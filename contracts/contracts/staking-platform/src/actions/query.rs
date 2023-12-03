use cosmwasm_std::{Addr, Coin, Deps, Env, Order, StdResult, Uint128};

use gopstake_base::{
    assets::{Currency, Funds, Token},
    constants::{MINS_PER_DAY, NANOS_PER_MIN},
    converters::{dec256_to_uint128, dec_to_dec256, u128_to_dec256},
    error::ContractError,
    staking_platform::{
        msg::{
            BalancesResponseItem, QueryCollectionsBalancesResponseItem,
            QueryCollectionsResponseItem, QueryProposalsResponseItem, QueryStakersResponseItem,
        },
        state::{COLLECTIONS, COLLECTIONS_BALANCES, CONFIG, FUNDS, PROPOSALS, STAKERS},
        types::{Collection, Config, StakedCollectionInfo},
    },
    utils::{filter_by_address_list, unwrap_field},
};

pub fn query_config(deps: Deps, _env: Env) -> StdResult<Config> {
    CONFIG.load(deps.storage)
}

pub fn query_funds(deps: Deps, _env: Env) -> StdResult<Vec<Funds<Token>>> {
    FUNDS.load(deps.storage)
}

pub fn query_stakers(
    deps: Deps,
    _env: Env,
    addresses: Option<Vec<String>>,
) -> StdResult<Vec<QueryStakersResponseItem>> {
    let stakers: Vec<(Addr, Vec<StakedCollectionInfo<Addr>>)> = STAKERS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .collect();

    Ok(filter_by_address_list(deps.api, &addresses, &stakers)?
        .into_iter()
        .map(
            |(staker_address, staked_collection_info_list)| QueryStakersResponseItem {
                staker_address,
                staked_collection_info_list,
            },
        )
        .collect())
}

pub fn query_staking_rewards(
    deps: Deps,
    env: Env,
    address: String,
) -> StdResult<BalancesResponseItem> {
    // There is no reason to update rewards every 1 ns. We will use 1 min timeframe
    let time_in_nanos: u128 = env.block.time.nanos().into();
    let mins_per_day = u128_to_dec256(MINS_PER_DAY);

    let staker_address = deps.api.addr_validate(&address)?;
    let collection_list = STAKERS.load(deps.storage, &staker_address)?;

    let mut funds_list: Vec<Funds<Token>> = vec![];

    for collection_info in collection_list {
        let Collection {
            staking_currency,
            daily_rewards,
            ..
        } = COLLECTIONS.load(deps.storage, &collection_info.collection_address)?;

        for token in collection_info.staked_token_info_list {
            let last_claim_date_in_nanos: u128 =
                unwrap_field(token.last_claim_date, "last_claim_date")?
                    .nanos()
                    .into();

            let time_diff_in_mins = u128_to_dec256(time_in_nanos - last_claim_date_in_nanos)
                / u128_to_dec256(NANOS_PER_MIN);
            let amount =
                dec256_to_uint128(time_diff_in_mins * dec_to_dec256(daily_rewards) / mins_per_day);

            let token_list: Vec<Token> = funds_list
                .iter()
                .map(|x| x.currency.token.to_owned())
                .collect();

            if !token_list.contains(&staking_currency.token) {
                funds_list.push(Funds::new(Uint128::zero(), &staking_currency));
            }

            for funds in funds_list.iter_mut() {
                if funds.currency.token == staking_currency.token {
                    funds.amount += amount;
                }
            }
        }
    }

    Ok(BalancesResponseItem {
        staker_address,
        funds_list,
    })
}

pub fn query_staking_rewards_per_collection(
    deps: Deps,
    env: Env,
    staker: String,
    collection: String,
) -> StdResult<BalancesResponseItem> {
    // There is no reason to update rewards every 1 ns. We will use 1 min timeframe
    let time_in_nanos: u128 = env.block.time.nanos().into();
    let mins_per_day = u128_to_dec256(MINS_PER_DAY);

    let staker_address = deps.api.addr_validate(&staker)?;
    let collection_address = deps.api.addr_validate(&collection)?;
    let collection_list = STAKERS.load(deps.storage, &staker_address)?;
    let collection_info = collection_list
        .iter()
        .find(|x| x.collection_address == collection_address)
        .ok_or(ContractError::CollectionIsNotFound)?;

    let mut funds_list: Vec<Funds<Token>> = vec![];

    let Collection {
        staking_currency,
        daily_rewards,
        ..
    } = COLLECTIONS.load(deps.storage, &collection_info.collection_address)?;

    for token in &collection_info.staked_token_info_list {
        let last_claim_date_in_nanos: u128 =
            unwrap_field(token.last_claim_date, "last_claim_date")?
                .nanos()
                .into();

        let time_diff_in_mins = u128_to_dec256(time_in_nanos - last_claim_date_in_nanos)
            / u128_to_dec256(NANOS_PER_MIN);
        let amount =
            dec256_to_uint128(time_diff_in_mins * dec_to_dec256(daily_rewards) / mins_per_day);

        let token_list: Vec<Token> = funds_list
            .iter()
            .map(|x| x.currency.token.to_owned())
            .collect();

        if !token_list.contains(&staking_currency.token) {
            funds_list.push(Funds::new(Uint128::zero(), &staking_currency));
        }

        for funds in funds_list.iter_mut() {
            if funds.currency.token == staking_currency.token {
                funds.amount += amount;
            }
        }
    }

    Ok(BalancesResponseItem {
        staker_address,
        funds_list,
    })
}

pub fn query_associated_balances(
    deps: Deps,
    _env: Env,
    address: String,
) -> StdResult<BalancesResponseItem> {
    let staker_address = deps.api.addr_validate(&address)?;

    // get native and cw20 tokens unique lists
    let collections: Vec<(Addr, Collection<Addr, Token>)> = COLLECTIONS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .collect();

    let mut native_currencies: Vec<Currency<Token>> = vec![];
    let mut cw20_currencies: Vec<Currency<Token>> = vec![];

    for (
        _,
        Collection {
            staking_currency, ..
        },
    ) in collections
    {
        let is_native = staking_currency.token.is_native();

        if !native_currencies.contains(&staking_currency) && is_native {
            native_currencies.push(staking_currency.clone());
            continue;
        }

        if !cw20_currencies.contains(&staking_currency) && !is_native {
            cw20_currencies.push(staking_currency);
        }
    }

    let native_tokens: Vec<Token> = native_currencies.iter().map(|x| x.token.clone()).collect();

    let mut staker_balances: Vec<Funds<Token>> = vec![];

    // query native tokens
    for Coin { denom, amount } in deps.querier.query_all_balances(staker_address.clone())? {
        let token = &Token::new_native(&denom);

        if !amount.is_zero() && native_tokens.contains(token) {
            if let Some(currency) = native_currencies.iter().find(|x| x.token == token.clone()) {
                staker_balances.push(Funds::new(amount, currency));
            }
        }
    }

    // query cw20 tokens
    for currency in &cw20_currencies {
        match &currency.token {
            Token::Native { denom: _ } => continue,
            Token::Cw20 { address } => {
                let cw20::BalanceResponse { balance } = deps.querier.query_wasm_smart(
                    address.clone(),
                    &cw20::Cw20QueryMsg::Balance {
                        address: staker_address.to_string(),
                    },
                )?;
                if balance.is_zero() {
                    continue;
                }

                staker_balances.push(Funds::new(balance, currency));
            }
        }
    }

    Ok(BalancesResponseItem {
        staker_address,
        funds_list: staker_balances,
    })
}

pub fn query_proposals(
    deps: Deps,
    _env: Env,
    last_amount: Option<Uint128>,
) -> StdResult<Vec<QueryProposalsResponseItem>> {
    let proposals: Vec<QueryProposalsResponseItem> = PROPOSALS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .map(|(id, proposal)| QueryProposalsResponseItem {
            id: id.into(),
            proposal,
        })
        .collect();

    if let Some(x) = last_amount {
        let x = (x.u128() as usize).clamp(0, proposals.len());
        let from = proposals.len() - x;
        return Ok(proposals[from..].to_vec());
    }

    Ok(proposals)
}

pub fn query_collections(
    deps: Deps,
    _env: Env,
    addresses: Option<Vec<String>>,
) -> StdResult<Vec<QueryCollectionsResponseItem>> {
    let collections: Vec<(Addr, Collection<Addr, Token>)> = COLLECTIONS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .collect();

    Ok(filter_by_address_list(deps.api, &addresses, &collections)?
        .into_iter()
        .map(|(address, collection)| QueryCollectionsResponseItem {
            address,
            collection,
        })
        .collect())
}

pub fn query_collections_balances(
    deps: Deps,
    _env: Env,
    addresses: Option<Vec<String>>,
) -> StdResult<Vec<QueryCollectionsBalancesResponseItem>> {
    let collections_balances: Vec<(Addr, Funds<Token>)> = COLLECTIONS_BALANCES
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .collect();

    Ok(
        filter_by_address_list(deps.api, &addresses, &collections_balances)?
            .into_iter()
            .map(|(address, funds)| QueryCollectionsBalancesResponseItem { address, funds })
            .collect(),
    )
}

use cosmwasm_std::{
    to_json_binary, Addr, CosmosMsg, Decimal, Deps, DepsMut, Env, MessageInfo, Order, Response,
    StdResult, Uint128, WasmMsg,
};

use cw721::Cw721ExecuteMsg;

use gopstake_base::{
    assets::{Currency, Funds, Token, TokenUnverified},
    constants::{MINS_PER_DAY, NANOS_PER_MIN},
    converters::{dec256_to_uint128, dec_to_dec256, u128_to_dec, u128_to_dec256},
    error::ContractError,
    staking_platform::{
        state::{
            COLLECTIONS, COLLECTIONS_BALANCES, CONFIG, FUNDS, PROPOSALS, PROPOSAL_COUNTER, STAKERS,
        },
        types::{
            Collection, Config, EmissionType, Proposal, ProposalStatus, ProposalType,
            StakedCollectionInfo, StakedTokenInfo,
        },
    },
    utils::{get_funds, get_transfer_msg, nonpayable, unwrap_field, validate_attr, Attrs},
};

pub fn try_stake(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    collections_to_stake: Vec<StakedCollectionInfo<String>>,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

    let mut staker = STAKERS.load(deps.storage, &info.sender).unwrap_or_default();
    let mut msg_list: Vec<CosmosMsg> = vec![];

    for StakedCollectionInfo {
        collection_address,
        staked_token_info_list,
    } in collections_to_stake
    {
        // validate collection
        let collection_address = deps.api.addr_validate(&collection_address)?;
        if !COLLECTIONS.has(deps.storage, &collection_address) {
            Err(ContractError::CollectionIsNotFound)?;
        }

        //  update state and create send messages
        for StakedTokenInfo { token_id, .. } in staked_token_info_list {
            let staked_collection = staker
                .iter()
                .find(|x| x.collection_address == collection_address);

            if staked_collection.is_none() {
                staker.push(StakedCollectionInfo {
                    collection_address: collection_address.clone(),
                    staked_token_info_list: vec![],
                });
            }

            for collection in staker.iter_mut() {
                if collection.collection_address == collection_address {
                    collection.staked_token_info_list.push(StakedTokenInfo {
                        token_id,
                        staking_start_date: Some(env.block.time),
                        last_claim_date: Some(env.block.time),
                    });
                }
            }

            let cw721_msg = Cw721ExecuteMsg::TransferNft {
                recipient: env.contract.address.to_string(),
                token_id: token_id.to_string(),
            };

            let msg = CosmosMsg::Wasm(WasmMsg::Execute {
                contract_addr: collection_address.to_string(),
                msg: to_json_binary(&cw721_msg)?,
                funds: vec![],
            });

            msg_list.push(msg);
        }
    }

    STAKERS.save(deps.storage, &info.sender, &staker)?;

    Ok(Response::new()
        .add_messages(msg_list)
        .add_attributes([("action", "try_stake")]))
}

pub fn try_unstake(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    collections_to_unstake: Vec<StakedCollectionInfo<String>>,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

    let mut msg_list: Vec<CosmosMsg> = vec![];
    let time_in_nanos: u128 = env.block.time.nanos().into();
    let mins_per_day = u128_to_dec256(MINS_PER_DAY);

    let addresses_of_collections_to_unstake: Vec<String> = collections_to_unstake
        .iter()
        .map(|x| x.collection_address.to_owned())
        .collect();
    let current_collection_list = STAKERS.load(deps.storage, &info.sender)?;
    let mut new_collection_list: Vec<StakedCollectionInfo<Addr>> = vec![];
    let mut staking_rewards_and_emission_type_list: Vec<(Funds<Token>, EmissionType)> = vec![];

    // check if each item of addresses_of_collections_to_unstake is included in list
    // of staked collections
    let current_collection_list_addresses: Vec<String> = current_collection_list
        .iter()
        .map(|x| x.collection_address.to_string())
        .collect();
    for address_of_collections_to_unstake in &addresses_of_collections_to_unstake {
        if !current_collection_list_addresses.contains(address_of_collections_to_unstake) {
            Err(ContractError::CollectionIsNotFound)?;
        }
    }

    // iterate over current_collection_list and fill new_collection_list
    for current_collection in current_collection_list {
        let current_collection_address = &current_collection.collection_address;

        // skip collections not included in collections_to_unstake
        if !addresses_of_collections_to_unstake.contains(&current_collection_address.to_string()) {
            new_collection_list.push(current_collection);
            continue;
        }

        // get data for current collection_to_unstake
        let collection_to_unstake = collections_to_unstake
            .iter()
            .find(|x| x.collection_address == *current_collection_address)
            .ok_or(ContractError::CollectionIsNotFound)?;

        // check if each token of collection_to_unstake is included in list
        // of staked tokens
        let current_staked_tokens: Vec<Uint128> = current_collection
            .staked_token_info_list
            .iter()
            .map(|x| x.token_id)
            .collect();
        for token_to_unstake in &collection_to_unstake.staked_token_info_list {
            if !current_staked_tokens.contains(&token_to_unstake.token_id) {
                Err(ContractError::AssetIsNotFound)?;
            }
        }

        let Collection {
            staking_currency,
            daily_rewards,
            emission_type,
            ..
        } = COLLECTIONS.load(deps.storage, current_collection_address)?;

        let mut collection_balances = match emission_type {
            EmissionType::Spending => {
                Some(COLLECTIONS_BALANCES.load(deps.storage, current_collection_address)?)
            }
            EmissionType::Minting => None,
        };

        // prepare new collection we want to fill with tokens not included in tokens_to_unstake
        let mut new_collection: StakedCollectionInfo<Addr> = StakedCollectionInfo {
            staked_token_info_list: vec![],
            ..current_collection.clone()
        };

        // iterate over tokens of current collection
        for token in current_collection.staked_token_info_list {
            let tokens_to_unstake: Vec<Uint128> = collection_to_unstake
                .staked_token_info_list
                .iter()
                .map(|x| x.token_id)
                .collect();

            // skip tokens not included in tokens_to_unstake
            if !tokens_to_unstake.contains(&token.token_id) {
                new_collection.staked_token_info_list.push(token);
                continue;
            }

            let last_claim_date_in_nanos: u128 =
                unwrap_field(token.last_claim_date, "last_claim_date")?
                    .nanos()
                    .into();

            let time_diff_in_mins = u128_to_dec256(time_in_nanos - last_claim_date_in_nanos)
                / u128_to_dec256(NANOS_PER_MIN);

            // calculate staking rewards
            let amount =
                dec256_to_uint128(time_diff_in_mins * dec_to_dec256(daily_rewards) / mins_per_day);

            // update staking rewards considering collection balances
            // it must be executed to prevent blocking unstaking NFT if collection balances
            // are not enough
            let amount = match &collection_balances {
                Some(x) => amount.clamp(Uint128::zero(), x.amount),
                _ => amount,
            };

            // update staking rewards list
            let is_token_found =
                staking_rewards_and_emission_type_list
                    .iter()
                    .any(|(funds, emission)| {
                        (funds.currency.token == staking_currency.token)
                            && (emission == &emission_type)
                    });

            if !is_token_found {
                staking_rewards_and_emission_type_list.push((
                    Funds::new(Uint128::zero(), &staking_currency),
                    emission_type.clone(),
                ));
            }

            for (funds, emission) in staking_rewards_and_emission_type_list.iter_mut() {
                if (funds.currency.token == staking_currency.token) && (emission == &emission_type)
                {
                    funds.amount += amount;
                }
            }

            // update collection balances if it's required
            collection_balances = collection_balances.map(|mut x| {
                x.amount -= amount;
                x
            });

            // create message to send NFT
            let cw721_msg = Cw721ExecuteMsg::TransferNft {
                recipient: info.sender.to_string(),
                token_id: token.token_id.to_string(),
            };

            let msg = CosmosMsg::Wasm(WasmMsg::Execute {
                contract_addr: current_collection_address.to_string(),
                msg: to_json_binary(&cw721_msg)?,
                funds: vec![],
            });

            msg_list.push(msg);
        }

        // if new_collection has tokens add it in new_collection_list
        if !new_collection.staked_token_info_list.is_empty() {
            new_collection_list.push(new_collection);
        }

        if let Some(x) = collection_balances {
            COLLECTIONS_BALANCES.save(deps.storage, current_collection_address, &x)?;
        }
    }

    STAKERS.save(deps.storage, &info.sender, &new_collection_list)?;

    let minter = unwrap_field(CONFIG.load(deps.storage)?.minter, "minter")?;

    // create messages to send rewards
    for (Funds { amount, currency }, emission) in staking_rewards_and_emission_type_list {
        if amount.is_zero() {
            continue;
        }

        let msg = match emission {
            EmissionType::Spending => get_transfer_msg(&info.sender, amount, &currency.token)?,
            EmissionType::Minting => {
                let mint_msg = gopstake_base::minter::msg::ExecuteMsg::MintTokens {
                    denom: currency.token.try_get_native()?,
                    amount,
                    mint_to_address: info.sender.to_string(),
                };

                CosmosMsg::Wasm(WasmMsg::Execute {
                    contract_addr: minter.to_string(),
                    msg: to_json_binary(&mint_msg)?,
                    funds: vec![],
                })
            }
        };

        msg_list.push(msg);
    }

    Ok(Response::new()
        .add_messages(msg_list)
        .add_attributes([("action", "try_unstake")]))
}

pub fn try_claim_staking_rewards(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

    let time_in_nanos: u128 = env.block.time.nanos().into();
    let mins_per_day = u128_to_dec256(MINS_PER_DAY);

    let mut collection_list = STAKERS.load(deps.storage, &info.sender)?;
    let mut staking_rewards_and_emission_type_list: Vec<(Funds<Token>, EmissionType)> = vec![];

    for collection_info in collection_list.iter_mut() {
        let Collection {
            staking_currency,
            daily_rewards,
            emission_type,
            ..
        } = COLLECTIONS.load(deps.storage, &collection_info.collection_address)?;

        let mut collection_balances = match emission_type {
            EmissionType::Spending => {
                Some(COLLECTIONS_BALANCES.load(deps.storage, &collection_info.collection_address)?)
            }
            EmissionType::Minting => None,
        };

        for token in collection_info.staked_token_info_list.iter_mut() {
            let last_claim_date_in_nanos: u128 =
                unwrap_field(token.last_claim_date, "last_claim_date")?
                    .nanos()
                    .into();

            let time_diff_in_mins = u128_to_dec256(time_in_nanos - last_claim_date_in_nanos)
                / u128_to_dec256(NANOS_PER_MIN);

            // calculate staking rewards
            let amount =
                dec256_to_uint128(time_diff_in_mins * dec_to_dec256(daily_rewards) / mins_per_day);

            let is_token_found =
                staking_rewards_and_emission_type_list
                    .iter()
                    .any(|(funds, emission)| {
                        (funds.currency.token == staking_currency.token)
                            && (emission == &emission_type)
                    });

            if !is_token_found {
                staking_rewards_and_emission_type_list.push((
                    Funds::new(Uint128::zero(), &staking_currency),
                    emission_type.clone(),
                ));
            }

            // update collection balances or skip if it's not enough funds
            let mut is_enough_funds = true;

            collection_balances = match collection_balances {
                Some(mut x) => {
                    if x.amount < amount {
                        is_enough_funds = false;
                        Some(x)
                    } else {
                        x.amount -= amount;
                        Some(x)
                    }
                }
                _ => None,
            };

            if !is_enough_funds {
                continue;
            }

            for (funds, emission) in staking_rewards_and_emission_type_list.iter_mut() {
                if (funds.currency.token == staking_currency.token) && (emission == &emission_type)
                {
                    funds.amount += amount;
                }
            }

            // reset last claim date
            token.last_claim_date = Some(env.block.time);
        }

        if let Some(x) = collection_balances {
            COLLECTIONS_BALANCES.save(deps.storage, &collection_info.collection_address, &x)?;
        }
    }

    STAKERS.save(deps.storage, &info.sender, &collection_list)?;

    let minter = unwrap_field(CONFIG.load(deps.storage)?.minter, "minter")?;

    // create send messages
    let msg_list = staking_rewards_and_emission_type_list
        .into_iter()
        .filter(|(x, _)| !x.amount.is_zero())
        .map(
            |(Funds { amount, currency }, emission)| -> StdResult<CosmosMsg> {
                match emission {
                    EmissionType::Spending => {
                        get_transfer_msg(&info.sender, amount, &currency.token)
                    }
                    EmissionType::Minting => {
                        let mint_msg = gopstake_base::minter::msg::ExecuteMsg::MintTokens {
                            denom: currency.token.try_get_native()?,
                            amount,
                            mint_to_address: info.sender.to_string(),
                        };

                        Ok(CosmosMsg::Wasm(WasmMsg::Execute {
                            contract_addr: minter.to_string(),
                            msg: to_json_binary(&mint_msg)?,
                            funds: vec![],
                        }))
                    }
                }
            },
        )
        .collect::<StdResult<Vec<CosmosMsg>>>()?;

    Ok(Response::new()
        .add_messages(msg_list)
        .add_attributes([("action", "try_claim_staking_rewards")]))
}

pub fn try_update_config(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    owner: Option<String>,
    minter: Option<String>,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

    let mut attrs = Attrs::init("try_update_config");
    let api = deps.api;

    CONFIG.update(deps.storage, |mut config| -> StdResult<Config> {
        // verify sender
        if info.sender != config.admin {
            Err(ContractError::Unauthorized)?;
        }

        config.owner = validate_attr(&mut attrs, api, "owner", &owner)?;
        config.minter = validate_attr(&mut attrs, api, "minter", &minter)?;

        Ok(config)
    })?;

    Ok(Response::new().add_attributes(attrs))
}

pub fn try_distribute_funds(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    address_and_weight_list: Vec<(String, Decimal)>,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

    // verify sender
    verify_admin_and_owner(deps.as_ref(), &info)?;

    // verify weights
    // check if all weights are in range [0, 1]
    if address_and_weight_list
        .iter()
        .any(|(_, weight)| weight > &Decimal::one())
    {
        Err(ContractError::WeightIsOutOfRange)?;
    }

    // check if sum of weights is equal one
    let weights_sum = address_and_weight_list
        .iter()
        .fold(Decimal::zero(), |acc, (_, weight)| acc + weight);

    if weights_sum != Decimal::one() {
        Err(ContractError::WeightsAreUnbalanced)?;
    }

    // create send messages and update state
    let mut funds_list = FUNDS.load(deps.storage)?;
    let mut msg_list: Vec<CosmosMsg> = vec![];

    let address_and_weight_list = address_and_weight_list
        .into_iter()
        .map(|(address, weight)| -> StdResult<(Addr, Decimal)> {
            let recipient = deps.api.addr_validate(&address)?;
            Ok((recipient, weight))
        })
        .collect::<StdResult<Vec<(Addr, Decimal)>>>()?;

    for funds_list_item in funds_list.iter_mut() {
        let mut amount_to_send = Uint128::zero();

        for (recipient, weight) in &address_and_weight_list {
            let amount = (u128_to_dec(funds_list_item.amount.to_owned()) * weight).to_uint_floor();
            amount_to_send += amount;

            let msg = get_transfer_msg(recipient, amount, &funds_list_item.currency.token)?;
            msg_list.push(msg);
        }

        funds_list_item.amount -= amount_to_send;
    }

    FUNDS.save(deps.storage, &funds_list)?;

    Ok(Response::new()
        .add_messages(msg_list)
        .add_attributes([("action", "try_distribute_funds")]))
}

pub fn try_remove_collection(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    address: String,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

    // verify sender
    verify_admin_and_owner(deps.as_ref(), &info)?;

    // update state
    let collection_address = &deps.api.addr_validate(&address)?;
    COLLECTIONS.remove(deps.storage, collection_address);

    Ok(Response::new().add_attributes([("action", "try_remove_collection")]))
}

pub fn try_create_proposal(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    proposal: Proposal<String, TokenUnverified>,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

    // verify sender
    verify_admin_and_owner(deps.as_ref(), &info)?;

    // verify proposal fields
    let Proposal {
        proposal_type,
        price,
        ..
    } = proposal;

    let proposal_type: ProposalType<Addr, Token> = match proposal_type {
        ProposalType::AddCollection {
            collection_address,
            collection:
                Collection {
                    name,
                    staking_currency,
                    daily_rewards,
                    emission_type,
                    owner,
                },
        } => {
            let collection_address = deps.api.addr_validate(&collection_address)?;
            let staking_currency = Currency::new(
                &staking_currency.token.verify(&deps.as_ref())?,
                staking_currency.decimals,
            );
            let owner = deps.api.addr_validate(&owner)?;

            if !emission_type.is_spending() && !staking_currency.token.is_native() {
                Err(ContractError::WrongMinterTokenType)?;
            }

            let is_collection_found = COLLECTIONS
                .range(deps.storage, None, None, Order::Ascending)
                .flatten()
                .any(|(current_address, current_collection)| {
                    (current_address == collection_address) || (current_collection.name == name)
                });

            if is_collection_found {
                Err(ContractError::CollectionDuplication)?;
            }

            ProposalType::AddCollection {
                collection_address,
                collection: Collection {
                    name,
                    staking_currency,
                    daily_rewards,
                    emission_type,
                    owner,
                },
            }
        }
        ProposalType::UpdateCollection {
            collection_address,
            new_collection_address,
            new_collection:
                Collection {
                    name,
                    staking_currency,
                    daily_rewards,
                    emission_type,
                    owner,
                },
        } => {
            let collection_address = deps.api.addr_validate(&collection_address)?;
            let new_collection_address = match new_collection_address {
                Some(x) => Some(deps.api.addr_validate(&x)?),
                _ => None,
            };
            let staking_currency = Currency::new(
                &staking_currency.token.verify(&deps.as_ref())?,
                staking_currency.decimals,
            );
            let owner = deps.api.addr_validate(&owner)?;

            if !emission_type.is_spending() && !staking_currency.token.is_native() {
                Err(ContractError::WrongMinterTokenType)?;
            }

            let is_collection_found = COLLECTIONS
                .range(deps.storage, None, None, Order::Ascending)
                .flatten()
                .any(|(current_address, current_collection)| {
                    (current_address == collection_address) || (current_collection.name == name)
                });

            if is_collection_found {
                Err(ContractError::CollectionDuplication)?;
            }

            ProposalType::UpdateCollection {
                collection_address,
                new_collection_address,
                new_collection: Collection {
                    name,
                    staking_currency,
                    daily_rewards,
                    emission_type,
                    owner,
                },
            }
        }
    };

    let token = price.currency.token.verify(&deps.as_ref())?;
    let proposal: Proposal<Addr, Token> = Proposal {
        proposal_status: Some(ProposalStatus::Active),
        proposal_type,
        price: Funds::new(
            price.amount,
            &Currency::new(&token, price.currency.decimals),
        ),
    };

    // update list of proposals
    let proposal_counter = PROPOSAL_COUNTER.load(deps.storage)?;
    PROPOSALS.save(deps.storage, proposal_counter, &proposal)?;
    PROPOSAL_COUNTER.save(deps.storage, &(proposal_counter + 1))?;

    Ok(Response::new().add_attributes([
        ("action", "try_create_proposal"),
        ("proposal_id", &proposal_counter.to_string()),
    ]))
}

pub fn try_reject_proposal(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    id: Uint128,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

    // verify sender
    verify_admin_and_owner(deps.as_ref(), &info)?;

    // update proposal status
    PROPOSALS.update(
        deps.storage,
        id.u128(),
        |proposal| -> StdResult<Proposal<Addr, Token>> {
            let proposal = unwrap_field(proposal, "proposal")?;

            // verify proposal status
            verify_proposal_status(&proposal, ProposalStatus::Active)?;

            Ok(Proposal {
                proposal_status: Some(ProposalStatus::Rejected),
                ..proposal
            })
        },
    )?;

    Ok(Response::new().add_attributes([("action", "try_reject_proposal")]))
}

pub fn try_accept_proposal(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    id: Uint128,
    sender: Option<String>,
    amount: Option<Uint128>,
) -> Result<Response, ContractError> {
    let id = id.u128();
    let (user_address, asset_amount, asset_info) = get_funds(deps.api, &info, &sender, &amount)?;
    let proposal = PROPOSALS.load(deps.storage, id)?;

    // verify funds
    if (asset_amount != proposal.price.amount) || (asset_info != proposal.price.currency.token) {
        Err(ContractError::WrongFundsCombination)?;
    }

    // verify proposal status
    verify_proposal_status(&proposal, ProposalStatus::Active)?;

    let time_in_nanos: u128 = env.block.time.nanos().into();
    let mins_per_day = u128_to_dec256(MINS_PER_DAY);

    let mut rewards_emission_staker_list: Vec<(Funds<Token>, EmissionType, Addr)> = vec![];

    let (collection_address, new_collection_address, collection) = match &proposal.proposal_type {
        ProposalType::AddCollection {
            collection_address,
            collection,
        } => {
            let is_collection_found = COLLECTIONS
                .range(deps.storage, None, None, Order::Ascending)
                .flatten()
                .any(|(current_address, current_collection)| {
                    (current_address == collection_address)
                        || (current_collection.name == collection.name)
                });

            if is_collection_found {
                Err(ContractError::CollectionDuplication)?;
            }

            COLLECTIONS_BALANCES.save(
                deps.storage,
                collection_address,
                &Funds::new(0u128, &collection.staking_currency),
            )?;

            (collection_address, None, collection)
        }
        ProposalType::UpdateCollection {
            collection_address,
            new_collection_address,
            new_collection,
        } => {
            let collections = &COLLECTIONS
                .range(deps.storage, None, None, Order::Ascending)
                .flatten()
                .collect::<Vec<(Addr, Collection<Addr, Token>)>>();

            let is_collection_found = collections
                .iter()
                .any(|(current_address, _)| (current_address == collection_address));

            if !is_collection_found {
                Err(ContractError::CollectionIsNotFound)?;
            }

            let is_collection_found =
                collections
                    .iter()
                    .any(|(current_address, _current_collection)| {
                        new_collection_address.is_some()
                            && (current_address == new_collection_address.clone().unwrap())
                    });

            if is_collection_found {
                Err(ContractError::CollectionDuplication)?;
            }

            // claim staking rewards for each collection staker before changing
            // daily_rewards or staking_currency
            let current_collection = COLLECTIONS.load(deps.storage, collection_address)?;

            if (new_collection.daily_rewards != current_collection.daily_rewards)
                || (new_collection.staking_currency != current_collection.staking_currency)
            {
                let mut collection_balances =
                    COLLECTIONS_BALANCES.load(deps.storage, collection_address)?;

                let mut stakers: Vec<(Addr, Vec<StakedCollectionInfo<Addr>>)> = STAKERS
                    .range(deps.storage, None, None, Order::Ascending)
                    .flatten()
                    .collect();

                for (staker_address, collection_list) in stakers.iter_mut() {
                    for staked_collection in collection_list {
                        if collection_address != staked_collection.collection_address {
                            continue;
                        }

                        let mut staker_rewards = Uint128::zero();

                        for token in staked_collection.staked_token_info_list.iter_mut() {
                            let last_claim_date_in_nanos: u128 =
                                unwrap_field(token.last_claim_date, "last_claim_date")?
                                    .nanos()
                                    .into();

                            let time_diff_in_mins =
                                u128_to_dec256(time_in_nanos - last_claim_date_in_nanos)
                                    / u128_to_dec256(NANOS_PER_MIN);

                            // calculate staking rewards
                            let amount = dec256_to_uint128(
                                time_diff_in_mins * dec_to_dec256(current_collection.daily_rewards)
                                    / mins_per_day,
                            );

                            staker_rewards += amount;

                            if current_collection.emission_type == EmissionType::Spending {
                                collection_balances.amount -= amount;
                            }

                            token.last_claim_date = Some(env.block.time);
                        }

                        if !staker_rewards.is_zero() {
                            rewards_emission_staker_list.push((
                                Funds::new(staker_rewards, &current_collection.staking_currency),
                                current_collection.emission_type.clone(),
                                staker_address.clone(),
                            ));
                        }
                    }
                }

                for (staker_address, collection_list) in stakers {
                    STAKERS.save(deps.storage, &staker_address, &collection_list)?;
                }

                // All funds from collection balances must be removed before
                // changing staking currency
                // Send unused funds to collection owner
                if (new_collection.staking_currency != current_collection.staking_currency)
                    && (current_collection.emission_type == EmissionType::Spending)
                    && !collection_balances.amount.is_zero()
                {
                    rewards_emission_staker_list.push((
                        Funds::new(
                            collection_balances.amount,
                            &current_collection.staking_currency,
                        ),
                        current_collection.emission_type.clone(),
                        current_collection.owner,
                    ));

                    collection_balances.amount = Uint128::zero();
                }

                COLLECTIONS_BALANCES.save(
                    deps.storage,
                    collection_address,
                    &collection_balances,
                )?;
            }

            (
                collection_address,
                new_collection_address.as_ref(),
                new_collection,
            )
        }
    };

    // verify sender
    if user_address != collection.owner {
        Err(ContractError::Unauthorized)?;
    }

    // add/update collection
    match new_collection_address {
        Some(x) => {
            COLLECTIONS.remove(deps.storage, collection_address);
            COLLECTIONS.save(deps.storage, x, collection)?;
        }
        _ => COLLECTIONS.save(deps.storage, collection_address, collection)?,
    };

    // update funds
    let mut funds_list = FUNDS.load(deps.storage)?;

    let funds = funds_list
        .iter()
        .find(|Funds { currency, .. }| currency.token == asset_info);

    if funds.is_none() {
        funds_list.push(Funds::new(Uint128::zero(), &proposal.price.currency));
    }

    for funds_list_item in funds_list.iter_mut() {
        if funds_list_item.currency.token == asset_info {
            funds_list_item.amount += asset_amount;
        }
    }

    FUNDS.save(deps.storage, &funds_list)?;

    // update proposal status
    PROPOSALS.save(
        deps.storage,
        id,
        &Proposal {
            proposal_status: Some(ProposalStatus::Accepted),
            ..proposal
        },
    )?;

    // create messages to send rewards
    let minter = unwrap_field(CONFIG.load(deps.storage)?.minter, "minter")?;

    let msg_list = rewards_emission_staker_list
        .into_iter()
        .map(
            |(Funds { amount, currency }, emission, staker_address)| -> StdResult<CosmosMsg> {
                match emission {
                    EmissionType::Spending => {
                        get_transfer_msg(&staker_address, amount, &currency.token)
                    }
                    EmissionType::Minting => {
                        let mint_msg = gopstake_base::minter::msg::ExecuteMsg::MintTokens {
                            denom: currency.token.try_get_native()?,
                            amount,
                            mint_to_address: staker_address.to_string(),
                        };

                        Ok(CosmosMsg::Wasm(WasmMsg::Execute {
                            contract_addr: minter.to_string(),
                            msg: to_json_binary(&mint_msg)?,
                            funds: vec![],
                        }))
                    }
                }
            },
        )
        .collect::<StdResult<Vec<CosmosMsg>>>()?;

    Ok(Response::new()
        .add_messages(msg_list)
        .add_attributes([("action", "try_accept_proposal")]))
}

pub fn try_deposit_tokens(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    collection_address: String,
    sender: Option<String>,
    amount: Option<Uint128>,
) -> Result<Response, ContractError> {
    let (user_address, asset_amount, asset_info) = get_funds(deps.api, &info, &sender, &amount)?;
    let collection_address = &deps.api.addr_validate(&collection_address)?;
    let collection = COLLECTIONS.load(deps.storage, collection_address)?;

    // verify funds
    if asset_info != collection.staking_currency.token {
        Err(ContractError::AssetIsNotFound)?;
    }

    // verify sender
    if user_address != collection.owner {
        Err(ContractError::Unauthorized)?;
    }

    // verify emmision type
    if collection.emission_type != EmissionType::Spending {
        Err(ContractError::ActionByEmissionType)?;
    }

    COLLECTIONS_BALANCES.update(
        deps.storage,
        collection_address,
        |x| -> StdResult<Funds<Token>> {
            match x {
                Some(Funds { amount, currency }) => {
                    Ok(Funds::new(amount + asset_amount, &currency))
                }
                _ => Ok(Funds::new(asset_amount, &collection.staking_currency)),
            }
        },
    )?;

    Ok(Response::new().add_attributes([("action", "try_deposit_tokens")]))
}

pub fn try_withdraw_tokens(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    collection_address: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let collection_address = &deps.api.addr_validate(&collection_address)?;
    let collection = COLLECTIONS.load(deps.storage, collection_address)?;

    // verify sender
    if info.sender != collection.owner {
        Err(ContractError::Unauthorized)?;
    }

    // verify emmision type
    if collection.emission_type != EmissionType::Spending {
        Err(ContractError::ActionByEmissionType)?;
    }

    COLLECTIONS_BALANCES.update(
        deps.storage,
        collection_address,
        |x| -> StdResult<Funds<Token>> {
            match x {
                Some(funds) => Ok(Funds::new(funds.amount - amount, &funds.currency)),
                _ => Err(ContractError::AssetIsNotFound)?,
            }
        },
    )?;

    let msg = get_transfer_msg(&info.sender, amount, &collection.staking_currency.token)?;

    Ok(Response::new()
        .add_message(msg)
        .add_attributes([("action", "try_withdraw_tokens")]))
}

fn verify_proposal_status(
    proposal: &Proposal<Addr, Token>,
    expected: ProposalStatus,
) -> StdResult<()> {
    let proposal_status = unwrap_field(proposal.proposal_status.as_ref(), "proposal_status")?;

    if proposal_status != &expected {
        Err(ContractError::WrongProposalStatus)?;
    }

    Ok(())
}

fn verify_admin_and_owner(deps: Deps, info: &MessageInfo) -> StdResult<()> {
    let Config { admin, owner, .. } = CONFIG.load(deps.storage)?;
    let owner = unwrap_field(owner, "owner");

    if (info.sender != admin) && (owner.is_err() || (owner.is_ok() && (info.sender != owner?))) {
        Err(ContractError::Unauthorized)?;
    }

    Ok(())
}

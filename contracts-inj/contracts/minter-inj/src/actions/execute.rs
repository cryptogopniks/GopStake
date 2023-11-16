use cosmwasm_std::{
    coin, Addr, BankMsg, Coin, CosmosMsg, DepsMut, Env, MessageInfo, Order, Response, StdError,
    StdResult, Uint128,
};

use injective_cosmwasm::{
    create_burn_tokens_msg, create_mint_tokens_msg, create_new_denom_msg,
    create_set_token_metadata_msg, InjectiveMsgWrapper, InjectiveQueryWrapper,
};

use crate::{
    error::ContractError,
    state::{CONFIG, TOKENS},
    types::{Config, Metadata},
    utils::{nonpayable, one_coin, unwrap_field, validate_attr, Attrs},
};

pub fn try_create_denom(
    deps: DepsMut<InjectiveQueryWrapper>,
    env: Env,
    info: MessageInfo,
    subdenom: String,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    // verify funds
    one_coin(&info)?;

    let owner = info.sender;
    let creator = env.contract.address;

    let denoms = &TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .flat_map(|(_, x)| x)
        .collect::<Vec<String>>();

    TOKENS.update(deps.storage, &owner, |x| -> StdResult<Vec<String>> {
        let full_denom = &get_full_denom(&creator, &subdenom);

        match x {
            Some(mut tokens) => {
                if denoms.iter().any(|y| y == full_denom) {
                    Err(ContractError::DenomExists)?;
                }

                tokens.push(full_denom.to_string());

                Ok(tokens)
            }
            _ => Ok(vec![full_denom.to_string()]),
        }
    })?;

    let msg = create_new_denom_msg(creator.to_string(), subdenom);

    Ok(Response::new()
        .add_message(msg)
        .add_attributes([("action", "try_create_denom")]))
}

pub fn try_mint_tokens(
    deps: DepsMut<InjectiveQueryWrapper>,
    env: Env,
    info: MessageInfo,
    denom: String,
    amount: Uint128,
    mint_to_address: String,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    // verify funds
    nonpayable(&info).map_err(|e| StdError::GenericErr { msg: e.to_string() })?;

    let owner_and_denoms = TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .find(|(_, tokens)| tokens.contains(&denom));
    let owner_and_denoms = unwrap_field(owner_and_denoms, "owner_and_denoms");

    let Config {
        staking_platform, ..
    } = CONFIG.load(deps.storage)?;
    let staking_platform = unwrap_field(staking_platform, "staking_platform");

    if owner_and_denoms.is_err() {
        Err(ContractError::AssetIsNotFound)?;
    }

    if (staking_platform.is_ok() && (info.sender != staking_platform?))
        && (owner_and_denoms.is_ok() && (info.sender != owner_and_denoms?.0))
    {
        Err(ContractError::Unauthorized)?;
    }

    let creator = &env.contract.address;
    let amount = coin(amount.u128(), denom);

    let msg_list = vec![
        create_mint_tokens_msg(creator.to_owned(), amount.clone(), creator.to_string()),
        CosmosMsg::Bank(BankMsg::Send {
            to_address: mint_to_address,
            amount: vec![amount],
        }),
    ];

    Ok(Response::new()
        .add_messages(msg_list)
        .add_attributes([("action", "try_mint_tokens")]))
}

pub fn try_burn_tokens(
    deps: DepsMut<InjectiveQueryWrapper>,
    env: Env,
    info: MessageInfo,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    // verify funds
    let Coin { amount, denom } = one_coin(&info)?;

    let owner_and_denoms = TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .find(|(_, tokens)| tokens.contains(&denom));

    if owner_and_denoms.is_none() {
        Err(ContractError::AssetIsNotFound)?;
    }

    let creator = &env.contract.address;
    let amount = coin(amount.u128(), denom);

    let msg = create_burn_tokens_msg(creator.to_owned(), amount);

    Ok(Response::new()
        .add_message(msg)
        .add_attributes([("action", "try_burn_tokens")]))
}

pub fn try_set_metadata(
    deps: DepsMut<InjectiveQueryWrapper>,
    _env: Env,
    info: MessageInfo,
    metadata: Metadata,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    // verify funds
    nonpayable(&info).map_err(|e| StdError::GenericErr { msg: e.to_string() })?;

    let Metadata { base: denom, .. } = &metadata;

    let owner_and_denoms = TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .find(|(_, tokens)| tokens.contains(denom));
    let owner_and_denoms = unwrap_field(owner_and_denoms, "owner_and_denoms");

    if owner_and_denoms.is_err() {
        Err(ContractError::AssetIsNotFound)?;
    }

    if owner_and_denoms.is_ok() && (info.sender != owner_and_denoms?.0) {
        Err(ContractError::Unauthorized)?;
    }

    let Metadata {
        denom_units,
        base,
        name,
        symbol,
        ..
    } = metadata;

    let msg = create_set_token_metadata_msg(
        base,
        name,
        symbol,
        denom_units
            .get(1)
            .ok_or(ContractError::Unauthorized)?
            .exponent as u8,
    );

    Ok(Response::new()
        .add_message(msg)
        .add_attributes([("action", "try_set_metadata")]))
}

pub fn try_update_config(
    deps: DepsMut<InjectiveQueryWrapper>,
    _env: Env,
    info: MessageInfo,
    staking_platform: Option<String>,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    // verify funds
    nonpayable(&info).map_err(|e| StdError::GenericErr { msg: e.to_string() })?;

    let mut attrs = Attrs::init("try_update_config");
    let api = deps.api;

    CONFIG.update(deps.storage, |mut config| -> StdResult<Config> {
        // verify sender
        if info.sender != config.admin {
            Err(ContractError::Unauthorized)?;
        }

        config.staking_platform =
            validate_attr(&mut attrs, api, "staking_platform", &staking_platform)?;

        Ok(config)
    })?;

    Ok(Response::new().add_attributes(attrs))
}

fn get_full_denom(creator: &Addr, subdenom: &str) -> String {
    format!("factory/{creator}/{subdenom}")
}

use cosmwasm_std::{
    coin, Addr, BankMsg, CosmosMsg, Deps, DepsMut, Env, MessageInfo, Order, Response, StdResult,
    Uint128,
};

use injective_cosmwasm::{
    create_burn_tokens_msg, create_mint_tokens_msg, create_new_denom_msg,
    create_set_token_metadata_msg, InjectiveMsgWrapper, InjectiveQueryWrapper,
};

use crate::{
    error::ContractError,
    state::{CONFIG, TOKENS},
    types::{Config, Metadata},
    utils::{check_funds, unwrap_field, Attrs, AuthType, FundsType},
};

pub fn try_create_denom(
    deps: DepsMut<InjectiveQueryWrapper>,
    env: Env,
    info: MessageInfo,
    token_owner: String,
    subdenom: String,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    let (sender_address, ..) = check_funds(
        deps.as_ref(),
        &info,
        FundsType::Single {
            sender: None,
            amount: None,
        },
    )?;
    check_authorization(deps.as_ref(), &sender_address, AuthType::AdminOrOwner)?;

    let owner = deps.api.addr_validate(&token_owner)?;
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
    let (sender_address, ..) = check_funds(deps.as_ref(), &info, FundsType::Empty)?;

    let owner_and_denoms = TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .find(|(_, tokens)| tokens.contains(&denom));
    let owner_and_denoms = unwrap_field(owner_and_denoms, "owner_and_denoms");

    if owner_and_denoms.is_err() {
        Err(ContractError::AssetIsNotFound)?;
    }

    let (token_owner, _) = owner_and_denoms?;

    check_authorization(
        deps.as_ref(),
        &sender_address,
        AuthType::Specified {
            allowlist: vec![
                CONFIG.load(deps.storage)?.staking_platform,
                Some(token_owner),
            ],
        },
    )?;

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
    let (sender_address, amount, asset_info) = check_funds(
        deps.as_ref(),
        &info,
        FundsType::Single {
            sender: None,
            amount: None,
        },
    )?;
    check_authorization(deps.as_ref(), &sender_address, AuthType::Any)?;
    let denom = asset_info.try_get_native()?;

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
    let (sender_address, ..) = check_funds(deps.as_ref(), &info, FundsType::Empty)?;

    let Metadata { base: denom, .. } = &metadata;

    let owner_and_denoms = TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .find(|(_, tokens)| tokens.contains(denom));
    let owner_and_denoms = unwrap_field(owner_and_denoms, "owner_and_denoms");

    if owner_and_denoms.is_err() {
        Err(ContractError::AssetIsNotFound)?;
    }

    let (token_owner, _) = owner_and_denoms?;

    check_authorization(
        deps.as_ref(),
        &sender_address,
        AuthType::AdminOrOwnerOrSpecified {
            allowlist: vec![Some(token_owner)],
        },
    )?;

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
    owner: Option<String>,
    staking_platform: Option<String>,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    let (sender_address, ..) = check_funds(deps.as_ref(), &info, FundsType::Empty)?;
    check_authorization(deps.as_ref(), &sender_address, AuthType::Admin)?;

    let mut attrs = Attrs::init("try_update_config");

    CONFIG.update(deps.storage, |mut config| -> StdResult<Config> {
        if let Some(x) = owner {
            config.owner = Some(deps.api.addr_validate(&x)?);
            attrs.push(("owner".to_string(), x));
        }

        if let Some(x) = staking_platform {
            config.staking_platform = Some(deps.api.addr_validate(&x)?);
            attrs.push(("staking_platform".to_string(), x));
        }

        Ok(config)
    })?;

    Ok(Response::new().add_attributes(attrs))
}

fn get_full_denom(creator: &Addr, subdenom: &str) -> String {
    format!("factory/{creator}/{subdenom}")
}

fn check_authorization(
    deps: Deps<InjectiveQueryWrapper>,
    sender: &Addr,
    auth_type: AuthType,
) -> StdResult<()> {
    let Config { admin, owner, .. } = CONFIG.load(deps.storage)?;
    let owner = unwrap_field(owner, "owner");

    match auth_type {
        AuthType::Any => {}
        AuthType::Admin => {
            if sender != admin {
                Err(ContractError::Unauthorized)?;
            }
        }
        AuthType::AdminOrOwner => {
            if !((sender == admin) || (owner.is_ok() && sender == owner?)) {
                Err(ContractError::Unauthorized)?;
            }
        }
        AuthType::Specified { allowlist } => {
            let is_included = allowlist.iter().any(|some_address| {
                if let Some(x) = some_address {
                    if sender == x {
                        return true;
                    }
                }

                false
            });

            if !is_included {
                Err(ContractError::Unauthorized)?;
            }
        }
        AuthType::AdminOrOwnerOrSpecified { allowlist } => {
            let is_included = allowlist.iter().any(|some_address| {
                if let Some(x) = some_address {
                    if sender == x {
                        return true;
                    }
                }

                false
            });

            if !((sender == admin) || (owner.is_ok() && sender == owner?) || is_included) {
                Err(ContractError::Unauthorized)?;
            }
        }
        AuthType::AdminOrSpecified { allowlist } => {
            let is_included = allowlist.iter().any(|some_address| {
                if let Some(x) = some_address {
                    if sender == x {
                        return true;
                    }
                }

                false
            });

            if !((sender == admin) || is_included) {
                Err(ContractError::Unauthorized)?;
            }
        }
    };

    Ok(())
}

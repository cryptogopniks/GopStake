use cosmwasm_std::{
    coin, Addr, BankMsg, Coin, CosmosMsg, Deps, DepsMut, Env, MessageInfo, Order, Response,
    StdResult, Uint128,
};

use gopstake_base::{
    error::ContractError,
    minter::{
        state::{CONFIG, TOKENS},
        types::{Config, Metadata},
    },
    utils::{nonpayable, one_coin, unwrap_field, Attrs, AuthType},
};

pub fn try_create_denom(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_owner: String,
    subdenom: String,
) -> Result<Response, ContractError> {
    check_authorization(deps.as_ref(), &info, AuthType::AdminOrOwner)?;

    // verify funds
    one_coin(&info)?;

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

    Ok(Response::new().add_attributes([("action", "try_create_denom")]))
}

pub fn try_mint_tokens(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    denom: String,
    amount: Uint128,
    mint_to_address: String,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

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

    let amount = coin(amount.u128(), denom);

    let msg = CosmosMsg::Bank(BankMsg::Send {
        to_address: mint_to_address,
        amount: vec![amount],
    });

    Ok(Response::new()
        .add_message(msg)
        .add_attributes([("action", "try_mint_tokens")]))
}

pub fn try_burn_tokens(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    // verify funds
    let Coin { denom, .. } = one_coin(&info)?;

    let owner_and_denoms = TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .find(|(_, tokens)| tokens.contains(&denom));

    if owner_and_denoms.is_none() {
        Err(ContractError::AssetIsNotFound)?;
    }

    Ok(Response::new().add_attributes([("action", "try_burn_tokens")]))
}

pub fn try_set_metadata(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    metadata: Metadata,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

    let Metadata { base: denom, .. } = &metadata;

    let owner_and_denoms = TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .find(|(_, tokens)| tokens.contains(denom));
    let owner_and_denoms = unwrap_field(owner_and_denoms, "owner_and_denoms");

    if owner_and_denoms.is_err() {
        Err(ContractError::AssetIsNotFound)?;
    }

    check_authorization(
        deps.as_ref(),
        &info,
        AuthType::AdminOrOwnerOrSpecified {
            allowlist: vec![Some(owner_and_denoms?.0)],
        },
    )?;

    Ok(Response::new().add_attributes([("action", "try_set_metadata")]))
}

pub fn try_update_config(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    owner: Option<String>,
    staking_platform: Option<String>,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info)?;

    let mut attrs = Attrs::init("try_update_config");

    CONFIG.update(deps.storage, |mut config| -> StdResult<Config> {
        // verify sender
        if info.sender != config.admin {
            Err(ContractError::Unauthorized)?;
        }

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

fn get_full_denom(_creator: &Addr, subdenom: &str) -> String {
    subdenom.to_string()
}

fn check_authorization(deps: Deps, info: &MessageInfo, auth_type: AuthType) -> StdResult<()> {
    let Config { admin, owner, .. } = CONFIG.load(deps.storage)?;
    let owner = unwrap_field(owner, "owner");

    match auth_type {
        AuthType::Any => {}
        AuthType::Admin => {
            if info.sender != admin {
                Err(ContractError::Unauthorized)?;
            }
        }
        AuthType::AdminOrOwner => {
            if !((info.sender == admin) || (owner.is_ok() && info.sender == owner?)) {
                Err(ContractError::Unauthorized)?;
            }
        }
        AuthType::Specified { allowlist } => {
            let is_included = allowlist.iter().any(|some_address| {
                if let Some(x) = some_address {
                    if info.sender == x {
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
                    if info.sender == x {
                        return true;
                    }
                }

                false
            });

            if !((info.sender == admin) || (owner.is_ok() && info.sender == owner?) || is_included)
            {
                Err(ContractError::Unauthorized)?;
            }
        }
        AuthType::AdminOrSpecified { allowlist } => {
            let is_included = allowlist.iter().any(|some_address| {
                if let Some(x) = some_address {
                    if info.sender == x {
                        return true;
                    }
                }

                false
            });

            if !((info.sender == admin) || is_included) {
                Err(ContractError::Unauthorized)?;
            }
        }
    };

    Ok(())
}

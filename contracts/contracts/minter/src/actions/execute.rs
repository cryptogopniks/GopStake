use cosmwasm_std::{
    coin, Addr, BankMsg, Coin, CosmosMsg, DepsMut, Env, MessageInfo, Order, Response, StdError,
    StdResult, Uint128,
};

use injective_std::types::{
    cosmos::bank::v1beta1::{DenomUnit as InjectiveDenomUnit, Metadata as InjectiveMetadata},
    injective::tokenfactory::v1beta1 as InjectiveFactory,
};

use osmosis_std::types::{
    cosmos::bank::v1beta1::{DenomUnit as OsmosisDenomUnit, Metadata as OsmosisMetadata},
    osmosis::tokenfactory::v1beta1 as OsmosisFactory,
};

use gopstake_base::{
    error::ContractError,
    minter::{
        state::{CONFIG, TOKENS},
        types::{Config, DenomUnit, FactoryType, Metadata},
    },
    utils::{add_attr, nonpayable, one_coin, unwrap_field, validate_attr, Attrs},
};

pub fn try_create_denom(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    subdenom: String,
) -> Result<Response, ContractError> {
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

    let Config { factory_type, .. } = CONFIG.load(deps.storage)?;
    let factory_type = unwrap_field(factory_type, "factory_type")?;

    let msg: CosmosMsg = match factory_type {
        FactoryType::Osmosis => OsmosisFactory::MsgCreateDenom {
            sender: creator.to_string(),
            subdenom,
        }
        .into(),
        FactoryType::Injective => InjectiveFactory::MsgCreateDenom {
            sender: creator.to_string(),
            subdenom,
        }
        .into(),
    };

    Ok(Response::new()
        .add_message(msg)
        .add_attributes([("action", "try_create_denom")]))
}

pub fn try_mint_tokens(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    denom: String,
    amount: Uint128,
    mint_to_address: String,
) -> Result<Response, ContractError> {
    // verify funds
    nonpayable(&info).map_err(|e| StdError::GenericErr { msg: e.to_string() })?;

    let owner_and_denoms = TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .find(|(_, tokens)| tokens.contains(&denom));
    let owner_and_denoms = unwrap_field(owner_and_denoms, "owner_and_denoms");

    let Config {
        staking_platform,
        factory_type,
        ..
    } = CONFIG.load(deps.storage)?;
    let staking_platform = unwrap_field(staking_platform, "staking_platform");
    let factory_type = unwrap_field(factory_type, "factory_type")?;

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
        match factory_type {
            FactoryType::Osmosis => OsmosisFactory::MsgMint {
                sender: creator.to_string(),
                amount: Some(amount.clone().into()),
                mint_to_address: creator.to_string(),
            }
            .into(),
            FactoryType::Injective => InjectiveFactory::MsgMint {
                sender: creator.to_string(),
                amount: Some(amount.clone().into()),
            }
            .into(),
        },
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
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    // verify funds
    let Coin { amount, denom } = one_coin(&info)?;

    let owner_and_denoms = TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .flatten()
        .find(|(_, tokens)| tokens.contains(&denom));

    if owner_and_denoms.is_none() {
        Err(ContractError::AssetIsNotFound)?;
    }

    let Config { factory_type, .. } = CONFIG.load(deps.storage)?;
    let factory_type = unwrap_field(factory_type, "factory_type")?;

    let creator = &env.contract.address;
    let amount = coin(amount.u128(), denom);

    let msg: CosmosMsg = match factory_type {
        FactoryType::Osmosis => OsmosisFactory::MsgBurn {
            sender: creator.to_string(),
            amount: Some(amount.into()),
            burn_from_address: creator.to_string(),
        }
        .into(),
        FactoryType::Injective => InjectiveFactory::MsgBurn {
            sender: creator.to_string(),
            amount: Some(amount.into()),
        }
        .into(),
    };

    Ok(Response::new()
        .add_message(msg)
        .add_attributes([("action", "try_burn_tokens")]))
}

pub fn try_set_metadata(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    metadata: Metadata,
) -> Result<Response, ContractError> {
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

    let Config { factory_type, .. } = CONFIG.load(deps.storage)?;
    let factory_type = unwrap_field(factory_type, "factory_type")?;

    let sender = env.contract.address.to_string();
    let Metadata {
        description,
        denom_units,
        base,
        display,
        name,
        symbol,
        uri,
        uri_hash,
    } = metadata;

    let msg: CosmosMsg = match factory_type {
        FactoryType::Osmosis => OsmosisFactory::MsgSetDenomMetadata {
            sender,
            metadata: Some(OsmosisMetadata {
                description,
                denom_units: denom_units
                    .into_iter()
                    .map(
                        |DenomUnit {
                             denom,
                             exponent,
                             aliases,
                         }| OsmosisDenomUnit {
                            aliases,
                            denom,
                            exponent,
                        },
                    )
                    .collect(),
                base,
                display,
                name,
                symbol,
            }),
        }
        .into(),
        FactoryType::Injective => InjectiveFactory::MsgSetDenomMetadata {
            sender,
            metadata: Some(InjectiveMetadata {
                description,
                denom_units: denom_units
                    .into_iter()
                    .map(
                        |DenomUnit {
                             denom,
                             exponent,
                             aliases,
                         }| InjectiveDenomUnit {
                            aliases,
                            denom,
                            exponent,
                        },
                    )
                    .collect(),
                base,
                display,
                name,
                symbol,
                uri: unwrap_field(uri, "uri")?,
                uri_hash: unwrap_field(uri_hash, "uri_hash")?,
            }),
        }
        .into(),
    };

    Ok(Response::new()
        .add_message(msg)
        .add_attributes([("action", "try_set_metadata")]))
}

pub fn try_update_config(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    staking_platform: Option<String>,
    factory_type: Option<FactoryType>,
) -> Result<Response, ContractError> {
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
        config.factory_type = add_attr(&mut attrs, "factory_type", &factory_type)?;

        Ok(config)
    })?;

    Ok(Response::new().add_attributes(attrs))
}

fn get_full_denom(creator: &Addr, subdenom: &str) -> String {
    format!("factory/{creator}/{subdenom}")
}

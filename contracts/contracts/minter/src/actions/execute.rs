use cosmwasm_std::{
    coin, Addr, BankMsg, Coin, CosmosMsg, DepsMut, Env, MessageInfo, Order, Response, StdResult,
    Uint128,
};

use osmosis_std::types::{
    cosmos::bank::v1beta1::{DenomUnit as OsmosisDenomUnit, Metadata as OsmosisMetadata},
    osmosis::tokenfactory::v1beta1 as OsmosisFactory,
};

use gopstake_base::{
    error::ContractError,
    minter::{
        state::{CONFIG, TOKENS},
        types::{Config, DenomUnit, Metadata},
    },
    utils::{nonpayable, one_coin, unwrap_field, validate_attr, Attrs},
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

    let msg: CosmosMsg = OsmosisFactory::MsgCreateDenom {
        sender: creator.to_string(),
        subdenom,
    }
    .into();

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

    let creator = &env.contract.address;
    let amount = coin(amount.u128(), denom);

    let msg_list = vec![
        OsmosisFactory::MsgMint {
            sender: creator.to_string(),
            amount: Some(amount.clone().into()),
            mint_to_address: creator.to_string(),
        }
        .into(),
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

    let creator = &env.contract.address;
    let amount = coin(amount.u128(), denom);

    let msg: CosmosMsg = OsmosisFactory::MsgBurn {
        sender: creator.to_string(),
        amount: Some(amount.into()),
        burn_from_address: creator.to_string(),
    }
    .into();

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

    if owner_and_denoms.is_ok() && (info.sender != owner_and_denoms?.0) {
        Err(ContractError::Unauthorized)?;
    }

    let sender = env.contract.address.to_string();
    let Metadata {
        description,
        denom_units,
        base,
        display,
        name,
        symbol,
        ..
    } = metadata;

    let msg: CosmosMsg = OsmosisFactory::MsgSetDenomMetadata {
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
    .into();

    Ok(Response::new()
        .add_message(msg)
        .add_attributes([("action", "try_set_metadata")]))
}

pub fn try_update_config(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    staking_platform: Option<String>,
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

        config.staking_platform =
            validate_attr(&mut attrs, api, "staking_platform", &staking_platform)?;

        Ok(config)
    })?;

    Ok(Response::new().add_attributes(attrs))
}

fn get_full_denom(creator: &Addr, subdenom: &str) -> String {
    format!("factory/{creator}/{subdenom}")
}

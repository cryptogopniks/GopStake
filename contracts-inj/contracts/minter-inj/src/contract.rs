#[cfg(not(feature = "library"))]
use cosmwasm_std::{
    entry_point, to_binary, Binary, Deps, DepsMut, Env, MessageInfo, Reply, Response, StdResult,
};

use injective_cosmwasm::{InjectiveMsgWrapper, InjectiveQueryWrapper};

use crate::{
    error::ContractError,
    msg::{ExecuteMsg, InstantiateMsg, MigrateMsg, QueryMsg},
};

use crate::actions::{
    execute::{
        try_burn_tokens, try_create_denom, try_mint_tokens, try_set_metadata, try_update_config,
    },
    instantiate::try_instantiate,
    other::migrate_contract,
    query::{query_config, query_denoms_by_creator},
};

/// Creates a new contract with the specified parameters packed in the "msg" variable
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    try_instantiate(deps, env, info, msg)
}

/// Exposes all the execute functions available in the contract
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut<InjectiveQueryWrapper>,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    match msg {
        ExecuteMsg::CreateDenom {
            token_owner,
            subdenom,
        } => try_create_denom(deps, env, info, token_owner, subdenom),
        ExecuteMsg::MintTokens {
            denom,
            amount,
            mint_to_address,
        } => try_mint_tokens(deps, env, info, denom, amount, mint_to_address),
        ExecuteMsg::BurnTokens {} => try_burn_tokens(deps, env, info),
        ExecuteMsg::SetMetadata { metadata } => try_set_metadata(deps, env, info, metadata),
        ExecuteMsg::UpdateConfig {
            owner,
            staking_platform,
        } => try_update_config(deps, env, info, owner, staking_platform),
    }
}

/// Exposes all the queries available in the contract
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::DenomsByCreator { creator } => {
            to_binary(&query_denoms_by_creator(deps, env, creator)?)
        }
        QueryMsg::QueryConfig {} => to_binary(&query_config(deps, env)?),
    }
}

/// Exposes all the replies available in the contract
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn reply(
    _deps: DepsMut,
    _env: Env,
    reply: Reply,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    let Reply { id: _, result: _ } = reply;

    Err(ContractError::UndefinedReplyId)
}

/// Used for contract migration
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn migrate(
    deps: DepsMut,
    env: Env,
    msg: MigrateMsg,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    migrate_contract(deps, env, msg)
}

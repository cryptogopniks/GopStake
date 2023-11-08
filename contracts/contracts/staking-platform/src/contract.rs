#[cfg(not(feature = "library"))]
use cosmwasm_std::{
    entry_point, from_json, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Reply,
    Response, StdResult,
};

use cw20::Cw20ReceiveMsg;

use gopstake_base::{
    error::ContractError,
    staking_platform::msg::{ExecuteMsg, InstantiateMsg, MigrateMsg, QueryMsg},
};

use crate::actions::{
    execute::{
        try_accept_proposal, try_claim_staking_rewards, try_create_proposal, try_deposit_tokens,
        try_distribute_funds, try_reject_proposal, try_remove_collection, try_stake, try_unstake,
        try_update_config, try_withdraw_tokens,
    },
    instantiate::try_instantiate,
    other::migrate_contract,
    query::{
        query_associated_balances, query_collections, query_collections_balances, query_config,
        query_funds, query_proposals, query_stakers, query_staking_rewards,
    },
};

/// Creates a new contract with the specified parameters packed in the "msg" variable
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    try_instantiate(deps, env, info, msg)
}

/// Exposes all the execute functions available in the contract
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Stake {
            collections_to_stake,
        } => try_stake(deps, env, info, collections_to_stake),
        ExecuteMsg::Unstake {
            collections_to_unstake,
        } => try_unstake(deps, env, info, collections_to_unstake),
        ExecuteMsg::ClaimStakingRewards {} => try_claim_staking_rewards(deps, env, info),
        ExecuteMsg::UpdateConfig { owner, minter } => {
            try_update_config(deps, env, info, owner, minter)
        }
        ExecuteMsg::DistributeFunds {
            address_and_weight_list,
        } => try_distribute_funds(deps, env, info, address_and_weight_list),
        ExecuteMsg::RemoveCollection { address } => try_remove_collection(deps, env, info, address),
        ExecuteMsg::CreateProposal { proposal } => try_create_proposal(deps, env, info, proposal),
        ExecuteMsg::RejectProposal { id } => try_reject_proposal(deps, env, info, id),
        ExecuteMsg::AcceptProposal { id } => try_accept_proposal(deps, env, info, id, None, None),
        ExecuteMsg::DepositTokens { collection_address } => {
            try_deposit_tokens(deps, env, info, collection_address, None, None)
        }
        ExecuteMsg::WithdrawTokens {
            collection_address,
            amount,
        } => try_withdraw_tokens(deps, env, info, collection_address, amount),
        ExecuteMsg::Receive(Cw20ReceiveMsg {
            sender,
            amount,
            msg,
        }) => match from_json(msg)? {
            ExecuteMsg::AcceptProposal { id } => {
                try_accept_proposal(deps, env, info, id, Some(sender), Some(amount))
            }
            ExecuteMsg::DepositTokens { collection_address } => try_deposit_tokens(
                deps,
                env,
                info,
                collection_address,
                Some(sender),
                Some(amount),
            ),
            _ => Err(ContractError::WrongMessageType)?,
        },
    }
}

/// Exposes all the queries available in the contract
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::QueryConfig {} => to_json_binary(&query_config(deps, env)?),
        QueryMsg::QueryFunds {} => to_json_binary(&query_funds(deps, env)?),
        QueryMsg::QueryStakers { addresses } => {
            to_json_binary(&query_stakers(deps, env, addresses)?)
        }
        QueryMsg::QueryStakingRewards { address } => {
            to_json_binary(&query_staking_rewards(deps, env, address)?)
        }
        QueryMsg::QueryAssociatedBalances { address } => {
            to_json_binary(&query_associated_balances(deps, env, address)?)
        }
        QueryMsg::QueryProposals { last_amount } => {
            to_json_binary(&query_proposals(deps, env, last_amount)?)
        }
        QueryMsg::QueryCollections { addresses } => {
            to_json_binary(&query_collections(deps, env, addresses)?)
        }
        QueryMsg::QueryCollectionsBalances { addresses } => {
            to_json_binary(&query_collections_balances(deps, env, addresses)?)
        }
    }
}

/// Exposes all the replies available in the contract
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn reply(_deps: DepsMut, _env: Env, reply: Reply) -> Result<Response, ContractError> {
    let Reply { id: _, result: _ } = reply;

    Err(ContractError::UndefinedReplyId)
}

/// Used for contract migration
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn migrate(deps: DepsMut, env: Env, msg: MigrateMsg) -> Result<Response, ContractError> {
    migrate_contract(deps, env, msg)
}

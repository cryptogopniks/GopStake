use cosmwasm_std::{DepsMut, Env, Response};

use gopstake_base::{error::ContractError, staking_platform::msg::MigrateMsg};

pub fn migrate_contract(
    _deps: DepsMut,
    _env: Env,
    _msg: MigrateMsg,
) -> Result<Response, ContractError> {
    Ok(Response::new())
}
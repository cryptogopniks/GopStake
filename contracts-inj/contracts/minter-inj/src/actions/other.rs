use cosmwasm_std::{DepsMut, Env, Response};

use injective_cosmwasm::InjectiveMsgWrapper;

use crate::{error::ContractError, msg::MigrateMsg};

pub fn migrate_contract(
    _deps: DepsMut,
    _env: Env,
    _msg: MigrateMsg,
) -> Result<Response<InjectiveMsgWrapper>, ContractError> {
    Ok(Response::new())
}

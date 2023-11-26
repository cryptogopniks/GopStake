use cosmwasm_std::{DepsMut, Env, Response, StdError};
use cw2::{get_contract_version, set_contract_version};

use semver::Version;

use gopstake_base::{
    error::ContractError,
    staking_platform::{msg::MigrateMsg, state},
};

pub fn migrate_contract(
    deps: DepsMut,
    _env: Env,
    msg: MigrateMsg,
) -> Result<Response, ContractError> {
    let version_previous: Version = get_contract_version(deps.storage)?
        .version
        .parse()
        .map_err(|_| StdError::generic_err("Parsing previous version error!"))?;

    let version_new: Version = env!("CARGO_PKG_VERSION")
        .parse()
        .map_err(|_| StdError::generic_err("Parsing new version error!"))?;

    let version_from_msg = &msg.version;

    if &version_new.to_string() != version_from_msg {
        Err(StdError::generic_err(
            "Msg version is not equal contract new version!",
        ))?;
    }

    if version_new >= version_previous {
        set_contract_version(deps.storage, state::CONTRACT_NAME, version_new.to_string())?;
    }

    Ok(Response::new())
}

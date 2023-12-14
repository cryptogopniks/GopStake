use cosmwasm_std::{Deps, Env, StdResult};

use crate::{
    state::{CONFIG, TOKENS},
    types::{Config, QueryDenomsFromCreatorResponse},
};

pub fn query_denoms_by_creator(
    deps: Deps,
    _env: Env,
    creator: String,
) -> StdResult<QueryDenomsFromCreatorResponse> {
    let creator = deps.api.addr_validate(&creator)?;
    let denoms = TOKENS.load(deps.storage, &creator).unwrap_or_default();
    Ok(QueryDenomsFromCreatorResponse { denoms })
}

pub fn query_config(deps: Deps, _env: Env) -> StdResult<Config> {
    CONFIG.load(deps.storage)
}

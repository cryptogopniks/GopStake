use cosmwasm_schema::cw_serde;
use cosmwasm_std::Addr;

#[cw_serde]
pub struct DenomUnit {
    pub denom: String,
    pub exponent: u32,
    pub aliases: Vec<String>,
}

#[cw_serde]
pub struct Metadata {
    pub description: String,
    pub denom_units: Vec<DenomUnit>,
    pub base: String,
    pub display: String,
    pub name: String,
    pub symbol: String,
    pub uri: Option<String>,
    pub uri_hash: Option<String>,
}

#[cw_serde]
pub struct Config {
    pub admin: Addr,
    pub staking_platform: Option<Addr>,
}

impl Config {
    pub fn new(admin: &Addr, staking_platform: &Option<Addr>) -> Self {
        Self {
            admin: admin.to_owned(),
            staking_platform: staking_platform.to_owned(),
        }
    }
}

#[cw_serde]
pub struct QueryDenomsFromCreatorResponse {
    pub denoms: Vec<String>,
}

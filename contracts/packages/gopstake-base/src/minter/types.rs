use cosmwasm_schema::cw_serde;
use cosmwasm_std::Addr;

use crate::constants::CHAIN_ID_DEV;

#[cw_serde]
pub enum FactoryType {
    Osmosis,
    Injective,
}

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
    pub factory_type: Option<FactoryType>,
    chain_id_dev: String,
}

impl Config {
    pub fn new(
        admin: &Addr,
        staking_platform: &Option<Addr>,
        factory_type: &Option<FactoryType>,
    ) -> Self {
        Self {
            admin: admin.to_owned(),
            staking_platform: staking_platform.to_owned(),
            factory_type: factory_type.to_owned(),
            chain_id_dev: String::from(CHAIN_ID_DEV),
        }
    }

    pub fn get_chain_id(&self) -> String {
        self.chain_id_dev.clone()
    }
}

#[cw_serde]
pub struct QueryDenomsFromCreatorResponse {
    pub denoms: Vec<String>,
}

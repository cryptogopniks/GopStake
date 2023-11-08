use cosmwasm_schema::cw_serde;
use cosmwasm_std::Addr;

pub use osmosis_std::types::cosmos::bank::v1beta1::Metadata;

use crate::constants::CHAIN_ID_DEV;

#[cw_serde]
pub struct Config {
    pub admin: Addr,
    pub staking_platform: Option<Addr>,
    chain_id_dev: String,
}

impl Config {
    pub fn new(admin: &Addr, staking_platform: &Option<Addr>) -> Self {
        Self {
            admin: admin.to_owned(),
            staking_platform: staking_platform.to_owned(),
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

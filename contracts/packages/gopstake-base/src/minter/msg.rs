use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Uint128;

use osmosis_std::types::cosmos::bank::v1beta1::Metadata;

#[cw_serde]
pub struct InstantiateMsg {
    pub staking_platform: Option<String>,
}

#[cw_serde]
pub enum ExecuteMsg {
    // staking-platform, user
    CreateDenom {
        subdenom: String,
    },

    MintTokens {
        denom: String,
        amount: Uint128,
        mint_to_address: String,
    },

    BurnTokens {},

    SetMetadata {
        metadata: Metadata,
    },

    // admin
    UpdateConfig {
        staking_platform: Option<String>,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(crate::minter::types::QueryDenomsFromCreatorResponse)]
    DenomsByCreator { creator: String },

    #[returns(crate::minter::types::Config)]
    QueryConfig {},
}

#[cw_serde]
pub enum MigrateMsg {}

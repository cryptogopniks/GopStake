use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Addr, Decimal, Uint128};

use cw20::Cw20ReceiveMsg;

use crate::{
    assets::{Funds, Token, TokenUnverified},
    staking_platform::types::{Collection, Proposal, StakedCollectionInfo},
};

#[cw_serde]
pub struct InstantiateMsg {
    pub owner: Option<String>,
    pub minter: Option<String>,
}

#[cw_serde]
pub enum ExecuteMsg {
    // stakers
    Stake {
        collections_to_stake: Vec<StakedCollectionInfo<String>>,
    },

    Unstake {
        collections_to_unstake: Vec<StakedCollectionInfo<String>>,
    },

    ClaimStakingRewards {},

    // admin
    UpdateConfig {
        owner: Option<String>,
        minter: Option<String>,
    },

    // admin, owner
    DistributeFunds {
        address_and_weight_list: Vec<(String, Decimal)>,
    },

    RemoveCollection {
        address: String,
    },

    CreateProposal {
        proposal: Proposal<String, TokenUnverified>,
    },

    RejectProposal {
        id: Uint128,
    },

    // projects
    AcceptProposal {
        id: Uint128,
    },

    DepositTokens {
        collection_address: String,
    },

    WithdrawTokens {
        collection_address: String,
        amount: Uint128,
    },

    Receive(Cw20ReceiveMsg),
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(crate::staking_platform::types::Config)]
    QueryConfig {},

    #[returns(Vec<crate::assets::Funds<crate::assets::Token>>)]
    QueryFunds {},

    #[returns(Vec<QueryStakersResponseItem>)]
    QueryStakers { addresses: Option<Vec<String>> },

    #[returns(BalancesResponseItem)]
    QueryStakingRewards { address: String },

    #[returns(BalancesResponseItem)]
    QueryAssociatedBalances { address: String },

    #[returns(Vec<QueryProposalsResponseItem>)]
    QueryProposals { last_amount: Option<Uint128> },

    #[returns(Vec<QueryCollectionsResponseItem>)]
    QueryCollections { addresses: Option<Vec<String>> },

    #[returns(Vec<QueryCollectionsBalancesResponseItem>)]
    QueryCollectionsBalances { addresses: Option<Vec<String>> },
}

#[cw_serde]
pub struct QueryStakersResponseItem {
    pub staker_address: Addr,
    pub staked_collection_info_list: Vec<StakedCollectionInfo<Addr>>,
}

#[cw_serde]
pub struct BalancesResponseItem {
    pub staker_address: Addr,
    pub funds_list: Vec<Funds<Token>>,
}

#[cw_serde]
pub struct QueryProposalsResponseItem {
    pub id: Uint128,
    pub proposal: Proposal<Addr, Token>,
}

#[cw_serde]
pub struct QueryCollectionsResponseItem {
    pub address: Addr,
    pub collection: Collection<Addr, Token>,
}

#[cw_serde]
pub struct QueryCollectionsBalancesResponseItem {
    pub address: Addr,
    pub funds: Funds<Token>,
}

#[cw_serde]
pub enum MigrateMsg {}

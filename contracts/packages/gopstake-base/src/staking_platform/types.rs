use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Decimal, Timestamp, Uint128};

use crate::{
    assets::{Currency, Funds, Token},
    constants::CHAIN_ID_DEV,
};

#[cw_serde]
pub struct Collection<A: ToString, T: From<Token>> {
    pub name: String,
    /// In case of minting distribution the token must be created with Minter
    /// before creating proposal
    pub staking_currency: Currency<T>,
    /// Amount of tokens per 24 h for single staked NFT
    pub daily_rewards: Decimal,
    /// Staking token can be taken from funds deposited to Collection balance (Spending)
    /// or minted by Minter contract (Minting)
    pub emission_type: EmissionType,
    /// Need to specify owner address to prevent accepting proposals with wrong parameters
    /// by bad actors
    pub owner: A,
}

#[cw_serde]
pub enum EmissionType {
    Spending,
    Minting,
}

impl EmissionType {
    pub fn is_spending(&self) -> bool {
        match self {
            Self::Spending => true,
            Self::Minting => false,
        }
    }
}

#[cw_serde]
pub struct Proposal<A: ToString, T: From<Token>> {
    pub proposal_status: Option<ProposalStatus>,
    pub proposal_type: ProposalType<A, T>,
    /// Such logic of adding collections allows to propose listing price for each collection
    pub price: Funds<T>,
}

#[cw_serde]
pub enum ProposalStatus {
    Active,
    Accepted,
    Rejected,
}

#[cw_serde]
pub enum ProposalType<A: ToString, T: From<Token>> {
    AddCollection {
        collection_address: A,
        collection: Collection<A, T>,
    },
    UpdateCollection {
        collection_address: A,
        new_collection_address: Option<A>,
        new_collection: Collection<A, T>,
    },
}

#[cw_serde]
pub struct StakedCollectionInfo<A: ToString> {
    pub collection_address: A,
    pub staked_token_info_list: Vec<StakedTokenInfo>,
}

#[cw_serde]
pub struct StakedTokenInfo {
    pub token_id: Uint128,
    /// It's possible to make a snapshot thanks to this field
    pub staking_start_date: Option<Timestamp>,
    pub last_claim_date: Option<Timestamp>,
}

#[cw_serde]
pub struct Config {
    pub admin: Addr,
    pub owner: Option<Addr>,
    pub minter: Option<Addr>,
    chain_id_dev: String,
}

impl Config {
    pub fn new(admin: &Addr, owner: &Option<Addr>, minter: &Option<Addr>) -> Self {
        Self {
            admin: admin.to_owned(),
            owner: owner.to_owned(),
            minter: minter.to_owned(),
            chain_id_dev: String::from(CHAIN_ID_DEV),
        }
    }

    pub fn get_chain_id(&self) -> String {
        self.chain_id_dev.clone()
    }
}

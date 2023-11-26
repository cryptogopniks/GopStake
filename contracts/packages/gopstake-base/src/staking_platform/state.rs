use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};

use crate::{
    assets::{Funds, Token},
    staking_platform::types::{Collection, Config, Proposal, StakedCollectionInfo},
};

pub const CONTRACT_NAME: &str = "crates.io:gopstake-staking-platform";

pub const CONFIG: Item<Config> = Item::new("config");
pub const FUNDS: Item<Vec<Funds<Token>>> = Item::new("funds");
pub const PROPOSAL_COUNTER: Item<u128> = Item::new("proposal counter");

pub const PROPOSALS: Map<u128, Proposal<Addr, Token>> = Map::new("proposal by id");
pub const COLLECTIONS: Map<&Addr, Collection<Addr, Token>> = Map::new("collection by address");
pub const COLLECTIONS_BALANCES: Map<&Addr, Funds<Token>> =
    Map::new("collection balance by address");
pub const STAKERS: Map<&Addr, Vec<StakedCollectionInfo<Addr>>> = Map::new("staker by address");

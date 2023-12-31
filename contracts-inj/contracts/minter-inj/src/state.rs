use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};

use crate::types::Config;

pub const CONTRACT_NAME: &str = "crates.io:cryptogopniks-minter-inj";

pub const CONFIG: Item<Config> = Item::new("config");

pub const TOKENS: Map<&Addr, Vec<String>> = Map::new("token by owner address");

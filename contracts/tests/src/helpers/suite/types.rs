use cosmwasm_std::{Addr, Binary, Decimal, StdResult};
use cw_multi_test::AppResponse;

use anyhow::Error;
use strum_macros::{Display, EnumIter, IntoStaticStr};

use gopstake_base::{assets::Token, converters::str_to_dec, math::P6};

pub const DEFAULT_FUNDS_AMOUNT: u128 = 1; // give each user 1 asset (1 CRD, 1 INJ, etc.)
pub const INCREASED_FUNDS_AMOUNT: u128 = 100 * P6; // give admin such amount of assets to ensure providing 1e6 of assets to each pair

pub const DEFAULT_DECIMALS: u8 = 6;
pub const INCREASED_DECIMALS: u8 = 18;

#[derive(Debug, Clone, Copy, Display, IntoStaticStr, EnumIter)]
pub enum ProjectAccount {
    #[strum(serialize = "admin")]
    Admin,
    #[strum(serialize = "alice")]
    Alice,
    #[strum(serialize = "bob")]
    Bob,
    #[strum(serialize = "owner")]
    Owner,
}

impl ProjectAccount {
    pub fn get_initial_funds_amount(&self) -> u128 {
        match self {
            ProjectAccount::Admin => INCREASED_FUNDS_AMOUNT,
            ProjectAccount::Alice => DEFAULT_FUNDS_AMOUNT,
            ProjectAccount::Bob => DEFAULT_FUNDS_AMOUNT,
            ProjectAccount::Owner => DEFAULT_FUNDS_AMOUNT,
        }
    }
}

#[derive(Debug, Clone, Copy, Display, IntoStaticStr, EnumIter)]
pub enum ProjectCoin {
    #[strum(serialize = "ucrd")]
    Denom,
    #[strum(serialize = "unoria")]
    Noria,
}

#[derive(Debug, Clone, Copy, Display, IntoStaticStr, EnumIter)]
pub enum ProjectToken {
    #[strum(serialize = "contract0")]
    Atom,
    #[strum(serialize = "contract1")]
    Luna,
    #[strum(serialize = "contract2")]
    Inj,
}

#[derive(Debug, Clone, Copy, Display, IntoStaticStr, EnumIter)]
pub enum ProjectNft {
    #[strum(serialize = "contract3")]
    Gopniks,
    #[strum(serialize = "contract4")]
    Pinjeons,
}

pub trait GetPrice {
    fn get_price(&self) -> Decimal;
}

impl GetPrice for ProjectAsset {
    fn get_price(&self) -> Decimal {
        match self {
            ProjectAsset::Coin(project_coin) => project_coin.get_price(),
            ProjectAsset::Token(project_token) => project_token.get_price(),
        }
    }
}

impl GetPrice for ProjectCoin {
    fn get_price(&self) -> Decimal {
        match self {
            ProjectCoin::Denom => str_to_dec("1"),
            ProjectCoin::Noria => str_to_dec("2"),
        }
    }
}

impl GetPrice for ProjectToken {
    fn get_price(&self) -> Decimal {
        match self {
            ProjectToken::Atom => str_to_dec("10"),
            ProjectToken::Luna => str_to_dec("0.5"),
            ProjectToken::Inj => str_to_dec("5"),
        }
    }
}

pub trait GetDecimals {
    fn get_decimals(&self) -> u8;
}

impl GetDecimals for ProjectAsset {
    fn get_decimals(&self) -> u8 {
        match self {
            ProjectAsset::Coin(project_coin) => project_coin.get_decimals(),
            ProjectAsset::Token(project_token) => project_token.get_decimals(),
        }
    }
}

impl GetDecimals for ProjectCoin {
    fn get_decimals(&self) -> u8 {
        match self {
            ProjectCoin::Denom => DEFAULT_DECIMALS,
            ProjectCoin::Noria => DEFAULT_DECIMALS,
        }
    }
}

impl GetDecimals for ProjectToken {
    fn get_decimals(&self) -> u8 {
        match self {
            ProjectToken::Atom => DEFAULT_DECIMALS,
            ProjectToken::Luna => DEFAULT_DECIMALS,
            ProjectToken::Inj => INCREASED_DECIMALS,
        }
    }
}

impl From<ProjectAccount> for Addr {
    fn from(project_account: ProjectAccount) -> Self {
        Self::unchecked(project_account.to_string())
    }
}

impl From<ProjectToken> for Addr {
    fn from(project_token: ProjectToken) -> Self {
        Addr::unchecked(project_token.to_string())
    }
}

impl From<ProjectNft> for Addr {
    fn from(project_nft: ProjectNft) -> Self {
        Addr::unchecked(project_nft.to_string())
    }
}

impl From<ProjectCoin> for Token {
    fn from(project_coin: ProjectCoin) -> Self {
        Self::new_native(&project_coin.to_string())
    }
}

impl From<ProjectToken> for Token {
    fn from(project_token: ProjectToken) -> Self {
        Self::new_cw20(&project_token.into())
    }
}

#[derive(Debug, Clone, Copy, Display)]
pub enum ProjectAsset {
    Coin(ProjectCoin),
    Token(ProjectToken),
}

impl From<ProjectCoin> for ProjectAsset {
    fn from(project_coin: ProjectCoin) -> Self {
        Self::Coin(project_coin)
    }
}

impl From<ProjectToken> for ProjectAsset {
    fn from(project_token: ProjectToken) -> Self {
        Self::Token(project_token)
    }
}

#[derive(Debug, Clone, Copy, EnumIter)]
pub enum ProjectPair {
    AtomLuna,
    DenomInj,
    DenomLuna,
    DenomNoria,
}

impl ProjectPair {
    pub fn split_pair(&self) -> (ProjectAsset, ProjectAsset) {
        match self {
            ProjectPair::AtomLuna => (ProjectToken::Atom.into(), ProjectToken::Luna.into()),
            ProjectPair::DenomInj => (ProjectCoin::Denom.into(), ProjectToken::Inj.into()),
            ProjectPair::DenomLuna => (ProjectCoin::Denom.into(), ProjectToken::Luna.into()),
            ProjectPair::DenomNoria => (ProjectCoin::Denom.into(), ProjectCoin::Noria.into()),
        }
    }
}

#[derive(Debug)]
pub enum WrappedResponse {
    Execute(Result<AppResponse, Error>),
    Query(StdResult<Binary>),
}

impl From<Result<AppResponse, Error>> for WrappedResponse {
    fn from(exec_res: Result<AppResponse, Error>) -> Self {
        Self::Execute(exec_res)
    }
}

impl From<StdResult<Binary>> for WrappedResponse {
    fn from(query_res: StdResult<Binary>) -> Self {
        Self::Query(query_res)
    }
}

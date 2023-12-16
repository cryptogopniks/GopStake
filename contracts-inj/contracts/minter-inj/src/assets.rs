use cosmwasm_std::{Addr, Deps, StdResult, Uint128};

use cosmwasm_schema::cw_serde;

use crate::error::ContractError;

#[cw_serde]
pub enum Token {
    Native { denom: String },
    Cw20 { address: Addr },
}

impl Token {
    pub fn new_native(denom: &str) -> Self {
        Self::Native {
            denom: denom.to_string(),
        }
    }

    pub fn new_cw20(address: &Addr) -> Self {
        Self::Cw20 {
            address: address.to_owned(),
        }
    }

    pub fn is_native(&self) -> bool {
        match self {
            Self::Native { denom: _ } => true,
            Self::Cw20 { address: _ } => false,
        }
    }

    pub fn try_get_native(&self) -> StdResult<String> {
        match self {
            Self::Native { denom } => Ok(denom.to_string()),
            Self::Cw20 { address: _ } => Err(ContractError::AssetIsNotFound)?,
        }
    }

    pub fn try_get_cw20(&self) -> StdResult<Addr> {
        match self {
            Self::Native { denom: _ } => Err(ContractError::AssetIsNotFound)?,
            Self::Cw20 { address } => Ok(address.to_owned()),
        }
    }
}

impl From<String> for Token {
    fn from(denom: String) -> Self {
        Self::Native { denom }
    }
}

impl From<Addr> for Token {
    fn from(address: Addr) -> Self {
        Self::Cw20 { address }
    }
}

#[cw_serde]
pub enum TokenUnverified {
    Native { denom: String },
    Cw20 { address: String },
}

impl TokenUnverified {
    pub fn new_native(denom: &str) -> Self {
        Self::Native {
            denom: denom.to_string(),
        }
    }

    pub fn new_cw20(address: &str) -> Self {
        Self::Cw20 {
            address: address.to_string(),
        }
    }

    pub fn verify(&self, deps: &Deps) -> StdResult<Token> {
        match self {
            Self::Cw20 { address } => Ok(Token::new_cw20(
                &deps.api.addr_validate(&address.to_string())?,
            )),
            Self::Native { denom } => Ok(Token::new_native(denom)),
        }
    }

    pub fn get_symbol(&self) -> String {
        match self.to_owned() {
            TokenUnverified::Native { denom } => denom,
            TokenUnverified::Cw20 { address } => address,
        }
    }
}

impl From<Token> for TokenUnverified {
    fn from(token: Token) -> Self {
        match token {
            Token::Native { denom } => Self::Native { denom },
            Token::Cw20 { address } => Self::Cw20 {
                address: address.to_string(),
            },
        }
    }
}

#[cw_serde]
pub struct Currency<T: From<Token>> {
    pub token: T,
    pub decimals: u8,
}

impl<T: From<Token> + Clone> Currency<T> {
    pub fn new(denom_or_address: &T, decimals: u8) -> Self {
        Self {
            token: denom_or_address.to_owned(),
            decimals,
        }
    }
}

#[cw_serde]
pub struct Funds<T: From<Token>> {
    pub amount: Uint128,
    pub currency: Currency<T>,
}

impl<T: From<Token> + Clone> Funds<T> {
    pub fn new(amount: impl Into<Uint128> + Clone, currency: &Currency<T>) -> Self {
        Self {
            amount: amount.into(),
            currency: currency.to_owned(),
        }
    }
}

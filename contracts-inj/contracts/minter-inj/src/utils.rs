use std::fmt::Debug;

use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Api, Coin, Deps, MessageInfo, StdError, StdResult, Uint128};

use injective_cosmwasm::InjectiveQueryWrapper;

use crate::{assets::Token, error::ContractError};

#[cw_serde]
pub enum FundsType {
    Empty,
    Single {
        sender: Option<String>,
        amount: Option<Uint128>,
    },
}

#[cw_serde]
pub enum AuthType {
    Any,
    Admin,
    AdminOrOwner,
    Specified { allowlist: Vec<Option<Addr>> },
    AdminOrOwnerOrSpecified { allowlist: Vec<Option<Addr>> },
    AdminOrSpecified { allowlist: Vec<Option<Addr>> },
}

#[cw_serde]
pub struct Attrs {}

impl Attrs {
    pub fn init(action: &str) -> Vec<(String, String)> {
        vec![("action".to_string(), action.to_string())]
    }
}

pub fn add_attr<T: Debug + Clone>(
    attrs: &mut Vec<(String, String)>,
    attr: &str,
    field: &Option<T>,
) -> StdResult<Option<T>> {
    if let Some(x) = field {
        attrs.push((attr.to_string(), format!("{:#?}", x)));

        return Ok(Some(x.to_owned()));
    }

    Ok(None)
}

pub fn validate_attr(
    attrs: &mut Vec<(String, String)>,
    api: &dyn Api,
    attr: &str,
    field: &Option<String>,
) -> StdResult<Option<Addr>> {
    if let Some(x) = field {
        let value = api.addr_validate(x)?;

        attrs.push((attr.to_string(), value.to_string()));

        return Ok(Some(value));
    }

    Ok(None)
}

pub fn unwrap_field<T>(field: Option<T>, name: &str) -> Result<T, ContractError> {
    field.ok_or(ContractError::ParameterIsNotFound {
        value: name.to_string(),
    })
}

/// Returns (sender_address, asset_amount, asset_info) supporting both native and cw20 tokens \
/// Use FundsType::Empty to check if info.funds is empty \
/// Use FundsType::Single { sender: None, amount: None } to check native token \
/// Use FundsType::Single { sender: Some(msg.sender), amount: Some(msg.amount) } to check cw20 token
pub fn check_funds(
    deps: Deps<InjectiveQueryWrapper>,
    info: &MessageInfo,
    funds_type: FundsType,
) -> StdResult<(Addr, Uint128, Token)> {
    match funds_type {
        FundsType::Empty => {
            nonpayable(info)?;

            Ok((
                info.sender.clone(),
                Uint128::default(),
                Token::new_native(&String::default()),
            ))
        }
        FundsType::Single { sender, amount } => {
            if sender.is_none() || amount.is_none() {
                let Coin { denom, amount } = one_coin(info)?;

                Ok((info.sender.clone(), amount, Token::new_native(&denom)))
            } else {
                Ok((
                    deps.api.addr_validate(&sender.unwrap_or_default())?,
                    amount.unwrap_or_default(),
                    Token::new_cw20(&info.sender),
                ))
            }
        }
    }
}

/// If exactly one coin was sent, returns it regardless of denom.
/// Returns error if 0 or 2+ coins were sent
fn one_coin(info: &MessageInfo) -> StdResult<Coin> {
    if info.funds.len() == 1 {
        let coin = &info.funds[0];

        if !coin.amount.is_zero() {
            return Ok(coin.to_owned());
        }

        Err(StdError::generic_err("Coins amount is zero!"))?;
    }

    Err(StdError::generic_err("Amount of denoms is not equal 1!"))?
}

/// returns an error if any coins were sent
fn nonpayable(info: &MessageInfo) -> StdResult<()> {
    if !info.funds.is_empty() {
        Err(StdError::generic_err("This message does no accept funds!"))?;
    }

    Ok(())
}

pub fn filter_by_address_list<T: Clone>(
    api: &dyn Api,
    addresses: &Option<Vec<String>>,
    list: &Vec<(Addr, T)>,
) -> StdResult<Vec<(Addr, T)>> {
    if let Some(x) = addresses {
        let address_list = x
            .iter()
            .map(|y| -> StdResult<Addr> { api.addr_validate(y) })
            .collect::<StdResult<Vec<Addr>>>()?;

        return Ok(list
            .iter()
            .cloned()
            .filter(|(address, _)| address_list.contains(address))
            .collect::<Vec<(Addr, T)>>());
    }

    Ok(list.to_owned())
}

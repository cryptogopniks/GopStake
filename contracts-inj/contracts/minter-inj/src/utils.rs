use std::fmt::Debug;

use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Api, Coin, MessageInfo, StdError, StdResult};

use crate::error::ContractError;

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

/// If exactly one coin was sent, returns it regardless of denom.
/// Returns error if 0 or 2+ coins were sent
pub fn one_coin(info: &MessageInfo) -> StdResult<Coin> {
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
pub fn nonpayable(info: &MessageInfo) -> StdResult<()> {
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

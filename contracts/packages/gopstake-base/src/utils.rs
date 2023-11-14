use std::fmt::Debug;

use cosmwasm_schema::cw_serde;
use cosmwasm_std::{
    coin, to_json_binary, Addr, Api, BankMsg, Coin, CosmosMsg, MessageInfo, StdError, StdResult,
    Uint128, WasmMsg,
};

use crate::{assets::Token, error::ContractError};

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

pub fn add_funds_to_exec_msg(
    exec_msg: &WasmMsg,
    funds_list: &[(Uint128, Token)],
) -> StdResult<WasmMsg> {
    let mut native_tokens: Vec<Coin> = vec![];
    let mut cw20_tokens: Vec<(Uint128, Addr)> = vec![];

    for (amount, token) in funds_list.iter().cloned() {
        match token {
            Token::Native { denom } => {
                native_tokens.push(coin(amount.u128(), denom));
            }
            Token::Cw20 { address } => {
                cw20_tokens.push((amount, address));
            }
        }
    }

    match exec_msg {
        WasmMsg::Execute {
            contract_addr, msg, ..
        } => {
            // Case 1 `Deposit` - only native tokens
            if cw20_tokens.is_empty() {
                return Ok(WasmMsg::Execute {
                    contract_addr: contract_addr.to_string(),
                    msg: msg.to_owned(),
                    funds: native_tokens,
                });
            }

            // Case 2 `Swap` - only single cw20 token
            if (cw20_tokens.len() == 1) && native_tokens.is_empty() {
                let (amount, token_address) =
                    cw20_tokens.get(0).ok_or(ContractError::AssetIsNotFound)?;

                return Ok(WasmMsg::Execute {
                    contract_addr: token_address.to_string(),
                    msg: to_json_binary(&cw20::Cw20ExecuteMsg::Send {
                        contract: contract_addr.to_string(),
                        amount: amount.to_owned(),
                        msg: to_json_binary(&msg)?,
                    })?,
                    funds: vec![],
                });
            }

            Err(ContractError::WrongFundsCombination)?
        }
        _ => Err(ContractError::WrongActionType)?,
    }
}

pub fn get_transfer_msg(recipient: &Addr, amount: Uint128, token: &Token) -> StdResult<CosmosMsg> {
    Ok(match token {
        Token::Native { denom } => CosmosMsg::Bank(BankMsg::Send {
            to_address: recipient.to_string(),
            amount: vec![coin(amount.u128(), denom)],
        }),
        Token::Cw20 { address } => CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr: address.to_string(),
            msg: to_json_binary(&cw20::Cw20ExecuteMsg::Transfer {
                recipient: recipient.to_string(),
                amount: amount.to_owned(),
            })?,
            funds: vec![],
        }),
    })
}

/// returns (sender_address, asset_amount, asset_info) supporting both native and cw20 tokens
pub fn get_funds(
    api: &dyn Api,
    info: &MessageInfo,
    sender: &Option<String>,
    amount: &Option<Uint128>,
) -> StdResult<(Addr, Uint128, Token)> {
    let (sender_address, asset_amount, asset_info) = if sender.is_some() && amount.is_some() {
        (
            api.addr_validate(&sender.to_owned().unwrap())?,
            amount.unwrap(),
            Token::new_cw20(&info.sender),
        )
    } else {
        let Coin { denom, amount } = one_coin(info)?;

        (info.sender.clone(), amount, Token::new_native(&denom))
    };

    Ok((sender_address, asset_amount, asset_info))
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

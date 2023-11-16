use cosmwasm_std::StdError;
use thiserror::Error;

impl From<StdError> for ContractError {
    fn from(std_error: StdError) -> Self {
        Self::CustomError {
            val: std_error.to_string(),
        }
    }
}

impl From<ContractError> for StdError {
    fn from(contract_error: ContractError) -> Self {
        Self::generic_err(contract_error.to_string())
    }
}

pub fn parse_err(err: anyhow::Error) -> StdError {
    let context = format!("{}", err);
    let source = err.source().unwrap().to_string();

    StdError::GenericErr {
        msg: format!("{}\n{}", context, source),
    }
}

/// Never is a placeholder to ensure we don't return any errors
#[derive(Error, Debug)]
pub enum Never {}

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("Custom Error val: {val:?}")]
    CustomError { val: String },

    // common
    #[error("Sender does not have access permissions!")]
    Unauthorized,

    #[error("Undefined Reply ID!")]
    UndefinedReplyId,

    #[error("Asset is not found!")]
    AssetIsNotFound,

    #[error("{value:?} config is not found!")]
    ParameterIsNotFound { value: String },

    // minter
    #[error("Denom already exists!")]
    DenomExists,

    #[error("Minter doesn't support CW20 tokens!")]
    WrongMinterTokenType,
}

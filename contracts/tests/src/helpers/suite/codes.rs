use cosmwasm_std::{Addr, StdResult, Uint128};
use cw_multi_test::{AppResponse, ContractWrapper, Executor};

use serde::Serialize;
use strum::IntoEnumIterator;

use gopstake_base::error::parse_err;

use crate::helpers::suite::{
    core::Project,
    types::{GetDecimals, ProjectAccount, ProjectNft, ProjectToken},
};

pub trait WithCodes {
    // store packages
    fn store_cw20_base_code(&mut self) -> u64;
    fn store_cw721_base_code(&mut self) -> u64;
    fn store_minter_code(&mut self) -> u64;

    // store contracts
    fn store_staking_platform_code(&mut self) -> u64;

    // instantiate packages
    fn instantiate_cw20_base_token(&mut self, code_id: u64, project_token: ProjectToken) -> Addr;
    fn instantiate_cw721_base_token(&mut self, code_id: u64, project_nft: ProjectNft) -> Addr;
    fn instantiate_minter(
        &mut self,
        minter_code_id: u64,
        owner: &Option<Addr>,
        staking_platform: &Option<Addr>,
    ) -> Addr;

    // instantiate contracts
    fn instantiate_staking_platform(
        &mut self,
        staking_platform_code_id: u64,
        owner: &Option<Addr>,
        minter: &Option<Addr>,
    ) -> Addr;

    fn migrate_contract(
        &mut self,
        sender: ProjectAccount,
        contract_address: Addr,
        contract_new_code_id: u64,
        migrate_msg: impl Serialize,
    ) -> StdResult<AppResponse>;
}

impl WithCodes for Project {
    // store packages
    fn store_cw20_base_code(&mut self) -> u64 {
        self.app.store_code(Box::new(ContractWrapper::new(
            cw20_base::contract::execute,
            cw20_base::contract::instantiate,
            cw20_base::contract::query,
        )))
    }

    fn store_cw721_base_code(&mut self) -> u64 {
        self.app.store_code(Box::new(ContractWrapper::new(
            cw721_base::entry::execute,
            cw721_base::entry::instantiate,
            cw721_base::entry::query,
        )))
    }
    fn store_minter_code(&mut self) -> u64 {
        self.app.store_code(Box::new(
            ContractWrapper::new(
                minter_mocks::contract::execute,
                minter_mocks::contract::instantiate,
                minter_mocks::contract::query,
            )
            .with_reply(minter_mocks::contract::reply)
            .with_migrate(minter_mocks::contract::migrate),
        ))
    }

    // store contracts
    fn store_staking_platform_code(&mut self) -> u64 {
        self.app.store_code(Box::new(
            ContractWrapper::new(
                staking_platform::contract::execute,
                staking_platform::contract::instantiate,
                staking_platform::contract::query,
            )
            .with_reply(staking_platform::contract::reply)
            .with_migrate(staking_platform::contract::migrate),
        ))
    }

    // instantiate packages
    fn instantiate_cw20_base_token(&mut self, code_id: u64, project_token: ProjectToken) -> Addr {
        let token_postfix: u8 = project_token
            .to_string()
            .strip_prefix("contract")
            .unwrap()
            .parse()
            .unwrap();

        let symbol = format!("TKN{}", "N".repeat(token_postfix as usize)); // max 10 tokens

        let initial_balances: Vec<cw20::Cw20Coin> = ProjectAccount::iter()
            .map(|project_account| {
                let amount = project_account.get_initial_funds_amount()
                    * 10u128.pow(project_token.get_decimals() as u32);

                cw20::Cw20Coin {
                    address: project_account.to_string(),
                    amount: Uint128::from(amount),
                }
            })
            .collect();

        self.instantiate_contract(
            code_id,
            &format!("token{}", "n".repeat(token_postfix as usize)),
            &cw20_base::msg::InstantiateMsg {
                name: format!("cw20-base token {}", symbol),
                symbol,
                decimals: project_token.get_decimals(),
                initial_balances,
                mint: None,
                marketing: None,
            },
        )
    }

    fn instantiate_cw721_base_token(&mut self, code_id: u64, project_nft: ProjectNft) -> Addr {
        let token_postfix: u8 = project_nft
            .to_string()
            .strip_prefix("contract")
            .unwrap()
            .parse()
            .unwrap();

        let symbol = format!("NFT{}", "T".repeat(token_postfix as usize)); // max 10 tokens

        self.instantiate_contract(
            code_id,
            &format!("nft{}", "t".repeat(token_postfix as usize)),
            &cw721_base::msg::InstantiateMsg {
                name: format!("cw721-base token {}", symbol),
                symbol,
                minter: ProjectAccount::Owner.to_string(),
            },
        )
    }

    fn instantiate_minter(
        &mut self,
        minter_code_id: u64,
        owner: &Option<Addr>,
        staking_platform: &Option<Addr>,
    ) -> Addr {
        self.instantiate_contract(
            minter_code_id,
            "minter_mocks",
            &gopstake_base::minter::msg::InstantiateMsg {
                owner: owner.as_ref().map(|x| x.to_string()),
                staking_platform: staking_platform.as_ref().map(|x| x.to_string()),
            },
        )
    }

    fn instantiate_staking_platform(
        &mut self,
        staking_platform_code_id: u64,
        owner: &Option<Addr>,
        minter: &Option<Addr>,
    ) -> Addr {
        self.instantiate_contract(
            staking_platform_code_id,
            "staking_platform",
            &gopstake_base::staking_platform::msg::InstantiateMsg {
                owner: owner.as_ref().map(|x| x.to_string()),
                minter: minter.as_ref().map(|x| x.to_string()),
            },
        )
    }

    fn migrate_contract(
        &mut self,
        sender: ProjectAccount,
        contract_address: Addr,
        contract_new_code_id: u64,
        migrate_msg: impl Serialize,
    ) -> StdResult<AppResponse> {
        self.app
            .migrate_contract(
                sender.into(),
                contract_address,
                &migrate_msg,
                contract_new_code_id,
            )
            .map_err(parse_err)
    }
}

use cosmwasm_std::{coin, Addr, StdResult, Uint128};
use cw_multi_test::{AppResponse, Executor};

use gopstake_base::{
    error::parse_err,
    minter::{
        msg::{ExecuteMsg, QueryMsg},
        types::{Config, Metadata, QueryDenomsFromCreatorResponse},
    },
};

use crate::helpers::suite::{
    core::Project,
    types::{ProjectAccount, ProjectCoin},
};

pub trait MinterExtension {
    fn minter_try_create_denom(
        &mut self,
        sender: ProjectAccount,
        subdenom: ProjectCoin,
        payment: (u128, ProjectCoin),
    ) -> StdResult<AppResponse>;

    fn minter_try_mint_tokens(
        &mut self,
        sender: ProjectAccount,
        denom: ProjectCoin,
        amount: u128,
        mint_to_address: ProjectAccount,
    ) -> StdResult<AppResponse>;

    fn minter_try_burn_tokens(
        &mut self,
        sender: ProjectAccount,
        denom: ProjectCoin,
        amount: u128,
        burn_from_address: ProjectAccount,
    ) -> StdResult<AppResponse>;

    fn minter_try_set_metadata(
        &mut self,
        sender: ProjectAccount,
        metadata: Metadata,
    ) -> StdResult<AppResponse>;

    fn minter_try_update_config(
        &mut self,
        sender: ProjectAccount,
        staking_platform: &Option<Addr>,
    ) -> StdResult<AppResponse>;

    fn minter_query_denoms_by_creator(
        &self,
        creator: ProjectAccount,
    ) -> StdResult<QueryDenomsFromCreatorResponse>;

    fn minter_query_config(&self) -> StdResult<Config>;
}

impl MinterExtension for Project {
    #[track_caller]
    fn minter_try_create_denom(
        &mut self,
        sender: ProjectAccount,
        subdenom: ProjectCoin,
        payment: (u128, ProjectCoin),
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_minter_address(),
                &ExecuteMsg::CreateDenom {
                    subdenom: subdenom.to_string(),
                },
                &[coin(payment.0, payment.1.to_string())],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn minter_try_mint_tokens(
        &mut self,
        sender: ProjectAccount,
        denom: ProjectCoin,
        amount: u128,
        mint_to_address: ProjectAccount,
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_minter_address(),
                &ExecuteMsg::MintTokens {
                    denom: denom.to_string(),
                    amount: Uint128::new(amount),
                    mint_to_address: mint_to_address.to_string(),
                },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn minter_try_burn_tokens(
        &mut self,
        sender: ProjectAccount,
        denom: ProjectCoin,
        amount: u128,
        burn_from_address: ProjectAccount,
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_minter_address(),
                &ExecuteMsg::BurnTokens {
                    denom: denom.to_string(),
                    amount: Uint128::new(amount),
                    burn_from_address: burn_from_address.to_string(),
                },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn minter_try_set_metadata(
        &mut self,
        sender: ProjectAccount,
        metadata: Metadata,
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_minter_address(),
                &ExecuteMsg::SetMetadata { metadata },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn minter_try_update_config(
        &mut self,
        sender: ProjectAccount,
        staking_platform: &Option<Addr>,
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_minter_address(),
                &ExecuteMsg::UpdateConfig {
                    staking_platform: staking_platform.as_ref().map(|x| x.to_string()),
                },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn minter_query_denoms_by_creator(
        &self,
        creator: ProjectAccount,
    ) -> StdResult<QueryDenomsFromCreatorResponse> {
        self.app.wrap().query_wasm_smart(
            self.get_minter_address(),
            &QueryMsg::DenomsByCreator {
                creator: creator.to_string(),
            },
        )
    }

    #[track_caller]
    fn minter_query_config(&self) -> StdResult<Config> {
        self.app
            .wrap()
            .query_wasm_smart(self.get_minter_address(), &QueryMsg::QueryConfig {})
    }
}

use cosmwasm_std::{coin, to_json_binary, Addr, Coin, Empty, StdResult, Timestamp, Uint128};
use cw_multi_test::{App, AppResponse, Executor};

use serde::Serialize;
use strum::IntoEnumIterator;

use gopstake_base::{
    assets::{Currency, Funds, Token},
    error::parse_err,
};

use crate::helpers::{
    minter::MinterExtension,
    staking_platform::StakingPlatformExtension,
    suite::{
        codes::WithCodes,
        types::{
            GetDecimals, ProjectAccount, ProjectAsset, ProjectCoin, ProjectNft, ProjectToken,
            WrappedResponse, DEFAULT_DECIMALS, DEFAULT_FUNDS_AMOUNT,
        },
    },
};

pub struct Project {
    pub app: App,
    pub logs: WrappedResponse,
    contract_counter: u16,

    // package code id
    // cw20_base_code_id: u64,
    // cw721_base_code_id: u64,
    minter_code_id: u64,

    // contract code id
    staking_platform_code_id: u64,

    // package address
    gopniks_address: Addr,
    pinjeons_address: Addr,
    minter_address: Addr,

    // contract address
    staking_platform_address: Addr,
    //
    // other
}

impl Project {
    pub fn create_project_with_balances() -> Self {
        Self {
            app: Self::create_app_with_balances(),
            logs: WrappedResponse::Execute(Ok(AppResponse::default())),
            contract_counter: 0,

            // cw20_base_code_id: 0,
            // cw721_base_code_id: 0,
            minter_code_id: 0,

            staking_platform_code_id: 0,

            gopniks_address: Addr::unchecked(""),
            pinjeons_address: Addr::unchecked(""),
            minter_address: Addr::unchecked(""),

            staking_platform_address: Addr::unchecked(""),
        }
    }

    pub fn new(chain_id_mocked: Option<&str>) -> Self {
        // create app and distribute coins to accounts
        let mut project = Self::create_project_with_balances();

        // set specific chain_id to prevent execution of mocked actions on real networks
        let chain_id = chain_id_mocked.unwrap_or(gopstake_base::constants::CHAIN_ID_DEV);
        project
            .app
            .update_block(|block| block.chain_id = String::from(chain_id));

        // register contracts code
        // packages
        let cw20_base_code_id = project.store_cw20_base_code();
        let cw721_base_code_id = project.store_cw721_base_code();
        let minter_code_id = project.store_minter_code();

        // contracts
        let staking_platform_code_id = project.store_staking_platform_code();

        // instantiate packages

        // DON'T CHANGE TOKEN INIT ORDER AS ITS ADDRESSES ARE HARDCODED IN ProjectToken ENUM
        for project_token in ProjectToken::iter() {
            project.instantiate_cw20_base_token(cw20_base_code_id, project_token);
        }

        let gopniks_address =
            project.instantiate_cw721_base_token(cw721_base_code_id, ProjectNft::Gopniks);
        let pinjeons_address =
            project.instantiate_cw721_base_token(cw721_base_code_id, ProjectNft::Pinjeons);

        // mint NFTs
        let token_id_list: Vec<u128> = vec![1, 2, 3];
        for collection in ProjectNft::iter() {
            for (i, recipient) in [ProjectAccount::Alice, ProjectAccount::Bob]
                .iter()
                .enumerate()
            {
                let nft_list: &Vec<u128> = &token_id_list
                    .iter()
                    .map(|x| x + (i as u128) * (token_id_list.len() as u128))
                    .collect();

                project.mint_nft(ProjectAccount::Owner, recipient, collection, nft_list);
            }
        }

        let minter_address = project.instantiate_minter(minter_code_id, &None);

        // instantiate gopstake contracts

        let staking_platform_address =
            project.instantiate_staking_platform(staking_platform_code_id, &None, &None);

        project = Self {
            // cw20_base_code_id,
            minter_code_id,
            staking_platform_code_id,

            gopniks_address,
            pinjeons_address,
            minter_address: minter_address.clone(),

            staking_platform_address: staking_platform_address.clone(),

            ..project
        };

        // prepare contracts
        project
            .staking_platform_try_update_config(
                ProjectAccount::Admin,
                &None,
                &Some(minter_address.clone()),
            )
            .unwrap();
        project
            .minter_try_update_config(ProjectAccount::Admin, &Some(staking_platform_address))
            .unwrap();

        // add funds to minter
        for project_coin in ProjectCoin::iter() {
            let amount = DEFAULT_FUNDS_AMOUNT * 10u128.pow(project_coin.get_decimals() as u32);
            let amount = coin(amount, project_coin.to_string());
            project
                .app
                .send_tokens(
                    ProjectAccount::Admin.into(),
                    minter_address.clone(),
                    &[amount],
                )
                .unwrap();
        }

        project
    }

    // code id getters
    pub fn get_minter_code_id(&self) -> u64 {
        self.minter_code_id
    }

    pub fn get_staking_platform_code_id(&self) -> u64 {
        self.staking_platform_code_id
    }

    // package address getters
    pub fn get_gopniks_address(&self) -> Addr {
        self.gopniks_address.clone()
    }

    pub fn get_pinjeons_address(&self) -> Addr {
        self.pinjeons_address.clone()
    }

    pub fn get_minter_address(&self) -> Addr {
        self.minter_address.clone()
    }

    // contract address getters
    pub fn get_staking_platform_address(&self) -> Addr {
        self.staking_platform_address.clone()
    }

    // utils
    pub fn increase_contract_counter(&mut self, step: u16) {
        self.contract_counter += step;
    }

    pub fn get_last_contract_address(&self) -> String {
        format!("contract{}", self.contract_counter)
    }

    pub fn get_timestamp(&self) -> Timestamp {
        self.app.block_info().time
    }

    pub fn wait(&mut self, delay_ns: u64) {
        self.app.update_block(|block| {
            block.time = block.time.plus_nanos(delay_ns);
            block.height += delay_ns / 5_000_000_000;
        });
    }

    pub fn increase_allowances(
        &mut self,
        owner: ProjectAccount,
        spender: impl ToString,
        assets: &[(impl Into<Uint128> + Clone, ProjectToken)],
    ) {
        for (asset_amount, token) in assets {
            self.app
                .execute_contract(
                    owner.into(),
                    token.to_owned().into(),
                    &cw20_base::msg::ExecuteMsg::IncreaseAllowance {
                        spender: spender.to_string(),
                        amount: asset_amount.to_owned().into(),
                        expires: None,
                    },
                    &[],
                )
                .unwrap();
        }
    }

    pub fn increase_allowances_nft(
        &mut self,
        owner: ProjectAccount,
        spender: impl ToString,
        collection: ProjectNft,
    ) {
        self.app
            .execute_contract(
                owner.into(),
                collection.into(),
                &cw721_base::ExecuteMsg::ApproveAll::<Empty, Empty> {
                    operator: spender.to_string(),
                    expires: None,
                },
                &[],
            )
            .unwrap();
    }

    pub fn mint_nft(
        &mut self,
        owner: ProjectAccount,
        recipient: impl ToString,
        collection: ProjectNft,
        token_id_list: &Vec<impl ToString>,
    ) {
        for token_id in token_id_list {
            let msg = &cw721_base::msg::ExecuteMsg::Mint::<Empty, Empty> {
                token_id: token_id.to_string(),
                owner: recipient.to_string(),
                token_uri: Some(format!("https://www.{:#?}.com", collection)),
                extension: Empty::default(),
            };

            self.app
                .execute_contract(owner.into(), collection.into(), msg, &[])
                .unwrap();
        }
    }

    pub fn query_all_nft(&self, owner: ProjectAccount) -> Vec<(ProjectNft, cw721::TokensResponse)> {
        let mut collection_and_tokens_response_list: Vec<(ProjectNft, cw721::TokensResponse)> =
            vec![];

        for collection in ProjectNft::iter() {
            let res: cw721::TokensResponse = self
                .app
                .wrap()
                .query_wasm_smart(
                    collection.to_string(),
                    &cw721::Cw721QueryMsg::Tokens {
                        owner: owner.to_string(),
                        start_after: None,
                        limit: None,
                    },
                )
                .unwrap();

            collection_and_tokens_response_list.push((collection, res));
        }

        collection_and_tokens_response_list
    }

    pub fn query_all_balances(&self, account: ProjectAccount) -> StdResult<Vec<Funds<Token>>> {
        let mut funds_list: Vec<Funds<Token>> = vec![];

        for Coin { denom, amount } in self.app.wrap().query_all_balances(account.to_string())? {
            if !amount.is_zero() {
                funds_list.push(Funds::new(
                    amount,
                    &Currency::new(&Token::new_native(&denom), DEFAULT_DECIMALS),
                ));
            }
        }

        for token_cw20 in ProjectToken::iter() {
            let cw20::BalanceResponse { balance } = self.app.wrap().query_wasm_smart(
                token_cw20.to_string(),
                &cw20::Cw20QueryMsg::Balance {
                    address: account.to_string(),
                },
            )?;

            if !balance.is_zero() {
                funds_list.push(Funds::new(
                    balance,
                    &Currency::new(
                        &Token::new_cw20(&token_cw20.into()),
                        token_cw20.get_decimals(),
                    ),
                ));
            }
        }

        Ok(funds_list)
    }

    pub fn instantiate_contract(
        &mut self,
        code_id: u64,
        label: &str,
        init_msg: &impl Serialize,
    ) -> Addr {
        self.increase_contract_counter(1);

        self.app
            .instantiate_contract(
                code_id,
                ProjectAccount::Admin.into(),
                init_msg,
                &[],
                label,
                Some(ProjectAccount::Admin.to_string()),
            )
            .unwrap()
    }

    fn create_app_with_balances() -> App {
        App::new(|router, _api, storage| {
            for project_account in ProjectAccount::iter() {
                let funds: Vec<Coin> = ProjectCoin::iter()
                    .map(|project_coin| {
                        let amount = project_account.get_initial_funds_amount()
                            * 10u128.pow(project_coin.get_decimals() as u32);

                        coin(amount, project_coin.to_string())
                    })
                    .collect();

                router
                    .bank
                    .init_balance(storage, &project_account.into(), funds)
                    .unwrap();
            }
        })
    }
}

pub fn assert_error<S: std::fmt::Debug + ToString>(subject: &S, err: impl ToString + Sized) {
    speculoos::assert_that(subject).matches(|x| x.to_string().contains(&err.to_string()));
}

pub fn add_funds_to_exec_msg<T: Serialize + std::fmt::Debug>(
    project: &mut Project,
    sender: ProjectAccount,
    contract_address: &Addr,
    msg: &T,
    amount: impl Into<Uint128>,
    asset: impl Into<ProjectAsset>,
) -> StdResult<AppResponse> {
    let asset: ProjectAsset = asset.into();

    match asset {
        ProjectAsset::Coin(denom) => project
            .app
            .execute_contract(
                sender.into(),
                contract_address.to_owned(),
                msg,
                &[coin(
                    Into::<Uint128>::into(amount).u128(),
                    denom.to_string(),
                )],
            )
            .map_err(parse_err),
        ProjectAsset::Token(address) => {
            let wasm_msg = cw20::Cw20ExecuteMsg::Send {
                contract: contract_address.to_string(),
                amount: Into::<Uint128>::into(amount),
                msg: to_json_binary(msg).unwrap(),
            };

            project
                .app
                .execute_contract(sender.into(), address.into(), &wasm_msg, &[])
                .map_err(parse_err)
        }
    }
}

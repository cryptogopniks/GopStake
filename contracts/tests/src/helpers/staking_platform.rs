use cosmwasm_std::{StdResult, Uint128};
use cw_multi_test::{AppResponse, Executor};

use gopstake_base::{
    assets::{Funds, Token, TokenUnverified},
    converters::str_to_dec,
    error::parse_err,
    staking_platform::{
        msg::{
            BalancesResponseItem, ExecuteMsg, QueryCollectionsBalancesResponseItem,
            QueryCollectionsResponseItem, QueryMsg, QueryProposalsResponseItem,
            QueryStakersResponseItem,
        },
        types::{Config, Proposal, StakedCollectionInfo},
    },
};

use crate::helpers::suite::{
    core::{add_funds_to_exec_msg, Project},
    types::{ProjectAccount, ProjectAsset, ProjectNft},
};

pub trait StakingPlatformExtension {
    fn staking_platform_try_stake(
        &mut self,
        sender: ProjectAccount,
        collections_to_stake: &[StakedCollectionInfo<String>],
    ) -> StdResult<AppResponse>;

    fn staking_platform_try_unstake(
        &mut self,
        sender: ProjectAccount,
        collections_to_unstake: &[StakedCollectionInfo<String>],
    ) -> StdResult<AppResponse>;

    fn staking_platform_try_claim_staking_rewards(
        &mut self,
        sender: ProjectAccount,
    ) -> StdResult<AppResponse>;

    fn staking_platform_try_update_config<A: ToString>(
        &mut self,
        sender: ProjectAccount,
        owner: &Option<A>,
        minter: &Option<A>,
    ) -> StdResult<AppResponse>;

    fn staking_platform_try_distribute_funds(
        &mut self,
        sender: ProjectAccount,
        address_and_weight_list: &[(impl ToString, &str)],
    ) -> StdResult<AppResponse>;

    fn staking_platform_try_remove_collection(
        &mut self,
        sender: ProjectAccount,
        address: ProjectNft,
    ) -> StdResult<AppResponse>;

    fn staking_platform_try_create_proposal(
        &mut self,
        sender: ProjectAccount,
        proposal: &Proposal<String, TokenUnverified>,
    ) -> StdResult<AppResponse>;

    fn staking_platform_try_reject_proposal(
        &mut self,
        sender: ProjectAccount,
        id: u128,
    ) -> StdResult<AppResponse>;

    fn staking_platform_try_accept_proposal(
        &mut self,
        sender: ProjectAccount,
        id: u128,
        amount: u128,
        asset: impl Into<ProjectAsset>,
    ) -> StdResult<AppResponse>;

    fn staking_platform_try_deposit_tokens(
        &mut self,
        sender: ProjectAccount,
        collection_address: ProjectNft,
        amount: impl Into<Uint128>,
        asset: impl Into<ProjectAsset>,
    ) -> StdResult<AppResponse>;

    fn staking_platform_try_withdraw_tokens(
        &mut self,
        sender: ProjectAccount,
        collection_address: ProjectNft,
        amount: impl Into<Uint128>,
    ) -> StdResult<AppResponse>;

    fn staking_platform_query_config(&self) -> StdResult<Config>;

    fn staking_platform_query_funds(&self) -> StdResult<Vec<Funds<Token>>>;

    fn staking_platform_query_stakers(
        &self,
        addresses: &Option<Vec<ProjectAccount>>,
    ) -> StdResult<Vec<QueryStakersResponseItem>>;

    fn staking_platform_query_staking_rewards(
        &self,
        address: ProjectAccount,
    ) -> StdResult<BalancesResponseItem>;

    fn staking_platform_query_staking_rewards_per_collection(
        &self,
        staker: ProjectAccount,
        collection: ProjectNft,
    ) -> StdResult<BalancesResponseItem>;

    fn staking_platform_query_associated_balances(
        &self,
        address: ProjectAccount,
    ) -> StdResult<BalancesResponseItem>;

    fn staking_platform_query_proposals(
        &self,
        last_amount: Option<u128>,
    ) -> StdResult<Vec<QueryProposalsResponseItem>>;

    fn staking_platform_query_collections(
        &self,
        addresses: &Option<Vec<ProjectNft>>,
    ) -> StdResult<Vec<QueryCollectionsResponseItem>>;

    fn staking_platform_query_collections_balances(
        &self,
        addresses: &Option<Vec<ProjectNft>>,
    ) -> StdResult<Vec<QueryCollectionsBalancesResponseItem>>;
}

impl StakingPlatformExtension for Project {
    #[track_caller]
    fn staking_platform_try_stake(
        &mut self,
        sender: ProjectAccount,
        collections_to_stake: &[StakedCollectionInfo<String>],
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_staking_platform_address(),
                &ExecuteMsg::Stake {
                    collections_to_stake: collections_to_stake.to_owned(),
                },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn staking_platform_try_unstake(
        &mut self,
        sender: ProjectAccount,
        collections_to_unstake: &[StakedCollectionInfo<String>],
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_staking_platform_address(),
                &ExecuteMsg::Unstake {
                    collections_to_unstake: collections_to_unstake.to_owned(),
                },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn staking_platform_try_claim_staking_rewards(
        &mut self,
        sender: ProjectAccount,
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_staking_platform_address(),
                &ExecuteMsg::ClaimStakingRewards {},
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn staking_platform_try_update_config<A: ToString>(
        &mut self,
        sender: ProjectAccount,
        owner: &Option<A>,
        minter: &Option<A>,
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_staking_platform_address(),
                &ExecuteMsg::UpdateConfig {
                    owner: owner.as_ref().map(|x| x.to_string()),
                    minter: minter.as_ref().map(|x| x.to_string()),
                },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn staking_platform_try_distribute_funds(
        &mut self,
        sender: ProjectAccount,
        address_and_weight_list: &[(impl ToString, &str)],
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_staking_platform_address(),
                &ExecuteMsg::DistributeFunds {
                    address_and_weight_list: address_and_weight_list
                        .iter()
                        .map(|(address, weight)| (address.to_string(), str_to_dec(weight)))
                        .collect(),
                },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn staking_platform_try_remove_collection(
        &mut self,
        sender: ProjectAccount,
        address: ProjectNft,
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_staking_platform_address(),
                &ExecuteMsg::RemoveCollection {
                    address: address.to_string(),
                },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn staking_platform_try_create_proposal(
        &mut self,
        sender: ProjectAccount,
        proposal: &Proposal<String, TokenUnverified>,
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_staking_platform_address(),
                &ExecuteMsg::CreateProposal {
                    proposal: proposal.to_owned(),
                },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn staking_platform_try_reject_proposal(
        &mut self,
        sender: ProjectAccount,
        id: u128,
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_staking_platform_address(),
                &ExecuteMsg::RejectProposal { id: id.into() },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn staking_platform_try_accept_proposal(
        &mut self,
        sender: ProjectAccount,
        id: u128,
        amount: u128,
        asset: impl Into<ProjectAsset>,
    ) -> StdResult<AppResponse> {
        let contract_address = &self.get_staking_platform_address();
        let msg = &ExecuteMsg::AcceptProposal { id: id.into() };

        add_funds_to_exec_msg(self, sender, contract_address, msg, amount, asset)
    }

    #[track_caller]
    fn staking_platform_try_deposit_tokens(
        &mut self,
        sender: ProjectAccount,
        collection_address: ProjectNft,
        amount: impl Into<Uint128>,
        asset: impl Into<ProjectAsset>,
    ) -> StdResult<AppResponse> {
        let contract_address = &self.get_staking_platform_address();
        let msg = &ExecuteMsg::DepositTokens {
            collection_address: collection_address.to_string(),
        };

        add_funds_to_exec_msg(self, sender, contract_address, msg, amount, asset)
    }

    #[track_caller]
    fn staking_platform_try_withdraw_tokens(
        &mut self,
        sender: ProjectAccount,
        collection_address: ProjectNft,
        amount: impl Into<Uint128>,
    ) -> StdResult<AppResponse> {
        self.app
            .execute_contract(
                sender.into(),
                self.get_staking_platform_address(),
                &ExecuteMsg::WithdrawTokens {
                    collection_address: collection_address.to_string(),
                    amount: amount.into(),
                },
                &[],
            )
            .map_err(parse_err)
    }

    #[track_caller]
    fn staking_platform_query_config(&self) -> StdResult<Config> {
        self.app.wrap().query_wasm_smart(
            self.get_staking_platform_address(),
            &QueryMsg::QueryConfig {},
        )
    }

    #[track_caller]
    fn staking_platform_query_funds(&self) -> StdResult<Vec<Funds<Token>>> {
        self.app.wrap().query_wasm_smart(
            self.get_staking_platform_address(),
            &QueryMsg::QueryFunds {},
        )
    }

    #[track_caller]
    fn staking_platform_query_stakers(
        &self,
        addresses: &Option<Vec<ProjectAccount>>,
    ) -> StdResult<Vec<QueryStakersResponseItem>> {
        let addresses = addresses
            .as_ref()
            .map(|x| x.iter().map(|y| y.to_string()).collect());

        self.app.wrap().query_wasm_smart(
            self.get_staking_platform_address(),
            &QueryMsg::QueryStakers { addresses },
        )
    }

    #[track_caller]
    fn staking_platform_query_staking_rewards(
        &self,
        address: ProjectAccount,
    ) -> StdResult<BalancesResponseItem> {
        self.app.wrap().query_wasm_smart(
            self.get_staking_platform_address(),
            &QueryMsg::QueryStakingRewards {
                address: address.to_string(),
            },
        )
    }

    #[track_caller]
    fn staking_platform_query_staking_rewards_per_collection(
        &self,
        staker: ProjectAccount,
        collection: ProjectNft,
    ) -> StdResult<BalancesResponseItem> {
        self.app.wrap().query_wasm_smart(
            self.get_staking_platform_address(),
            &QueryMsg::QueryStakingRewardsPerCollection {
                collection: collection.to_string(),
                staker: staker.to_string(),
            },
        )
    }

    #[track_caller]
    fn staking_platform_query_associated_balances(
        &self,
        address: ProjectAccount,
    ) -> StdResult<BalancesResponseItem> {
        self.app.wrap().query_wasm_smart(
            self.get_staking_platform_address(),
            &QueryMsg::QueryAssociatedBalances {
                address: address.to_string(),
            },
        )
    }

    #[track_caller]
    fn staking_platform_query_proposals(
        &self,
        last_amount: Option<u128>,
    ) -> StdResult<Vec<QueryProposalsResponseItem>> {
        self.app.wrap().query_wasm_smart(
            self.get_staking_platform_address(),
            &QueryMsg::QueryProposals {
                last_amount: last_amount.map(Into::<Uint128>::into),
            },
        )
    }

    #[track_caller]
    fn staking_platform_query_collections(
        &self,
        addresses: &Option<Vec<ProjectNft>>,
    ) -> StdResult<Vec<QueryCollectionsResponseItem>> {
        let addresses = addresses
            .as_ref()
            .map(|x| x.iter().map(|y| y.to_string()).collect());

        self.app.wrap().query_wasm_smart(
            self.get_staking_platform_address(),
            &QueryMsg::QueryCollections { addresses },
        )
    }

    #[track_caller]
    fn staking_platform_query_collections_balances(
        &self,
        addresses: &Option<Vec<ProjectNft>>,
    ) -> StdResult<Vec<QueryCollectionsBalancesResponseItem>> {
        let addresses = addresses
            .as_ref()
            .map(|x| x.iter().map(|y| y.to_string()).collect());

        self.app.wrap().query_wasm_smart(
            self.get_staking_platform_address(),
            &QueryMsg::QueryCollectionsBalances { addresses },
        )
    }
}

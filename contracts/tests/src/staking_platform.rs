use cosmwasm_std::{StdResult, Uint128};

use speculoos::assert_that;

use gopstake_base::{
    assets::{Currency, Funds, Token, TokenUnverified},
    constants::{CHAIN_ID_DEV, MINS_PER_DAY, NANOS_PER_MIN},
    converters::str_to_dec,
    error::ContractError,
    staking_platform::{
        msg::{
            QueryCollectionsBalancesResponseItem, QueryCollectionsResponseItem,
            QueryProposalsResponseItem,
        },
        types::{
            Collection, EmissionType, Proposal, ProposalStatus, ProposalType, StakedCollectionInfo,
            StakedTokenInfo,
        },
    },
};

use crate::helpers::{
    minter::MinterExtension,
    staking_platform::StakingPlatformExtension,
    suite::{
        core::{assert_error, Project},
        types::{ProjectAccount, ProjectCoin, ProjectNft, ProjectToken},
    },
};

#[test]
fn create_proposal_default_and_query_last_proposals() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposals = project.staking_platform_query_proposals(None)?;
    assert_that(&proposals).is_equal_to(vec![]);

    let proposal: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let expected: Vec<QueryProposalsResponseItem> = vec![QueryProposalsResponseItem {
        id: Uint128::new(1),
        proposal: Proposal {
            proposal_status: Some(ProposalStatus::Active),
            price: Funds::new(
                100u128,
                &Currency::new(&Token::new_native(&ProjectCoin::Denom.to_string()), 6),
            ),
            proposal_type: ProposalType::AddCollection {
                collection_address: ProjectNft::Gopniks.into(),
                collection: Collection {
                    name: ProjectNft::Gopniks.to_string(),
                    staking_currency: Currency::new(
                        &Token::new_cw20(&ProjectToken::Atom.into()),
                        6,
                    ),
                    daily_rewards: str_to_dec("86400000000000"),
                    emission_type: EmissionType::Spending,
                    owner: ProjectAccount::Owner.into(),
                },
            },
        },
    }];

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal)?;

    let proposals = project.staking_platform_query_proposals(None)?;
    assert_that(&proposals).is_equal_to(&expected);

    // query last 2 proposals
    let proposals = project.staking_platform_query_proposals(Some(2))?;
    assert_that(&proposals).is_equal_to(&expected);

    // query last proposal
    let proposals = project.staking_platform_query_proposals(Some(1))?;
    assert_that(&proposals).is_equal_to(&expected);

    // query last 0 proposals
    let proposals = project.staking_platform_query_proposals(Some(0))?;
    assert_that(&proposals).is_equal_to(vec![]);

    Ok(())
}

#[test]
fn create_proposal_add_same_collection_twice() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_b: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_c: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    let res = project
        .staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b)
        .unwrap_err();
    assert_error(&res, ContractError::CollectionDuplication);

    let res = project
        .staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_c)
        .unwrap_err();
    assert_error(&res, ContractError::CollectionDuplication);

    Ok(())
}

#[test]
fn create_proposal_update_collection_to_replace_it() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    // good collection
    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    // bad collection
    let proposal_b: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    // replace good collection with bad
    let proposal_c: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::UpdateCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            new_collection_address: Some(ProjectNft::Pinjeons.to_string()),
            new_collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b)?;
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        2,
        100,
        ProjectCoin::Denom,
    )?;

    let res = project
        .staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_c)
        .unwrap_err();
    assert_error(&res, ContractError::CollectionDuplication);

    Ok(())
}

#[test]
fn create_proposal_authorization() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let expected: Vec<QueryProposalsResponseItem> = vec![QueryProposalsResponseItem {
        id: Uint128::new(1),
        proposal: Proposal {
            proposal_status: Some(ProposalStatus::Active),
            price: Funds::new(
                100u128,
                &Currency::new(&Token::new_native(&ProjectCoin::Denom.to_string()), 6),
            ),
            proposal_type: ProposalType::AddCollection {
                collection_address: ProjectNft::Gopniks.into(),
                collection: Collection {
                    name: ProjectNft::Gopniks.to_string(),
                    staking_currency: Currency::new(
                        &Token::new_cw20(&ProjectToken::Atom.into()),
                        6,
                    ),
                    daily_rewards: str_to_dec("86400000000000"),
                    emission_type: EmissionType::Spending,
                    owner: ProjectAccount::Owner.into(),
                },
            },
        },
    }];

    let res = project
        .staking_platform_try_create_proposal(ProjectAccount::Alice, proposal)
        .unwrap_err();
    assert_error(&res, ContractError::Unauthorized);

    let res = project
        .staking_platform_try_update_config(
            ProjectAccount::Alice,
            &Some(ProjectAccount::Alice),
            &None,
        )
        .unwrap_err();
    assert_error(&res, ContractError::Unauthorized);

    project.staking_platform_try_update_config(
        ProjectAccount::Admin,
        &Some(ProjectAccount::Alice),
        &None,
    )?;

    project.staking_platform_try_create_proposal(ProjectAccount::Alice, proposal)?;

    let proposals = project.staking_platform_query_proposals(None)?;
    assert_that(&proposals).is_equal_to(&expected);

    Ok(())
}

#[test]
fn reject_proposal_unauth_default_twice() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let expected: Vec<QueryProposalsResponseItem> = vec![QueryProposalsResponseItem {
        id: Uint128::new(1),
        proposal: Proposal {
            proposal_status: Some(ProposalStatus::Rejected),
            price: Funds::new(
                100u128,
                &Currency::new(&Token::new_native(&ProjectCoin::Denom.to_string()), 6),
            ),
            proposal_type: ProposalType::AddCollection {
                collection_address: ProjectNft::Gopniks.into(),
                collection: Collection {
                    name: ProjectNft::Gopniks.to_string(),
                    staking_currency: Currency::new(
                        &Token::new_cw20(&ProjectToken::Atom.into()),
                        6,
                    ),
                    daily_rewards: str_to_dec("86400000000000"),
                    emission_type: EmissionType::Spending,
                    owner: ProjectAccount::Owner.into(),
                },
            },
        },
    }];

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal)?;

    let res = project
        .staking_platform_try_reject_proposal(ProjectAccount::Owner, 1)
        .unwrap_err();
    assert_error(&res, ContractError::Unauthorized);

    project.staking_platform_try_reject_proposal(ProjectAccount::Admin, 1)?;

    let res = project
        .staking_platform_try_reject_proposal(ProjectAccount::Admin, 1)
        .unwrap_err();
    assert_error(&res, ContractError::WrongProposalStatus);

    let proposals = project.staking_platform_query_proposals(None)?;
    assert_that(&proposals).is_equal_to(&expected);

    Ok(())
}

#[test]
fn accept_proposal_unauth_underfunded_default_twice() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let collection = Collection {
        name: ProjectNft::Gopniks.to_string(),
        staking_currency: Currency::new(&Token::new_cw20(&ProjectToken::Atom.into()), 6),
        daily_rewards: str_to_dec("86400000000000"),
        emission_type: EmissionType::Spending,
        owner: ProjectAccount::Owner.into(),
    };

    let expected: Vec<QueryProposalsResponseItem> = vec![QueryProposalsResponseItem {
        id: Uint128::new(1),
        proposal: Proposal {
            proposal_status: Some(ProposalStatus::Accepted),
            price: Funds::new(
                100u128,
                &Currency::new(&Token::new_native(&ProjectCoin::Denom.to_string()), 6),
            ),
            proposal_type: ProposalType::AddCollection {
                collection_address: ProjectNft::Gopniks.into(),
                collection: collection.clone(),
            },
        },
    }];

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal)?;

    let res = project
        .staking_platform_try_accept_proposal(ProjectAccount::Admin, 1, 100, ProjectCoin::Denom)
        .unwrap_err();
    assert_error(&res, ContractError::Unauthorized);

    let res = project
        .staking_platform_try_accept_proposal(ProjectAccount::Owner, 1, 50, ProjectCoin::Denom)
        .unwrap_err();
    assert_error(&res, ContractError::WrongFundsCombination);

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    let res = project
        .staking_platform_try_accept_proposal(ProjectAccount::Owner, 1, 100, ProjectCoin::Denom)
        .unwrap_err();
    assert_error(&res, ContractError::WrongProposalStatus);

    let proposals = project.staking_platform_query_proposals(None)?;
    assert_that(&proposals).is_equal_to(&expected);

    let funds = project.staking_platform_query_funds()?;
    assert_that(&funds).is_equal_to(vec![Funds::new(
        100u128,
        &Currency::new(&Token::new_native(&ProjectCoin::Denom.to_string()), 6),
    )]);

    let collections = project.staking_platform_query_collections(&None)?;
    assert_that(&collections).is_equal_to(vec![QueryCollectionsResponseItem {
        address: ProjectNft::Gopniks.into(),
        collection,
    }]);

    Ok(())
}

#[test]
fn accept_proposal_add_same_collection_twice() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_b: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_c: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_c)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    let res = project
        .staking_platform_try_accept_proposal(ProjectAccount::Owner, 2, 100, ProjectCoin::Denom)
        .unwrap_err();
    assert_error(&res, ContractError::CollectionDuplication);

    let res = project
        .staking_platform_try_accept_proposal(ProjectAccount::Owner, 3, 100, ProjectCoin::Denom)
        .unwrap_err();
    assert_error(&res, ContractError::CollectionDuplication);

    Ok(())
}

#[test]
fn accept_proposal_update_collection_to_replace_it() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    // good collection
    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    // bad collection
    let proposal_b: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    // replace good collection with bad
    let proposal_c: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::UpdateCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            new_collection_address: Some(ProjectNft::Pinjeons.to_string()),
            new_collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_c)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b)?;

    // b
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        3,
        100,
        ProjectCoin::Denom,
    )?;

    // c
    let res = project
        .staking_platform_try_accept_proposal(ProjectAccount::Owner, 1, 100, ProjectCoin::Denom)
        .unwrap_err();
    assert_error(&res, ContractError::CollectionIsNotFound);

    // a
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        2,
        100,
        ProjectCoin::Denom,
    )?;

    // c
    let res = project
        .staking_platform_try_accept_proposal(ProjectAccount::Owner, 1, 100, ProjectCoin::Denom)
        .unwrap_err();
    assert_error(&res, ContractError::CollectionDuplication);

    Ok(())
}

#[test]
fn accept_proposal_and_pay_with_cw20_tokens() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_cw20(&ProjectToken::Luna.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let collection = Collection {
        name: ProjectNft::Gopniks.to_string(),
        staking_currency: Currency::new(&Token::new_cw20(&ProjectToken::Atom.into()), 6),
        daily_rewards: str_to_dec("86400000000000"),
        emission_type: EmissionType::Spending,
        owner: ProjectAccount::Owner.into(),
    };

    let expected: Vec<QueryProposalsResponseItem> = vec![QueryProposalsResponseItem {
        id: Uint128::new(1),
        proposal: Proposal {
            proposal_status: Some(ProposalStatus::Accepted),
            price: Funds::new(
                100u128,
                &Currency::new(&Token::new_cw20(&ProjectToken::Luna.into()), 6),
            ),
            proposal_type: ProposalType::AddCollection {
                collection_address: ProjectNft::Gopniks.into(),
                collection: collection.clone(),
            },
        },
    }];

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectToken::Luna,
    )?;

    let proposals = project.staking_platform_query_proposals(None)?;
    assert_that(&proposals).is_equal_to(&expected);

    let funds = project.staking_platform_query_funds()?;
    assert_that(&funds).is_equal_to(vec![Funds::new(
        100u128,
        &Currency::new(&Token::new_cw20(&ProjectToken::Luna.into()), 6),
    )]);

    let collections = project.staking_platform_query_collections(&None)?;
    assert_that(&collections).is_equal_to(vec![QueryCollectionsResponseItem {
        address: ProjectNft::Gopniks.into(),
        collection,
    }]);

    Ok(())
}

#[test]
fn distribute_funds_unauth_weights_default() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_b: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            222u128,
            &Currency::new(
                &TokenUnverified::new_cw20(&ProjectToken::Inj.to_string()),
                18,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        2,
        222u128,
        ProjectToken::Inj,
    )?;

    let res = project
        .staking_platform_try_distribute_funds(
            ProjectAccount::Alice,
            &[(ProjectAccount::Alice, "0.5"), (ProjectAccount::Bob, "0.5")],
        )
        .unwrap_err();
    assert_error(&res, ContractError::Unauthorized);

    let res = project
        .staking_platform_try_distribute_funds(
            ProjectAccount::Admin,
            &[(ProjectAccount::Alice, "1.5"), (ProjectAccount::Bob, "0.5")],
        )
        .unwrap_err();
    assert_error(&res, ContractError::WeightIsOutOfRange);

    let res = project
        .staking_platform_try_distribute_funds(
            ProjectAccount::Admin,
            &[(ProjectAccount::Alice, "0.4"), (ProjectAccount::Bob, "0.5")],
        )
        .unwrap_err();
    assert_error(&res, ContractError::WeightsAreUnbalanced);

    project.staking_platform_try_distribute_funds(
        ProjectAccount::Admin,
        &[
            (ProjectAccount::Alice, "0.33"),
            (ProjectAccount::Bob, "0.67"),
        ],
    )?;

    let balances_alice = project.query_all_balances(ProjectAccount::Alice)?;
    let balance_alice_denom = balances_alice
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Denom.to_string()))
        .unwrap()
        .amount
        .u128();
    let balance_alice_inj = balances_alice
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Inj.into()))
        .unwrap()
        .amount
        .u128();

    let balances_bob = project.query_all_balances(ProjectAccount::Bob)?;
    let balance_bob_denom = balances_bob
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Denom.to_string()))
        .unwrap()
        .amount
        .u128();
    let balance_bob_inj = balances_bob
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Inj.into()))
        .unwrap()
        .amount
        .u128();

    assert_that(&balance_alice_denom).is_equal_to(1000033);
    assert_that(&balance_alice_inj).is_equal_to(1000000000000000073);
    assert_that(&balance_bob_denom).is_equal_to(1000067);
    assert_that(&balance_bob_inj).is_equal_to(1000000000000000148);

    Ok(())
}

#[test]
fn remove_collection_unauth_default() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    let res = project
        .staking_platform_try_remove_collection(ProjectAccount::Alice, ProjectNft::Gopniks)
        .unwrap_err();
    assert_error(&res, ContractError::Unauthorized);

    project.staking_platform_try_remove_collection(ProjectAccount::Admin, ProjectNft::Gopniks)?;

    let collections = project.staking_platform_query_collections(&None)?;
    assert_that(&collections).is_equal_to(vec![]);

    Ok(())
}

#[test]
fn deposit_tokens_unauth_default() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    let res = project
        .staking_platform_try_deposit_tokens(
            ProjectAccount::Admin,
            ProjectNft::Gopniks,
            1_000u128,
            ProjectToken::Atom,
        )
        .is_err();
    assert_that(&res).is_equal_to(true);

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        1_000u128,
        ProjectToken::Atom,
    )?;

    let collections_balances = project.staking_platform_query_collections_balances(&None)?;
    assert_that(&collections_balances).is_equal_to(vec![QueryCollectionsBalancesResponseItem {
        address: ProjectNft::Gopniks.into(),
        funds: Funds::new(
            1_000u128,
            &Currency::new(&Token::new_cw20(&ProjectToken::Atom.into()), 6),
        ),
    }]);

    Ok(())
}

#[test]
fn deposit_tokens_improper_emission_type() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Minting,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    let res = project
        .staking_platform_try_deposit_tokens(
            ProjectAccount::Owner,
            ProjectNft::Gopniks,
            1_000u128,
            ProjectCoin::Noria,
        )
        .unwrap_err();
    assert_error(&res, ContractError::ActionByEmissionType);

    Ok(())
}

#[test]
fn withdraw_tokens_unauth_default() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("86400000000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        1_000u128,
        ProjectToken::Atom,
    )?;

    let res = project
        .staking_platform_try_withdraw_tokens(ProjectAccount::Admin, ProjectNft::Gopniks, 500u128)
        .unwrap_err();
    assert_error(&res, ContractError::Unauthorized);

    project.staking_platform_try_withdraw_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        111u128,
    )?;

    let collections_balances = project.staking_platform_query_collections_balances(&None)?;
    assert_that(&collections_balances).is_equal_to(vec![QueryCollectionsBalancesResponseItem {
        address: ProjectNft::Gopniks.into(),
        funds: Funds::new(
            889u128,
            &Currency::new(&Token::new_cw20(&ProjectToken::Atom.into()), 6),
        ),
    }]);

    let owner_balances = project.query_all_balances(ProjectAccount::Owner)?;
    let balance_owner_atom = owner_balances
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();

    assert_that(&balance_owner_atom).is_equal_to(999111);

    Ok(())
}

#[test]
fn stake_2_users_2_collections() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_b: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            222u128,
            &Currency::new(
                &TokenUnverified::new_cw20(&ProjectToken::Inj.to_string()),
                18,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("500000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        2,
        222u128,
        ProjectToken::Inj,
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        1_000_000u128,
        ProjectToken::Atom,
    )?;
    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Pinjeons,
        500_000u128,
        ProjectCoin::Noria,
    )?;

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );
    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Pinjeons,
    );
    project.increase_allowances_nft(
        ProjectAccount::Bob,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );
    project.increase_allowances_nft(
        ProjectAccount::Bob,
        project.get_staking_platform_address(),
        ProjectNft::Pinjeons,
    );

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[StakedCollectionInfo {
            collection_address: ProjectNft::Gopniks.to_string(),
            staked_token_info_list: vec![StakedTokenInfo {
                token_id: Uint128::new(1),
                staking_start_date: None,
                last_claim_date: None,
            }],
        }],
    )?;

    let delay = (10 * MINS_PER_DAY * NANOS_PER_MIN) as u64;
    project.wait(delay);

    project.staking_platform_try_stake(
        ProjectAccount::Bob,
        &[
            StakedCollectionInfo {
                collection_address: ProjectNft::Gopniks.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(4),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            },
            StakedCollectionInfo {
                collection_address: ProjectNft::Gopniks.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(5),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            },
        ],
    )?;

    project.wait(delay);

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[StakedCollectionInfo {
            collection_address: ProjectNft::Pinjeons.to_string(),
            staked_token_info_list: vec![
                StakedTokenInfo {
                    token_id: Uint128::new(1),
                    staking_start_date: None,
                    last_claim_date: None,
                },
                StakedTokenInfo {
                    token_id: Uint128::new(2),
                    staking_start_date: None,
                    last_claim_date: None,
                },
            ],
        }],
    )?;

    project.wait(delay);

    project.staking_platform_try_stake(
        ProjectAccount::Bob,
        &[StakedCollectionInfo {
            collection_address: ProjectNft::Pinjeons.to_string(),
            staked_token_info_list: vec![
                StakedTokenInfo {
                    token_id: Uint128::new(4),
                    staking_start_date: None,
                    last_claim_date: None,
                },
                StakedTokenInfo {
                    token_id: Uint128::new(5),
                    staking_start_date: None,
                    last_claim_date: None,
                },
                StakedTokenInfo {
                    token_id: Uint128::new(6),
                    staking_start_date: None,
                    last_claim_date: None,
                },
            ],
        }],
    )?;

    project.wait(delay);

    let alice_rewards = project.staking_platform_query_staking_rewards(ProjectAccount::Alice)?;
    let alice_rewards_atom = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();
    let alice_rewards_noria = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();

    let bob_rewards = project.staking_platform_query_staking_rewards(ProjectAccount::Bob)?;
    let bob_rewards_atom = bob_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();
    let bob_rewards_noria = bob_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();

    // 1 nft * 1 atom * 40 days
    assert_that(&alice_rewards_atom).is_equal_to(40_000_000);
    // 2 nft * 0.5 noria * 20 days
    assert_that(&alice_rewards_noria).is_equal_to(20_000_000);
    // 2 nft * 1 atom * 30 days
    assert_that(&bob_rewards_atom).is_equal_to(60_000_000);
    // 3 nft * 0.5 noria * 10 days
    assert_that(&bob_rewards_noria).is_equal_to(15_000_000);

    Ok(())
}

#[test]
fn stake_unallowed_unfunded_delayed() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    let res = project
        .staking_platform_try_stake(
            ProjectAccount::Alice,
            &[StakedCollectionInfo {
                collection_address: ProjectNft::Gopniks.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(1),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            }],
        )
        .is_err();
    assert_that(&res).is_equal_to(true);

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );

    let delay = (10 * MINS_PER_DAY * NANOS_PER_MIN) as u64;

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[StakedCollectionInfo {
            collection_address: ProjectNft::Gopniks.to_string(),
            staked_token_info_list: vec![StakedTokenInfo {
                token_id: Uint128::new(1),
                staking_start_date: Some(project.get_timestamp().plus_nanos(delay)),
                last_claim_date: Some(project.get_timestamp().plus_nanos(delay)),
            }],
        }],
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        1_000_000u128,
        ProjectToken::Atom,
    )?;

    project.wait(delay);

    let alice_rewards = project.staking_platform_query_staking_rewards(ProjectAccount::Alice)?;
    let alice_rewards_atom = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();

    // 1 nft * 1 atom * 10 days
    assert_that(&alice_rewards_atom).is_equal_to(10_000_000);

    Ok(())
}

#[test]
fn claim_staking_rewards_default() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        500_000u128,
        ProjectToken::Atom,
    )?;

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[StakedCollectionInfo {
            collection_address: ProjectNft::Gopniks.to_string(),
            staked_token_info_list: vec![StakedTokenInfo {
                token_id: Uint128::new(1),
                staking_start_date: None,
                last_claim_date: None,
            }],
        }],
    )?;

    let delay = (12 * 60 * NANOS_PER_MIN) as u64;
    project.wait(delay);

    project.staking_platform_try_claim_staking_rewards(ProjectAccount::Alice)?;

    let alice_rewards = project.staking_platform_query_staking_rewards(ProjectAccount::Alice)?;
    let alice_rewards_atom = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();

    // 1 nft * 1 atom * 0.5 days
    assert_that(&alice_rewards_atom).is_equal_to(0);

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        200_000u128,
        ProjectToken::Atom,
    )?;

    let collections_balances = project.staking_platform_query_collections_balances(&None)?;
    let gopniks_balance = collections_balances
        .iter()
        .find(|x| x.address == ProjectNft::Gopniks.to_string())
        .unwrap();
    assert_that(&gopniks_balance.funds.amount.u128()).is_equal_to(200_000);

    let alice_associated_balances =
        project.staking_platform_query_associated_balances(ProjectAccount::Alice)?;
    let alice_atom_associated_balance = alice_associated_balances
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();
    assert_that(&alice_atom_associated_balance).is_equal_to(1_500_000);

    Ok(())
}

#[test]
fn unstake_improper_collection_and_id_default() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        1_000_000u128,
        ProjectToken::Atom,
    )?;

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[StakedCollectionInfo {
            collection_address: ProjectNft::Gopniks.to_string(),
            staked_token_info_list: vec![
                StakedTokenInfo {
                    token_id: Uint128::new(1),
                    staking_start_date: None,
                    last_claim_date: None,
                },
                StakedTokenInfo {
                    token_id: Uint128::new(2),
                    staking_start_date: None,
                    last_claim_date: None,
                },
            ],
        }],
    )?;

    let delay = (6 * 60 * NANOS_PER_MIN) as u64;
    project.wait(delay);

    let res = project
        .staking_platform_try_unstake(
            ProjectAccount::Alice,
            &[StakedCollectionInfo {
                collection_address: ProjectNft::Pinjeons.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(1),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            }],
        )
        .unwrap_err();
    assert_error(&res, ContractError::CollectionIsNotFound);

    let res = project
        .staking_platform_try_unstake(
            ProjectAccount::Alice,
            &[StakedCollectionInfo {
                collection_address: ProjectNft::Gopniks.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(3),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            }],
        )
        .unwrap_err();
    assert_error(&res, ContractError::AssetIsNotFound);

    project.staking_platform_try_unstake(
        ProjectAccount::Alice,
        &[StakedCollectionInfo {
            collection_address: ProjectNft::Gopniks.to_string(),
            staked_token_info_list: vec![StakedTokenInfo {
                token_id: Uint128::new(1),
                staking_start_date: None,
                last_claim_date: None,
            }],
        }],
    )?;

    let alice_rewards = project.staking_platform_query_staking_rewards(ProjectAccount::Alice)?;
    let alice_rewards_atom = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();

    // 1 nft * 1 atom * 0.25 days
    assert_that(&alice_rewards_atom).is_equal_to(250_000);

    let collections_balances = project.staking_platform_query_collections_balances(&None)?;
    let gopniks_balance = collections_balances
        .iter()
        .find(|x| x.address == ProjectNft::Gopniks.to_string())
        .unwrap();
    assert_that(&gopniks_balance.funds.amount.u128()).is_equal_to(750_000);

    let alice_associated_balances =
        project.staking_platform_query_associated_balances(ProjectAccount::Alice)?;
    let alice_atom_associated_balance = alice_associated_balances
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();
    assert_that(&alice_atom_associated_balance).is_equal_to(1_250_000);

    Ok(())
}

#[test]
fn claim_staking_rewards_with_minter_default() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    project.minter_try_create_denom(
        ProjectAccount::Owner,
        ProjectCoin::Noria,
        (1, ProjectCoin::Denom),
    )?;

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Minting,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[StakedCollectionInfo {
            collection_address: ProjectNft::Gopniks.to_string(),
            staked_token_info_list: vec![StakedTokenInfo {
                token_id: Uint128::new(1),
                staking_start_date: None,
                last_claim_date: None,
            }],
        }],
    )?;

    let delay = (MINS_PER_DAY * NANOS_PER_MIN) as u64;
    project.wait(delay);

    project.staking_platform_try_claim_staking_rewards(ProjectAccount::Alice)?;

    let alice_associated_balances =
        project.staking_platform_query_associated_balances(ProjectAccount::Alice)?;
    let alice_noria_associated_balance = alice_associated_balances
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();
    assert_that(&alice_noria_associated_balance).is_equal_to(2_000_000);

    Ok(())
}

#[test]
fn claim_staking_rewards_with_minter_and_empty_spender() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    project.minter_try_create_denom(
        ProjectAccount::Owner,
        ProjectCoin::Noria,
        (1, ProjectCoin::Denom),
    )?;

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_b: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            222u128,
            &Currency::new(
                &TokenUnverified::new_cw20(&ProjectToken::Inj.to_string()),
                18,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("500000"),
                emission_type: EmissionType::Minting,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        2,
        222u128,
        ProjectToken::Inj,
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        100_000u128,
        ProjectToken::Atom,
    )?;

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );
    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Pinjeons,
    );

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[
            StakedCollectionInfo {
                collection_address: ProjectNft::Gopniks.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(1),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            },
            StakedCollectionInfo {
                collection_address: ProjectNft::Pinjeons.to_string(),
                staked_token_info_list: vec![
                    StakedTokenInfo {
                        token_id: Uint128::new(1),
                        staking_start_date: None,
                        last_claim_date: None,
                    },
                    StakedTokenInfo {
                        token_id: Uint128::new(2),
                        staking_start_date: None,
                        last_claim_date: None,
                    },
                ],
            },
        ],
    )?;

    let delay = (12 * 60 * NANOS_PER_MIN) as u64;
    project.wait(delay);

    let alice_rewards = project.staking_platform_query_staking_rewards(ProjectAccount::Alice)?;
    let alice_rewards_atom = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();
    let alice_rewards_noria = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();

    // 1 nft * 1 atom * 0.5 days
    assert_that(&alice_rewards_atom).is_equal_to(500_000);
    // 2 nft * 0.5 noria * 0.5 days
    assert_that(&alice_rewards_noria).is_equal_to(500_000);

    project.staking_platform_try_claim_staking_rewards(ProjectAccount::Alice)?;

    let alice_associated_balances =
        project.staking_platform_query_associated_balances(ProjectAccount::Alice)?;
    let alice_atom_associated_balance = alice_associated_balances
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();
    let alice_noria_associated_balance = alice_associated_balances
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();

    assert_that(&alice_atom_associated_balance).is_equal_to(1_000_000);
    assert_that(&alice_noria_associated_balance).is_equal_to(1_500_000);

    Ok(())
}

#[test]
fn unstake_with_minter_and_empty_spender() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    project.minter_try_create_denom(
        ProjectAccount::Owner,
        ProjectCoin::Noria,
        (1, ProjectCoin::Denom),
    )?;

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_b: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            222u128,
            &Currency::new(
                &TokenUnverified::new_cw20(&ProjectToken::Inj.to_string()),
                18,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("500000"),
                emission_type: EmissionType::Minting,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        2,
        222u128,
        ProjectToken::Inj,
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        100_000u128,
        ProjectToken::Atom,
    )?;

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );
    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Pinjeons,
    );

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[
            StakedCollectionInfo {
                collection_address: ProjectNft::Gopniks.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(1),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            },
            StakedCollectionInfo {
                collection_address: ProjectNft::Pinjeons.to_string(),
                staked_token_info_list: vec![
                    StakedTokenInfo {
                        token_id: Uint128::new(1),
                        staking_start_date: None,
                        last_claim_date: None,
                    },
                    StakedTokenInfo {
                        token_id: Uint128::new(2),
                        staking_start_date: None,
                        last_claim_date: None,
                    },
                ],
            },
        ],
    )?;

    let delay = (12 * 60 * NANOS_PER_MIN) as u64;
    project.wait(delay);

    let alice_rewards = project.staking_platform_query_staking_rewards(ProjectAccount::Alice)?;
    let alice_rewards_atom = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();
    let alice_rewards_noria = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();

    // 1 nft * 1 atom * 0.5 days
    assert_that(&alice_rewards_atom).is_equal_to(500_000);
    // 2 nft * 0.5 noria * 0.5 days
    assert_that(&alice_rewards_noria).is_equal_to(500_000);

    project.staking_platform_try_unstake(
        ProjectAccount::Alice,
        &[StakedCollectionInfo {
            collection_address: ProjectNft::Gopniks.to_string(),
            staked_token_info_list: vec![StakedTokenInfo {
                token_id: Uint128::new(1),
                staking_start_date: None,
                last_claim_date: None,
            }],
        }],
    )?;

    let alice_associated_balances =
        project.staking_platform_query_associated_balances(ProjectAccount::Alice)?;
    let alice_atom_associated_balance = alice_associated_balances
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();

    assert_that(&alice_atom_associated_balance).is_equal_to(1_100_000);

    Ok(())
}

#[test]
fn claim_staking_rewards_and_unstake_all() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    project.minter_try_create_denom(
        ProjectAccount::Owner,
        ProjectCoin::Noria,
        (1, ProjectCoin::Denom),
    )?;

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_b: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            222u128,
            &Currency::new(
                &TokenUnverified::new_cw20(&ProjectToken::Inj.to_string()),
                18,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("500000"),
                emission_type: EmissionType::Minting,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        2,
        222u128,
        ProjectToken::Inj,
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        100_000u128,
        ProjectToken::Atom,
    )?;

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );
    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Pinjeons,
    );

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[
            StakedCollectionInfo {
                collection_address: ProjectNft::Gopniks.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(1),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            },
            StakedCollectionInfo {
                collection_address: ProjectNft::Pinjeons.to_string(),
                staked_token_info_list: vec![
                    StakedTokenInfo {
                        token_id: Uint128::new(1),
                        staking_start_date: None,
                        last_claim_date: None,
                    },
                    StakedTokenInfo {
                        token_id: Uint128::new(2),
                        staking_start_date: None,
                        last_claim_date: None,
                    },
                ],
            },
        ],
    )?;

    let delay = (12 * 60 * NANOS_PER_MIN) as u64;
    project.wait(delay);

    let alice_rewards = project.staking_platform_query_staking_rewards(ProjectAccount::Alice)?;
    let alice_rewards_atom = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();
    let alice_rewards_noria = alice_rewards
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();

    // 1 nft * 1 atom * 0.5 days
    assert_that(&alice_rewards_atom).is_equal_to(500_000);
    // 2 nft * 0.5 noria * 0.5 days
    assert_that(&alice_rewards_noria).is_equal_to(500_000);

    project.staking_platform_try_claim_staking_rewards(ProjectAccount::Alice)?;

    project.staking_platform_try_unstake(
        ProjectAccount::Alice,
        &[
            StakedCollectionInfo {
                collection_address: ProjectNft::Gopniks.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(1),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            },
            StakedCollectionInfo {
                collection_address: ProjectNft::Pinjeons.to_string(),
                staked_token_info_list: vec![
                    StakedTokenInfo {
                        token_id: Uint128::new(1),
                        staking_start_date: None,
                        last_claim_date: None,
                    },
                    StakedTokenInfo {
                        token_id: Uint128::new(2),
                        staking_start_date: None,
                        last_claim_date: None,
                    },
                ],
            },
        ],
    )?;

    let alice_associated_balances =
        project.staking_platform_query_associated_balances(ProjectAccount::Alice)?;
    let alice_atom_associated_balance = alice_associated_balances
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();
    let alice_noria_associated_balance = alice_associated_balances
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();

    assert_that(&alice_atom_associated_balance).is_equal_to(1_100_000);
    assert_that(&alice_noria_associated_balance).is_equal_to(1_500_000);

    let staker = project.staking_platform_query_stakers(&Some(vec![ProjectAccount::Alice]))?;
    assert_that(&(staker.len() == 1 && staker[0].staked_collection_info_list.is_empty()))
        .is_equal_to(true);

    Ok(())
}

#[test]
fn accept_proposal_update_collection_change_daily_rewards() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    let proposal_a: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    // increase daily rewards 2x
    let proposal_b: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::UpdateCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            new_collection_address: None,
            new_collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("2000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Gopniks,
        400_000u128,
        ProjectCoin::Noria,
    )?;

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[StakedCollectionInfo {
            collection_address: ProjectNft::Gopniks.to_string(),
            staked_token_info_list: vec![StakedTokenInfo {
                token_id: Uint128::new(1),
                staking_start_date: None,
                last_claim_date: None,
            }],
        }],
    )?;

    let delay = (3 * 60 * NANOS_PER_MIN) as u64;
    project.wait(delay);

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        2,
        100,
        ProjectCoin::Denom,
    )?;

    project.wait(delay);

    project.staking_platform_try_claim_staking_rewards(ProjectAccount::Alice)?;

    let alice_associated_balances =
        project.staking_platform_query_associated_balances(ProjectAccount::Alice)?;
    let alice_noria_associated_balance = alice_associated_balances
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();

    let owner_associated_balances =
        project.staking_platform_query_associated_balances(ProjectAccount::Owner)?;
    let owner_noria_associated_balance = owner_associated_balances
        .funds_list
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();

    // 125 + 250
    assert_that(&alice_noria_associated_balance).is_equal_to(1_375_000);
    // 1000 - 400
    assert_that(&owner_noria_associated_balance).is_equal_to(600_000);

    Ok(())
}

#[test]
fn accept_proposal_update_collection_change_staking_currency() -> StdResult<()> {
    let mut project = Project::new(Some(CHAIN_ID_DEV));

    project.minter_try_create_denom(
        ProjectAccount::Owner,
        ProjectCoin::Noria,
        (1, ProjectCoin::Denom),
    )?;
    project.minter_try_create_denom(
        ProjectAccount::Owner,
        ProjectCoin::Denom,
        (1, ProjectCoin::Denom),
    )?;

    let proposal_a1: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Noria.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Minting,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_a2: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::UpdateCollection {
            collection_address: ProjectNft::Gopniks.to_string(),
            new_collection_address: None,
            new_collection: Collection {
                name: ProjectNft::Gopniks.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Minting,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_b1: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::AddCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Inj.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    let proposal_b2: &Proposal<String, TokenUnverified> = &Proposal {
        proposal_status: None,
        price: Funds::new(
            100u128,
            &Currency::new(
                &TokenUnverified::new_native(&ProjectCoin::Denom.to_string()),
                6,
            ),
        ),
        proposal_type: ProposalType::UpdateCollection {
            collection_address: ProjectNft::Pinjeons.to_string(),
            new_collection_address: None,
            new_collection: Collection {
                name: ProjectNft::Pinjeons.to_string(),
                staking_currency: Currency::new(
                    &TokenUnverified::new_cw20(&ProjectToken::Atom.to_string()),
                    6,
                ),
                daily_rewards: str_to_dec("1000000"),
                emission_type: EmissionType::Spending,
                owner: ProjectAccount::Owner.to_string(),
            },
        },
    };

    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a1)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b1)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_a2)?;
    project.staking_platform_try_create_proposal(ProjectAccount::Admin, proposal_b2)?;

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        1,
        100,
        ProjectCoin::Denom,
    )?;
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        2,
        100,
        ProjectCoin::Denom,
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Pinjeons,
        400_000u128,
        ProjectToken::Inj,
    )?;

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Gopniks,
    );

    project.increase_allowances_nft(
        ProjectAccount::Alice,
        project.get_staking_platform_address(),
        ProjectNft::Pinjeons,
    );

    project.staking_platform_try_stake(
        ProjectAccount::Alice,
        &[
            StakedCollectionInfo {
                collection_address: ProjectNft::Gopniks.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(1),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            },
            StakedCollectionInfo {
                collection_address: ProjectNft::Pinjeons.to_string(),
                staked_token_info_list: vec![StakedTokenInfo {
                    token_id: Uint128::new(1),
                    staking_start_date: None,
                    last_claim_date: None,
                }],
            },
        ],
    )?;

    let delay = (6 * 60 * NANOS_PER_MIN) as u64;
    project.wait(delay);

    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        3,
        100,
        ProjectCoin::Denom,
    )?;
    project.staking_platform_try_accept_proposal(
        ProjectAccount::Owner,
        4,
        100,
        ProjectCoin::Denom,
    )?;

    project.staking_platform_try_deposit_tokens(
        ProjectAccount::Owner,
        ProjectNft::Pinjeons,
        400_000u128,
        ProjectToken::Atom,
    )?;

    project.wait(delay);

    project.staking_platform_try_claim_staking_rewards(ProjectAccount::Alice)?;

    let alice_balances = project.query_all_balances(ProjectAccount::Alice)?;
    let alice_denom_balance = alice_balances
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Denom.to_string()))
        .unwrap()
        .amount
        .u128();
    let alice_noria_balance = alice_balances
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();
    let alice_inj_balance = alice_balances
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Inj.into()))
        .unwrap()
        .amount
        .u128();
    let alice_atom_balance = alice_balances
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();

    // 250
    assert_that(&alice_denom_balance).is_equal_to(1_250_000);
    // 250
    assert_that(&alice_noria_balance).is_equal_to(1_250_000);
    // 250
    assert_that(&alice_inj_balance).is_equal_to(1_000_000_000_000_250_000);
    // 250
    assert_that(&alice_atom_balance).is_equal_to(1_250_000);

    let owner_balances = project.query_all_balances(ProjectAccount::Owner)?;
    let owner_denom_balance = owner_balances
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Denom.to_string()))
        .unwrap()
        .amount
        .u128();
    let owner_noria_balance = owner_balances
        .iter()
        .find(|x| x.currency.token == Token::new_native(&ProjectCoin::Noria.to_string()))
        .unwrap()
        .amount
        .u128();
    let owner_inj_balance = owner_balances
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Inj.into()))
        .unwrap()
        .amount
        .u128();
    let owner_atom_balance = owner_balances
        .iter()
        .find(|x| x.currency.token == Token::new_cw20(&ProjectToken::Atom.into()))
        .unwrap()
        .amount
        .u128();

    // 1_000_000 - 2 - 400
    assert_that(&owner_denom_balance).is_equal_to(999_598);
    // 1000
    assert_that(&owner_noria_balance).is_equal_to(1_000_000);

    // 1e18 - 400_000 + 150_000
    assert_that(&owner_inj_balance).is_equal_to(999_999_999_999_750_000);
    // 1000 - 400
    assert_that(&owner_atom_balance).is_equal_to(600_000);

    Ok(())
}

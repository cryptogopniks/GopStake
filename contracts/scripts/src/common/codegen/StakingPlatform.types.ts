/**
* This file was automatically generated by @cosmwasm/ts-codegen@0.35.3.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

export interface InstantiateMsg {
  minter?: string | null;
  owner?: string | null;
}
export type ExecuteMsg = {
  stake: {
    collections_to_stake: StakedCollectionInfoForString[];
  };
} | {
  unstake: {
    collections_to_unstake: StakedCollectionInfoForString[];
  };
} | {
  claim_staking_rewards: {};
} | {
  update_config: {
    minter?: string | null;
    owner?: string | null;
  };
} | {
  distribute_funds: {
    address_and_weight_list: [string, Decimal][];
  };
} | {
  remove_collection: {
    address: string;
  };
} | {
  create_proposal: {
    proposal: ProposalForStringAndTokenUnverified;
  };
} | {
  reject_proposal: {
    id: Uint128;
  };
} | {
  accept_proposal: {
    id: Uint128;
  };
} | {
  deposit_tokens: {
    collection_address: string;
  };
} | {
  withdraw_tokens: {
    amount: Uint128;
    collection_address: string;
  };
} | {
  receive: Cw20ReceiveMsg;
};
export type Timestamp = Uint64;
export type Uint64 = string;
export type Uint128 = string;
export type Decimal = string;
export type TokenUnverified = {
  native: {
    denom: string;
  };
} | {
  cw20: {
    address: string;
  };
};
export type ProposalStatus = "active" | "accepted" | "rejected";
export type ProposalTypeForStringAndTokenUnverified = {
  add_collection: {
    collection: CollectionForStringAndTokenUnverified;
    collection_address: string;
  };
} | {
  update_collection: {
    collection_address: string;
    new_collection: CollectionForStringAndTokenUnverified;
    new_collection_address?: string | null;
  };
};
export type EmissionType = "spending" | "minting";
export type Binary = string;
export interface StakedCollectionInfoForString {
  collection_address: string;
  staked_token_info_list: StakedTokenInfo[];
}
export interface StakedTokenInfo {
  last_claim_date?: Timestamp | null;
  staking_start_date?: Timestamp | null;
  token_id: Uint128;
}
export interface ProposalForStringAndTokenUnverified {
  price: FundsForTokenUnverified;
  proposal_status?: ProposalStatus | null;
  proposal_type: ProposalTypeForStringAndTokenUnverified;
}
export interface FundsForTokenUnverified {
  amount: Uint128;
  currency: CurrencyForTokenUnverified;
}
export interface CurrencyForTokenUnverified {
  decimals: number;
  token: TokenUnverified;
}
export interface CollectionForStringAndTokenUnverified {
  daily_rewards: Decimal;
  emission_type: EmissionType;
  name: string;
  owner: string;
  staking_currency: CurrencyForTokenUnverified;
}
export interface Cw20ReceiveMsg {
  amount: Uint128;
  msg: Binary;
  sender: string;
}
export type QueryMsg = {
  query_config: {};
} | {
  query_funds: {};
} | {
  query_stakers: {
    addresses?: string[] | null;
  };
} | {
  query_staking_rewards: {
    address: string;
  };
} | {
  query_associated_balances: {
    address: string;
  };
} | {
  query_proposals: {
    last_amount?: Uint128 | null;
  };
} | {
  query_collections: {
    addresses?: string[] | null;
  };
} | {
  query_collections_balances: {
    addresses?: string[] | null;
  };
};
export type MigrateMsg = string;
export type Token = {
  native: {
    denom: string;
  };
} | {
  cw20: {
    address: Addr;
  };
};
export type Addr = string;
export interface BalancesResponseItem {
  funds_list: FundsForToken[];
  staker_address: Addr;
}
export interface FundsForToken {
  amount: Uint128;
  currency: CurrencyForToken;
}
export interface CurrencyForToken {
  decimals: number;
  token: Token;
}
export type ArrayOfQueryCollectionsResponseItem = QueryCollectionsResponseItem[];
export interface QueryCollectionsResponseItem {
  address: Addr;
  collection: CollectionForAddrAndToken;
}
export interface CollectionForAddrAndToken {
  daily_rewards: Decimal;
  emission_type: EmissionType;
  name: string;
  owner: Addr;
  staking_currency: CurrencyForToken;
}
export type ArrayOfQueryCollectionsBalancesResponseItem = QueryCollectionsBalancesResponseItem[];
export interface QueryCollectionsBalancesResponseItem {
  address: Addr;
  funds: FundsForToken;
}
export interface Config {
  admin: Addr;
  chain_id_dev: string;
  minter?: Addr | null;
  owner?: Addr | null;
}
export type ArrayOfFundsForToken = FundsForToken[];
export type ProposalTypeForAddrAndToken = {
  add_collection: {
    collection: CollectionForAddrAndToken;
    collection_address: Addr;
  };
} | {
  update_collection: {
    collection_address: Addr;
    new_collection: CollectionForAddrAndToken;
    new_collection_address?: Addr | null;
  };
};
export type ArrayOfQueryProposalsResponseItem = QueryProposalsResponseItem[];
export interface QueryProposalsResponseItem {
  id: Uint128;
  proposal: ProposalForAddrAndToken;
}
export interface ProposalForAddrAndToken {
  price: FundsForToken;
  proposal_status?: ProposalStatus | null;
  proposal_type: ProposalTypeForAddrAndToken;
}
export type ArrayOfQueryStakersResponseItem = QueryStakersResponseItem[];
export interface QueryStakersResponseItem {
  staked_collection_info_list: StakedCollectionInfoForAddr[];
  staker_address: Addr;
}
export interface StakedCollectionInfoForAddr {
  collection_address: Addr;
  staked_token_info_list: StakedTokenInfo[];
}
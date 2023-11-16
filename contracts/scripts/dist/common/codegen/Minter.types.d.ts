/**
* This file was automatically generated by @cosmwasm/ts-codegen@0.35.3.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/
export interface InstantiateMsg {
    staking_platform?: string | null;
}
export type ExecuteMsg = {
    create_denom: {
        subdenom: string;
    };
} | {
    mint_tokens: {
        amount: Uint128;
        denom: string;
        mint_to_address: string;
    };
} | {
    burn_tokens: {};
} | {
    set_metadata: {
        metadata: Metadata;
    };
} | {
    update_config: {
        staking_platform?: string | null;
    };
};
export type Uint128 = string;
export interface Metadata {
    base: string;
    denom_units: DenomUnit[];
    description: string;
    display: string;
    name: string;
    symbol: string;
    uri?: string | null;
    uri_hash?: string | null;
}
export interface DenomUnit {
    aliases: string[];
    denom: string;
    exponent: number;
}
export type QueryMsg = {
    denoms_by_creator: {
        creator: string;
    };
} | {
    query_config: {};
};
export type MigrateMsg = string;
export interface QueryDenomsFromCreatorResponse {
    denoms: string[];
}
export type Addr = string;
export interface Config {
    admin: Addr;
    chain_id_dev: string;
    staking_platform?: Addr | null;
}

/**
* This file was automatically generated by @cosmwasm/ts-codegen@0.35.3.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/
import { CosmWasmClient, SigningCosmWasmClient, ExecuteResult } from "@cosmjs/cosmwasm-stargate";
import { Coin, StdFee } from "@cosmjs/amino";
import { Uint128, Metadata, QueryDenomsFromCreatorResponse, Config } from "./Minter.types";
export interface MinterReadOnlyInterface {
    contractAddress: string;
    denomsByCreator: ({ creator }: {
        creator: string;
    }) => Promise<QueryDenomsFromCreatorResponse>;
    queryConfig: () => Promise<Config>;
}
export declare class MinterQueryClient implements MinterReadOnlyInterface {
    client: CosmWasmClient;
    contractAddress: string;
    constructor(client: CosmWasmClient, contractAddress: string);
    denomsByCreator: ({ creator }: {
        creator: string;
    }) => Promise<QueryDenomsFromCreatorResponse>;
    queryConfig: () => Promise<Config>;
}
export interface MinterInterface extends MinterReadOnlyInterface {
    contractAddress: string;
    sender: string;
    createDenom: ({ subdenom }: {
        subdenom: string;
    }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
    mintTokens: ({ amount, denom, mintToAddress }: {
        amount: Uint128;
        denom: string;
        mintToAddress: string;
    }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
    burnTokens: ({ amount, burnFromAddress, denom }: {
        amount: Uint128;
        burnFromAddress: string;
        denom: string;
    }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
    setMetadata: ({ metadata }: {
        metadata: Metadata;
    }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
    updateConfig: ({ stakingPlatform }: {
        stakingPlatform?: string;
    }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
}
export declare class MinterClient extends MinterQueryClient implements MinterInterface {
    client: SigningCosmWasmClient;
    sender: string;
    contractAddress: string;
    constructor(client: SigningCosmWasmClient, sender: string, contractAddress: string);
    createDenom: ({ subdenom }: {
        subdenom: string;
    }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
    mintTokens: ({ amount, denom, mintToAddress }: {
        amount: Uint128;
        denom: string;
        mintToAddress: string;
    }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
    burnTokens: ({ amount, burnFromAddress, denom }: {
        amount: Uint128;
        burnFromAddress: string;
        denom: string;
    }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
    setMetadata: ({ metadata }: {
        metadata: Metadata;
    }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
    updateConfig: ({ stakingPlatform }: {
        stakingPlatform?: string | undefined;
    }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
}

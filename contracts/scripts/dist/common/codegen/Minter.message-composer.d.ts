/**
* This file was automatically generated by @cosmwasm/ts-codegen@0.35.3.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/
import { Coin } from "@cosmjs/amino";
import { MsgExecuteContractEncodeObject } from "@cosmjs/cosmwasm-stargate";
import { Uint128, Metadata } from "./Minter.types";
export interface MinterMsg {
    contractAddress: string;
    sender: string;
    createDenom: ({ subdenom, tokenOwner }: {
        subdenom: string;
        tokenOwner: string;
    }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
    mintTokens: ({ amount, denom, mintToAddress }: {
        amount: Uint128;
        denom: string;
        mintToAddress: string;
    }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
    burnTokens: (_funds?: Coin[]) => MsgExecuteContractEncodeObject;
    setMetadata: ({ metadata }: {
        metadata: Metadata;
    }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
    updateConfig: ({ owner, stakingPlatform }: {
        owner?: string;
        stakingPlatform?: string;
    }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
}
export declare class MinterMsgComposer implements MinterMsg {
    sender: string;
    contractAddress: string;
    constructor(sender: string, contractAddress: string);
    createDenom: ({ subdenom, tokenOwner }: {
        subdenom: string;
        tokenOwner: string;
    }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
    mintTokens: ({ amount, denom, mintToAddress }: {
        amount: Uint128;
        denom: string;
        mintToAddress: string;
    }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
    burnTokens: (_funds?: Coin[]) => MsgExecuteContractEncodeObject;
    setMetadata: ({ metadata }: {
        metadata: Metadata;
    }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
    updateConfig: ({ owner, stakingPlatform }: {
        owner?: string | undefined;
        stakingPlatform?: string | undefined;
    }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
}

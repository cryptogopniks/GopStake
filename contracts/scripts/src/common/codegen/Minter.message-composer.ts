/**
* This file was automatically generated by @cosmwasm/ts-codegen@0.35.3.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

import { Coin } from "@cosmjs/amino";
import { MsgExecuteContractEncodeObject } from "@cosmjs/cosmwasm-stargate";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { toUtf8 } from "@cosmjs/encoding";
import { InstantiateMsg, ExecuteMsg, Uint128, Metadata, DenomUnit, QueryMsg, MigrateMsg, QueryDenomsFromCreatorResponse, Addr, Config } from "./Minter.types";
export interface MinterMsg {
  contractAddress: string;
  sender: string;
  createDenom: ({
    subdenom,
    tokenOwner
  }: {
    subdenom: string;
    tokenOwner: string;
  }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
  mintTokens: ({
    amount,
    denom,
    mintToAddress
  }: {
    amount: Uint128;
    denom: string;
    mintToAddress: string;
  }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
  burnTokens: (_funds?: Coin[]) => MsgExecuteContractEncodeObject;
  setMetadata: ({
    metadata
  }: {
    metadata: Metadata;
  }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
  updateConfig: ({
    owner,
    stakingPlatform
  }: {
    owner?: string;
    stakingPlatform?: string;
  }, _funds?: Coin[]) => MsgExecuteContractEncodeObject;
}
export class MinterMsgComposer implements MinterMsg {
  sender: string;
  contractAddress: string;

  constructor(sender: string, contractAddress: string) {
    this.sender = sender;
    this.contractAddress = contractAddress;
    this.createDenom = this.createDenom.bind(this);
    this.mintTokens = this.mintTokens.bind(this);
    this.burnTokens = this.burnTokens.bind(this);
    this.setMetadata = this.setMetadata.bind(this);
    this.updateConfig = this.updateConfig.bind(this);
  }

  createDenom = ({
    subdenom,
    tokenOwner
  }: {
    subdenom: string;
    tokenOwner: string;
  }, _funds?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          create_denom: {
            subdenom,
            token_owner: tokenOwner
          }
        })),
        funds: _funds
      })
    };
  };
  mintTokens = ({
    amount,
    denom,
    mintToAddress
  }: {
    amount: Uint128;
    denom: string;
    mintToAddress: string;
  }, _funds?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          mint_tokens: {
            amount,
            denom,
            mint_to_address: mintToAddress
          }
        })),
        funds: _funds
      })
    };
  };
  burnTokens = (_funds?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          burn_tokens: {}
        })),
        funds: _funds
      })
    };
  };
  setMetadata = ({
    metadata
  }: {
    metadata: Metadata;
  }, _funds?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          set_metadata: {
            metadata
          }
        })),
        funds: _funds
      })
    };
  };
  updateConfig = ({
    owner,
    stakingPlatform
  }: {
    owner?: string;
    stakingPlatform?: string;
  }, _funds?: Coin[]): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          update_config: {
            owner,
            staking_platform: stakingPlatform
          }
        })),
        funds: _funds
      })
    };
  };
}
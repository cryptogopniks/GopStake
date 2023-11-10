/**
* This file was automatically generated by @cosmwasm/ts-codegen@0.35.3.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { toUtf8 } from "@cosmjs/encoding";
export class MinterMsgComposer {
  constructor(sender, contractAddress) {
    this.sender = sender;
    this.contractAddress = contractAddress;
    this.createDenom = this.createDenom.bind(this);
    this.mintTokens = this.mintTokens.bind(this);
    this.burnTokens = this.burnTokens.bind(this);
    this.setMetadata = this.setMetadata.bind(this);
    this.updateConfig = this.updateConfig.bind(this);
  }
  createDenom = ({
    subdenom
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          create_denom: {
            subdenom
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
  }, _funds) => {
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
  burnTokens = ({
    amount,
    burnFromAddress,
    denom
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          burn_tokens: {
            amount,
            burn_from_address: burnFromAddress,
            denom
          }
        })),
        funds: _funds
      })
    };
  };
  setMetadata = ({
    metadata
  }, _funds) => {
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
    stakingPlatform
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          update_config: {
            staking_platform: stakingPlatform
          }
        })),
        funds: _funds
      })
    };
  };
}
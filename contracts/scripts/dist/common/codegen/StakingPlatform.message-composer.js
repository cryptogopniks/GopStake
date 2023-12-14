/**
* This file was automatically generated by @cosmwasm/ts-codegen@0.35.3.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { toUtf8 } from "@cosmjs/encoding";
export class StakingPlatformMsgComposer {
  constructor(sender, contractAddress) {
    this.sender = sender;
    this.contractAddress = contractAddress;
    this.stake = this.stake.bind(this);
    this.unstake = this.unstake.bind(this);
    this.claimStakingRewards = this.claimStakingRewards.bind(this);
    this.updateConfig = this.updateConfig.bind(this);
    this.lock = this.lock.bind(this);
    this.unlock = this.unlock.bind(this);
    this.distributeFunds = this.distributeFunds.bind(this);
    this.removeCollection = this.removeCollection.bind(this);
    this.createProposal = this.createProposal.bind(this);
    this.rejectProposal = this.rejectProposal.bind(this);
    this.acceptProposal = this.acceptProposal.bind(this);
    this.depositTokens = this.depositTokens.bind(this);
    this.withdrawTokens = this.withdrawTokens.bind(this);
    this.receive = this.receive.bind(this);
  }
  stake = ({
    collectionsToStake
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          stake: {
            collections_to_stake: collectionsToStake
          }
        })),
        funds: _funds
      })
    };
  };
  unstake = ({
    collectionsToUnstake
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          unstake: {
            collections_to_unstake: collectionsToUnstake
          }
        })),
        funds: _funds
      })
    };
  };
  claimStakingRewards = ({
    collection
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          claim_staking_rewards: {
            collection
          }
        })),
        funds: _funds
      })
    };
  };
  updateConfig = ({
    minter,
    owner
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          update_config: {
            minter,
            owner
          }
        })),
        funds: _funds
      })
    };
  };
  lock = _funds => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          lock: {}
        })),
        funds: _funds
      })
    };
  };
  unlock = _funds => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          unlock: {}
        })),
        funds: _funds
      })
    };
  };
  distributeFunds = ({
    addressAndWeightList
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          distribute_funds: {
            address_and_weight_list: addressAndWeightList
          }
        })),
        funds: _funds
      })
    };
  };
  removeCollection = ({
    address
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          remove_collection: {
            address
          }
        })),
        funds: _funds
      })
    };
  };
  createProposal = ({
    proposal
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          create_proposal: {
            proposal
          }
        })),
        funds: _funds
      })
    };
  };
  rejectProposal = ({
    id
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          reject_proposal: {
            id
          }
        })),
        funds: _funds
      })
    };
  };
  acceptProposal = ({
    id
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          accept_proposal: {
            id
          }
        })),
        funds: _funds
      })
    };
  };
  depositTokens = ({
    collectionAddress
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          deposit_tokens: {
            collection_address: collectionAddress
          }
        })),
        funds: _funds
      })
    };
  };
  withdrawTokens = ({
    amount,
    collectionAddress
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          withdraw_tokens: {
            amount,
            collection_address: collectionAddress
          }
        })),
        funds: _funds
      })
    };
  };
  receive = ({
    amount,
    msg,
    sender
  }, _funds) => {
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: this.sender,
        contract: this.contractAddress,
        msg: toUtf8(JSON.stringify({
          receive: {
            amount,
            msg,
            sender
          }
        })),
        funds: _funds
      })
    };
  };
}
import { l } from "../utils";
import { getExecuteContractMsg } from "./clients";
import { toUtf8, toBase64, fromUtf8 } from "@cosmjs/encoding";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";
import { NETWORK_CONFIG, MINTER_WASM, STAKING_PLATFORM_WASM } from "../config";
import { MinterMsgComposer } from "../codegen/Minter.message-composer";
import { StakingPlatformMsgComposer } from "../codegen/StakingPlatform.message-composer";
import { ChainGrpcWasmApi, MsgExecuteContract } from "@injectivelabs/sdk-ts";
const networkType = Network.Testnet;
function getInjExecMsgFromComposerObj(obj) {
  const {
    value: {
      contract,
      sender,
      msg,
      funds
    }
  } = obj;
  if (!(contract && sender && msg)) {
    throw new Error(`${msg} parameters error!`);
  }
  return MsgExecuteContract.fromJSON({
    contractAddress: contract,
    sender,
    msg: JSON.parse(fromUtf8(msg)),
    funds
  });
}
function getSingleTokenExecMsg(obj, amount, token) {
  const {
    value: {
      contract,
      sender,
      msg
    }
  } = obj;
  if (!(contract && sender && msg)) {
    throw new Error(`${msg} parameters error!`);
  }

  // get msg without funds
  if (!(token && amount)) {
    return MsgExecuteContract.fromJSON({
      contractAddress: contract,
      sender,
      msg: JSON.parse(fromUtf8(msg)),
      funds: undefined
    });
  }

  // get msg with native token
  if ("native" in token) {
    return MsgExecuteContract.fromJSON({
      contractAddress: contract,
      sender,
      msg: JSON.parse(fromUtf8(msg)),
      funds: {
        amount: `${amount}`,
        denom: token.native.denom
      }
    });
  }

  // TODO: check
  // get msg with CW20 token
  const cw20SendMsg = {
    send: {
      contract: token.cw20.address,
      amount: `${amount}`,
      msg: toBase64(msg)
    }
  };
  return MsgExecuteContract.fromJSON({
    contractAddress: contract,
    sender,
    msg: cw20SendMsg,
    funds: undefined
  });
}
async function queryInjContract(chainGrpcWasmApi, contractAddress, queryMsg) {
  const {
    data
  } = await chainGrpcWasmApi.fetchSmartContractState(contractAddress, toBase64(toUtf8(JSON.stringify(queryMsg))));
  return fromUtf8(data);
}
function getApproveCollectionMsg(collectionAddress, senderAddress, operator) {
  const approveCollectionMsg = {
    approve_all: {
      operator
    }
  };
  return getSingleTokenExecMsg(getExecuteContractMsg(collectionAddress, senderAddress, approveCollectionMsg, []));
}
function getRevokeCollectionMsg(collectionAddress, senderAddress, operator) {
  const revokeCollectionMsg = {
    revoke_all: {
      operator
    }
  };
  return getSingleTokenExecMsg(getExecuteContractMsg(collectionAddress, senderAddress, revokeCollectionMsg, []));
}
function getSetMetadataMsg(minterContractAddress, senderAddress, setMetadataMsg) {
  return getSingleTokenExecMsg(getExecuteContractMsg(minterContractAddress, senderAddress, setMetadataMsg, []));
}

// symbol - PINJ
// description - Awesome DAO Pinjeons NFT collection staking token
// full_denom - factory/osmo1ggnqrq28tk7tlyp4c5f2mv4907wa92f5y4gvfhqv5t43fxx4mdxsd8kfs0/upinj
function createMetadata(creatorAddress, symbol, description, uri = "", uriHash = "") {
  const decimals = 6;
  let subdenom = symbol.toLowerCase();
  let fullDenom = `factory/${creatorAddress}/u${subdenom}`;
  if (symbol != symbol.toUpperCase()) {
    throw new Error("Symbol must be uppercased!");
  }
  return {
    base: fullDenom,
    denom_units: [{
      aliases: [],
      denom: fullDenom,
      exponent: "0"
    }, {
      aliases: [],
      denom: subdenom,
      exponent: `${decimals}`
    }],
    description,
    display: subdenom,
    name: symbol,
    symbol,
    uri,
    uri_hash: uriHash
  };
}
async function getCwExecHelpers(network, owner, msgBroadcaster) {
  const {
    CONTRACTS
  } = NETWORK_CONFIG[network];
  const MINTER_CONTRACT = CONTRACTS.find(x => x.WASM === MINTER_WASM);
  if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");
  const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(x => x.WASM === STAKING_PLATFORM_WASM);
  if (!STAKING_PLATFORM_CONTRACT) {
    throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
  }
  const stakingPlatformMsgComposer = new StakingPlatformMsgComposer(owner, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS);
  const minterMsgComposer = new MinterMsgComposer(owner, MINTER_CONTRACT.DATA.ADDRESS);

  // staking-platform

  async function cwApproveCollection(collectionAddress, senderAddress, operator, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getApproveCollectionMsg(collectionAddress, senderAddress, operator)]
    });
  }
  async function cwRevokeCollection(collectionAddress, senderAddress, operator, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getRevokeCollectionMsg(collectionAddress, senderAddress, operator)]
    });
  }
  async function cwStake(collectionsToStake, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.stake({
        collectionsToStake
      }))]
    });
  }
  async function cwUnstake(collectionsToUnstake, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.unstake({
        collectionsToUnstake
      }))]
    });
  }
  async function cwClaimStakingRewards(_gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.claimStakingRewards())]
    });
  }
  async function cwUpdateStakingPlatformConfig(updateStakingPlatformConfigStruct, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.updateConfig(updateStakingPlatformConfigStruct))]
    });
  }
  async function cwDistributeFunds(addressAndWeightList, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.distributeFunds({
        addressAndWeightList
      }))]
    });
  }
  async function cwRemoveCollection(address, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.removeCollection({
        address
      }))]
    });
  }
  async function cwCreateProposal(proposal, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.createProposal({
        proposal
      }))]
    });
  }
  async function cwRejectProposal(id, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.rejectProposal({
        id: `${id}`
      }))]
    });
  }
  async function cwAcceptProposal(id, amount, token, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getSingleTokenExecMsg(stakingPlatformMsgComposer.acceptProposal({
        id: `${id}`
      }), amount, token)]
    });
  }
  async function cwDepositTokens(collectionAddress, amount, token, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getSingleTokenExecMsg(stakingPlatformMsgComposer.depositTokens({
        collectionAddress
      }), amount, token)]
    });
  }
  async function cwWithdrawTokens(collectionAddress, amount, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.withdrawTokens({
        collectionAddress,
        amount: `${amount}`
      }))]
    });
  }

  // minter

  async function cwCreateDenom(subdenom, paymentAmount, paymentDenom, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getSingleTokenExecMsg(minterMsgComposer.createDenom({
        subdenom
      }), paymentAmount, {
        native: {
          denom: paymentDenom
        }
      })]
    });
  }
  async function cwMintTokens(denom, amount, mintToAddress, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(minterMsgComposer.mintTokens({
        denom,
        amount: `${amount}`,
        mintToAddress
      }))]
    });
  }
  async function cwBurnTokens(denom, amount, burnFromAddress, _gasPrice) {
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(minterMsgComposer.burnTokens({
        denom,
        amount: `${amount}`,
        burnFromAddress
      }))]
    });
  }
  async function cwSetMetadata(creatorAddress, symbol, description, uri = "", uriHash = "", _gasPrice) {
    const metadata = createMetadata(creatorAddress, symbol, description, uri, uriHash);
    const setMetadataMsg = {
      set_metadata: {
        metadata
      }
    };
    if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");
    return await msgBroadcaster.broadcast({
      msgs: [getSetMetadataMsg(MINTER_CONTRACT.DATA.ADDRESS, owner, setMetadataMsg)]
    });
  }
  async function cwUpdateMinterConfig(updateMinterConfigStruct, _gasPrice) {
    const {
      stakingPlatform
    } = updateMinterConfigStruct;
    return await msgBroadcaster.broadcast({
      msgs: [getInjExecMsgFromComposerObj(minterMsgComposer.updateConfig({
        stakingPlatform
      }))]
    });
  }
  return {
    // frontend
    cwApproveCollection,
    cwRevokeCollection,
    cwStake,
    cwUnstake,
    cwClaimStakingRewards,
    cwDistributeFunds,
    cwRemoveCollection,
    cwCreateProposal,
    cwRejectProposal,
    cwAcceptProposal,
    cwDepositTokens,
    cwWithdrawTokens,
    cwCreateDenom,
    cwMintTokens,
    cwBurnTokens,
    cwSetMetadata,
    // backend
    cwUpdateStakingPlatformConfig,
    cwUpdateMinterConfig
  };
}
async function getCwQueryHelpers(network) {
  const {
    CONTRACTS
  } = NETWORK_CONFIG[network];
  const MINTER_CONTRACT = CONTRACTS.find(x => x.WASM === MINTER_WASM);
  const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(x => x.WASM === STAKING_PLATFORM_WASM);
  const endpoints = getNetworkEndpoints(networkType);
  const chainGrpcWasmApi = new ChainGrpcWasmApi(endpoints.grpc);

  // staking platform

  async function cwQueryApprovals(collectionAddress, tokenId) {
    const msg = {
      token_id: `${tokenId}`
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, collectionAddress, msg));
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryStakingPlatformConfig() {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }
    const msg = {
      query_config: {}
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS, msg));
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryFunds() {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }
    const msg = {
      query_funds: {}
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS, msg));
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryStakers(addresses) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }
    const msg = {
      query_stakers: {
        addresses
      }
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS, msg));
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryStakingRewards(address) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }
    const msg = {
      query_staking_rewards: {
        address
      }
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS, msg));
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryAssociatedBalances(address) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }
    const msg = {
      query_associated_balances: {
        address
      }
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS, msg));
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryProposals(lastAmount) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }
    const msg = {
      query_proposals: {
        last_amount: lastAmount ? `${lastAmount}` : undefined
      }
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS, msg));
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryCollections(addresses) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }
    const msg = {
      query_collections: {
        addresses
      }
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS, msg));
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryCollectionsBalances(addresses) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }
    const msg = {
      query_collections_balances: {
        addresses
      }
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS, msg));
    l("\n", res, "\n");
    return res;
  }

  // minter

  async function cwQueryDenomsByCreator(creator) {
    if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");
    const msg = {
      denoms_by_creator: {
        creator
      }
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, MINTER_CONTRACT.DATA.ADDRESS, msg));
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryMinterConfig() {
    if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");
    const msg = {
      query_config: {}
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, MINTER_CONTRACT.DATA.ADDRESS, msg));
    l("\n", res, "\n");
    return res;
  }
  return {
    cwQueryApprovals,
    cwQueryStakingPlatformConfig,
    cwQueryFunds,
    cwQueryStakers,
    cwQueryStakingRewards,
    cwQueryAssociatedBalances,
    cwQueryProposals,
    cwQueryCollections,
    cwQueryCollectionsBalances,
    cwQueryDenomsByCreator,
    cwQueryMinterConfig
  };
}
export default {
  getInjExecMsgFromComposerObj,
  queryInjContract
};
export { getCwExecHelpers, getCwQueryHelpers };
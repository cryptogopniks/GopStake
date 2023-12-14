import { l, getLast } from "../utils";
import { getExecuteContractMsg } from "./clients";
import { toUtf8, toBase64, fromUtf8 } from "@cosmjs/encoding";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";
import { MinterMsgComposer } from "../codegen/Minter.message-composer";
import { StakingPlatformMsgComposer } from "../codegen/StakingPlatform.message-composer";
import { NETWORK_CONFIG, MINTER_WASM, STAKING_PLATFORM_WASM, INJ_MINTER_WASM } from "../config";
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
  return [MsgExecuteContract.fromJSON({
    contractAddress: contract,
    sender,
    msg: JSON.parse(fromUtf8(msg)),
    funds
  }), sender];
}
function getSingleTokenExecMsg(obj, amount, token) {
  const {
    value: {
      contract,
      sender,
      msg: _msg
    }
  } = obj;
  if (!(contract && sender && _msg)) {
    throw new Error(`${_msg} parameters error!`);
  }
  const msg = JSON.parse(fromUtf8(_msg));

  // get msg without funds
  if (!(token && amount)) {
    return [MsgExecuteContract.fromJSON({
      contractAddress: contract,
      sender,
      msg
    }), sender];
  }

  // get msg with native token
  if ("native" in token) {
    return [MsgExecuteContract.fromJSON({
      contractAddress: contract,
      sender,
      msg,
      funds: {
        amount: `${amount}`,
        denom: token.native.denom
      }
    }), sender];
  }

  // get msg with CW20 token
  const cw20SendMsg = {
    send: {
      contract,
      amount: `${amount}`,
      msg: toBase64(msg)
    }
  };
  return [MsgExecuteContract.fromJSON({
    contractAddress: token.cw20.address,
    sender,
    msg: cw20SendMsg
  }), sender];
}
async function queryInjContract(chainGrpcWasmApi, contractAddress, queryMsg) {
  const {
    data
  } = await chainGrpcWasmApi.fetchSmartContractState(contractAddress, toBase64(toUtf8(JSON.stringify(queryMsg))));
  return fromUtf8(data);
}
function getApproveNftMsg(collectionAddress, tokenId, senderAddress, operator) {
  const approveMsg = {
    approve: {
      spender: operator,
      token_id: `${tokenId}`
    }
  };
  return getSingleTokenExecMsg(getExecuteContractMsg(collectionAddress, senderAddress, approveMsg, []));
}
function getRevokeNftMsg(collectionAddress, tokenId, senderAddress, operator) {
  const revokeMsg = {
    revoke: {
      spender: operator,
      token_id: `${tokenId}`
    }
  };
  return getSingleTokenExecMsg(getExecuteContractMsg(collectionAddress, senderAddress, revokeMsg, []));
}
function getSetMetadataMsg(minterContractAddress, senderAddress, setMetadataMsg) {
  return getSingleTokenExecMsg(getExecuteContractMsg(minterContractAddress, senderAddress, setMetadataMsg, []));
}
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
  const MINTER_CONTRACT = CONTRACTS.find(x => x.WASM === (network === "INJECTIVE" ? INJ_MINTER_WASM : MINTER_WASM));
  if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");
  const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(x => x.WASM === STAKING_PLATFORM_WASM);
  if (!STAKING_PLATFORM_CONTRACT) {
    throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
  }
  const stakingPlatformMsgComposer = new StakingPlatformMsgComposer(owner, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS);
  const minterMsgComposer = new MinterMsgComposer(owner, MINTER_CONTRACT.DATA.ADDRESS);
  async function cwRevoke(collectionAddress, tokenId, senderAddress, operator, _gasPrice) {
    const [msg, sender] = getRevokeNftMsg(collectionAddress, tokenId, senderAddress, operator);
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }

  // staking-platform

  async function cwApproveAndStake(senderAddress, operator, collectionsToStake, _gasPrice) {
    let msgList = [];
    for (const {
      collection_address,
      staked_token_info_list
    } of collectionsToStake) {
      for (const {
        token_id
      } of staked_token_info_list) {
        msgList.push(getApproveNftMsg(collection_address, +token_id, senderAddress, operator)[0]);
      }
    }
    const [msg, sender] = getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.stake({
      collectionsToStake
    }));
    return await msgBroadcaster.broadcast({
      msgs: [...msgList, msg],
      injectiveAddress: sender
    });
  }
  async function cwUnstake(collectionsToUnstake, _gasPrice) {
    const [msg, sender] = getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.unstake({
      collectionsToUnstake
    }));
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwClaimStakingRewards({
    collection
  }, _gasPrice) {
    const [msg, sender] = getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.claimStakingRewards({
      collection
    }));
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwLock(_gasPrice) {
    const [msg, sender] = getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.lock());
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwUnlock(_gasPrice) {
    const [msg, sender] = getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.unlock());
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwDistributeFunds(addressAndWeightList, _gasPrice) {
    const [msg, sender] = getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.distributeFunds({
      addressAndWeightList
    }));
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwRemoveCollection(address, _gasPrice) {
    const [msg, sender] = getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.removeCollection({
      address
    }));
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwCreateProposal(proposal, _gasPrice) {
    const [msg, sender] = getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.createProposal({
      proposal
    }));
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwRejectProposal(id, _gasPrice) {
    const [msg, sender] = getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.rejectProposal({
      id: `${id}`
    }));
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwAcceptProposal(id, amount, token, _gasPrice) {
    const [msg, sender] = getSingleTokenExecMsg(stakingPlatformMsgComposer.acceptProposal({
      id: `${id}`
    }), amount, token);
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwDepositTokens(collectionAddress, amount, token, _gasPrice) {
    const [msg, sender] = getSingleTokenExecMsg(stakingPlatformMsgComposer.depositTokens({
      collectionAddress
    }), amount, token);
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwWithdrawTokens(collectionAddress, amount, _gasPrice) {
    const [msg, sender] = getInjExecMsgFromComposerObj(stakingPlatformMsgComposer.withdrawTokens({
      collectionAddress,
      amount: `${amount}`
    }));
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }

  // minter

  async function cwCreateDenom(subdenom, paymentAmount, paymentDenom, _gasPrice) {
    const [msg, sender] = getSingleTokenExecMsg(minterMsgComposer.createDenom({
      subdenom
    }), paymentAmount, {
      native: {
        denom: paymentDenom
      }
    });
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwMintTokens(denom, amount, mintToAddress, _gasPrice) {
    const [msg, sender] = getInjExecMsgFromComposerObj(minterMsgComposer.mintTokens({
      denom,
      amount: `${amount}`,
      mintToAddress
    }));
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwBurnTokens(denom, amount, _gasPrice) {
    const [msg, sender] = getSingleTokenExecMsg(minterMsgComposer.burnTokens(), amount, {
      native: {
        denom
      }
    });
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
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
    const [msg, sender] = getSetMetadataMsg(MINTER_CONTRACT.DATA.ADDRESS, owner, setMetadataMsg);
    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender
    });
  }
  async function cwUpdateConfig(updateConfigStruct, _gasPrice) {
    let msgList = [];
    const {
      stakingPlatform,
      minter,
      owner
    } = updateConfigStruct;
    if (stakingPlatform) {
      msgList.push(minterMsgComposer.updateConfig({
        stakingPlatform
      }));
    }
    if (minter || owner) {
      msgList.push(stakingPlatformMsgComposer.updateConfig({
        minter,
        owner
      }));
    }
    if (!msgList.length) {
      throw new Error("cwUpdateConfig arguments are not provided!");
    }
    const msgs = msgList.map(x => getInjExecMsgFromComposerObj(x)[0]);
    const [{
      value: {
        sender
      }
    }] = msgList;
    return await msgBroadcaster.broadcast({
      msgs,
      injectiveAddress: sender
    });
  }
  return {
    // frontend
    cwApproveAndStake,
    cwUnstake,
    cwClaimStakingRewards,
    cwLock,
    cwUnlock,
    cwDistributeFunds,
    cwRemoveCollection,
    cwCreateProposal,
    cwRejectProposal,
    cwAcceptProposal,
    cwDepositTokens,
    cwWithdrawTokens,
    cwCreateDenom,
    cwSetMetadata,
    // backend
    cwRevoke,
    cwMintTokens,
    cwBurnTokens,
    cwUpdateConfig
  };
}
async function getCwQueryHelpers(network) {
  const {
    CONTRACTS
  } = NETWORK_CONFIG[network];
  const MINTER_CONTRACT = CONTRACTS.find(x => x.WASM === (network === "INJECTIVE" ? INJ_MINTER_WASM : MINTER_WASM));
  const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(x => x.WASM === STAKING_PLATFORM_WASM);
  const endpoints = getNetworkEndpoints(networkType);
  const chainGrpcWasmApi = new ChainGrpcWasmApi(endpoints.grpc);

  // staking platform

  async function cwQueryApprovals(collectionAddress, tokenId) {
    const msg = {
      approvals: {
        token_id: `${tokenId}`
      }
    };
    const res = JSON.parse(await queryInjContract(chainGrpcWasmApi, collectionAddress, msg));
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryBalanceInNft(owner, collectionAddress) {
    const MAX_LIMIT = 100;
    const ITER_LIMIT = 50;
    let tokenList = [];
    let tokenAmountSum = 0;
    let i = 0;
    let lastToken = undefined;
    while ((!i || tokenAmountSum === MAX_LIMIT) && i < ITER_LIMIT) {
      i++;
      try {
        const msg = {
          tokens: {
            owner,
            start_after: lastToken,
            limit: MAX_LIMIT
          }
        };
        const {
          ids
        } = JSON.parse(await queryInjContract(chainGrpcWasmApi, collectionAddress, msg));
        tokenList = [...tokenList, ...ids];
        tokenAmountSum = ids.length;
        lastToken = getLast(ids);
      } catch (error) {
        l(error);
      }
    }
    const res = {
      tokens: tokenList
    };
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryNftOwner(collectionAddress, tokenId) {
    const msg = {
      owner_of: {
        token_id: `${tokenId}`
      }
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
  async function cwQueryStakingRewardsPerCollection(staker, collection) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }
    const msg = {
      query_staking_rewards_per_collection: {
        staker,
        collection
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
    cwQueryBalanceInNft,
    cwQueryNftOwner,
    cwQueryStakingPlatformConfig,
    cwQueryFunds,
    cwQueryStakers,
    cwQueryStakingRewards,
    cwQueryStakingRewardsPerCollection,
    cwQueryAssociatedBalances,
    cwQueryProposals,
    cwQueryCollections,
    cwQueryCollectionsBalances,
    cwQueryDenomsByCreator,
    cwQueryMinterConfig
  };
}
export { getCwExecHelpers, getCwQueryHelpers };
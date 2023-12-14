import { l, getLast } from "../utils";
import { toBase64, fromUtf8 } from "@cosmjs/encoding";
import { MinterMsgComposer } from "../codegen/Minter.message-composer";
import { MinterQueryClient } from "../codegen/Minter.client";
import { StakingPlatformMsgComposer } from "../codegen/StakingPlatform.message-composer";
import { StakingPlatformQueryClient } from "../codegen/StakingPlatform.client";
import { NETWORK_CONFIG, MINTER_WASM, STAKING_PLATFORM_WASM } from "../config";
import { getCwClient, signAndBroadcastWrapper, getExecuteContractMsg } from "./clients";
import { coin } from "@cosmjs/proto-signing";
function addSingleTokenToComposerObj(obj, amount, token) {
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
  return getSingleTokenExecMsg(contract, sender, JSON.parse(fromUtf8(msg)), amount, token);
}
function getSingleTokenExecMsg(contractAddress, senderAddress, msg, amount, token) {
  // get msg without funds
  if (!(token && amount)) {
    return getExecuteContractMsg(contractAddress, senderAddress, msg, []);
  }

  // get msg with native token
  if ("native" in token) {
    return getExecuteContractMsg(contractAddress, senderAddress, msg, [coin(amount, token.native.denom)]);
  }

  // get msg with CW20 token
  const cw20SendMsg = {
    send: {
      contract: contractAddress,
      amount: `${amount}`,
      msg: toBase64(msg)
    }
  };
  return getExecuteContractMsg(token.cw20.address, senderAddress, cw20SendMsg, []);
}
function getApproveNftMsg(collectionAddress, tokenId, senderAddress, operator) {
  const approveMsg = {
    approve: {
      spender: operator,
      token_id: `${tokenId}`
    }
  };
  return getSingleTokenExecMsg(collectionAddress, senderAddress, approveMsg);
}
function getRevokeNftMsg(collectionAddress, tokenId, senderAddress, operator) {
  const revokeMsg = {
    revoke: {
      spender: operator,
      token_id: `${tokenId}`
    }
  };
  return getSingleTokenExecMsg(collectionAddress, senderAddress, revokeMsg);
}
function getSetMetadataMsg(minterContractAddress, senderAddress, setMetadataMsg) {
  return getSingleTokenExecMsg(minterContractAddress, senderAddress, setMetadataMsg);
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
async function getCwExecHelpers(network, rpc, owner, signer) {
  const {
    CONTRACTS
  } = NETWORK_CONFIG[network];
  const MINTER_CONTRACT = CONTRACTS.find(x => x.WASM === MINTER_WASM);
  if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");
  const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(x => x.WASM === STAKING_PLATFORM_WASM);
  if (!STAKING_PLATFORM_CONTRACT) {
    throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
  }
  const cwClient = await getCwClient(rpc, owner, signer);
  if (!cwClient) throw new Error("cwClient is not found!");
  const signingClient = cwClient.client;
  const _signAndBroadcast = signAndBroadcastWrapper(signingClient, owner);
  const stakingPlatformMsgComposer = new StakingPlatformMsgComposer(owner, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS);
  const minterMsgComposer = new MinterMsgComposer(owner, MINTER_CONTRACT.DATA.ADDRESS);
  async function _msgWrapperWithGasPrice(msgs, gasPrice) {
    const tx = await _signAndBroadcast(msgs, gasPrice);
    l("\n", tx, "\n");
    return tx;
  }
  async function cwRevoke(collectionAddress, tokenId, senderAddress, operator, gasPrice) {
    return await _msgWrapperWithGasPrice([getRevokeNftMsg(collectionAddress, tokenId, senderAddress, operator)], gasPrice);
  }

  // staking-platform

  async function cwApproveAndStake(senderAddress, operator, collectionsToStake, gasPrice) {
    let msgList = [];
    for (const {
      collection_address,
      staked_token_info_list
    } of collectionsToStake) {
      for (const {
        token_id
      } of staked_token_info_list) {
        msgList.push(getApproveNftMsg(collection_address, +token_id, senderAddress, operator));
      }
    }
    msgList.push(stakingPlatformMsgComposer.stake({
      collectionsToStake
    }));
    return await _msgWrapperWithGasPrice(msgList, gasPrice);
  }
  async function cwUnstake(collectionsToUnstake, gasPrice) {
    return await _msgWrapperWithGasPrice([stakingPlatformMsgComposer.unstake({
      collectionsToUnstake
    })], gasPrice);
  }
  async function cwClaimStakingRewards({
    collection
  }, gasPrice) {
    return await _msgWrapperWithGasPrice([stakingPlatformMsgComposer.claimStakingRewards({
      collection
    })], gasPrice);
  }
  async function cwLock(gasPrice) {
    return await _msgWrapperWithGasPrice([stakingPlatformMsgComposer.lock()], gasPrice);
  }
  async function cwUnlock(gasPrice) {
    return await _msgWrapperWithGasPrice([stakingPlatformMsgComposer.unlock()], gasPrice);
  }
  async function cwDistributeFunds(addressAndWeightList, gasPrice) {
    return await _msgWrapperWithGasPrice([stakingPlatformMsgComposer.distributeFunds({
      addressAndWeightList
    })], gasPrice);
  }
  async function cwRemoveCollection(address, gasPrice) {
    return await _msgWrapperWithGasPrice([stakingPlatformMsgComposer.removeCollection({
      address
    })], gasPrice);
  }
  async function cwCreateProposal(proposal, gasPrice) {
    return await _msgWrapperWithGasPrice([stakingPlatformMsgComposer.createProposal({
      proposal
    })], gasPrice);
  }
  async function cwRejectProposal(id, gasPrice) {
    return await _msgWrapperWithGasPrice([stakingPlatformMsgComposer.rejectProposal({
      id: `${id}`
    })], gasPrice);
  }
  async function cwAcceptProposal(id, amount, token, gasPrice) {
    return await _msgWrapperWithGasPrice([addSingleTokenToComposerObj(stakingPlatformMsgComposer.acceptProposal({
      id: `${id}`
    }), amount, token)], gasPrice);
  }
  async function cwDepositTokens(collectionAddress, amount, token, gasPrice) {
    return await _msgWrapperWithGasPrice([addSingleTokenToComposerObj(stakingPlatformMsgComposer.depositTokens({
      collectionAddress
    }), amount, token)], gasPrice);
  }
  async function cwWithdrawTokens(collectionAddress, amount, gasPrice) {
    return await _msgWrapperWithGasPrice([stakingPlatformMsgComposer.withdrawTokens({
      collectionAddress,
      amount: `${amount}`
    })], gasPrice);
  }

  // minter

  async function cwCreateDenom(subdenom, paymentAmount, paymentDenom, gasPrice) {
    return await _msgWrapperWithGasPrice([addSingleTokenToComposerObj(minterMsgComposer.createDenom({
      subdenom
    }), paymentAmount, {
      native: {
        denom: paymentDenom
      }
    })], gasPrice);
  }
  async function cwMintTokens(denom, amount, mintToAddress, gasPrice) {
    return await _msgWrapperWithGasPrice([minterMsgComposer.mintTokens({
      denom,
      amount: `${amount}`,
      mintToAddress
    })], gasPrice);
  }
  async function cwBurnTokens(denom, amount, gasPrice) {
    return await _msgWrapperWithGasPrice([addSingleTokenToComposerObj(minterMsgComposer.burnTokens(), amount, {
      native: {
        denom
      }
    })], gasPrice);
  }
  async function cwSetMetadata(creatorAddress, symbol, description, uri = "", uriHash = "", gasPrice) {
    const metadata = createMetadata(creatorAddress, symbol, description, uri, uriHash);
    const setMetadataMsg = {
      set_metadata: {
        metadata
      }
    };
    if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");
    return await _msgWrapperWithGasPrice([getSetMetadataMsg(MINTER_CONTRACT.DATA.ADDRESS, owner, setMetadataMsg)], gasPrice);
  }
  async function cwUpdateConfig(updateConfigStruct, gasPrice) {
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
    return await _msgWrapperWithGasPrice(msgList, gasPrice);
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
async function getCwQueryHelpers(network, rpc) {
  const {
    CONTRACTS
  } = NETWORK_CONFIG[network];
  const MINTER_CONTRACT = CONTRACTS.find(x => x.WASM === MINTER_WASM);
  if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");
  const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(x => x.WASM === STAKING_PLATFORM_WASM);
  if (!STAKING_PLATFORM_CONTRACT) {
    throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
  }
  const cwClient = await getCwClient(rpc);
  if (!cwClient) throw new Error("cwClient is not found!");
  const cosmwasmQueryClient = cwClient.client;
  const stakingPlatformQueryClient = new StakingPlatformQueryClient(cosmwasmQueryClient, STAKING_PLATFORM_CONTRACT.DATA.ADDRESS);
  const minterQueryClient = new MinterQueryClient(cosmwasmQueryClient, MINTER_CONTRACT.DATA.ADDRESS);

  // staking platform

  async function cwQueryApprovals(collectionAddress, tokenId) {
    const queryApprovalsMsg = {
      approvals: {
        token_id: `${tokenId}`
      }
    };
    const res = await cosmwasmQueryClient.queryContractSmart(collectionAddress, queryApprovalsMsg);
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
        const queryTokensMsg = {
          tokens: {
            owner,
            start_after: lastToken,
            limit: MAX_LIMIT
          }
        };
        const {
          tokens
        } = await cosmwasmQueryClient.queryContractSmart(collectionAddress, queryTokensMsg);
        tokenList = [...tokenList, ...tokens];
        tokenAmountSum = tokens.length;
        lastToken = getLast(tokens);
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
    const queryOwnerOfMsg = {
      owner_of: {
        token_id: `${tokenId}`
      }
    };
    const res = await cosmwasmQueryClient.queryContractSmart(collectionAddress, queryOwnerOfMsg);
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryStakingPlatformConfig() {
    const res = await stakingPlatformQueryClient.queryConfig();
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryFunds() {
    const res = await stakingPlatformQueryClient.queryFunds();
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryStakers(addresses) {
    const res = await stakingPlatformQueryClient.queryStakers({
      addresses
    });
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryStakingRewards(address) {
    const res = await stakingPlatformQueryClient.queryStakingRewards({
      address
    });
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryStakingRewardsPerCollection(staker, collection) {
    const res = await stakingPlatformQueryClient.queryStakingRewardsPerCollection({
      staker,
      collection
    });
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryAssociatedBalances(address) {
    const res = await stakingPlatformQueryClient.queryAssociatedBalances({
      address
    });
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryProposals(lastAmount) {
    const res = await stakingPlatformQueryClient.queryProposals({
      lastAmount: lastAmount ? `${lastAmount}` : undefined
    });
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryCollections(addresses) {
    const res = await stakingPlatformQueryClient.queryCollections({
      addresses
    });
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryCollectionsBalances(addresses) {
    const res = await stakingPlatformQueryClient.queryCollectionsBalances({
      addresses
    });
    l("\n", res, "\n");
    return res;
  }

  // minter

  async function cwQueryDenomsByCreator(creator) {
    const res = await minterQueryClient.denomsByCreator({
      creator
    });
    l("\n", res, "\n");
    return res;
  }
  async function cwQueryMinterConfig() {
    const res = await minterQueryClient.queryConfig();
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
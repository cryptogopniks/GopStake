import { l, getLast } from "../utils";
import { getExecuteContractMsg } from "./clients";
import { toUtf8, toBase64, fromUtf8 } from "@cosmjs/encoding";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";
import { MsgBroadcaster } from "@injectivelabs/wallet-ts";
import { MsgExecuteContractEncodeObject } from "@cosmjs/cosmwasm-stargate";
import { MinterMsgComposer } from "../codegen/Minter.message-composer";
import { StakingPlatformMsgComposer } from "../codegen/StakingPlatform.message-composer";
import * as MinterTypes from "../codegen/Minter.types";
import * as StakingPlatformTypes from "../codegen/StakingPlatform.types";
import {
  NETWORK_CONFIG,
  MINTER_WASM,
  STAKING_PLATFORM_WASM,
  INJ_MINTER_WASM,
} from "../config";
import {
  MsgBroadcasterWithPk,
  ChainGrpcWasmApi,
  MsgExecuteContract,
} from "@injectivelabs/sdk-ts";
import {
  SetMetadataMsg,
  Metadata,
  UpdateConfigStruct,
  QueryApprovalsMsg,
  ApprovalsResponse,
  Cw20SendMsg,
  NetworkName,
  ApproveMsg,
  RevokeMsg,
  QueryTokens,
  TokensResponse,
  TokensResponseInj,
  QueryOwnerOf,
  OwnerOfResponse,
} from "../interfaces";

const networkType = Network.Testnet;

function getInjExecMsgFromComposerObj(
  obj: MsgExecuteContractEncodeObject
): [MsgExecuteContract, string] {
  const {
    value: { contract, sender, msg, funds },
  } = obj;

  if (!(contract && sender && msg)) {
    throw new Error(`${msg} parameters error!`);
  }

  return [
    MsgExecuteContract.fromJSON({
      contractAddress: contract,
      sender,
      msg: JSON.parse(fromUtf8(msg)),
      funds,
    }),
    sender,
  ];
}

function getSingleTokenExecMsg(
  obj: MsgExecuteContractEncodeObject,
  amount?: number,
  token?: StakingPlatformTypes.TokenUnverified
): [MsgExecuteContract, string] {
  const {
    value: { contract, sender, msg: _msg },
  } = obj;

  if (!(contract && sender && _msg)) {
    throw new Error(`${_msg} parameters error!`);
  }

  const msg = JSON.parse(fromUtf8(_msg));

  // get msg without funds
  if (!(token && amount)) {
    return [
      MsgExecuteContract.fromJSON({
        contractAddress: contract,
        sender,
        msg,
      }),
      sender,
    ];
  }

  // get msg with native token
  if ("native" in token) {
    return [
      MsgExecuteContract.fromJSON({
        contractAddress: contract,
        sender,
        msg,
        funds: { amount: `${amount}`, denom: token.native.denom },
      }),
      sender,
    ];
  }

  // get msg with CW20 token
  const cw20SendMsg: Cw20SendMsg = {
    send: {
      contract,
      amount: `${amount}`,
      msg: toBase64(msg),
    },
  };

  return [
    MsgExecuteContract.fromJSON({
      contractAddress: token.cw20.address,
      sender,
      msg: cw20SendMsg,
    }),
    sender,
  ];
}

async function queryInjContract(
  chainGrpcWasmApi: ChainGrpcWasmApi,
  contractAddress: string,
  queryMsg: any
): Promise<string> {
  const { data } = await chainGrpcWasmApi.fetchSmartContractState(
    contractAddress,
    toBase64(toUtf8(JSON.stringify(queryMsg)))
  );

  return fromUtf8(data);
}

function getApproveNftMsg(
  collectionAddress: string,
  tokenId: number,
  senderAddress: string,
  operator: string
): [MsgExecuteContract, string] {
  const approveMsg: ApproveMsg = {
    approve: {
      spender: operator,
      token_id: `${tokenId}`,
    },
  };

  return getSingleTokenExecMsg(
    getExecuteContractMsg(collectionAddress, senderAddress, approveMsg, [])
  );
}

function getRevokeNftMsg(
  collectionAddress: string,
  tokenId: number,
  senderAddress: string,
  operator: string
): [MsgExecuteContract, string] {
  const revokeMsg: RevokeMsg = {
    revoke: {
      spender: operator,
      token_id: `${tokenId}`,
    },
  };

  return getSingleTokenExecMsg(
    getExecuteContractMsg(collectionAddress, senderAddress, revokeMsg, [])
  );
}

function getSetMetadataMsg(
  minterContractAddress: string,
  senderAddress: string,
  setMetadataMsg: SetMetadataMsg
): [MsgExecuteContract, string] {
  return getSingleTokenExecMsg(
    getExecuteContractMsg(
      minterContractAddress,
      senderAddress,
      setMetadataMsg,
      []
    )
  );
}

function createMetadata(
  creatorAddress: string,
  symbol: string,
  description: string,
  uri: string = "",
  uriHash: string = ""
): Metadata {
  const decimals = 6;

  let subdenom = symbol.toLowerCase();
  let fullDenom = `factory/${creatorAddress}/u${subdenom}`;

  if (symbol != symbol.toUpperCase()) {
    throw new Error("Symbol must be uppercased!");
  }

  return {
    base: fullDenom,
    denom_units: [
      {
        aliases: [],
        denom: fullDenom,
        exponent: "0",
      },
      {
        aliases: [],
        denom: subdenom,
        exponent: `${decimals}`,
      },
    ],
    description,
    display: subdenom,
    name: symbol,
    symbol,
    uri,
    uri_hash: uriHash,
  };
}

async function getCwExecHelpers(
  network: NetworkName,
  owner: string,
  msgBroadcaster: MsgBroadcasterWithPk | MsgBroadcaster
) {
  const { CONTRACTS } = NETWORK_CONFIG[network];

  const MINTER_CONTRACT = CONTRACTS.find(
    (x) => x.WASM === (network === "INJECTIVE" ? INJ_MINTER_WASM : MINTER_WASM)
  );
  if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");

  const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(
    (x) => x.WASM === STAKING_PLATFORM_WASM
  );
  if (!STAKING_PLATFORM_CONTRACT) {
    throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
  }

  const stakingPlatformMsgComposer = new StakingPlatformMsgComposer(
    owner,
    STAKING_PLATFORM_CONTRACT.DATA.ADDRESS
  );
  const minterMsgComposer = new MinterMsgComposer(
    owner,
    MINTER_CONTRACT.DATA.ADDRESS
  );

  async function cwRevoke(
    collectionAddress: string,
    tokenId: number,
    senderAddress: string,
    operator: string,
    _gasPrice?: string
  ) {
    const [msg, sender] = getRevokeNftMsg(
      collectionAddress,
      tokenId,
      senderAddress,
      operator
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  // staking-platform

  async function cwApproveAndStake(
    senderAddress: string,
    operator: string,
    collectionsToStake: StakingPlatformTypes.StakedCollectionInfoForString[],
    _gasPrice?: string
  ) {
    let msgList: MsgExecuteContract[] = [];

    for (const {
      collection_address,
      staked_token_info_list,
    } of collectionsToStake) {
      for (const { token_id } of staked_token_info_list) {
        msgList.push(
          getApproveNftMsg(
            collection_address,
            +token_id,
            senderAddress,
            operator
          )[0]
        );
      }
    }

    const [msg, sender] = getInjExecMsgFromComposerObj(
      stakingPlatformMsgComposer.stake({ collectionsToStake })
    );

    return await msgBroadcaster.broadcast({
      msgs: [...msgList, msg],
      injectiveAddress: sender,
    });
  }

  async function cwUnstake(
    collectionsToUnstake: StakingPlatformTypes.StakedCollectionInfoForString[],
    _gasPrice?: string
  ) {
    const [msg, sender] = getInjExecMsgFromComposerObj(
      stakingPlatformMsgComposer.unstake({ collectionsToUnstake })
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwClaimStakingRewards(
    { collection }: { collection: string | undefined },
    _gasPrice?: string
  ) {
    const [msg, sender] = getInjExecMsgFromComposerObj(
      stakingPlatformMsgComposer.claimStakingRewards({ collection })
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwLock(_gasPrice?: string) {
    const [msg, sender] = getInjExecMsgFromComposerObj(
      stakingPlatformMsgComposer.lock()
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwUnlock(_gasPrice?: string) {
    const [msg, sender] = getInjExecMsgFromComposerObj(
      stakingPlatformMsgComposer.unlock()
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwDistributeFunds(
    addressAndWeightList: [string, string][],
    _gasPrice?: string
  ) {
    const [msg, sender] = getInjExecMsgFromComposerObj(
      stakingPlatformMsgComposer.distributeFunds({ addressAndWeightList })
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwRemoveCollection(address: string, _gasPrice?: string) {
    const [msg, sender] = getInjExecMsgFromComposerObj(
      stakingPlatformMsgComposer.removeCollection({ address })
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwCreateProposal(
    proposal: StakingPlatformTypes.ProposalForStringAndTokenUnverified,
    _gasPrice?: string
  ) {
    const [msg, sender] = getInjExecMsgFromComposerObj(
      stakingPlatformMsgComposer.createProposal({ proposal })
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwRejectProposal(id: number, _gasPrice?: string) {
    const [msg, sender] = getInjExecMsgFromComposerObj(
      stakingPlatformMsgComposer.rejectProposal({ id: `${id}` })
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwAcceptProposal(
    id: number,
    amount: number,
    token: StakingPlatformTypes.TokenUnverified,
    _gasPrice?: string
  ) {
    const [msg, sender] = getSingleTokenExecMsg(
      stakingPlatformMsgComposer.acceptProposal({ id: `${id}` }),
      amount,
      token
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwDepositTokens(
    collectionAddress: string,
    amount: number,
    token: StakingPlatformTypes.TokenUnverified,
    _gasPrice?: string
  ) {
    const [msg, sender] = getSingleTokenExecMsg(
      stakingPlatformMsgComposer.depositTokens({ collectionAddress }),
      amount,
      token
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwWithdrawTokens(
    collectionAddress: string,
    amount: number,
    _gasPrice?: string
  ) {
    const [msg, sender] = getInjExecMsgFromComposerObj(
      stakingPlatformMsgComposer.withdrawTokens({
        collectionAddress,
        amount: `${amount}`,
      })
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  // minter

  async function cwCreateDenom(
    subdenom: string,
    paymentAmount: number,
    paymentDenom: string,
    _gasPrice?: string
  ) {
    const [msg, sender] = getSingleTokenExecMsg(
      minterMsgComposer.createDenom({ subdenom }),
      paymentAmount,
      {
        native: { denom: paymentDenom },
      }
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwMintTokens(
    denom: string,
    amount: number,
    mintToAddress: string,
    _gasPrice?: string
  ) {
    const [msg, sender] = getInjExecMsgFromComposerObj(
      minterMsgComposer.mintTokens({
        denom,
        amount: `${amount}`,
        mintToAddress,
      })
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwBurnTokens(
    denom: string,
    amount: number,
    _gasPrice?: string
  ) {
    const [msg, sender] = getSingleTokenExecMsg(
      minterMsgComposer.burnTokens(),
      amount,
      {
        native: { denom },
      }
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwSetMetadata(
    creatorAddress: string,
    symbol: string,
    description: string,
    uri: string = "",
    uriHash: string = "",
    _gasPrice?: string
  ) {
    const metadata = createMetadata(
      creatorAddress,
      symbol,
      description,
      uri,
      uriHash
    );
    const setMetadataMsg: SetMetadataMsg = {
      set_metadata: { metadata },
    };

    if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");

    const [msg, sender] = getSetMetadataMsg(
      MINTER_CONTRACT.DATA.ADDRESS,
      owner,
      setMetadataMsg
    );

    return await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: sender,
    });
  }

  async function cwUpdateConfig(
    updateConfigStruct: UpdateConfigStruct,
    _gasPrice?: string
  ) {
    let msgList: MsgExecuteContractEncodeObject[] = [];

    const { stakingPlatform, minter, owner } = updateConfigStruct;

    if (stakingPlatform) {
      msgList.push(
        minterMsgComposer.updateConfig({
          stakingPlatform,
        })
      );
    }

    if (minter || owner) {
      msgList.push(stakingPlatformMsgComposer.updateConfig({ minter, owner }));
    }

    if (!msgList.length) {
      throw new Error("cwUpdateConfig arguments are not provided!");
    }

    const msgs = msgList.map((x) => getInjExecMsgFromComposerObj(x)[0]);

    const [
      {
        value: { sender },
      },
    ] = msgList;

    return await msgBroadcaster.broadcast({
      msgs,
      injectiveAddress: sender,
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
    cwUpdateConfig,
  };
}

async function getCwQueryHelpers(network: NetworkName) {
  const { CONTRACTS } = NETWORK_CONFIG[network];
  const MINTER_CONTRACT = CONTRACTS.find(
    (x) => x.WASM === (network === "INJECTIVE" ? INJ_MINTER_WASM : MINTER_WASM)
  );
  const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(
    (x) => x.WASM === STAKING_PLATFORM_WASM
  );

  const endpoints = getNetworkEndpoints(networkType);
  const chainGrpcWasmApi = new ChainGrpcWasmApi(endpoints.grpc);

  // staking platform

  async function cwQueryApprovals(collectionAddress: string, tokenId: number) {
    const msg: QueryApprovalsMsg = {
      approvals: {
        token_id: `${tokenId}`,
      },
    };

    const res: ApprovalsResponse = JSON.parse(
      await queryInjContract(chainGrpcWasmApi, collectionAddress, msg)
    );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryBalanceInNft(owner: string, collectionAddress: string) {
    const MAX_LIMIT = 100;
    const ITER_LIMIT = 50;

    let tokenList: string[] = [];
    let tokenAmountSum: number = 0;
    let i: number = 0;
    let lastToken: string | undefined = undefined;

    while ((!i || tokenAmountSum === MAX_LIMIT) && i < ITER_LIMIT) {
      i++;

      try {
        const msg: QueryTokens = {
          tokens: {
            owner,
            start_after: lastToken,
            limit: MAX_LIMIT,
          },
        };

        const { ids }: TokensResponseInj = JSON.parse(
          await queryInjContract(chainGrpcWasmApi, collectionAddress, msg)
        );

        tokenList = [...tokenList, ...ids];
        tokenAmountSum = ids.length;
        lastToken = getLast(ids);
      } catch (error) {
        l(error);
      }
    }

    const res: TokensResponse = { tokens: tokenList };
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryNftOwner(collectionAddress: string, tokenId: number) {
    const msg: QueryOwnerOf = {
      owner_of: { token_id: `${tokenId}` },
    };

    const res: OwnerOfResponse = JSON.parse(
      await queryInjContract(chainGrpcWasmApi, collectionAddress, msg)
    );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryStakingPlatformConfig() {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const msg: StakingPlatformTypes.QueryMsg = {
      query_config: {},
    };

    const res: StakingPlatformTypes.Config = JSON.parse(
      await queryInjContract(
        chainGrpcWasmApi,
        STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
        msg
      )
    );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryFunds() {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const msg: StakingPlatformTypes.QueryMsg = {
      query_funds: {},
    };

    const res: StakingPlatformTypes.ArrayOfFundsForToken = JSON.parse(
      await queryInjContract(
        chainGrpcWasmApi,
        STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
        msg
      )
    );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryStakers(addresses?: string[]) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const msg: StakingPlatformTypes.QueryMsg = {
      query_stakers: { addresses },
    };

    const res: StakingPlatformTypes.ArrayOfQueryStakersResponseItem =
      JSON.parse(
        await queryInjContract(
          chainGrpcWasmApi,
          STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
          msg
        )
      );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryStakingRewards(address: string) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const msg: StakingPlatformTypes.QueryMsg = {
      query_staking_rewards: { address },
    };

    const res: StakingPlatformTypes.BalancesResponseItem = JSON.parse(
      await queryInjContract(
        chainGrpcWasmApi,
        STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
        msg
      )
    );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryStakingRewardsPerCollection(
    staker: string,
    collection: string
  ) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const msg: StakingPlatformTypes.QueryMsg = {
      query_staking_rewards_per_collection: { staker, collection },
    };

    const res: StakingPlatformTypes.BalancesResponseItem = JSON.parse(
      await queryInjContract(
        chainGrpcWasmApi,
        STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
        msg
      )
    );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryAssociatedBalances(address: string) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const msg: StakingPlatformTypes.QueryMsg = {
      query_associated_balances: { address },
    };

    const res: StakingPlatformTypes.BalancesResponseItem = JSON.parse(
      await queryInjContract(
        chainGrpcWasmApi,
        STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
        msg
      )
    );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryProposals(lastAmount?: number) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const msg: StakingPlatformTypes.QueryMsg = {
      query_proposals: {
        last_amount: lastAmount ? `${lastAmount}` : undefined,
      },
    };

    const res: StakingPlatformTypes.ArrayOfQueryProposalsResponseItem =
      JSON.parse(
        await queryInjContract(
          chainGrpcWasmApi,
          STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
          msg
        )
      );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryCollections(addresses?: string[]) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const msg: StakingPlatformTypes.QueryMsg = {
      query_collections: { addresses },
    };

    const res: StakingPlatformTypes.ArrayOfQueryCollectionsResponseItem =
      JSON.parse(
        await queryInjContract(
          chainGrpcWasmApi,
          STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
          msg
        )
      );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryCollectionsBalances(addresses?: string[]) {
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const msg: StakingPlatformTypes.QueryMsg = {
      query_collections_balances: { addresses },
    };

    const res: StakingPlatformTypes.ArrayOfQueryCollectionsBalancesResponseItem =
      JSON.parse(
        await queryInjContract(
          chainGrpcWasmApi,
          STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
          msg
        )
      );

    l("\n", res, "\n");
    return res;
  }

  // minter

  async function cwQueryDenomsByCreator(creator: string) {
    if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");

    const msg: MinterTypes.QueryMsg = {
      denoms_by_creator: { creator },
    };

    const res: MinterTypes.QueryDenomsFromCreatorResponse = JSON.parse(
      await queryInjContract(
        chainGrpcWasmApi,
        MINTER_CONTRACT.DATA.ADDRESS,
        msg
      )
    );

    l("\n", res, "\n");
    return res;
  }

  async function cwQueryMinterConfig() {
    if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");

    const msg: MinterTypes.QueryMsg = {
      query_config: {},
    };

    const res: MinterTypes.Config = JSON.parse(
      await queryInjContract(
        chainGrpcWasmApi,
        MINTER_CONTRACT.DATA.ADDRESS,
        msg
      )
    );

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
    cwQueryMinterConfig,
  };
}

export { getCwExecHelpers, getCwQueryHelpers };

import { l, getLast } from "../utils";
import { toBase64, fromUtf8 } from "@cosmjs/encoding";
import { MinterMsgComposer } from "../codegen/Minter.message-composer";
import { MinterQueryClient } from "../codegen/Minter.client";
import { StakingPlatformMsgComposer } from "../codegen/StakingPlatform.message-composer";
import { StakingPlatformQueryClient } from "../codegen/StakingPlatform.client";
import { NETWORK_CONFIG, MINTER_WASM, STAKING_PLATFORM_WASM } from "../config";
import {
  getCwClient,
  signAndBroadcastWrapper,
  getExecuteContractMsg,
} from "./clients";
import {
  ProposalForStringAndTokenUnverified,
  StakedCollectionInfoForString,
  TokenUnverified,
} from "../codegen/StakingPlatform.types";
import {
  SigningCosmWasmClient,
  CosmWasmClient,
  MsgExecuteContractEncodeObject,
} from "@cosmjs/cosmwasm-stargate";
import {
  DirectSecp256k1HdWallet,
  OfflineSigner,
  OfflineDirectSigner,
  coin,
} from "@cosmjs/proto-signing";
import {
  SetMetadataMsg,
  Metadata,
  UpdateConfigStruct,
  QueryApprovalsMsg,
  ApprovalsResponse,
  Cw20SendMsg,
  NetworkName,
  QueryAllOperatorsMsg,
  QueryAllOperatorsResponse,
  ApproveAllMsg,
  RevokeAllMsg,
  QueryTokens,
  TokensResponse,
  QueryOwnerOf,
  OwnerOfResponse,
} from "../interfaces";

function addSingleTokenToComposerObj(
  obj: MsgExecuteContractEncodeObject,
  amount: number,
  token: TokenUnverified
): MsgExecuteContractEncodeObject {
  const {
    value: { contract, sender, msg },
  } = obj;

  if (!(contract && sender && msg)) {
    throw new Error(`${msg} parameters error!`);
  }

  return getSingleTokenExecMsg(
    contract,
    sender,
    JSON.parse(fromUtf8(msg)),
    amount,
    token
  );
}

function getSingleTokenExecMsg(
  contractAddress: string,
  senderAddress: string,
  msg: any,
  amount?: number,
  token?: TokenUnverified
) {
  // get msg without funds
  if (!(token && amount)) {
    return getExecuteContractMsg(contractAddress, senderAddress, msg, []);
  }

  // get msg with native token
  if ("native" in token) {
    return getExecuteContractMsg(contractAddress, senderAddress, msg, [
      coin(amount, token.native.denom),
    ]);
  }

  // get msg with CW20 token
  const cw20SendMsg: Cw20SendMsg = {
    send: {
      contract: contractAddress,
      amount: `${amount}`,
      msg: toBase64(msg),
    },
  };

  return getExecuteContractMsg(
    token.cw20.address,
    senderAddress,
    cw20SendMsg,
    []
  );
}

function getApproveCollectionMsg(
  collectionAddress: string,
  senderAddress: string,
  operator: string
): MsgExecuteContractEncodeObject {
  const approveAllMsg: ApproveAllMsg = {
    approve_all: {
      operator,
    },
  };

  return getSingleTokenExecMsg(collectionAddress, senderAddress, approveAllMsg);
}

function getRevokeCollectionMsg(
  collectionAddress: string,
  senderAddress: string,
  operator: string
): MsgExecuteContractEncodeObject {
  const revokeAllMsg: RevokeAllMsg = {
    revoke_all: {
      operator,
    },
  };

  return getSingleTokenExecMsg(collectionAddress, senderAddress, revokeAllMsg);
}

function getSetMetadataMsg(
  minterContractAddress: string,
  senderAddress: string,
  setMetadataMsg: SetMetadataMsg
): MsgExecuteContractEncodeObject {
  return getSingleTokenExecMsg(
    minterContractAddress,
    senderAddress,
    setMetadataMsg
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
  rpc: string,
  owner: string,
  signer: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet
) {
  const { CONTRACTS } = NETWORK_CONFIG[network];

  const MINTER_CONTRACT = CONTRACTS.find((x) => x.WASM === MINTER_WASM);
  if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");

  const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(
    (x) => x.WASM === STAKING_PLATFORM_WASM
  );
  if (!STAKING_PLATFORM_CONTRACT) {
    throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
  }

  const cwClient = await getCwClient(rpc, owner, signer);
  if (!cwClient) throw new Error("cwClient is not found!");

  const signingClient = cwClient.client as SigningCosmWasmClient;
  const _signAndBroadcast = signAndBroadcastWrapper(signingClient, owner);

  const stakingPlatformMsgComposer = new StakingPlatformMsgComposer(
    owner,
    STAKING_PLATFORM_CONTRACT.DATA.ADDRESS
  );
  const minterMsgComposer = new MinterMsgComposer(
    owner,
    MINTER_CONTRACT.DATA.ADDRESS
  );

  async function _msgWrapperWithGasPrice(
    msgs: MsgExecuteContractEncodeObject[],
    gasPrice: string,
    gasAdjustment: number = 1,
    memo?: string
  ) {
    const tx = await _signAndBroadcast(msgs, gasPrice, gasAdjustment, memo);
    l("\n", tx, "\n");
    return tx;
  }

  async function cwRevoke(
    collectionAddress: string,
    senderAddress: string,
    operator: string,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [getRevokeCollectionMsg(collectionAddress, senderAddress, operator)],
      gasPrice
    );
  }

  // staking-platform

  async function cwApproveAndStake(
    senderAddress: string,
    operator: string,
    collectionsToStake: StakedCollectionInfoForString[],
    gasPrice: string
  ) {
    const queryAllOperatorsMsg: QueryAllOperatorsMsg = {
      all_operators: {
        owner: senderAddress,
      },
    };

    let msgList: MsgExecuteContractEncodeObject[] = [];

    for (const {
      collection_address: collectionAddress,
    } of collectionsToStake) {
      const { operators }: QueryAllOperatorsResponse =
        await signingClient.queryContractSmart(
          collectionAddress,
          queryAllOperatorsMsg
        );

      const targetOperator = operators.find((x) => x.spender === operator);

      if (!targetOperator) {
        msgList.push(
          getApproveCollectionMsg(collectionAddress, senderAddress, operator)
        );
      }
    }

    msgList.push(stakingPlatformMsgComposer.stake({ collectionsToStake }));

    return await _msgWrapperWithGasPrice(msgList, gasPrice);
  }

  async function cwUnstake(
    collectionsToUnstake: StakedCollectionInfoForString[],
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.unstake({ collectionsToUnstake })],
      gasPrice,
      1.05
    );
  }

  async function cwClaimStakingRewards(
    { collection }: { collection: string | undefined },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.claimStakingRewards({ collection })],
      gasPrice
    );
  }

  async function cwLock(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.lock()],
      gasPrice
    );
  }

  async function cwUnlock(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.unlock()],
      gasPrice
    );
  }

  async function cwDistributeFunds(
    addressAndWeightList: [string, string][],
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.distributeFunds({ addressAndWeightList })],
      gasPrice
    );
  }

  async function cwRemoveCollection(address: string, gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.removeCollection({ address })],
      gasPrice
    );
  }

  async function cwCreateProposal(
    proposal: ProposalForStringAndTokenUnverified,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.createProposal({ proposal })],
      gasPrice
    );
  }

  async function cwRejectProposal(id: number, gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.rejectProposal({ id: `${id}` })],
      gasPrice
    );
  }

  async function cwAcceptProposal(
    id: number,
    amount: number,
    token: TokenUnverified,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        addSingleTokenToComposerObj(
          stakingPlatformMsgComposer.acceptProposal({ id: `${id}` }),
          amount,
          token
        ),
      ],
      gasPrice
    );
  }

  async function cwDepositTokens(
    collectionAddress: string,
    amount: number,
    token: TokenUnverified,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        addSingleTokenToComposerObj(
          stakingPlatformMsgComposer.depositTokens({ collectionAddress }),
          amount,
          token
        ),
      ],
      gasPrice
    );
  }

  async function cwWithdrawTokens(
    collectionAddress: string,
    amount: number,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        stakingPlatformMsgComposer.withdrawTokens({
          collectionAddress,
          amount: `${amount}`,
        }),
      ],
      gasPrice
    );
  }

  // minter

  async function cwCreateDenom(
    tokenOwner: string,
    subdenom: string,
    paymentAmount: number,
    paymentDenom: string,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        addSingleTokenToComposerObj(
          minterMsgComposer.createDenom({ tokenOwner, subdenom }),
          paymentAmount,
          {
            native: { denom: paymentDenom },
          }
        ),
      ],
      gasPrice
    );
  }

  async function cwMintTokens(
    denom: string,
    amount: number,
    mintToAddress: string,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.mintTokens({
          denom,
          amount: `${amount}`,
          mintToAddress,
        }),
      ],
      gasPrice
    );
  }

  async function cwBurnTokens(denom: string, amount: number, gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [
        addSingleTokenToComposerObj(minterMsgComposer.burnTokens(), amount, {
          native: { denom },
        }),
      ],
      gasPrice
    );
  }

  async function cwSetMetadata(
    creatorAddress: string,
    symbol: string,
    description: string,
    uri: string = "",
    uriHash: string = "",
    gasPrice: string
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

    return await _msgWrapperWithGasPrice(
      [getSetMetadataMsg(MINTER_CONTRACT.DATA.ADDRESS, owner, setMetadataMsg)],
      gasPrice
    );
  }

  async function cwUpdateConfig(
    updateConfigStruct: UpdateConfigStruct,
    gasPrice: string
  ) {
    let msgList: MsgExecuteContractEncodeObject[] = [];

    const { stakingPlatform, stakingPlatformOwner, minter, minterOwner } =
      updateConfigStruct;

    if (minterOwner || stakingPlatform) {
      msgList.push(
        minterMsgComposer.updateConfig({
          owner: minterOwner,
          stakingPlatform,
        })
      );
    }

    if (stakingPlatformOwner || minter) {
      msgList.push(
        stakingPlatformMsgComposer.updateConfig({
          owner: stakingPlatformOwner,
          minter,
        })
      );
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
    cwUpdateConfig,
  };
}

async function getCwQueryHelpers(network: NetworkName, rpc: string) {
  const { CONTRACTS } = NETWORK_CONFIG[network];

  const MINTER_CONTRACT = CONTRACTS.find((x) => x.WASM === MINTER_WASM);
  if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");

  const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(
    (x) => x.WASM === STAKING_PLATFORM_WASM
  );
  if (!STAKING_PLATFORM_CONTRACT) {
    throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
  }

  const cwClient = await getCwClient(rpc);
  if (!cwClient) throw new Error("cwClient is not found!");

  const cosmwasmQueryClient: CosmWasmClient = cwClient.client;
  const stakingPlatformQueryClient = new StakingPlatformQueryClient(
    cosmwasmQueryClient,
    STAKING_PLATFORM_CONTRACT.DATA.ADDRESS
  );
  const minterQueryClient = new MinterQueryClient(
    cosmwasmQueryClient,
    MINTER_CONTRACT.DATA.ADDRESS
  );

  // staking platform
  async function cwQueryOperators(
    collectionAddress: string,
    ownerAddress: string
  ) {
    const queryAllOperatorsMsg: QueryAllOperatorsMsg = {
      all_operators: {
        owner: ownerAddress,
      },
    };
    const res: QueryAllOperatorsResponse =
      await cosmwasmQueryClient.queryContractSmart(
        collectionAddress,
        queryAllOperatorsMsg
      );
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryApprovals(collectionAddress: string, tokenId: number) {
    const queryApprovalsMsg: QueryApprovalsMsg = {
      approvals: {
        token_id: `${tokenId}`,
      },
    };
    const res: ApprovalsResponse = await cosmwasmQueryClient.queryContractSmart(
      collectionAddress,
      queryApprovalsMsg
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
        const queryTokensMsg: QueryTokens = {
          tokens: {
            owner,
            start_after: lastToken,
            limit: MAX_LIMIT,
          },
        };

        const { tokens }: TokensResponse =
          await cosmwasmQueryClient.queryContractSmart(
            collectionAddress,
            queryTokensMsg
          );

        tokenList = [...tokenList, ...tokens];
        tokenAmountSum = tokens.length;
        lastToken = getLast(tokens);
      } catch (error) {
        l(error);
      }
    }

    const res: TokensResponse = { tokens: tokenList };
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryNftOwner(collectionAddress: string, tokenId: number) {
    const queryOwnerOfMsg: QueryOwnerOf = {
      owner_of: { token_id: `${tokenId}` },
    };
    const res: OwnerOfResponse = await cosmwasmQueryClient.queryContractSmart(
      collectionAddress,
      queryOwnerOfMsg
    );
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

  async function cwQueryStakers(addresses?: string[]) {
    const res = await stakingPlatformQueryClient.queryStakers({ addresses });
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryStakingRewards(address: string) {
    const res = await stakingPlatformQueryClient.queryStakingRewards({
      address,
    });
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryStakingRewardsPerCollection(
    staker: string,
    collection: string
  ) {
    const res =
      await stakingPlatformQueryClient.queryStakingRewardsPerCollection({
        staker,
        collection,
      });
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryAssociatedBalances(address: string) {
    const res = await stakingPlatformQueryClient.queryAssociatedBalances({
      address,
    });
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryProposals(lastAmount?: number) {
    const res = await stakingPlatformQueryClient.queryProposals({
      lastAmount: lastAmount ? `${lastAmount}` : undefined,
    });
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryCollections(addresses?: string[]) {
    const res = await stakingPlatformQueryClient.queryCollections({
      addresses,
    });
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryCollectionsBalances(addresses?: string[]) {
    const res = await stakingPlatformQueryClient.queryCollectionsBalances({
      addresses,
    });
    l("\n", res, "\n");
    return res;
  }

  // minter

  async function cwQueryDenomsByCreator(creator: string) {
    const res = await minterQueryClient.denomsByCreator({ creator });
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryMinterConfig() {
    const res = await minterQueryClient.queryConfig();
    l("\n", res, "\n");
    return res;
  }

  return {
    cwQueryOperators,
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

import { l } from "../utils";
import { getCwClient, signAndBroadcastWrapper } from "./clients";
import { toUtf8, toBase64 } from "@cosmjs/encoding";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { MinterMsgComposer } from "../codegen/Minter.message-composer";
import { MinterQueryClient } from "../codegen/Minter.client";
import { StakingPlatformMsgComposer } from "../codegen/StakingPlatform.message-composer";
import { StakingPlatformQueryClient } from "../codegen/StakingPlatform.client";
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
  Coin,
  coin,
} from "@cosmjs/proto-signing";
import {
  SetMetadataMsg,
  Metadata,
  UpdateMinterConfigStruct,
  UpdateStakingPlatformConfigStruct,
  ApproveCollectionMsg,
  RevokeCollectionMsg,
  QueryApprovalsMsg,
  ApprovalsResponse,
  Cw20SendMsg,
} from "../interfaces";

function getSingleTokenExecMsg(
  contractAddress: string,
  senderAddress: string,
  msg: any,
  amount?: number,
  token?: TokenUnverified
) {
  // get msg without funds
  if (!(token && amount)) {
    return _getExecuteContractMsg(contractAddress, senderAddress, msg, []);
  }

  // get msg with native token
  if ("native" in token) {
    return _getExecuteContractMsg(contractAddress, senderAddress, msg, [
      coin(amount, token.native.denom),
    ]);
  }

  // get msg with CW20 token
  const cw20SendMsg: Cw20SendMsg = {
    send: {
      contract: token.cw20.address,
      amount: `${amount}`,
      msg: toBase64(msg),
    },
  };

  return _getExecuteContractMsg(
    contractAddress,
    senderAddress,
    cw20SendMsg,
    []
  );
}

function _getExecuteContractMsg(
  contractAddress: string,
  senderAddress: string,
  msg: any,
  funds: Coin[]
): MsgExecuteContractEncodeObject {
  return {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: MsgExecuteContract.fromPartial({
      sender: senderAddress,
      contract: contractAddress,
      msg: toUtf8(JSON.stringify(msg)),
      funds,
    }),
  };
}

function getApproveCollectionMsg(
  collectionAddress: string,
  senderAddress: string,
  operator: string
): MsgExecuteContractEncodeObject {
  const approveCollectionMsg: ApproveCollectionMsg = {
    approve_all: { operator },
  };

  return getSingleTokenExecMsg(
    collectionAddress,
    senderAddress,
    approveCollectionMsg
  );
}

function getRevokeCollectionMsg(
  collectionAddress: string,
  senderAddress: string,
  operator: string
): MsgExecuteContractEncodeObject {
  const revokeCollectionMsg: RevokeCollectionMsg = {
    revoke_all: { operator },
  };

  return getSingleTokenExecMsg(
    collectionAddress,
    senderAddress,
    revokeCollectionMsg
  );
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

// symbol - PINJ
// description - Awesome DAO Pinjeons NFT collection staking token
// full_denom - factory/osmo1ggnqrq28tk7tlyp4c5f2mv4907wa92f5y4gvfhqv5t43fxx4mdxsd8kfs0/upinj
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
  stakingPlatformContractAddress: string,
  minterContractAddress: string,
  rpc: string,
  owner: string,
  signer: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet
) {
  const cwClient = await getCwClient(rpc, owner, signer);
  if (!cwClient) throw new Error("cwClient is not found!");

  const signingClient = cwClient.client as SigningCosmWasmClient;
  const _signAndBroadcast = signAndBroadcastWrapper(signingClient, owner);

  const stakingPlatformMsgComposer = new StakingPlatformMsgComposer(
    owner,
    stakingPlatformContractAddress
  );
  const minterMsgComposer = new MinterMsgComposer(owner, minterContractAddress);

  async function _msgWrapperWithGasPrice(
    msgs: MsgExecuteContractEncodeObject[],
    gasPrice: string
  ) {
    const tx = await _signAndBroadcast(msgs, gasPrice);
    l("\n", tx, "\n");
    return tx;
  }

  // staking-platform

  async function cwApproveCollection(
    collectionAddress: string,
    senderAddress: string,
    operator: string,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [getApproveCollectionMsg(collectionAddress, senderAddress, operator)],
      gasPrice
    );
  }

  async function cwRevokeCollection(
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

  // TODO: try single tx Approve + Stake
  async function cwStake(
    collectionsToStake: StakedCollectionInfoForString[],
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.stake({ collectionsToStake })],
      gasPrice
    );
  }

  async function cwUnstake(
    collectionsToUnstake: StakedCollectionInfoForString[],
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.unstake({ collectionsToUnstake })],
      gasPrice
    );
  }

  async function cwClaimStakingRewards(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [stakingPlatformMsgComposer.claimStakingRewards()],
      gasPrice
    );
  }

  async function cwUpdateStakingPlatformConfig(
    updateStakingPlatformConfigStruct: UpdateStakingPlatformConfigStruct,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        stakingPlatformMsgComposer.updateConfig(
          updateStakingPlatformConfigStruct
        ),
      ],
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
    const {
      value: { contract, sender, msg },
    } = stakingPlatformMsgComposer.acceptProposal({ id: `${id}` });

    if (!(contract && sender && msg)) {
      throw new Error("cwAcceptProposal parameters error!");
    }

    return await _msgWrapperWithGasPrice(
      [getSingleTokenExecMsg(contract, sender, msg, amount, token)],
      gasPrice
    );
  }

  async function cwDepositTokens(
    collectionAddress: string,
    amount: number,
    token: TokenUnverified,
    gasPrice: string
  ) {
    const {
      value: { contract, sender, msg },
    } = stakingPlatformMsgComposer.depositTokens({ collectionAddress });

    if (!(contract && sender && msg)) {
      throw new Error("cwDepositTokens parameters error!");
    }

    return await _msgWrapperWithGasPrice(
      [getSingleTokenExecMsg(contract, sender, msg, amount, token)],
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
    subdenom: string,
    paymentAmount: number,
    paymentDenom: string,
    gasPrice: string
  ) {
    const {
      value: { contract, sender, msg },
    } = minterMsgComposer.createDenom({ subdenom });

    if (!(contract && sender && msg)) {
      throw new Error("cwCreateDenom parameters error!");
    }

    return await _msgWrapperWithGasPrice(
      [
        getSingleTokenExecMsg(contract, sender, msg, paymentAmount, {
          native: { denom: paymentDenom },
        }),
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

  async function cwBurnTokens(
    denom: string,
    amount: number,
    burnFromAddress: string,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.burnTokens({
          denom,
          amount: `${amount}`,
          burnFromAddress,
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

    return await _msgWrapperWithGasPrice(
      [getSetMetadataMsg(minterContractAddress, owner, setMetadataMsg)],
      gasPrice
    );
  }

  async function cwUpdateMinterConfig(
    updateMinterConfigStruct: UpdateMinterConfigStruct,
    gasPrice: string
  ) {
    const { stakingPlatform } = updateMinterConfigStruct;

    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.updateConfig({
          stakingPlatform,
        }),
      ],
      gasPrice
    );
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
    cwUpdateMinterConfig,
  };
}

async function getCwQueryHelpers(
  stakingPlatformContractAddress: string,
  minterContractAddress: string,
  rpc: string
) {
  const cwClient = await getCwClient(rpc);
  if (!cwClient) throw new Error("cwClient is not found!");

  const cosmwasmQueryClient: CosmWasmClient = cwClient.client;
  const stakingPlatformQueryClient = new StakingPlatformQueryClient(
    cosmwasmQueryClient,
    stakingPlatformContractAddress
  );
  const minterQueryClient = new MinterQueryClient(
    cosmwasmQueryClient,
    minterContractAddress
  );

  // staking platform

  async function cwQueryApprovals(collectionAddress: string, tokenId: number) {
    const queryApprovalsMsg: QueryApprovalsMsg = {
      token_id: `${tokenId}`,
    };
    const res: ApprovalsResponse = await cosmwasmQueryClient.queryContractSmart(
      collectionAddress,
      queryApprovalsMsg
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
    cwQueryMinterConfig,
  };
}

export { getCwExecHelpers, getCwQueryHelpers, SetMetadataMsg };

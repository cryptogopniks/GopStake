import { coin } from "@cosmjs/stargate";
import { getSigner } from "./signer";
import { l } from "../../common/utils";
import { NETWORK_CONFIG } from "../../common/config";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers";
import {
  getSgExecHelpers,
  getSgQueryHelpers,
} from "../../common/account/sg-helpers";
import {
  NetworkName,
  UpdateMinterConfigStruct,
  UpdateStakingPlatformConfigStruct,
} from "../../common/interfaces";
import {
  ProposalForStringAndTokenUnverified,
  StakedCollectionInfoForString,
  TokenUnverified,
} from "../../common/codegen/StakingPlatform.types";

async function initExecWorkers(
  network: NetworkName,
  seed: string,
  gasPrice: string
) {
  const {
    BASE: {
      PREFIX,
      RPC_LIST: [RPC],
    },
  } = NETWORK_CONFIG[network];

  const { signer, owner } = await getSigner(RPC, PREFIX, seed);

  // cosmwasm helpers
  const dappCwExecHelpers = await getCwExecHelpers(network, RPC, owner, signer);
  if (!dappCwExecHelpers) throw new Error("cwExecHelpers are not found!");

  const {
    cwApproveCollection: _cwApproveCollection,
    cwRevokeCollection: _cwRevokeCollection,
    cwStake: _cwStake,
    cwUnstake: _cwUnstake,
    cwClaimStakingRewards: _cwClaimStakingRewards,
    cwDistributeFunds: _cwDistributeFunds,
    cwRemoveCollection: _cwRemoveCollection,
    cwCreateProposal: _cwCreateProposal,
    cwRejectProposal: _cwRejectProposal,
    cwAcceptProposal: _cwAcceptProposal,
    cwDepositTokens: _cwDepositTokens,
    cwWithdrawTokens: _cwWithdrawTokens,
    cwCreateDenom: _cwCreateDenom,
    cwMintTokens: _cwMintTokens,
    cwBurnTokens: _cwBurnTokens,
    cwSetMetadata: _cwSetMetadata,
    cwUpdateStakingPlatformConfig: _cwUpdateStakingPlatformConfig,
    cwUpdateMinterConfig: _cwUpdateMinterConfig,
  } = dappCwExecHelpers;

  // stargate helpers
  const dappSgExecHelpers = await getSgExecHelpers(RPC, owner, signer);
  if (!dappSgExecHelpers) throw new Error("sgExecHelpers are not found!");

  const { sgSend: _sgSend } = dappSgExecHelpers;

  async function cwApproveCollection(
    collectionAddress: string,
    senderAddress: string,
    operator: string
  ) {
    try {
      return await _cwApproveCollection(
        collectionAddress,
        senderAddress,
        operator,
        gasPrice
      );
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwRevokeCollection(
    collectionAddress: string,
    senderAddress: string,
    operator: string
  ) {
    try {
      return await _cwRevokeCollection(
        collectionAddress,
        senderAddress,
        operator,
        gasPrice
      );
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwStake(collectionsToStake: StakedCollectionInfoForString[]) {
    try {
      return await _cwStake(collectionsToStake, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwUnstake(
    collectionsToUnstake: StakedCollectionInfoForString[]
  ) {
    try {
      return await _cwUnstake(collectionsToUnstake, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwClaimStakingRewards() {
    try {
      return await _cwClaimStakingRewards(gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwDistributeFunds(addressAndWeightList: [string, string][]) {
    try {
      return await _cwDistributeFunds(addressAndWeightList, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwRemoveCollection(address: string) {
    try {
      return await _cwRemoveCollection(address, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwCreateProposal(
    proposal: ProposalForStringAndTokenUnverified
  ) {
    try {
      return await _cwCreateProposal(proposal, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwRejectProposal(id: number) {
    try {
      return await _cwRejectProposal(id, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwAcceptProposal(
    id: number,
    amount: number,
    token: TokenUnverified
  ) {
    try {
      return await _cwAcceptProposal(id, amount, token, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwDepositTokens(
    collectionAddress: string,
    amount: number,
    token: TokenUnverified
  ) {
    try {
      return await _cwDepositTokens(collectionAddress, amount, token, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwWithdrawTokens(collectionAddress: string, amount: number) {
    try {
      return await _cwWithdrawTokens(collectionAddress, amount, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwUpdateStakingPlatformConfig(
    updateStakingPlatformConfigStruct: UpdateStakingPlatformConfigStruct
  ) {
    try {
      return await _cwUpdateStakingPlatformConfig(
        updateStakingPlatformConfigStruct,
        gasPrice
      );
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwCreateDenom(
    subdenom: string,
    paymentAmount: number,
    paymentDenom: string,
    gasPrice: string
  ) {
    try {
      return await _cwCreateDenom(
        subdenom,
        paymentAmount,
        paymentDenom,
        gasPrice
      );
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwMintTokens(
    denom: string,
    amount: number,
    mintToAddress: string
  ) {
    try {
      return await _cwMintTokens(denom, amount, mintToAddress, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwBurnTokens(
    denom: string,
    amount: number,
    burnFromAddress: string
  ) {
    try {
      return await _cwBurnTokens(denom, amount, burnFromAddress, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwSetMetadata(
    creatorAddress: string,
    symbol: string,
    description: string,
    uri: string = "",
    uriHash: string = ""
  ) {
    try {
      return await _cwSetMetadata(
        creatorAddress,
        symbol,
        description,
        uri,
        uriHash,
        gasPrice
      );
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwUpdateMinterConfig(
    updateMinterConfigStruct: UpdateMinterConfigStruct
  ) {
    try {
      return await _cwUpdateMinterConfig(updateMinterConfigStruct, gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function sgSend(recipient: string, amount: number, denom: string) {
    try {
      return await _sgSend(recipient, coin(amount, denom), gasPrice);
    } catch (error) {
      l(error, "\n");
    }
  }

  return {
    owner,

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

    sgSend,
  };
}

async function initQueryWorkers(network: NetworkName) {
  const {
    BASE: {
      RPC_LIST: [RPC],
      CHAIN_ID,
    },
  } = NETWORK_CONFIG[network];

  const cwQueryHelpers = await getCwQueryHelpers(network, RPC);
  if (!cwQueryHelpers) throw new Error("cwQueryHelpers are not found!");

  const sgQueryHelpers = await getSgQueryHelpers(RPC);
  if (!sgQueryHelpers) throw new Error("sgQueryHelpers are not found!");

  const {
    cwQueryApprovals: _cwQueryApprovals,
    cwQueryStakingPlatformConfig: _cwQueryStakingPlatformConfig,
    cwQueryFunds: _cwQueryFunds,
    cwQueryStakers: _cwQueryStakers,
    cwQueryStakingRewards: _cwQueryStakingRewards,
    cwQueryAssociatedBalances: _cwQueryAssociatedBalances,
    cwQueryProposals: _cwQueryProposals,
    cwQueryCollections: _cwQueryCollections,
    cwQueryCollectionsBalances: _cwQueryCollectionsBalances,
    cwQueryDenomsByCreator: _cwQueryDenomsByCreator,
    cwQueryMinterConfig: _cwQueryMinterConfig,
  } = cwQueryHelpers;

  const {
    getAllBalances: _getAllBalances,
    getMetadata: _getMetadata,
    getTokenfactoryConfig: _getTokenfactoryConfig,
  } = sgQueryHelpers;

  async function cwQueryApprovals(collectionAddress: string, tokenId: number) {
    try {
      return await _cwQueryApprovals(collectionAddress, tokenId);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryStakingPlatformConfig() {
    try {
      return await _cwQueryStakingPlatformConfig();
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryFunds() {
    try {
      return await _cwQueryFunds();
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryStakers(addresses?: string[]) {
    try {
      return await _cwQueryStakers(addresses);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryStakingRewards(address: string) {
    try {
      return await _cwQueryStakingRewards(address);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryAssociatedBalances(address: string) {
    try {
      return await _cwQueryAssociatedBalances(address);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryProposals(lastAmount?: number) {
    try {
      return await _cwQueryProposals(lastAmount);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryCollections(addresses?: string[]) {
    try {
      return await _cwQueryCollections(addresses);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryCollectionsBalances(addresses?: string[]) {
    try {
      return await _cwQueryCollectionsBalances(addresses);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryDenomsByCreator(creator: string) {
    try {
      return await _cwQueryDenomsByCreator(creator);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryMinterConfig() {
    try {
      return await _cwQueryMinterConfig();
    } catch (error) {
      l(error, "\n");
    }
  }

  async function getAllBalances(address: string) {
    try {
      return await _getAllBalances(address);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function getMetadata(denom: string) {
    try {
      return await _getMetadata(denom);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function getTokenfactoryConfig() {
    try {
      return await _getTokenfactoryConfig(CHAIN_ID);
    } catch (error) {
      l(error, "\n");
    }
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

    getAllBalances,
    getMetadata,
    getTokenfactoryConfig,
  };
}

export { initExecWorkers, initQueryWorkers };

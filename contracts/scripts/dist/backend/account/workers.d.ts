import { NetworkName, UpdateMinterConfigStruct, UpdateStakingPlatformConfigStruct } from "../../common/interfaces";
import { ProposalForStringAndTokenUnverified, StakedCollectionInfoForString, TokenUnverified } from "../../common/codegen/StakingPlatform.types";
declare function initExecWorkers(network: NetworkName, seed: string, gasPrice: string): Promise<{
    owner: string;
    cwApproveCollection: (collectionAddress: string, senderAddress: string, operator: string) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwRevokeCollection: (collectionAddress: string, senderAddress: string, operator: string) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwStake: (collectionsToStake: StakedCollectionInfoForString[]) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwUnstake: (collectionsToUnstake: StakedCollectionInfoForString[]) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwClaimStakingRewards: () => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwDistributeFunds: (addressAndWeightList: [string, string][]) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwRemoveCollection: (address: string) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwCreateProposal: (proposal: ProposalForStringAndTokenUnverified) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwRejectProposal: (id: number) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwAcceptProposal: (id: number, amount: number, token: TokenUnverified) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwDepositTokens: (collectionAddress: string, amount: number, token: TokenUnverified) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwWithdrawTokens: (collectionAddress: string, amount: number) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwCreateDenom: (subdenom: string, paymentAmount: number, paymentDenom: string, gasPrice: string) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwMintTokens: (denom: string, amount: number, mintToAddress: string) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwBurnTokens: (denom: string, amount: number) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwSetMetadata: (creatorAddress: string, symbol: string, description: string, uri?: string, uriHash?: string) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwUpdateStakingPlatformConfig: (updateStakingPlatformConfigStruct: UpdateStakingPlatformConfigStruct) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    cwUpdateMinterConfig: (updateMinterConfigStruct: UpdateMinterConfigStruct) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
    sgSend: (recipient: string, amount: number, denom: string) => Promise<import("@cosmjs/stargate").DeliverTxResponse | undefined>;
}>;
declare function initQueryWorkers(network: NetworkName): Promise<{
    cwQueryApprovals: (collectionAddress: string, tokenId: number) => Promise<import("../../common/interfaces").ApprovalsResponse | undefined>;
    cwQueryStakingPlatformConfig: () => Promise<import("../../common/codegen/StakingPlatform.types").Config | undefined>;
    cwQueryFunds: () => Promise<import("../../common/codegen/StakingPlatform.types").ArrayOfFundsForToken | undefined>;
    cwQueryStakers: (addresses?: string[]) => Promise<import("../../common/codegen/StakingPlatform.types").ArrayOfQueryStakersResponseItem | undefined>;
    cwQueryStakingRewards: (address: string) => Promise<import("../../common/codegen/StakingPlatform.types").BalancesResponseItem | undefined>;
    cwQueryAssociatedBalances: (address: string) => Promise<import("../../common/codegen/StakingPlatform.types").BalancesResponseItem | undefined>;
    cwQueryProposals: (lastAmount?: number) => Promise<import("../../common/codegen/StakingPlatform.types").ArrayOfQueryProposalsResponseItem | undefined>;
    cwQueryCollections: (addresses?: string[]) => Promise<import("../../common/codegen/StakingPlatform.types").ArrayOfQueryCollectionsResponseItem | undefined>;
    cwQueryCollectionsBalances: (addresses?: string[]) => Promise<import("../../common/codegen/StakingPlatform.types").ArrayOfQueryCollectionsBalancesResponseItem | undefined>;
    cwQueryDenomsByCreator: (creator: string) => Promise<import("../../common/codegen/Minter.types").QueryDenomsFromCreatorResponse | undefined>;
    cwQueryMinterConfig: () => Promise<import("../../common/codegen/Minter.types").Config | undefined>;
    getAllBalances: (address: string) => Promise<import("cosmjs-types/cosmos/base/v1beta1/coin").Coin[] | undefined>;
    getMetadata: (denom: string) => Promise<import("cosmjs-types/cosmos/bank/v1beta1/bank").Metadata | undefined>;
}>;
export { initExecWorkers, initQueryWorkers };

import { ProposalForStringAndTokenUnverified, StakedCollectionInfoForString, TokenUnverified } from "../codegen/StakingPlatform.types";
import { DirectSecp256k1HdWallet, OfflineSigner, OfflineDirectSigner } from "@cosmjs/proto-signing";
import { UpdateConfigStruct, ApprovalsResponse, NetworkName, TokensResponse, OwnerOfResponse } from "../interfaces";
declare function getCwExecHelpers(network: NetworkName, rpc: string, owner: string, signer: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet): Promise<{
    cwApproveAndStake: (senderAddress: string, operator: string, collectionsToStake: StakedCollectionInfoForString[], gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwUnstake: (collectionsToUnstake: StakedCollectionInfoForString[], gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwClaimStakingRewards: ({ collection }: {
        collection: string | undefined;
    }, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwLock: (gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwUnlock: (gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwDistributeFunds: (addressAndWeightList: [string, string][], gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwRemoveCollection: (address: string, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwCreateProposal: (proposal: ProposalForStringAndTokenUnverified, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwRejectProposal: (id: number, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwAcceptProposal: (id: number, amount: number, token: TokenUnverified, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwDepositTokens: (collectionAddress: string, amount: number, token: TokenUnverified, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwWithdrawTokens: (collectionAddress: string, amount: number, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwCreateDenom: (tokenOwner: string, subdenom: string, paymentAmount: number, paymentDenom: string, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwSetMetadata: (creatorAddress: string, symbol: string, description: string, uri: string | undefined, uriHash: string | undefined, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwRevoke: (collectionAddress: string, tokenId: number, senderAddress: string, operator: string, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwMintTokens: (denom: string, amount: number, mintToAddress: string, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwBurnTokens: (denom: string, amount: number, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
    cwUpdateConfig: (updateConfigStruct: UpdateConfigStruct, gasPrice: string) => Promise<import("@cosmjs/cosmwasm-stargate").DeliverTxResponse>;
}>;
declare function getCwQueryHelpers(network: NetworkName, rpc: string): Promise<{
    cwQueryApprovals: (collectionAddress: string, tokenId: number) => Promise<ApprovalsResponse>;
    cwQueryBalanceInNft: (owner: string, collectionAddress: string) => Promise<TokensResponse>;
    cwQueryNftOwner: (collectionAddress: string, tokenId: number) => Promise<OwnerOfResponse>;
    cwQueryStakingPlatformConfig: () => Promise<import("../codegen/StakingPlatform.types").Config>;
    cwQueryFunds: () => Promise<import("../codegen/StakingPlatform.types").ArrayOfFundsForToken>;
    cwQueryStakers: (addresses?: string[]) => Promise<import("../codegen/StakingPlatform.types").ArrayOfQueryStakersResponseItem>;
    cwQueryStakingRewards: (address: string) => Promise<import("../codegen/StakingPlatform.types").BalancesResponseItem>;
    cwQueryStakingRewardsPerCollection: (staker: string, collection: string) => Promise<import("../codegen/StakingPlatform.types").BalancesResponseItem>;
    cwQueryAssociatedBalances: (address: string) => Promise<import("../codegen/StakingPlatform.types").BalancesResponseItem>;
    cwQueryProposals: (lastAmount?: number) => Promise<import("../codegen/StakingPlatform.types").ArrayOfQueryProposalsResponseItem>;
    cwQueryCollections: (addresses?: string[]) => Promise<import("../codegen/StakingPlatform.types").ArrayOfQueryCollectionsResponseItem>;
    cwQueryCollectionsBalances: (addresses?: string[]) => Promise<import("../codegen/StakingPlatform.types").ArrayOfQueryCollectionsBalancesResponseItem>;
    cwQueryDenomsByCreator: (creator: string) => Promise<import("../codegen/Minter.types").QueryDenomsFromCreatorResponse>;
    cwQueryMinterConfig: () => Promise<import("../codegen/Minter.types").Config>;
}>;
export { getCwExecHelpers, getCwQueryHelpers };

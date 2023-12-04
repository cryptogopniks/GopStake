### Project description

Gopstake consists of two contracts: `staking-platform` and `minter`. Together they implement NFT staking functionality with rewards in one of two ways - minting native tokens through a `minter` contract (working with the Token Factory module of Cosmos SDK) or consuming tokens (native or CW20) deposited by the collection creator to the collection balance. This accommodates the needs of both those teams who want to release their token with minimal effort, and those who want to give away existing tokens (such as USDC or WBTC transferred from Osmosis or Kujira) for staking their NFTs that can be used in DeFi.

The `staking-platform` has advanced functionality to control the emission rate of the staking rewards token and, for example, distribute a fixed amount to stakers each month. Also, by sending a single request, it is possible to get information about all NFTs of each staker, including the start date of staking, which simplifies the process of creating an airdrop snapshot.

Any NFT collection must be registered (listed), for which there is a mechanism for dealing with proposals. The process is as follows:
1. The collection creator passes the collection details to the CryptoGopniks team
2. The team verifies the data, decides on the listing, and sets the listing price. At this stage, the collection creator must decide on the token in which the staking rewards will be paid out. If he doesn't have his own token, it can be created using a `minter` contract (for which a small fee in network coins is charged by the Token Factory module itself). Metadata can be recorded and minting/burning can be done through the contract. Any number of tokens can be registered, but only one token must be specified for a collection
3. The admin or the owner of the contract (saved in the contract config by the admin) creates a proposal to add a new collection. The proposal becomes active
4. The creator of the collection (specified in the proposal as collection owner) can accept the proposal by signing a transaction with the required amount. In this case, the status of the proposal will change to "accepted" and the deposited amount will be sent to a special balance, from where the admin/owner can distribute it to the required list of addresses with the specified weights. If necessary, admin/owner can reject the active collection (status will change to "rejected") and create a new one with changed parameters. Also an erroneously registered collection can be deleted by admin/owner.
5. After listing a collection, its balance must be replenished if `minter` is not used. The required amount can be calculated based on the number of tokens minted per 1 NFT per 24 hours (parameter specified in the proposal), the number of NFTs in the collection and the frequency of replenishment. Excess tokens can be returned to the collection creator's address.

In addition to the proposal to add a collection, there is a proposal to update the collection parameters. This can be used to change the collection token or emission rate, which gives access to the real yield functionality of NFT staking, where the collection creator distributes income to the stakers each month, adjusting the emission rate to match its value. When such a proposal is accepted, the remaining rewards in the previous tokens are automatically claimed and the excess balance of the collection is returned to its owner.

To get started with the platform, the user doesn't need to make an approve for the desired collection. It is possible to stake/unstake any number of NFTs in a single transaction as approvals for specified tokens will be added automatically. The number of rewards is updated every minute. These rewards are collected (sent to the user's addresses) via the claim function or by unstaking.

The first function collects rewards from all NFTs for all collections, but if the balance of any collection is deficient, its NFTs will be ignored (rewards can be collected after the collection creator replenishes the balance). In the second option, claiming affects only selected NFTs, and it will occur even if the collection's balance is insufficient for a full payout, to avoid blocking NFTs being taken out of staking.

There is no problem with insufficient collection balance in the case of using `minter`. 

To interact with both `staking-platform` and `minter` contracts following functions were provided:


| Function | Who should use | Description |
| -------- | -------------- | ----------- |
| `cwApproveAndStake(senderAddress: string, operator: string, collectionsToStake: StakedCollectionInfoForString[], gasPrice: string): Promise<DeliverTxResponse>` | User | Approve and stake NFTs to start earning staking rewards. Sender is the user and operator is the `staking-platform` (must be used `STAKING_PLATFORM_CONTRACT.DATA.ADDRESS`) |
| `cwUnstake(collectionsToUnstake: StakedCollectionInfoForString[], gasPrice: string): Promise<DeliverTxResponse>` | User | Unstake NFTs and claim any pending staking rewards. In case of insufficient collection balance rewards for NFTs of this collection will not be claimed |
| `cwClaimStakingRewards({ collection }: { collection: string \| undefined }, gasPrice: string): Promise<DeliverTxResponse>` | User | Claim pending staking rewards for staked NFTs. If the collection address is not specified all collections rewards will be claimed. In case of insufficient collection balance rewards for NFTs of this collection will be claimed anyway to reset pending balances |
| `cwDistributeFunds(addressAndWeightList: [string, string][], gasPrice: string): Promise<DeliverTxResponse>` | Contract admin or owner | Distribute funds from the collection registration balance to specified recipients corresponding to their weights. The sum of weights must be equal one. Every weight must not exceed one |
| `cwRemoveCollection(address: string, gasPrice: string): Promise<DeliverTxResponse>` | Contract admin or owner | Remove a collection and associated data from `staking-platform` |
| `cwCreateProposal(proposal: ProposalForStringAndTokenUnverified, gasPrice: string): Promise<DeliverTxResponse>` | Contract admin or owner | Create a proposal to list a new NFT collection or update parameters of an existing one |
| `cwRejectProposal(id: number, gasPrice: string): Promise<DeliverTxResponse>` | Contract admin or owner | Reject an active collection proposal |
| `cwAcceptProposal(id: number, amount: number, token: TokenUnverified, gasPrice: string): Promise<DeliverTxResponse>` | Collection creator | Accept an active collection proposal by paying the listing price |
| `cwDepositTokens(collectionAddress: string, amount: number, token: TokenUnverified, gasPrice: string): Promise<DeliverTxResponse>` | Collection creator | Deposit tokens to a collection's reward balance |
| `cwWithdrawTokens(collectionAddress: string, amount: number, gasPrice: string): Promise<DeliverTxResponse>` | Collection creator | Withdraw excess tokens from a collection's reward balance |
| `cwCreateDenom(subdenom: string, paymentAmount: number, paymentDenom: string, gasPrice: string): Promise<DeliverTxResponse>` | Collection creator | Create a new token denomination using the `minter` contract |
| `cwSetMetadata(creatorAddress: string, symbol: string, description: string, uri: string = "", uriHash: string = "", gasPrice: string): Promise<DeliverTxResponse>` | Collection creator | Set metadata for a token created with the `minter` contract |
| `cwMintTokens(denom: string, amount: number, mintToAddress: string, gasPrice: string): Promise<DeliverTxResponse>` | `staking-platform` contract or collection creator | Mint new tokens using the `minter` contract. If `EmissionType` is `minting` it will be called by `staking-platform`. In case of `spending` `EmissionType` the collection creator can manually call the function and replenish collection balance |
| `cwBurnTokens(denom: string, amount: number, gasPrice: string): Promise<DeliverTxResponse>` | User | Burn tokens using the `minter` contract. It is not required under normal conditions |
| `cwRevoke(collectionAddress: string, tokenId: number, senderAddress: string, operator: string, gasPrice: string): Promise<DeliverTxResponse>` | Developer | Remove approval from NFT. For debugging |
| `cwUpdateConfig(updateConfigStruct: UpdateConfigStruct, gasPrice: string): Promise<DeliverTxResponse>` | Contract admin | Update configuration parameters for the contract |
| `cwQueryFunds(): Promise<ArrayOfFundsForToken>` | - | Return the account balance for contributions when listing collections |
| `cwQueryStakers(addresses?: string[]): Promise<ArrayOfQueryStakersResponseItem>` | - | Return the list of stakers for specified (or all) staking addresses |
| `cwQueryStakingRewards(address: string): Promise<BalancesResponseItem>` | - | Return, for a specified address, a list of staking awards summarized across all collections and NFTs |
| `cwQueryStakingRewardsPerCollection(staker: string, collection: string): Promise<BalancesResponseItem>` | - | Return, for a specified staker and collection, a list of staking awards summarized across all NFTs |
| `cwQueryAssociatedBalances(address: string): Promise<BalancesResponseItem>` | - | Return for the specified address the list of balances of tokens of registered collections (associated balances) |
| `cwQueryProposals(lastAmount?: number): Promise<ArrayOfQueryProposalsResponseItem>` | - | Return a list of the specified number of recent proposals (or all proposals) for the specified address |
| `cwQueryCollections(addresses?: string[]): Promise<ArrayOfQueryCollectionsResponseItem>` | - | Return a list of collections at the specified (or all) collection addresses |
| `cwQueryCollectionsBalances(addresses?: string[]): Promise<ArrayOfQueryCollectionsBalancesResponseItem>` | - | Return a list of collection balances for the specified (or all) collection addresses |
| `cwQueryDenomsByCreator(creator: string): Promise<QueryDenomsFromCreatorResponse>` | - | Return a list of denoms for tokens created by the specified address |
| `cwQueryMinterConfig(): Promise<Minter.types.Config>` | - | Return the `minter` contract configuration |
| `cwQueryStakingPlatformConfig(): Promise<StakingPlatform.types.Config>` | - | Return the `staking-platform` contract configuration |
| `cwQueryApprovals(collectionAddress: string, tokenId: number): Promise<ApprovalsResponse>` | - | Return approvals that a token has  |
| `cwQueryBalanceInNft(owner: string, collectionAddress: string): Promise<TokensResponse>` | - | Return a list of tokens owned by the given address  |
| `cwQueryNftOwner(collectionAddress: string, tokenId: number): Promise<OwnerOfResponse>` | - | Return the owner of the given token, error if token does not exist |


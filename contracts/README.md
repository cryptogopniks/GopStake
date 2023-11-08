### Project description

Gopstake consists of two contracts: staking-platform and minter. Together they implement NFT staking functionality with rewards in one of two ways - minting native tokens through a minter contract (working with the Token Factory module) or consuming tokens (native or CW20) contributed by the collection owner to the collection balance. This accommodates the needs of both those teams who want to release their token with minimal effort, and those who want to give away existing tokens (such as USDC or WBTC translated from Osmosis or Kujira) for steaking their NFTs that can be used in DeFi.

Any NFT collection must be registered, for which there is a mechanism for dealing with proposals. The process is as follows:
1. The collection owner passes the collection details (e.g. via a google form) to the CryptoGopniks team
2. The team verifies the data, decides on the listing, and sets the listing price. At this stage, the collection owner must decide on the token to be issued for the steaking. If he doesn't have his own token, it can be created using a minter contract (for which a small fee in network coins is charged by the Token Factory module itself). Metadata can be recorded and minting/burning can be done through the contract. Any number of tokens can be registered, but only one token is specified for a collection
3. The administrator (hereinafter referred to as admin) or the owner of the contract saved in the contract settings by the administrator (hereinafter referred to as ovner) creates a propozal to add a new collection. The propozal becomes active
4. The owner of the collection (specified in the propozal) can accept the propozal by signing a transaction with the required amount. In this case, the status of the propozal will change to "accepted" and the deposited amount will be sent to a special balance, from where the admin/owner can distribute it to the required list of addresses with the specified weights. If necessary, admin/owner can reject the active collection (status will change to "rejected") and create a new one with changed parameters. Also an erroneously registered collection can be deleted by admin/owner.
5. After listing a collection, its balance must be replenished if minter is not used. The required amount can be calculated based on the number of tokens issued per 1 NFT per 24 hours (parameter specified in the proposal), the number of NFTs in the collection and the frequency of replenishment. Excess tokens can be issued to the collection owner's address.

In addition to the proposal to add a collection, there is a proposal to update the collection parameters. This can be used to change the collection token or issue rate, which gives access to the real yield functionality of NFT staking, where the collection owner distributes income to the stakers each month, adjusting the issue rate to match its value. When such a proposal is accepted, the remaining rewards in the previous tokens are automatically branded and the excess balance of the collection is returned to its owner.

To get started with the platform, the user needs to make an apprue for the desired collection. After that, it will be possible to steak/unsteak any number of NFTs in a single transaction. The number of rewards is updated every minute. They are collected (sent to the user's addresses) via the stigma function or by anstaking.
The first variant collects rewards from all NFTs for all collections, but if the balance of any collection is deficient, its NFTs will be ignored (rewards can be collected on branding after the collection owner replenishes the balance). In the second option, stigma affects only selected NFTs, and it will occur even if the collection's balance is insufficient for a full payout, to avoid blocking NFTs being taken out of staking.
There is no problem with insufficient collection balance in the case of Minter. 

Contracts provide convenient queries for useful information:

- `QueryFunds` - returns the account balance for contributions when listing collections

- `QueryStakers` - returns the list of stakers for specified (or all) staking addresses

- `QueryStakingRewards` - returns, for a specified address, a list of staking awards summarized across all collections and NFTs

- `QueryAssociatedBalances` - returns for the specified address the list of balances of tokens of registered collections (associated balances)

- `QueryProposals` - returns a list of the specified number of recent proposals (or all proposals) for the specified address

- `QueryCollections` - returns a list of collections at the specified (or all) collection addresses

- `QueryCollectionsBalances` - returns a list of collection balances for the specified (or all) collection addresses

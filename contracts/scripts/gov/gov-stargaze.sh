DAEMON="starsd"
# update for your config
PASSWORD="12345678"

# update for mainnet
RPC="https://rpc.elgafar-1.stargaze-apis.com:443"
CHAIN_ID="elgafar-1"

TXFLAG="-y --gas auto --gas-prices 1ustars --gas-adjustment 1.3 --chain-id $CHAIN_ID --node $RPC"

# specify your account address
PROPOSAL_CREATOR="stars1f37v0rdvrred27tlqqcpkrqpzfv6ddr2a97zzu"
# don't change!
ADMIN="stars1f37v0rdvrred27tlqqcpkrqpzfv6ddr2a97zzu"

MINTER_WASM="../../artifacts/minter.wasm"
STAKING_PLATFORM_WASM="../../artifacts/staking_platform.wasm"

TITLE="CryptoGopniks NFT Staking Platform: Minter Contract v.1.1.1"
DESCRIPTION=$(cat description.md | jq -Rsa | tr -d '"')
# set 50000000000 for mainnet
DEPOSIT="1000000000ustars"

yes $PASSWORD | $DAEMON tx gov submit-proposal "./prop.json" --from "stars1f37v0rdvrred27tlqqcpkrqpzfv6ddr2a97zzu" $TXFLAG


# echo 'enter seed phrase'
# echo "then enter keyring password twice"
# $DAEMON keys add "admin-gopstake" --recover
# yes $PASSWORD | $DAEMON tx wasm submit-proposal wasm-store $MINTER_WASM \
#   --title "$TITLE" \
#   --summary "$DESCRIPTION" \
#   --authority $ADMIN \
#   --deposit $DEPOSIT \
#   --from $PROPOSAL_CREATOR \
#   --instantiate-anyof-addresses $ADMIN \
#   $TXFLAG




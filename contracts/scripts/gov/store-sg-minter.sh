source ./config.sh


$DAEMON_STARGAZE tx gov submit-proposal wasm-store $WASM_STARGAZE_MINTER \
  --title $TITLE_STARGAZE_MINTER \
  --description $DESCRIPTION_STARGAZE_MINTER \
  --code-source-url $WASM_SOURCE_STARGAZE_MINTER \
	--builder $BUILDER \
	--code-hash $HASH_SUM_STARGAZE_MINTER \
  --deposit $DEPOSIT_STARGAZE \
  --from $ADDRESS_OWNER_STARGAZE \
  --run-as $ADDRESS_ADMIN_STARGAZE \
  --instantiate-anyof-addresses "$ADDRESS_ADMIN_STARGAZE,$ADDRESS_OWNER_STARGAZE" \
  $TXFLAG_STARGAZE

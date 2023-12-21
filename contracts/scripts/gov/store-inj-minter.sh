source ./config.sh


$DAEMON_INJECTIVE tx gov submit-proposal wasm-store $WASM_INJECTIVE_MINTER \
  --title $TITLE_INJECTIVE_MINTER \
  --description $DESCRIPTION_INJECTIVE_MINTER \
  --code-source-url $WASM_SOURCE_INJECTIVE_MINTER \
	--builder $BUILDER \
	--code-hash $HASH_SUM_INJECTIVE_MINTER \
  --deposit $DEPOSIT_INJECTIVE \
  --from $ADDRESS_OWNER_INJECTIVE \
  --run-as $ADDRESS_ADMIN_INJECTIVE \
  --instantiate-anyof-addresses "$ADDRESS_ADMIN_INJECTIVE,$ADDRESS_OWNER_INJECTIVE" \
  $TXFLAG_INJECTIVE

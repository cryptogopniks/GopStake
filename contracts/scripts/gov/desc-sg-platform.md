## CryptoGopniks NFT Staking Platform: Staking Platform Contract v.1.3.1

CryptoGopniks team presents to your attention new gamechanging NFT staking platform! The app contains 2 smart contracts - `Minter` and `Staking Platform` by itself. The second one provides core logic. This proposal will allow to upload the `Staking Platform` contract code v1.3.1 to the Stargaze network.


## Links

Commonwealth:
https://gov.stargaze.zone/discussion/14571-deploy-smart-contracts-for-the-staking-platform
https://gov.stargaze.zone/discussion/14595-deploy-minter-smart-contract-for-the-staking-platform

X/Twitter: https://twitter.com/StarGops_nft

Discord: https://discord.gg/RuMJ54c2Yz

Telegram: https://t.me/CryptoGopnik_ru


## Store WASM Code

The source code is available at https://github.com/cryptogopniks/GopStake/releases/tag/staking_platform-v1.3.1


## Compile Instructions

```sh
cargo cw-optimizoor
```

This results in the following SHA256
```
fdf63299a1abf865578dd6c74ac0c074c2d36d3cc05d356e16af7a7afc10a358
```

## Verify On-chain Contract

```sh
starsd q gov proposal --output json| jq -r ‘.content.wasm_byte_code’| base64 -d| gzip -dc| sha256sum
```

## Verify Local Contract

```sh
sha256sum artifacts/staking_platform.wasm
```
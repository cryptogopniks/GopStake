
## CryptoGopniks NFT Staking Platform: Minter Contract v.1.1.1

CryptoGopniks team presents to your attention new gamechanging NFT staking platform! The app contains 2 smart contracts - `Minter` and `Staking Platform` by itself. The first one is designed for minting native tokens under the control of the platform. This proposal will allow to upload the `Minter` contract code v1.1.1 to the Stargaze network.


## Links

Commonwealth:
https://gov.stargaze.zone/discussion/14571-deploy-smart-contracts-for-the-staking-platform
https://gov.stargaze.zone/discussion/14595-deploy-minter-smart-contract-for-the-staking-platform

X/Twitter: https://twitter.com/StarGops_nft

Discord: https://discord.gg/RuMJ54c2Yz

Telegram: https://t.me/CryptoGopnik_ru


## Store WASM Code

The source code is available at https://github.com/cryptogopniks/GopStake/releases/tag/minter-v1.1.1


## Compile Instructions

```sh
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/workspace-optimizer:0.15.0
```

This results in the following SHA256
```
80cf323ef1460bbfc9cd1f1ffb49a4405f43dd9fcd46139049379530e67512ad
```

## Verify On-chain Contract

```sh
starsd q gov proposal $ID --output json| jq -r ‘.content.wasm_byte_code’| base64 -d| gzip -dc| sha256sum
```

## Verify Local Contract

```sh
sha256sum artifacts/minter.wasm
```
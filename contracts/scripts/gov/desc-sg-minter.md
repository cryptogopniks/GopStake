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
cargo cw-optimizoor
```

This results in the following SHA256
```
7591410a254f1a381b509c7740c2f25a2859a7802900b4eacc430ccbc2967108
```

## Verify On-chain Contract

```sh
starsd q gov proposal --output json| jq -r ‘.content.wasm_byte_code’| base64 -d| gzip -dc| sha256sum
```

## Verify Local Contract

```sh
sha256sum artifacts/minter.wasm
```
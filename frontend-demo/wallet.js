import { assets, chains } from "chain-registry"
import { chainRegistryChainToKeplr } from "@chain-registry/keplr"
import { getGasPriceFromChainRegistryItem } from "./common/account/clients"
import { NETWORK_CONFIG } from "./common/config"

function detectWallet() {
  const { keplr } = window
  if (!keplr) throw new Error("You need to install Keplr!")
  return keplr
}

function getChainList(chainIdList) {
  return chains.filter(({ chain_id }) => chainIdList.includes(chain_id))
}

async function addChainList(wallet, chainIdList) {
  for (const chain of getChainList(chainIdList)) {
    try {
      const chainInfo = chainRegistryChainToKeplr(chain, assets)
      await wallet.experimentalSuggestChain(chainInfo)
    } catch (error) {
      console.log(error)
    }
  }
}

async function unlockWalletList(wallet, chainIdList) {
  try {
    await wallet.enable(chainIdList)
  } catch (error) {
    console.log(error)
  }
}

async function initWalletInterchain(chainIdList) {
  const wallet = detectWallet()
  await addChainList(wallet, chainIdList) // add network to Keplr
  await unlockWalletList(wallet, chainIdList) // give permission for the webpage to access to Keplr
  return wallet
}

async function getAccountAddress(wallet, chainId) {
  return (await wallet.getKey(chainId)).bech32Address
}

async function getSigner(chainId, wallet) {
  const signer = window.getOfflineSigner?.(chainId)
  const owner = (await wallet.getKey(chainId)).bech32Address

  return { signer, owner }
}

async function connectWallet(network) {
  const { BASE: { CHAIN_ID } } = NETWORK_CONFIG[network]
  return await initWalletInterchain([CHAIN_ID])
}

async function disconnectWallet() {
  const wallet = detectWallet()
  wallet.disable()
}

export {
  connectWallet, disconnectWallet, getSigner, getAccountAddress, detectWallet,
  getChainList, getGasPriceFromChainRegistryItem
}
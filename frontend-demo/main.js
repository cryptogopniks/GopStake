import "./style.css"
// https://github.com/cryptogopniks/GopStake/tree/main/contracts/scripts/dist/common
import { l } from "./common/utils"
import * as stargazeCwHelpers from "./common/account/cw-helpers"
import * as injectiveCwHelpers from "./common/account/cw-helpers-inj"
import { Network } from "@injectivelabs/networks";
import { WalletStrategy, MsgBroadcaster, Wallet } from "@injectivelabs/wallet-ts"
import { NETWORK_CONFIG } from "./common/config"
import {
  connectWallet, disconnectWallet, getAccountAddress, detectWallet, getSigner,
  getChainList, getGasPriceFromChainRegistryItem
} from "./wallet"

const stargazeNetworkName = "STARGAZE"

const [btnConnect, btnDisconnect, btnCreateProp, btnRejectProp] = document.querySelectorAll("button");
const [taPropDisplay, taPropSpecify] = document.querySelectorAll("textarea")
const [inpAddress, inpPropSelect] = document.querySelectorAll("input")
const selectNetwork = document.querySelector("select")

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const network = selectNetwork.value.toUpperCase()
    const { BASE: { RPC_LIST: [RPC] } } = NETWORK_CONFIG[network]
    const { cwQueryProposals } = await (network === stargazeNetworkName
      ? stargazeCwHelpers.getCwQueryHelpers(network, RPC)
      : injectiveCwHelpers.getCwQueryHelpers(network));

    // query proposals
    const propList = await cwQueryProposals(3)
    taPropDisplay.value = propList.reduce((acc, cur) => `${acc}${JSON.stringify(cur)}\n`, "").trim()

    // write proposal template
    taPropSpecify.value = JSON.stringify(getProposalTemplate(network))
  } catch (error) { l(error) }
})

selectNetwork.addEventListener("change", async () => {
  try {
    const network = selectNetwork.value.toUpperCase()
    const { BASE: { RPC_LIST: [RPC], CHAIN_ID } } = NETWORK_CONFIG[network]
    const { cwQueryProposals } = await (network === stargazeNetworkName
      ? stargazeCwHelpers.getCwQueryHelpers(network, RPC)
      : injectiveCwHelpers.getCwQueryHelpers(network));

    // query proposals
    const propList = await cwQueryProposals(3)
    taPropDisplay.value = propList.reduce((acc, cur) => `${acc}${JSON.stringify(cur)}\n`, "").trim()

    // write proposal template
    taPropSpecify.value = JSON.stringify(getProposalTemplate(network))

    // display address
    const wallet = detectWallet()
    const owner = await getAccountAddress(wallet, CHAIN_ID)
    inpAddress.value = owner
  } catch (error) { l(error) }
})

btnConnect.addEventListener("click", async () => {
  try {
    const network = selectNetwork.value.toUpperCase()
    const wallet = await connectWallet(network)
    if (wallet) {
      const { BASE: { CHAIN_ID } } = NETWORK_CONFIG[network]
      const owner = await getAccountAddress(wallet, CHAIN_ID)
      inpAddress.value = owner
    }
  } catch (error) { l(error) }
})

btnDisconnect.addEventListener("click", async () => {
  try {
    await disconnectWallet()
    inpAddress.value = ""
  } catch (error) { l(error) }
})

btnCreateProp.addEventListener("click", async () => {
  try {
    const proposal = JSON.parse(taPropSpecify.value)

    const network = selectNetwork.value.toUpperCase()
    const { BASE: { CHAIN_ID, RPC_LIST: [RPC] } } = NETWORK_CONFIG[network]

    const wallet = detectWallet()

    let [cwQueryProposals, cwCreateProposal] = []

    if (network === stargazeNetworkName) {
      const { signer, owner } = await getSigner(CHAIN_ID, wallet)

      cwQueryProposals = (await stargazeCwHelpers.getCwQueryHelpers(network, RPC)).cwQueryProposals
      cwCreateProposal = (await stargazeCwHelpers.getCwExecHelpers(network, RPC, owner, signer)).cwCreateProposal
    } else {
      const injNetwork = Network.Testnet
      const owner = await getAccountAddress(wallet, CHAIN_ID)

      const walletStrategy = new WalletStrategy({
        chainId: CHAIN_ID,
        wallet: Wallet.Keplr
      });

      const msgBroadcaster = new MsgBroadcaster({
        network: injNetwork,
        walletStrategy,
        simulateTx: true,
      });

      cwQueryProposals = (await injectiveCwHelpers.getCwQueryHelpers(network)).cwQueryProposals
      cwCreateProposal = (await injectiveCwHelpers.getCwExecHelpers(network, owner, msgBroadcaster)).cwCreateProposal
    }

    const [chain] = getChainList([CHAIN_ID])
    const gasPrice = getGasPriceFromChainRegistryItem(chain)

    await cwCreateProposal(proposal, gasPrice)

    const propList = await cwQueryProposals(3)
    taPropDisplay.value = propList.reduce((acc, cur) => `${acc}${JSON.stringify(cur)}\n`, "").trim()
  } catch (error) { l(error) }
})

btnRejectProp.addEventListener("click", async () => {
  try {
    const network = selectNetwork.value.toUpperCase()
    const { BASE: { CHAIN_ID, RPC_LIST: [RPC] } } = NETWORK_CONFIG[network]

    const proposalIdString = inpPropSelect.value;
    if (!proposalIdString) throw new Error("Proposal ID is not found!")
    const proposalId = +inpPropSelect.value

    const wallet = detectWallet()

    let [cwQueryProposals, cwRejectProposal] = []

    if (network === stargazeNetworkName) {
      const { signer, owner } = await getSigner(CHAIN_ID, wallet)

      cwQueryProposals = (await stargazeCwHelpers.getCwQueryHelpers(network, RPC)).cwQueryProposals
      cwRejectProposal = (await stargazeCwHelpers.getCwExecHelpers(network, RPC, owner, signer)).cwRejectProposal
    } else {
      const injNetwork = Network.Testnet
      const owner = await getAccountAddress(wallet, CHAIN_ID)

      const walletStrategy = new WalletStrategy({
        chainId: CHAIN_ID,
        wallet: Wallet.Keplr
      });

      const msgBroadcaster = new MsgBroadcaster({
        network: injNetwork,
        walletStrategy,
        simulateTx: true,
      });

      cwQueryProposals = (await injectiveCwHelpers.getCwQueryHelpers(network)).cwQueryProposals
      cwRejectProposal = (await injectiveCwHelpers.getCwExecHelpers(network, owner, msgBroadcaster)).cwRejectProposal
    }

    const [chain] = getChainList([CHAIN_ID])
    const gasPrice = getGasPriceFromChainRegistryItem(chain)

    await cwRejectProposal(proposalId, gasPrice)

    const propList = await cwQueryProposals(3)
    taPropDisplay.value = propList.reduce((acc, cur) => `${acc}${JSON.stringify(cur)}\n`, "").trim()
  } catch (error) { l(error) }
})

function getProposalTemplate(network) {
  const collectionAddress = network === stargazeNetworkName
    ? "stars1qrghctped3a7jcklqxg92dn8lvw88adrduwx3h50pmmcgcwl82xsu84lnw"
    : "inj1qvfylg5zvqar4q2sl6qxzhukdhr5av7qwxpl5p"
  const owner = network === stargazeNetworkName
    ? "stars1gjqnuhv52pd2a7ets2vhw9w9qa9knyhyzrpx49"
    : "inj1prmtvxpvdcmp3dtn6qn4hyq9gytj5ry4u28nqz"
  const denom = network === stargazeNetworkName ? "ustars" : "inj"
  const decimals = network === stargazeNetworkName ? 6 : 18
  const address = network === stargazeNetworkName
    ? "stars1chgwz55h9kepjq0fkj5supl2ta3nwu639kfa69"
    : "inj1hag3kx8f9ypnssw7aqnq9e82t2zgt0g0ac2rru"

  return {
    proposal_type: {
      add_collection: {
        collection_address: collectionAddress,
        collection: {
          name: "Pinjeons",
          owner,
          emission_type: "minting",
          daily_rewards: "0.1",
          staking_currency: { token: { native: { denom } }, decimals },
        }
      }
    },
    price: { amount: "500000000", currency: { token: { cw20: { address } }, decimals: 6 } }
  }
}
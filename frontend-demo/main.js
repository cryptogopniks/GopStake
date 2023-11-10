import "./style.css"
// https://github.com/cryptogopniks/GopStake/tree/main/contracts/scripts/dist/common
import { l } from "./common/utils"
import { getCwQueryHelpers, getCwExecHelpers } from "./common/account/cw-helpers"
import { NETWORK_CONFIG } from "./common/config"
import {
  connectWallet, disconnectWallet, getAccountAddress, detectWallet, getSigner,
  getChainList, getGasPriceFromChainRegistryItem
} from "./wallet"

const network = "STARGAZE"

const [btnConnect, btnDisconnect, btnCreateProp, btnRejectProp] = document.querySelectorAll("button");
const [taPropDisplay, taPropSpecify] = document.querySelectorAll("textarea")
const [inpAddress, inpPropSelect] = document.querySelectorAll("input")

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { BASE: { RPC_LIST: [RPC] } } = NETWORK_CONFIG[network]
    const { cwQueryProposals } = await getCwQueryHelpers(network, RPC)

    // query proposals
    const propList = await cwQueryProposals(3)
    taPropDisplay.value = propList.reduce((acc, cur) => `${acc}${JSON.stringify(cur)}\n`, "").trim()

    // write proposal template
    const prop = {
      proposal_type: {
        add_collection: {
          collection_address: "stars1qrghctped3a7jcklqxg92dn8lvw88adrduwx3h50pmmcgcwl82xsu84lnw", collection: {
            name: "Pinjeons",
            owner: "stars1gjqnuhv52pd2a7ets2vhw9w9qa9knyhyzrpx49",
            emission_type: "minting",
            daily_rewards: "0.1",
            staking_currency: { token: { native: { denom: "ustars" } }, decimals: 6 },
          }
        }
      },
      price: { amount: "500000000", currency: { token: { cw20: { address: "stars1chgwz55h9kepjq0fkj5supl2ta3nwu639kfa69" } }, decimals: 6 } }
    }

    taPropSpecify.value = JSON.stringify(prop)
  } catch (error) { l(error) }
})

btnConnect.addEventListener("click", async () => {
  try {
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

    const { BASE: { CHAIN_ID, RPC_LIST: [RPC] } } = NETWORK_CONFIG[network]

    const wallet = detectWallet()
    const { signer, owner } = await getSigner(CHAIN_ID, wallet)

    const { cwQueryProposals } = await getCwQueryHelpers(network, RPC)
    const { cwCreateProposal } = await getCwExecHelpers(network, RPC, owner, signer)

    const [chain] = getChainList([CHAIN_ID])
    const gasPrice = getGasPriceFromChainRegistryItem(chain)

    await cwCreateProposal(proposal, gasPrice)

    const propList = await cwQueryProposals(3)
    taPropDisplay.value = propList.reduce((acc, cur) => `${acc}${JSON.stringify(cur)}\n`, "").trim()
  } catch (error) { l(error) }
})

btnRejectProp.addEventListener("click", async () => {
  try {
    const { BASE: { CHAIN_ID, RPC_LIST: [RPC] } } = NETWORK_CONFIG[network]

    const wallet = detectWallet()
    const { signer, owner } = await getSigner(CHAIN_ID, wallet)

    const { cwQueryProposals } = await getCwQueryHelpers(network, RPC)
    const { cwRejectProposal } = await getCwExecHelpers(network, RPC, owner, signer)

    const [chain] = getChainList([CHAIN_ID])
    const gasPrice = getGasPriceFromChainRegistryItem(chain)

    const proposalIdString = inpPropSelect.value;
    if (!proposalIdString) throw new Error("Proposal ID is not found!")
    const proposalId = +inpPropSelect.value

    await cwRejectProposal(proposalId, gasPrice)

    const propList = await cwQueryProposals(3)
    taPropDisplay.value = propList.reduce((acc, cur) => `${acc}${JSON.stringify(cur)}\n`, "").trim()
  } catch (error) { l(error) }
})
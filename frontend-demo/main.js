import "./style.css"
import { l } from "./common/utils"
import { getCwQueryHelpers, getCwExecHelpers } from "./common/account/cw-helpers"
import { NETWORK_CONFIG, MINTER_WASM, STAKING_PLATFORM_WASM } from "./common/config"

async function clickHandler() {
  const { BASE: { RPC_LIST: [RPC] }, CONTRACTS } = NETWORK_CONFIG.STARGAZE

  const minter = CONTRACTS.find(x => x.WASM === MINTER_WASM)
  const staking_platform = CONTRACTS.find(x => x.WASM === STAKING_PLATFORM_WASM)

  const { cwQueryStakingPlatformConfig, cwQueryStakers } = await getCwQueryHelpers(staking_platform.DATA.ADDRESS, minter.DATA.ADDRESS, RPC)
  // const { cwCreateProposal } = await getCwExecHelpers(staking_platform.DATA.ADDRESS, minter.DATA.ADDRESS, RPC, "", {})

  await cwQueryStakingPlatformConfig()
}

const btn = document.querySelectorAll("button")[0];

btn.addEventListener("click", async (e) => {
  await clickHandler()
})

import STARGAZE_MINTER from "./stargaze-minter.json";
import STARGAZE_STAKING_PLATFORM from "./stargaze-staking_platform.json";
const MINTER_WASM = "minter.wasm";
const STAKING_PLATFORM_WASM = "staking_platform.wasm";
const minterInitMsg = {};
const stakingPlatformInitMsg = {};
const NETWORK_CONFIG = {
  STARGAZE: {
    BASE: {
      PREFIX: "stars",
      DENOM: "ustars",
      CHAIN_ID: "elgafar-1",
      RPC_LIST: ["https://rpc.elgafar-1.stargaze-apis.com:443"],
      GAS_PRICE_AMOUNT: 0.04,
      STORE_CODE_GAS_MULTIPLIER: 7.3
    },
    CONTRACTS: [{
      WASM: MINTER_WASM,
      LABEL: "minter-dev-1.0",
      INIT_MSG: minterInitMsg,
      DATA: {
        CODE: STARGAZE_MINTER.CODE,
        ADDRESS: STARGAZE_MINTER.ADDRESS
      }
    }, {
      WASM: STAKING_PLATFORM_WASM,
      LABEL: "staking_platform-dev-1.0",
      INIT_MSG: stakingPlatformInitMsg,
      DATA: {
        CODE: STARGAZE_STAKING_PLATFORM.CODE,
        ADDRESS: STARGAZE_STAKING_PLATFORM.ADDRESS
      }
    }]
  },
  INJECTIVE: {
    BASE: {
      PREFIX: "osmo",
      DENOM: "uosmo",
      CHAIN_ID: "osmo-test-5",
      RPC_LIST: ["https://osmosis-testnet.rpc.kjnodes.com:443"],
      GAS_PRICE_AMOUNT: 0.04,
      STORE_CODE_GAS_MULTIPLIER: 7.3
    },
    CONTRACTS: []
  }
};
export { NETWORK_CONFIG, MINTER_WASM, STAKING_PLATFORM_WASM };
import { NetworkConfig } from "../../common/interfaces";
import { InstantiateMsg as MinterInitMsg } from "../codegen/Minter.types";
import { InstantiateMsg as StakingPlatformInitMsg } from "../codegen/StakingPlatform.types";
import STARGAZE_MINTER from "./stargaze-minter.json";
import STARGAZE_STAKING_PLATFORM from "./stargaze-staking_platform.json";
import INJECTIVE_MINTER from "./injective-minter.json";
import INJECTIVE_STAKING_PLATFORM from "./injective-staking_platform.json";

const INJ_MINTER_WASM = "minter_inj.wasm";
const MINTER_WASM = "minter.wasm";
const STAKING_PLATFORM_WASM = "staking_platform.wasm";

const minterInitMsg: MinterInitMsg = {};
const stakingPlatformInitMsg: StakingPlatformInitMsg = {};

const NETWORK_CONFIG: NetworkConfig = {
  STARGAZE: {
    BASE: {
      PREFIX: "stars",
      DENOM: "ustars",
      CHAIN_ID: "elgafar-1",
      RPC_LIST: ["https://rpc.elgafar-1.stargaze-apis.com:443"],
      GAS_PRICE_AMOUNT: 0.04,
      STORE_CODE_GAS_MULTIPLIER: 19.2,
    },
    CONTRACTS: [
      {
        WASM: MINTER_WASM,
        LABEL: "minter-dev-1.0",
        INIT_MSG: minterInitMsg,
        DATA: {
          CODE: STARGAZE_MINTER.CODE,
          ADDRESS: STARGAZE_MINTER.ADDRESS,
        },
      },
      {
        WASM: STAKING_PLATFORM_WASM,
        LABEL: "staking_platform-dev-1.0",
        INIT_MSG: stakingPlatformInitMsg,
        DATA: {
          CODE: STARGAZE_STAKING_PLATFORM.CODE,
          ADDRESS: STARGAZE_STAKING_PLATFORM.ADDRESS,
        },
      },
    ],
  },
  INJECTIVE: {
    BASE: {
      PREFIX: "inj",
      DENOM: "inj",
      CHAIN_ID: "injective-888",
      RPC_LIST: [
        "https://injective-testnet-rpc.polkachu.com:443",
        "https://k8s.testnet.tm.injective.network:443",
      ],
      GAS_PRICE_AMOUNT: 700000000,
      STORE_CODE_GAS_MULTIPLIER: 1,
    },
    CONTRACTS: [
      {
        WASM: INJ_MINTER_WASM,
        LABEL: "minter-dev-1.0",
        INIT_MSG: minterInitMsg,
        DATA: {
          CODE: INJECTIVE_MINTER.CODE,
          ADDRESS: INJECTIVE_MINTER.ADDRESS,
        },
      },
      {
        WASM: STAKING_PLATFORM_WASM,
        LABEL: "staking_platform-dev-1.0",
        INIT_MSG: stakingPlatformInitMsg,
        DATA: {
          CODE: INJECTIVE_STAKING_PLATFORM.CODE,
          ADDRESS: INJECTIVE_STAKING_PLATFORM.ADDRESS,
        },
      },
    ],
  },
};

export { NETWORK_CONFIG, MINTER_WASM, STAKING_PLATFORM_WASM, INJ_MINTER_WASM };

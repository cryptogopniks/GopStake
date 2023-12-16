import { getGasPriceFromChainRegistryItem } from "../../common/account/clients";
import { getSigner } from "../account/signer";
import { getSeed } from "./get-seed";
import { l } from "../../common/utils";
import { chains } from "chain-registry";
import { NetworkName } from "../../common/interfaces";
import { readFile } from "fs/promises";
import { PATH } from "../envs";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers";
import {
  NETWORK_CONFIG,
  MINTER_WASM,
  STAKING_PLATFORM_WASM,
} from "../../common/config";

async function main(network: NetworkName) {
  try {
    const {
      BASE: {
        CHAIN_ID,
        RPC_LIST: [RPC],
        PREFIX,
      },
      CONTRACTS,
    } = NETWORK_CONFIG[network];

    const MINTER_CONTRACT = CONTRACTS.find((x) => x.WASM === MINTER_WASM);
    if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");

    const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(
      (x) => x.WASM === STAKING_PLATFORM_WASM
    );
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const testWallets: {
      SEED_ADMIN: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding: "utf8" }));

    const seed = await getSeed(testWallets.SEED_ADMIN);
    if (!seed) throw new Error("Seed is not found!");

    const chain = chains.find((x) => x.chain_id == CHAIN_ID);
    if (!chain) throw new Error(`${CHAIN_ID} config is not found!`);

    const gasPrice = getGasPriceFromChainRegistryItem(chain);

    const { signer, owner } = await getSigner(PREFIX, seed);

    const { cwQueryMinterConfig, cwQueryStakingPlatformConfig } =
      await getCwQueryHelpers(network, RPC);

    const { cwUpdateConfig } = await getCwExecHelpers(
      network,
      RPC,
      owner,
      signer
    );

    const minterAndStakingPlatformOwner =
      "stars1hvp3q00ypzrurd46h7c7c3hu86tx9uf8sg5lm3";

    await cwUpdateConfig(
      {
        minterOwner: minterAndStakingPlatformOwner,
        stakingPlatform: STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
        stakingPlatformOwner: minterAndStakingPlatformOwner,
        minter: MINTER_CONTRACT.DATA.ADDRESS,
      },
      gasPrice
    );

    await cwQueryMinterConfig();
    await cwQueryStakingPlatformConfig();
  } catch (error) {
    l(error);
  }
}

main("STARGAZE");

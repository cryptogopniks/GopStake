import { getGasPriceFromChainRegistryItem } from "../../common/account/clients";
import { initExecWorkers, initQueryWorkers } from "../account/workers";
import { getSeed } from "./get-seed";
import { l } from "../../common/utils";
import { chains } from "chain-registry";
import { NetworkName } from "../../common/interfaces";
import { readFile } from "fs/promises";
import { PATH } from "../envs";
import {
  NETWORK_CONFIG,
  MINTER_WASM,
  STAKING_PLATFORM_WASM,
} from "../../common/config";

async function main(network: NetworkName) {
  try {
    const {
      BASE: { CHAIN_ID },
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
      SEED_DAPP: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding: "utf8" }));

    const { SEED_DAPP } = testWallets;

    const seed = await getSeed(SEED_DAPP);
    if (!seed) throw new Error("Seed is not found!");

    const chain = chains.find((x) => x.chain_id == CHAIN_ID);
    if (!chain) throw new Error(`${CHAIN_ID} config is not found!`);

    const gasPrice = getGasPriceFromChainRegistryItem(chain);

    const { cwUpdateMinterConfig, cwUpdateStakingPlatformConfig } =
      await initExecWorkers(network, seed, gasPrice);

    const { cwQueryMinterConfig, cwQueryStakingPlatformConfig } =
      await initQueryWorkers(network);

    await cwUpdateMinterConfig({
      stakingPlatform: STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
    });
    await cwUpdateStakingPlatformConfig({
      minter: MINTER_CONTRACT.DATA.ADDRESS,
      owner: "stars1hvp3q00ypzrurd46h7c7c3hu86tx9uf8sg5lm3",
    });

    await cwQueryMinterConfig();
    await cwQueryStakingPlatformConfig();
  } catch (error) {
    l(error);
  }
}

main("STARGAZE");

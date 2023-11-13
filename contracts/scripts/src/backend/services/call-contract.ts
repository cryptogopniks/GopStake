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
import { getSgQueryHelpers } from "../../common/account/sg-helpers";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers";
import { getSigner } from "../account/signer";

async function main(network: NetworkName) {
  try {
    const {
      BASE: {
        DENOM,
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
      SEED_DAPP: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding: "utf8" }));

    const { SEED_DAPP } = testWallets;

    const seed = await getSeed(SEED_DAPP);
    if (!seed) throw new Error("Seed is not found!");

    const chain = chains.find((x) => x.chain_id == CHAIN_ID);
    if (!chain) throw new Error(`${CHAIN_ID} config is not found!`);

    const gasPrice = getGasPriceFromChainRegistryItem(chain);

    // const { owner, cwCreateDenom, cwMintTokens, cwBurnTokens } =
    //   await initExecWorkers(network, seed, gasPrice);

    // const { getAllBalances } = await initQueryWorkers(network);

    const { signer, owner } = await getSigner(PREFIX, seed);

    const { getAllBalances } = await getSgQueryHelpers(RPC);
    const { cwCreateDenom, cwMintTokens, cwBurnTokens } =
      await getCwExecHelpers(network, RPC, owner, signer);

    const alice = "stars1gjqnuhv52pd2a7ets2vhw9w9qa9knyhyzrpx49";
    const denom = "upinj";
    const fullDenom = `factory/${MINTER_CONTRACT.DATA.ADDRESS}/${denom}`;

    // await cwCreateDenom(denom, 10000000000, "ustars", gasPrice);
    // await cwMintTokens(fullDenom, 100, owner, gasPrice);
    await cwBurnTokens(fullDenom, 100, gasPrice);

    await getAllBalances(alice);
  } catch (error) {
    l(error);
  }
}

main("STARGAZE");

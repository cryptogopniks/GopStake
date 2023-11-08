import { coin } from "@cosmjs/stargate";
import { getGasPriceFromChainRegistryItem } from "../../common/account/clients";
import { init } from "../account/workers";
import { getSeed } from "./get-seed";
import { l } from "../../common/utils";
import { chains } from "chain-registry";
import {
  SEED_DAPP,
  CHAIN_ID,
  CONTRACT_ADDRESS,
} from "../../common/config/stars-testnet-config.json";
// import {
//   SEED_DAPP,
//   CHAIN_ID,
//   CONTRACT_ADDRESS,
// } from "../../common/config/osmo-testnet-config.json";

async function main() {
  try {
    const seed = await getSeed(SEED_DAPP);
    if (!seed) throw new Error("Seed is not found!");

    const chain = chains.find((x) => x.chain_id == CHAIN_ID);
    if (!chain) throw new Error(`${CHAIN_ID} config is not found!`);

    const gasPrice = getGasPriceFromChainRegistryItem(chain);

    const helpers = await init(seed, gasPrice);
    if (!helpers) throw new Error("Helpers are not found!");

    const {
      owner,
      cwCreateDenom,
      cwMintTokens,
      cwBurnTokens,
      cwSetMetadata,
      cwUpdateConfig,
      sgSend,
      cwQueryDenomsByCreator,
      cwQueryConfig,
      sgGetAllBalances,
      sgGetMetadata,
      sgGetTokenfactoryConfig,
    } = helpers;
    if (!owner) return;

    const DAPP_ADDRESS = owner;
    const ALICE_ADDRESS = "stars1gjqnuhv52pd2a7ets2vhw9w9qa9knyhyzrpx49";

    const subdenom = "upinj";
    const fullDenom = `factory/${CONTRACT_ADDRESS}/${subdenom}`;

    // await cwCreateDenom(subdenom, coin(1, "uosmo"));
    // await cwCreateDenom(subdenom, coin(10000000000, "ustars"));

    // await cwQueryDenomsByCreator(DAPP_ADDRESS);

    // await cwSetMetadata(
    //   CONTRACT_ADDRESS,
    //   "PINJ",
    //   "Gopniks Project Pinjeons NFT collection staking token"
    // );

    // await sgGetMetadata(fullDenom);

    // await cwMintTokens(fullDenom, 100, ALICE_ADDRESS);

    await cwBurnTokens(fullDenom, 50, ALICE_ADDRESS);

    await sgGetAllBalances(ALICE_ADDRESS);

    // await sgGetTokenfactoryConfig();
  } catch (error) {
    l(error);
  }
}

main();

import { getSeed } from "./get-seed";
import { l } from "../../common/utils";
import { NetworkName } from "../../common/interfaces";
import { readFile } from "fs/promises";
import { PATH } from "../envs";
import { getPrivateKey } from "../account/signer-inj";
import { Network } from "@injectivelabs/networks";
import { MsgBroadcasterWithPk } from "@injectivelabs/sdk-ts";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers-inj";
import {
  NETWORK_CONFIG,
  MINTER_WASM,
  STAKING_PLATFORM_WASM,
  INJ_MINTER_WASM,
} from "../../common/config";

const encoding = "utf8";
const networkType = Network.Testnet;

async function main(network: NetworkName) {
  try {
    if (network !== "INJECTIVE") {
      throw new Error("The network is not INJECTIVE!");
    }

    const { CONTRACTS } = NETWORK_CONFIG[network];

    const MINTER_CONTRACT = CONTRACTS.find(
      (x) =>
        x.WASM === (network === "INJECTIVE" ? INJ_MINTER_WASM : MINTER_WASM)
    );
    if (!MINTER_CONTRACT) throw new Error("MINTER_CONTRACT in not found!");

    const STAKING_PLATFORM_CONTRACT = CONTRACTS.find(
      (x) => x.WASM === STAKING_PLATFORM_WASM
    );
    if (!STAKING_PLATFORM_CONTRACT) {
      throw new Error("STAKING_PLATFORM_CONTRACT in not found!");
    }

    const testWallets: {
      SEED_ADMIN: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding }));

    const seed = await getSeed(testWallets.SEED_ADMIN);
    if (!seed) throw new Error("Seed is not found!");

    const { privateKey, injectiveAddress } = getPrivateKey(seed);

    const msgBroadcasterWithPk = new MsgBroadcasterWithPk({
      privateKey,
      network: networkType,
      simulateTx: true,
    });

    const { cwQueryStakingPlatformConfig, cwQueryMinterConfig } =
      await getCwQueryHelpers(network);

    const { cwUpdateConfig } = await getCwExecHelpers(
      network,
      injectiveAddress,
      msgBroadcasterWithPk
    );

    const res = await cwUpdateConfig({
      stakingPlatform: STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
      minter: MINTER_CONTRACT.DATA.ADDRESS,
      owner: "inj1u9jles5s3nw29726frttn007h9880n2zyfwf6c",
    });
    l("\n", res, "\n");

    await cwQueryMinterConfig();
    await cwQueryStakingPlatformConfig();
  } catch (error) {
    l(error);
  }
}

main("INJECTIVE");

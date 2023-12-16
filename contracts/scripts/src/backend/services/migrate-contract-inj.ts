import { getSeed } from "./get-seed";
import { getPrivateKey } from "../account/signer-inj";
import { l } from "../../common/utils";
import { NetworkName } from "../../common/interfaces";
import { readFile } from "fs/promises";
import { PATH } from "../envs";
import { Network } from "@injectivelabs/networks";
import {
  MsgBroadcasterWithPk,
  MsgMigrateContract,
} from "@injectivelabs/sdk-ts";
import {
  NETWORK_CONFIG,
  MINTER_WASM,
  INJ_MINTER_WASM,
  STAKING_PLATFORM_WASM,
} from "../../common/config";

const networkType = Network.Testnet;

async function main(network: NetworkName, wasm: string) {
  try {
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
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding: "utf8" }));

    const seed = await getSeed(testWallets.SEED_ADMIN);
    if (!seed) throw new Error("Seed is not found!");

    const { privateKey, injectiveAddress } = getPrivateKey(seed);

    const msgBroadcasterWithPk = new MsgBroadcasterWithPk({
      privateKey,
      network: networkType,
      simulateTx: true,
    });

    const contract =
      wasm === STAKING_PLATFORM_WASM
        ? STAKING_PLATFORM_CONTRACT
        : MINTER_CONTRACT;

    const msg = MsgMigrateContract.fromJSON({
      sender: injectiveAddress,
      contract: contract.DATA.ADDRESS,
      codeId: contract.DATA.CODE,
      msg: contract.MIGRATE_MSG,
    });

    l(msg);

    const tx = await msgBroadcasterWithPk.broadcast({ msgs: msg });

    l(tx);
  } catch (error) {
    l(error);
  }
}

main("INJECTIVE", MINTER_WASM);

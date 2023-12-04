import { getSeed } from "./get-seed";
import { getPrivateKey } from "../account/signer-inj";
import { l } from "../../common/utils";
import { NetworkName } from "../../common/interfaces";
import { readFile } from "fs/promises";
import { PATH } from "../envs";
import {
  MsgBroadcasterWithPk,
  MsgMigrateContract,
} from "@injectivelabs/sdk-ts";
import { Network } from "@injectivelabs/networks";
import { ProposalForStringAndTokenUnverified } from "../../common/codegen/StakingPlatform.types";
import { getSgQueryHelpers } from "../../common/account/sg-helpers-inj";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers-inj";
import {
  NETWORK_CONFIG,
  MINTER_WASM,
  INJ_MINTER_WASM,
  STAKING_PLATFORM_WASM,
} from "../../common/config";

import { MigrateMsg } from "../../common/codegen/StakingPlatform.types";
import { toUtf8 } from "@cosmjs/encoding";

const networkType = Network.Testnet;

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
      SEED_DAPP: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding: "utf8" }));

    const seed = await getSeed(testWallets.SEED_DAPP);
    if (!seed) throw new Error("Seed is not found!");

    const { privateKey, injectiveAddress } = getPrivateKey(seed);

    const msgBroadcasterWithPk = new MsgBroadcasterWithPk({
      privateKey,
      network: networkType,
      simulateTx: true,
    });

    const migrateMsg: MigrateMsg = { version: "1.3.0" };

    const msg = MsgMigrateContract.fromJSON({
      sender: injectiveAddress,
      contract: STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
      codeId: STAKING_PLATFORM_CONTRACT.DATA.CODE,
      msg: migrateMsg,
    });

    l(msg);

    const tx = await msgBroadcasterWithPk.broadcast({ msgs: msg });

    l(tx);
  } catch (error) {
    l(error);
  }
}

main("INJECTIVE");

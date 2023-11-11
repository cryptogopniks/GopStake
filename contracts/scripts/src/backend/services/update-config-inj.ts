import { getSeed } from "./get-seed";
import { l } from "../../common/utils";
import { NetworkName } from "../../common/interfaces";
import { readFile } from "fs/promises";
import { PATH } from "../envs";
import { getPrivateKey } from "../account/signer-inj";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";
import { MsgBroadcasterWithPk, ChainGrpcWasmApi } from "@injectivelabs/sdk-ts";
import { MinterMsgComposer } from "../../common/codegen/Minter.message-composer";
import { StakingPlatformMsgComposer } from "../../common/codegen/StakingPlatform.message-composer";
import { QueryMsg as MinterQueryMsg } from "../../common/codegen/Minter.types";
import { QueryMsg as StakingPlatformQueryMsg } from "../../common/codegen/StakingPlatform.types";
import cwHelpersInj from "../../common/account/cw-helpers-inj";
import {
  NETWORK_CONFIG,
  MINTER_WASM,
  STAKING_PLATFORM_WASM,
} from "../../common/config";

const { getInjExecMsgFromComposerObj, queryInjContract } = cwHelpersInj;

const encoding = "utf8";
const networkType = Network.Testnet;

async function main(network: NetworkName) {
  try {
    if (network !== "INJECTIVE") {
      throw new Error("The network is not INJECTIVE!");
    }

    const { CONTRACTS } = NETWORK_CONFIG[network];

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
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding }));

    const { SEED_DAPP } = testWallets;

    const seed = await getSeed(SEED_DAPP);
    if (!seed) throw new Error("Seed is not found!");

    const { privateKey, injectiveAddress } = getPrivateKey(seed);

    const msgBroadcasterWithPk = new MsgBroadcasterWithPk({
      privateKey,
      network: networkType,
      simulateTx: true,
    });

    const stakingPlatformMsgComposer = new StakingPlatformMsgComposer(
      injectiveAddress,
      STAKING_PLATFORM_CONTRACT.DATA.ADDRESS
    );
    const minterMsgComposer = new MinterMsgComposer(
      injectiveAddress,
      MINTER_CONTRACT.DATA.ADDRESS
    );

    const msg1 = minterMsgComposer.updateConfig({
      stakingPlatform: STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
    });

    const msg2 = stakingPlatformMsgComposer.updateConfig({
      minter: MINTER_CONTRACT.DATA.ADDRESS,
      owner: "inj1u9jles5s3nw29726frttn007h9880n2zyfwf6c",
    });

    await msgBroadcasterWithPk.broadcast({
      msgs: [msg1, msg2].map(getInjExecMsgFromComposerObj),
    });

    const endpoints = getNetworkEndpoints(networkType);
    const chainGrpcWasmApi = new ChainGrpcWasmApi(endpoints.grpc);

    const minterQueryMsg: MinterQueryMsg = { query_config: {} };
    const stakingPlatformQueryMsg: StakingPlatformQueryMsg = {
      query_config: {},
    };

    const minterConfig = await queryInjContract(
      chainGrpcWasmApi,
      MINTER_CONTRACT.DATA.ADDRESS,
      minterQueryMsg
    );

    l("\n", JSON.parse(minterConfig), "\n");

    const stakingPlatformConfig = await queryInjContract(
      chainGrpcWasmApi,
      STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
      stakingPlatformQueryMsg
    );

    l("\n", JSON.parse(stakingPlatformConfig), "\n");
  } catch (error) {
    l(error);
  }
}

main("INJECTIVE");

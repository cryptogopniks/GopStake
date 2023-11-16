import { l } from "../../common/utils";
import { PATH, rootPath } from "../envs";
import { readFile, writeFile } from "fs/promises";
import { getSeed } from "./get-seed";
import { NetworkName, ContractData } from "../../common/interfaces";
import { NETWORK_CONFIG, INJ_MINTER_WASM } from "../../common/config";
import { getPrivateKey } from "../account/signer-inj";
import { Network } from "@injectivelabs/networks";
import {
  MsgBroadcasterWithPk,
  MsgInstantiateContract,
  MsgStoreCode,
} from "@injectivelabs/sdk-ts";

const encoding = "utf8";

async function main(network: NetworkName) {
  try {
    if (network !== "INJECTIVE") {
      throw new Error("The network is not INJECTIVE!");
    }

    const { CONTRACTS } = NETWORK_CONFIG[network];

    const testWallets: {
      SEED_DAPP: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding }));

    const { SEED_DAPP } = testWallets;

    const seed = await getSeed(SEED_DAPP);
    if (!seed) throw new Error("Seed is not found!");

    const { privateKey, injectiveAddress } = getPrivateKey(seed);

    const msgBroadcasterWithPk = new MsgBroadcasterWithPk({
      privateKey,
      network: Network.Testnet,
      simulateTx: true,
    });

    for (const { WASM, LABEL, INIT_MSG } of CONTRACTS) {
      // if (WASM !== INJ_MINTER_WASM) continue;

      const networkName = network.toLowerCase();
      const contractName = WASM.replace(".wasm", "").toLowerCase();

      const wasmBinary = await readFile(rootPath(`../artifacts/${WASM}`));

      // TODO: use 2 msgs 1 tx for each type
      const msgStore = MsgStoreCode.fromJSON({
        sender: injectiveAddress,
        wasmBytes: wasmBinary,
      });

      const { rawLog } = await msgBroadcasterWithPk.broadcast({
        msgs: [msgStore],
      });

      const codeIdMatch = rawLog.split("code_id")[1].match(/[0-9]+/);
      if (!codeIdMatch) throw new Error("codeIdMatch is not found!");
      const codeId = +codeIdMatch[0];

      l(`\n"${contractName}" contract code is ${codeId}\n`);

      const msgInit = MsgInstantiateContract.fromJSON({
        sender: injectiveAddress,
        codeId,
        label: LABEL,
        msg: INIT_MSG,
        admin: injectiveAddress,
      });

      const res = await msgBroadcasterWithPk.broadcast({
        msgs: [msgInit],
      });

      const contractAddressMatch = res.rawLog
        .split("contract_address")[1]
        .match(/inj[\w]+/);
      if (!contractAddressMatch) {
        throw new Error("contractAddressMatch is not found!");
      }
      const contractAddress = contractAddressMatch[0];

      l(`"${contractName}" contract address is ${contractAddress}\n`);

      const contractData: ContractData = {
        CODE: codeId,
        ADDRESS: contractAddress,
      };

      await writeFile(
        rootPath(`src/common/config/${networkName}-${contractName}.json`),
        JSON.stringify(contractData),
        { encoding }
      );

      l(`✔️ "${contractName}" contract is ready!\n`);
    }
  } catch (error) {
    l(error);
  }
}

main("INJECTIVE");

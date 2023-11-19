import { l } from "../../common/utils";
import { PATH, rootPath } from "../envs";
import { readFile, writeFile } from "fs/promises";
import { getSeed } from "./get-seed";
import { NETWORK_CONFIG } from "../../common/config";
import { getPrivateKey } from "../account/signer-inj";
import { Network } from "@injectivelabs/networks";
import { parseCodeIdList, parseAddressList } from "../utils";
import {
  MsgBroadcasterWithPk,
  MsgInstantiateContract,
  MsgStoreCode,
} from "@injectivelabs/sdk-ts";
import {
  NetworkName,
  ContractData,
  ContractsConfig,
} from "../../common/interfaces";

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

    const seed = await getSeed(testWallets.SEED_DAPP);
    if (!seed) throw new Error("Seed is not found!");

    const { privateKey, injectiveAddress } = getPrivateKey(seed);

    const msgBroadcasterWithPk = new MsgBroadcasterWithPk({
      privateKey,
      network: Network.Testnet,
      simulateTx: true,
    });

    let contractConfigAndStoreCodeMsgList: [ContractsConfig, MsgStoreCode][] =
      [];

    for (const CONTRACT of CONTRACTS) {
      const wasmBinary = await readFile(
        rootPath(`../artifacts/${CONTRACT.WASM}`)
      );

      contractConfigAndStoreCodeMsgList.push([
        CONTRACT,
        MsgStoreCode.fromJSON({
          sender: injectiveAddress,
          wasmBytes: wasmBinary,
        }),
      ]);
    }

    const { rawLog } = await msgBroadcasterWithPk.broadcast({
      msgs: contractConfigAndStoreCodeMsgList.map((x) => x[1]),
    });

    const codeIds = parseCodeIdList(rawLog);

    let contractConfigAndInitMsgList: [
      ContractsConfig,
      MsgInstantiateContract
    ][] = [];

    for (const i in contractConfigAndStoreCodeMsgList) {
      const [CONTRACT] = contractConfigAndStoreCodeMsgList[i];
      const { WASM, LABEL, INIT_MSG } = CONTRACT;
      const codeId = codeIds[i];

      const contractName = WASM.replace(".wasm", "")
        .replace("_inj", "")
        .toLowerCase();

      l(`\n"${contractName}" contract code is ${codeId}\n`);

      const msgInit = MsgInstantiateContract.fromJSON({
        sender: injectiveAddress,
        codeId,
        label: LABEL,
        msg: INIT_MSG,
        admin: injectiveAddress,
      });

      contractConfigAndInitMsgList.push([CONTRACT, msgInit]);
    }

    const res = await msgBroadcasterWithPk.broadcast({
      msgs: contractConfigAndInitMsgList.map((x) => x[1]),
    });

    const addressList = parseAddressList(res.rawLog);

    for (const i in contractConfigAndInitMsgList) {
      const [{ WASM }] = contractConfigAndInitMsgList[i];
      const codeId = codeIds[i];
      const contractAddress = addressList[i];

      const networkName = network.toLowerCase();
      const contractName = WASM.replace(".wasm", "")
        .replace("_inj", "")
        .toLowerCase();

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

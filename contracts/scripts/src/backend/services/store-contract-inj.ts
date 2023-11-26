import { l } from "../../common/utils";
import { PATH, rootPath } from "../envs";
import { readFile, writeFile } from "fs/promises";
import { getSeed } from "./get-seed";
import { NETWORK_CONFIG, INJ_MINTER_WASM } from "../../common/config";
import { getPrivateKey } from "../account/signer-inj";
import { Network } from "@injectivelabs/networks";
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

function parseCodeIdList(rawLog: string): number[] {
  const regex = /"code_id","value":"([\d\\\"]+)"/g;

  return (rawLog.match(regex) || []).map(
    (x) => +x.split("\\")[1].replace('"', "")
  );
}

function parseAddressList(rawLog: string): string[] {
  const regex = /"contract_address","value":"([\w\\\"]+)"/g;

  return (rawLog.match(regex) || []).map((x) =>
    x.split("\\")[1].replace('"', "")
  );
}

async function main(
  network: NetworkName,
  isMigrationRequired: boolean,
  wasmIgnoreList: string[]
) {
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
      if (wasmIgnoreList.includes(CONTRACT.WASM)) continue;

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
    let addressList: string[] = [];

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

    if (!isMigrationRequired) {
      const res = await msgBroadcasterWithPk.broadcast({
        msgs: contractConfigAndInitMsgList.map((x) => x[1]),
      });

      addressList = parseAddressList(res.rawLog);
    }

    for (const i in contractConfigAndInitMsgList) {
      const [{ WASM }] = contractConfigAndInitMsgList[i];
      const codeId = codeIds[i];
      const contractAddress = addressList[i] || "";

      const networkName = network.toLowerCase();
      const contractName = WASM.replace(".wasm", "")
        .replace("_inj", "")
        .toLowerCase();

      let contractData: ContractData = {
        CODE: codeId,
        ADDRESS: "",
      };

      if (!isMigrationRequired) {
        l(`"${contractName}" contract address is ${contractAddress}\n`);

        contractData.ADDRESS = contractAddress;
      } else {
        const { ADDRESS }: ContractData = JSON.parse(
          await readFile(
            rootPath(`src/common/config/${networkName}-${contractName}.json`),
            { encoding }
          )
        );

        contractData.ADDRESS = ADDRESS;
      }

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

main("INJECTIVE", true, [INJ_MINTER_WASM]);

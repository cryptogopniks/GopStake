import { l, Request } from "../../common/utils";
import { PATH, rootPath } from "../envs";
import { calculateFee } from "@cosmjs/stargate";
import { toUtf8 } from "@cosmjs/encoding";
import {
  NETWORK_CONFIG,
  MINTER_WASM,
  STAKING_PLATFORM_WASM,
} from "../../common/config";
import { gzip } from "pako";
import { readFile, writeFile } from "fs/promises";
import { getCwClient } from "../../common/account/clients";
import { getSeed } from "./get-seed";
import {
  NetworkName,
  ContractData,
  ContractsConfig,
  QueryContractCodesResponse,
} from "../../common/interfaces";
import {
  SigningCosmWasmClient,
  MsgStoreCodeEncodeObject,
  MsgInstantiateContractEncodeObject,
} from "@cosmjs/cosmwasm-stargate";

import { getPrivateKey } from "../account/signer-inj";
import { Network } from "@injectivelabs/networks";
import {
  MsgBroadcasterWithPk,
  MsgInstantiateContract,
} from "@injectivelabs/sdk-ts";

const networkType = Network.Mainnet;

const encoding = "utf8";

function parseAddressList(rawLog: string): string[] {
  const regex = /"_contract_address","value":"(\w+)"/g;

  const addresses = (rawLog.match(regex) || []).map((x) =>
    x.split(":")[1].replace(/"/g, "")
  );

  return [...new Set(addresses).values()];
}

async function main(
  network: NetworkName,
  isMigrationRequired: boolean,
  wasmIgnoreList: string[]
) {
  try {
    const {
      BASE: { DENOM, PREFIX },
      CONTRACTS,
    } = NETWORK_CONFIG[network];

    const GAS_PRICE_AMOUNT = 1;
    const RPC = "https://stargaze-rpc.reece.sh:443";
    const REST = "https://injective-api.lavenderfive.com:443";

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

    let contractConfigList: ContractsConfig[] = [];

    for (const CONTRACT of CONTRACTS) {
      if (wasmIgnoreList.includes(CONTRACT.WASM)) continue;

      contractConfigList.push(CONTRACT);
    }

    let contractConfigAndInitMsgList: [
      ContractsConfig,
      MsgInstantiateContractEncodeObject
    ][] = [];
    let addressList: string[] = [];

    // const { code_infos: codeList } =
    //   await new Request().get<QueryContractCodesResponse>(
    //     `${REST}/cosmwasm/wasm/v1/code?pagination.limit=8&pagination.reverse=true`
    //   );
    // l({ codeList });

    // const code = codeList.find((x) => x.creator === injectiveAddress);
    // if (!code) throw new Error("Code ID is not found!");

    // const codeId = +code.code_id;

    const codeId = 330;

    //  for (const contractConfig in contractConfigList) {
    // const a = contractConfig;
    // const { WASM, LABEL } = CONTRACT;
    // const contractName = WASM.replace(".wasm", "").toLowerCase();

    // l(`\n"${contractName}" contract code is ${codeId}\n`);

    const instantiateContractMsg = MsgInstantiateContract.fromJSON({
      sender: injectiveAddress,
      codeId,
      label: "cryptogopniks-staking_platform",
      msg: {
        owner: "inj1u9jles5s3nw29726frttn007h9880n2zyfwf6c",
        minter: injectiveAddress,
      },
      admin: injectiveAddress,
    });

    // {
    //   typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
    //   value: MsgInstantiateContract.fromPartial({
    //     sender: owner,
    //     codeId,
    //     label: LABEL,
    //     msg: toUtf8(
    //       JSON.stringify({
    //         owner: "stars1hvp3q00ypzrurd46h7c7c3hu86tx9uf8sg5lm3",
    //       })
    //     ),
    //     funds: [],
    //     admin: owner,
    //   }),
    // };

    const tx = await msgBroadcasterWithPk.broadcast({
      msgs: [instantiateContractMsg],
    });

    l(tx);
    return;

    contractConfigAndInitMsgList.push([CONTRACT, instantiateContractMsg]);
    //  }

    const gasSimulated = await signingClient.simulate(
      owner,
      contractConfigAndInitMsgList.map((x) => x[1]),
      ""
    );
    const gasWantedSim = Math.ceil(1.2 * gasSimulated);

    if (!isMigrationRequired) {
      const res = await signingClient.signAndBroadcast(
        owner,
        contractConfigAndInitMsgList.map((x) => x[1]),
        calculateFee(gasWantedSim, gasPrice)
      );

      addressList = parseAddressList(res.rawLog || "");
    }

    for (const i in contractConfigAndInitMsgList) {
      const [{ WASM }] = contractConfigAndInitMsgList[i];
      const contractAddress = addressList[i] || "";

      const networkName = network.toLowerCase();
      const contractName = WASM.replace(".wasm", "").toLowerCase();

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

main("STARGAZE", false, [MINTER_WASM]);

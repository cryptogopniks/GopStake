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
import { getSigner } from "../account/signer";
import { getSeed } from "./get-seed";
import {
  MsgInstantiateContract,
  MsgStoreCode,
} from "cosmjs-types/cosmwasm/wasm/v1/tx";
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
    const REST = "https://stargaze-api.reece.sh:443";

    const testWallets: {
      SEED_ADMIN: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding }));

    const seed = await getSeed(testWallets.SEED_ADMIN);
    if (!seed) throw new Error("Seed is not found!");

    const { signer, owner } = await getSigner(PREFIX, seed);
    const cwClient = await getCwClient(RPC, owner, signer);
    if (!cwClient) throw new Error("cwClient is not found!");

    const signingClient = cwClient.client as SigningCosmWasmClient;

    let byteLengthSum = 0;
    let contractConfigAndStoreCodeMsgList: [
      ContractsConfig,
      MsgStoreCodeEncodeObject
    ][] = [];

    for (const CONTRACT of CONTRACTS) {
      if (wasmIgnoreList.includes(CONTRACT.WASM)) continue;

      const wasmBinary = await readFile(
        rootPath(`../artifacts/${CONTRACT.WASM}`)
      );
      const compressed = gzip(wasmBinary, { level: 9 });

      byteLengthSum += compressed.byteLength;

      const storeCodeMsg: MsgStoreCodeEncodeObject = {
        typeUrl: "/cosmwasm.wasm.v1.MsgStoreCode",
        value: MsgStoreCode.fromPartial({
          sender: owner,
          wasmByteCode: compressed,
        }),
      };

      contractConfigAndStoreCodeMsgList.push([CONTRACT, storeCodeMsg]);
    }

    const gasPrice = `${GAS_PRICE_AMOUNT}${DENOM}`;

    let contractConfigAndInitMsgList: [
      ContractsConfig,
      MsgInstantiateContractEncodeObject
    ][] = [];
    let addressList: string[] = [];

    const { code_infos: codeList } =
      await new Request().get<QueryContractCodesResponse>(
        `${REST}/cosmwasm/wasm/v1/code?pagination.limit=50&pagination.reverse=true`
      );
    const code = codeList.find((x) => x.creator === owner);
    if (!code) throw new Error("Code ID is not found!");

    const codeId = +code.code_id;

    for (const i in contractConfigAndStoreCodeMsgList) {
      const [CONTRACT] = contractConfigAndStoreCodeMsgList[i];
      const { WASM, LABEL } = CONTRACT;
      const contractName = WASM.replace(".wasm", "").toLowerCase();

      l(`\n"${contractName}" contract code is ${codeId}\n`);

      const instantiateContractMsg: MsgInstantiateContractEncodeObject = {
        typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
        value: MsgInstantiateContract.fromPartial({
          sender: owner,
          codeId,
          label: LABEL,
          msg: toUtf8(
            JSON.stringify({
              owner: "stars1hvp3q00ypzrurd46h7c7c3hu86tx9uf8sg5lm3",
            })
          ),
          funds: [],
          admin: owner,
        }),
      };

      contractConfigAndInitMsgList.push([CONTRACT, instantiateContractMsg]);
    }

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

main("STARGAZE", false, [STAKING_PLATFORM_WASM]);

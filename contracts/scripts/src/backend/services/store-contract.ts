import { l } from "../../common/utils";
import { PATH, rootPath } from "../envs";
import { calculateFee } from "@cosmjs/stargate";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { toUtf8 } from "@cosmjs/encoding";
import { MsgInstantiateContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { readFile, writeFile } from "fs/promises";
import { getCwClient } from "../../common/account/clients";
import { getSigner } from "../account/signer";
import { getSeed } from "./get-seed";
import { NetworkName, ContractData } from "../../common/interfaces";
import { NETWORK_CONFIG } from "../../common/config";

const encoding = "utf8";

async function main(network: NetworkName) {
  try {
    const {
      BASE: {
        DENOM,
        PREFIX,
        RPC_LIST: [RPC],
        GAS_PRICE_AMOUNT,
        STORE_CODE_GAS_MULTIPLIER,
      },
      CONTRACTS,
    } = NETWORK_CONFIG[network];

    const testWallets: {
      SEED_DAPP: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding }));

    const { SEED_DAPP } = testWallets;

    const seed = await getSeed(SEED_DAPP);
    if (!seed) throw new Error("Seed is not found!");

    for (const { WASM, LABEL, INIT_MSG } of CONTRACTS) {
      if (WASM !== "minter.wasm") continue;

      const networkName = network.toLowerCase();
      const contractName = WASM.replace(".wasm", "").toLowerCase();

      const { signer, owner } = await getSigner(PREFIX, seed);
      const cwClient = await getCwClient(RPC, owner, signer);
      if (!cwClient) throw new Error("cwClient is not found!");

      const signingClient = cwClient.client as SigningCosmWasmClient;
      const wasmBinary = await readFile(rootPath(`../artifacts/${WASM}`));

      const gasWantedCalc = Math.ceil(
        STORE_CODE_GAS_MULTIPLIER * wasmBinary.byteLength
      );
      const gasPrice = `${GAS_PRICE_AMOUNT}${DENOM}`;

      // TODO: use 2 msgs 1 tx for each type
      const uploadRes = await signingClient.upload(
        owner,
        wasmBinary,
        calculateFee(gasWantedCalc, gasPrice)
      );
      const { codeId } = uploadRes;
      l(`\n"${contractName}" contract code is ${codeId}\n`);

      const instantiateContractMsg = {
        typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
        value: MsgInstantiateContract.fromPartial({
          sender: owner,
          codeId,
          label: LABEL,
          msg: toUtf8(JSON.stringify(INIT_MSG)),
          funds: [],
          admin: owner,
        }),
      };

      const gasSimulated = await signingClient.simulate(
        owner,
        [instantiateContractMsg],
        ""
      );
      const gasWantedSim = Math.ceil(1.2 * gasSimulated);

      const instRes = await signingClient.instantiate(
        owner,
        codeId,
        INIT_MSG,
        LABEL,
        calculateFee(gasWantedSim, gasPrice),
        { admin: owner }
      );
      const { contractAddress } = instRes;
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

main("STARGAZE");

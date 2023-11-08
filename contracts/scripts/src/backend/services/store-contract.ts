import { l, rootPath, getLast } from "../../common/utils";
import { PATH } from "../envs";
import { calculateFee } from "@cosmjs/stargate";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { toUtf8 } from "@cosmjs/encoding";
import { MsgInstantiateContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { readFile, writeFile } from "fs/promises";
import { getCwClient } from "../../common/account/clients";
import { getSigner } from "../account/signer";
import { getSeed } from "./get-seed";
import { NetworkConfig } from "../../common/interfaces";
import { InstantiateMsg } from "../../common/codegen/Minter.types";

const NETWORK = "STARGAZE";
// const NETWORK = "OSMO";
// const NETWORK = "JUNO"; // contract not registered [CosmosContracts/juno/v18/x/feepay/ante/deduct_fee.go:150]

const NETWORK_CONFIG: NetworkConfig = {
  STARGAZE: {
    PREFIX: "stars",
    DENOM: "ustars",
    CHAIN_ID: "elgafar-1",
    RPC: "https://rpc.elgafar-1.stargaze-apis.com:443",
    GAS_PRICE_AMOUNT: 0.04,
  },
  JUNO: {
    PREFIX: "juno",
    DENOM: "ujunox",
    CHAIN_ID: "uni-6",
    RPC: "https://juno-testnet-rpc.polkachu.com:443",
    GAS_PRICE_AMOUNT: 0.04,
  },
  OSMO: {
    PREFIX: "osmo",
    DENOM: "uosmo",
    CHAIN_ID: "osmo-test-5",
    RPC: "https://osmosis-testnet.rpc.kjnodes.com:443",
    GAS_PRICE_AMOUNT: 0.04,
  },
};

async function main() {
  try {
    const CONTRACT_LABEL = "minter-dev";
    const INIT_MSG: InstantiateMsg = {};

    const WASM = "minter.wasm";

    // if (!DIR_NAME.includes(NETWORK)) {
    //   throw new Error(`${NETWORK} config is not found!`);
    // }

    const { CHAIN_ID, DENOM, PREFIX, RPC, GAS_PRICE_AMOUNT } =
      NETWORK_CONFIG[NETWORK.toUpperCase()];

    const encoding = "utf8";
    const testWallets: {
      SEED_ALICE: string;
      SEED_BOB: string;
      SEED_DAPP: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding }));

    const { SEED_ALICE, SEED_BOB, SEED_DAPP } = testWallets;

    const seed = await getSeed(SEED_DAPP);
    if (!seed) throw new Error("Seed is not found!");

    const { signer, owner } = await getSigner(RPC, PREFIX, seed);
    const cwClient = await getCwClient(RPC, owner, signer);
    if (!cwClient) return;

    const signingClient = cwClient.client as SigningCosmWasmClient;
    const wasmBinary = await readFile(rootPath(`../artifacts/${WASM}`));

    const k = 7.3; // chain specific coefficient
    const gasWantedCalc = Math.ceil(k * wasmBinary.byteLength);
    const gasPrice = `${GAS_PRICE_AMOUNT}${DENOM}`;

    const uploadRes = await signingClient.upload(
      owner,
      wasmBinary,
      calculateFee(gasWantedCalc, gasPrice)
    );
    const { codeId } = uploadRes;
    l(`\nThe contract code is ${codeId}\n`);

    const instantiateContractMsg = {
      typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
      value: MsgInstantiateContract.fromPartial({
        sender: owner,
        codeId,
        label: CONTRACT_LABEL,
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
      CONTRACT_LABEL,
      calculateFee(gasWantedSim, gasPrice),
      { admin: owner }
    );
    const { contractAddress } = instRes;
    l(`The contract address is ${contractAddress}\n`);

    const configData = {
      PREFIX,
      CHAIN_ID,
      RPC,
      CONTRACT_CODE: codeId,
      CONTRACT_ADDRESS: contractAddress,
      SEED_ALICE,
      SEED_BOB,
      SEED_DAPP,
    };

    await writeFile(
      rootPath(`src/common/config/${PREFIX}-testnet-config.json`),
      JSON.stringify(configData),
      { encoding }
    );

    l(`✔️ The contract is ready!\n`);
  } catch (error) {
    l(error);
  }
}

main();

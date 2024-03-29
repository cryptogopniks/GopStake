import { getSigner } from "../account/signer";
import { getSeed } from "./get-seed";
import { l } from "../../common/utils";
import { chains } from "chain-registry";
import { NetworkName } from "../../common/interfaces";
import { readFile } from "fs/promises";
import { PATH } from "../envs";
import { toUtf8 } from "@cosmjs/encoding";
import { calculateFee } from "@cosmjs/stargate";
import { MsgMigrateContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import {
  getGasPriceFromChainRegistryItem,
  getCwClient,
} from "../../common/account/clients";
import {
  SigningCosmWasmClient,
  MsgMigrateContractEncodeObject,
} from "@cosmjs/cosmwasm-stargate";
import {
  NETWORK_CONFIG,
  MINTER_WASM,
  STAKING_PLATFORM_WASM,
} from "../../common/config";

async function main(network: NetworkName, wasm: string) {
  try {
    const {
      BASE: {
        CHAIN_ID,
        RPC_LIST: [RPC],
        PREFIX,
      },
      CONTRACTS,
    } = NETWORK_CONFIG[network];

    const MINTER_CONTRACT = CONTRACTS.find((x) => x.WASM === MINTER_WASM);
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

    const chain = chains.find((x) => x.chain_id == CHAIN_ID);
    if (!chain) throw new Error(`${CHAIN_ID} config is not found!`);

    const gasPrice = getGasPriceFromChainRegistryItem(chain);

    const { signer, owner } = await getSigner(PREFIX, seed);
    const cwClient = await getCwClient(RPC, owner, signer);
    if (!cwClient) throw new Error("cwClient is not found!");

    const signingClient = cwClient.client as SigningCosmWasmClient;

    const contract =
      wasm === STAKING_PLATFORM_WASM
        ? STAKING_PLATFORM_CONTRACT
        : MINTER_CONTRACT;

    const msg: MsgMigrateContractEncodeObject = {
      typeUrl: "/cosmwasm.wasm.v1.MsgMigrateContract",
      value: MsgMigrateContract.fromPartial({
        sender: owner,
        contract: contract.DATA.ADDRESS,
        codeId: contract.DATA.CODE,
        msg: toUtf8(JSON.stringify(contract.MIGRATE_MSG)),
      }),
    };

    const gasSimulated = await signingClient.simulate(owner, [msg], "");
    const gasWantedSim = Math.ceil(1.2 * gasSimulated);

    const tx = await signingClient.migrate(
      owner,
      contract.DATA.ADDRESS,
      contract.DATA.CODE,
      contract.MIGRATE_MSG,
      calculateFee(gasWantedSim, gasPrice)
    );

    l(tx);
  } catch (error) {
    l(error);
  }
}

main("STARGAZE", STAKING_PLATFORM_WASM);

import { getSeed } from "./get-seed";
import { getPrivateKey } from "../account/signer-inj";
import { l } from "../../common/utils";
import { NetworkName } from "../../common/interfaces";
import { readFile } from "fs/promises";
import { PATH } from "../envs";
import { MsgBroadcasterWithPk } from "@injectivelabs/sdk-ts";
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

const networkType = Network.Mainnet;

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
      throw new Error("MINTER_CONTRACT in not found!");
    }

    const testWallets: {
      SEED_ADMIN: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding: "utf8" }));

    const seed = await getSeed(testWallets.SEED_ADMIN);
    if (!seed) throw new Error("Seed is not found!");

    const { privateKey, injectiveAddress } = getPrivateKey(seed);

    const msgBroadcasterWithPk = new MsgBroadcasterWithPk({
      privateKey,
      network: networkType,
      simulateTx: true,
    });

    const { getAllBalances } = await getSgQueryHelpers();
    const {
      cwQueryProposals,
      cwQueryBalanceInNft,
      cwQueryStakingPlatformConfig,
      cwQueryMinterConfig,
      cwQueryOperators,
    } = await getCwQueryHelpers(network);
    const {
      cwCreateProposal,
      cwMintTokens,
      cwBurnTokens,
      cwCreateDenom,
      cwRevoke,
      cwApproveAndStake,
      cwUnstake,
      cwUpdateConfig,
    } = await getCwExecHelpers(network, injectiveAddress, msgBroadcasterWithPk);

    await cwQueryStakingPlatformConfig();
    await cwQueryMinterConfig();

    return;
    l(
      await cwUpdateConfig({
        minter: "inj1eff58ps7p4v5jfxkg3ngj4zc42qlefpjuukrw6",
      })
    );

    const collection = "inj1es8mtzzgap9z5wewwhg5w7e9yumek6m20w8790";

    const tokens = ["648"].map((x) => +x);
    const [token1] = tokens;

    await cwQueryOperators(collection, injectiveAddress);
    l(
      await cwRevoke(
        collection,
        injectiveAddress,
        STAKING_PLATFORM_CONTRACT.DATA.ADDRESS
      )
    );
    await cwQueryOperators(collection, injectiveAddress);

    // for (let i = 0; i < 1; i++) {
    //   await cwQueryOperators(collection, injectiveAddress);

    //   l(
    //     await cwApproveAndStake(
    //       injectiveAddress,
    //       STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
    //       [
    //         {
    //           collection_address: collection,
    //           staked_token_info_list: [{ token_id: `${token1}` }],
    //         },
    //       ]
    //     )
    //   );

    //   await cwQueryOperators(collection, injectiveAddress);

    //   l(
    //     await cwUnstake([
    //       {
    //         collection_address: collection,
    //         staked_token_info_list: [{ token_id: `${token1}` }],
    //       },
    //     ])
    //   );
    // }

    return;

    const alice = "inj1prmtvxpvdcmp3dtn6qn4hyq9gytj5ry4u28nqz";
    const denom = "upinj";
    const fullDenom = `factory/${MINTER_CONTRACT.DATA.ADDRESS}/${denom}`;

    // await cwCreateProposal(getProposalTemplate(network));

    // await cwQueryProposals(3);

    // await cwCreateDenom("upinj", 1000000000000000000, "inj");

    //await cwMintTokens(fullDenom, 100, alice);
    // await cwBurnTokens(fullDenom, 100);

    // await getAllBalances(alice);

    const collectionAddress = "inj1dyrtccs6dg8j9v9v5y64fdxsxaxhq77qx0z0w8";

    await cwQueryBalanceInNft(injectiveAddress, collectionAddress);
  } catch (error) {
    l(error);
  }
}

main("INJECTIVE");

function getProposalTemplate(
  network: NetworkName
): ProposalForStringAndTokenUnverified {
  const stargazeNetworkName = "STARGAZE";

  const collectionAddress =
    network === stargazeNetworkName
      ? "stars1qrghctped3a7jcklqxg92dn8lvw88adrduwx3h50pmmcgcwl82xsu84lnw"
      : "inj1qvfylg5zvqar4q2sl6qxzhukdhr5av7qwxpl5p";
  const injectiveAddress =
    network === stargazeNetworkName
      ? "stars1gjqnuhv52pd2a7ets2vhw9w9qa9knyhyzrpx49"
      : "inj1prmtvxpvdcmp3dtn6qn4hyq9gytj5ry4u28nqz";
  const denom = network === stargazeNetworkName ? "ustars" : "inj";
  const decimals = network === stargazeNetworkName ? 6 : 18;
  const address =
    network === stargazeNetworkName
      ? "stars1chgwz55h9kepjq0fkj5supl2ta3nwu639kfa69"
      : "inj1hag3kx8f9ypnssw7aqnq9e82t2zgt0g0ac2rru";

  return {
    proposal_type: {
      add_collection: {
        collection_address: collectionAddress,
        collection: {
          name: "Pinjeons",
          injectiveAddress,
          emission_type: "minting",
          daily_rewards: "0.1",
          staking_currency: { token: { native: { denom } }, decimals },
        },
      },
    },
    price: {
      amount: "500000000",
      currency: { token: { cw20: { address } }, decimals: 6 },
    },
  };
}

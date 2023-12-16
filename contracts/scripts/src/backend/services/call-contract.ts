import { getGasPriceFromChainRegistryItem } from "../../common/account/clients";
import { getSigner } from "../account/signer";
import { getSeed } from "./get-seed";
import { l } from "../../common/utils";
import { chains } from "chain-registry";
import { NetworkName } from "../../common/interfaces";
import { readFile } from "fs/promises";
import { PATH } from "../envs";
import {
  NETWORK_CONFIG,
  MINTER_WASM,
  STAKING_PLATFORM_WASM,
} from "../../common/config";
import { getSgQueryHelpers } from "../../common/account/sg-helpers";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers";

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
      SEED_ALICE: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding: "utf8" }));

    const seed = await getSeed(testWallets.SEED_ALICE);
    if (!seed) throw new Error("Seed is not found!");

    const chain = chains.find((x) => x.chain_id == CHAIN_ID);
    if (!chain) throw new Error(`${CHAIN_ID} config is not found!`);

    const gasPrice = getGasPriceFromChainRegistryItem(chain);

    const { signer, owner } = await getSigner(PREFIX, seed);

    const { getAllBalances } = await getSgQueryHelpers(RPC);

    const {
      cwQueryCollections,
      cwQueryProposals,
      cwQueryStakers,
      cwQueryApprovals,
      cwQueryNftOwner,
      cwQueryBalanceInNft,
      cwQueryStakingRewardsPerCollection,
      cwQueryDenomsByCreator,
    } = await getCwQueryHelpers(network, RPC);

    const {
      cwCreateDenom,
      cwMintTokens,
      cwBurnTokens,
      cwApproveAndStake,
      cwUnstake,
    } = await getCwExecHelpers(network, RPC, owner, signer);

    const alice = "stars1gjqnuhv52pd2a7ets2vhw9w9qa9knyhyzrpx49";
    const denom = "upinj";
    const fullDenom = `factory/${MINTER_CONTRACT.DATA.ADDRESS}/${denom}`;

    await cwQueryDenomsByCreator(alice);
    return;
    await cwCreateDenom(alice, "gop", 10000000000, DENOM, gasPrice);
    return;
    // await cwMintTokens(fullDenom, 100, owner, gasPrice);
    // await cwBurnTokens(fullDenom, 100, gasPrice);

    // await getAllBalances(alice);

    // let p = await cwQueryProposals(1);
    // l(p[0]);
    // await cwQueryCollections();
    // await cwQueryStakers();

    const collection =
      "stars1qrghctped3a7jcklqxg92dn8lvw88adrduwx3h50pmmcgcwl82xsu84lnw";

    const token1 = 526;
    const token2 = 679;
    const token3 = 851;

    // await cwApproveAndStake(
    //   owner,
    //   STAKING_PLATFORM_CONTRACT.DATA.ADDRESS,
    //   [
    //     {
    //       collection_address: collection,
    //       staked_token_info_list: [
    //         { token_id: `${token1}` },
    //         { token_id: `${token2}` },
    //       ],
    //     },
    //   ],
    //   gasPrice
    // );

    // await cwQueryApprovals(collection, token1);
    // await cwQueryNftOwner(collection, token1);

    // await cwUnstake(
    //   [
    //     {
    //       collection_address: collection,
    //       staked_token_info_list: [
    //         { token_id: `${token1}` },
    //         { token_id: `${token2}` },
    //       ],
    //     },
    //   ],
    //   gasPrice
    // );

    // await cwQueryApprovals(collection, token1);
    // await cwQueryNftOwner(collection, token1);

    await cwQueryBalanceInNft(
      "stars1hvp3q00ypzrurd46h7c7c3hu86tx9uf8sg5lm3",
      collection
    );

    await cwQueryStakingRewardsPerCollection(
      "stars1hvp3q00ypzrurd46h7c7c3hu86tx9uf8sg5lm3",
      collection
    );
  } catch (error) {
    l(error);
  }
}

main("STARGAZE");

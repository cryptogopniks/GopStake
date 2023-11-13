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

const networkType = Network.Testnet;

async function main(network: NetworkName) {
  try {
    const testWallets: {
      SEED_DAPP: string;
    } = JSON.parse(await readFile(PATH.TO_TEST_WALLETS, { encoding: "utf8" }));

    const { SEED_DAPP } = testWallets;

    const seed = await getSeed(SEED_DAPP);
    if (!seed) throw new Error("Seed is not found!");

    const { privateKey, injectiveAddress } = getPrivateKey(seed);

    const msgBroadcasterWithPk = new MsgBroadcasterWithPk({
      privateKey,
      network: networkType,
      simulateTx: true,
    });

    const { getAllBalances } = await getSgQueryHelpers();
    const { cwQueryProposals } = await getCwQueryHelpers(network);
    const { cwCreateProposal, cwMintTokens, cwBurnTokens, cwCreateDenom } =
      await getCwExecHelpers(network, injectiveAddress, msgBroadcasterWithPk);

    // await cwCreateProposal(getProposalTemplate(network));

    // await cwQueryProposals(3);

    await cwCreateDenom("upinj", 1, "inj");
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
  const owner =
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
          owner,
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

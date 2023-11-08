import { l, Request } from "../utils";
import { getSgClient, signAndBroadcastWrapper } from "./clients";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { TokenfactoryConfigResponse } from "../interfaces";
import {
  DirectSecp256k1HdWallet,
  OfflineSigner,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import {
  MsgSendEncodeObject,
  Coin,
  SigningStargateClient,
  setupBankExtension,
  QueryClient,
} from "@cosmjs/stargate";

const req = new Request({});

async function getSgExecHelpers(
  rpc: string,
  owner: string,
  signer: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet
) {
  const sgClient = await getSgClient(rpc, owner, signer);
  if (!sgClient) throw new Error("sgClient is not found!");

  const client = sgClient.client as SigningStargateClient;
  const signAndBroadcast = signAndBroadcastWrapper(client, owner);

  async function sgSend(recipient: string, amount: Coin, gasPrice: string) {
    const msg: MsgSendEncodeObject = {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress: owner,
        toAddress: recipient,
        amount: [amount],
      },
    };
    const tx = await signAndBroadcast([msg], gasPrice);
    l("\n", tx, "\n");
    return tx;
  }

  return {
    sgSend,
  };
}

async function getSgQueryHelpers(rpc: string) {
  const tmClient = await Tendermint37Client.connect(rpc);
  const queryClient = QueryClient.withExtensions(tmClient);
  const bankExtension = setupBankExtension(queryClient);

  async function getAllBalances(address: string) {
    const res = await bankExtension.bank.allBalances(address);
    l("\n", res, "\n");
    return res;
  }

  async function getMetadata(denom: string) {
    const res = await bankExtension.bank.denomMetadata(denom);
    l("\n", res, "\n");
    return res;
  }

  // TODO: choose API carefully
  async function getTokenfactoryConfig(chainId: string) {
    // const chain = chains.find((x) => x.chain_id == chainId);
    // if (!chain) throw new Error("Chain is not found!");

    // const rest = chain.apis?.rest?.[0]?.address;
    // if (!rest) throw new Error("REST is not found!");

    const rest = "https://osmosis-testnet.api.kjnodes.com";
    const res: TokenfactoryConfigResponse = await req.get(
      `${rest}/osmosis/tokenfactory/v1beta1/params`
    );
    l("\n", res, "\n");
    return res;
  }

  return { getAllBalances, getMetadata, getTokenfactoryConfig };
}

export { getSgExecHelpers, getSgQueryHelpers };

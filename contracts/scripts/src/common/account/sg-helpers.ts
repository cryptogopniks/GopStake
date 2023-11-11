import { l, Request } from "../utils";
import { getSgClient, signAndBroadcastWrapper } from "./clients";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
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

  return { getAllBalances, getMetadata };
}

export { getSgExecHelpers, getSgQueryHelpers };

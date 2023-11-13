import { l } from "../utils";
import { getSgClient, signAndBroadcastWrapper } from "./clients";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { setupBankExtension, QueryClient } from "@cosmjs/stargate";
async function getSgExecHelpers(rpc, owner, signer) {
  const sgClient = await getSgClient(rpc, owner, signer);
  if (!sgClient) throw new Error("sgClient is not found!");
  const client = sgClient.client;
  const signAndBroadcast = signAndBroadcastWrapper(client, owner);
  async function sgSend(recipient, amount, gasPrice) {
    const msg = {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress: owner,
        toAddress: recipient,
        amount: [amount]
      }
    };
    const tx = await signAndBroadcast([msg], gasPrice);
    l("\n", tx, "\n");
    return tx;
  }
  return {
    sgSend
  };
}
async function getSgQueryHelpers(rpc) {
  const tmClient = await Tendermint37Client.connect(rpc);
  const queryClient = QueryClient.withExtensions(tmClient);
  const bankExtension = setupBankExtension(queryClient);
  async function getAllBalances(address) {
    const res = await bankExtension.bank.allBalances(address);
    l("\n", res, "\n");
    return res;
  }
  async function getMetadata(denom) {
    const res = await bankExtension.bank.denomMetadata(denom);
    l("\n", res, "\n");
    return res;
  }
  return {
    getAllBalances,
    getMetadata
  };
}
export { getSgExecHelpers, getSgQueryHelpers };
import { l } from "../utils";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";
import { MsgSend, ChainGrpcBankApi } from "@injectivelabs/sdk-ts";
const networkType = Network.Mainnet;
async function getSgExecHelpers(owner, msgBroadcaster) {
  async function sgSend(recipient, amount, _gasPrice) {
    const msg = new MsgSend({
      amount,
      srcInjectiveAddress: owner,
      dstInjectiveAddress: recipient
    });
    const tx = await msgBroadcaster.broadcast({
      msgs: [msg],
      injectiveAddress: owner
    });
    l("\n", tx, "\n");
    return tx;
  }
  return {
    sgSend
  };
}
async function getSgQueryHelpers() {
  const endpoints = getNetworkEndpoints(networkType);
  const chainGrpcBankApi = new ChainGrpcBankApi(endpoints.grpc);
  async function getAllBalances(address) {
    const res = await chainGrpcBankApi.fetchBalances(address);
    l("\n", res, "\n");
    return res;
  }
  async function getMetadata(denom) {
    const res = await chainGrpcBankApi.fetchDenomMetadata(denom);
    l("\n", res, "\n");
    return res;
  }
  return {
    getAllBalances,
    getMetadata
  };
}
export { getSgExecHelpers, getSgQueryHelpers };
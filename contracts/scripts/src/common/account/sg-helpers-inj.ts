import { l } from "../utils";
import { Coin } from "@cosmjs/stargate";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";
import { MsgBroadcaster } from "@injectivelabs/wallet-ts";
import {
  MsgBroadcasterWithPk,
  MsgSend,
  ChainGrpcBankApi,
} from "@injectivelabs/sdk-ts";

const networkType = Network.Testnet;

async function getSgExecHelpers(
  owner: string,
  msgBroadcaster: MsgBroadcasterWithPk | MsgBroadcaster
) {
  async function sgSend(recipient: string, amount: Coin, _gasPrice?: string) {
    const msg = new MsgSend({
      amount,
      srcInjectiveAddress: owner,
      dstInjectiveAddress: recipient,
    });

    const tx = await msgBroadcaster.broadcast({ msgs: [msg] });

    l("\n", tx, "\n");
    return tx;
  }

  return {
    sgSend,
  };
}

async function getSgQueryHelpers() {
  const endpoints = getNetworkEndpoints(networkType);
  const chainGrpcBankApi = new ChainGrpcBankApi(endpoints.grpc);

  async function getAllBalances(address: string) {
    const res = await chainGrpcBankApi.fetchBalances(address);
    l("\n", res, "\n");
    return res;
  }

  async function getMetadata(denom: string) {
    const res = await chainGrpcBankApi.fetchDenomMetadata(denom);
    l("\n", res, "\n");
    return res;
  }

  return { getAllBalances, getMetadata };
}

export { getSgExecHelpers, getSgQueryHelpers };

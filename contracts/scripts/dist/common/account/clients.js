import { l } from "../utils";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { fromBech32, toBech32, toUtf8 } from "@cosmjs/encoding";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { SigningCosmWasmClient, CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { SigningStargateClient, StargateClient, calculateFee as _calculateFee } from "@cosmjs/stargate";
async function getSgClient(rpc, owner, signer) {
  try {
    if (owner && signer) {
      const tmClient = await Tendermint37Client.connect(rpc);
      const signingClient = await SigningStargateClient.createWithSigner(tmClient, signer);
      return {
        client: signingClient,
        owner
      };
    }
    const client = await StargateClient.connect(rpc);
    return {
      client
    };
  } catch (error) {
    l(error);
  }
}
async function getCwClient(rpc, owner, signer) {
  try {
    if (owner && signer) {
      const tmClient = await Tendermint37Client.connect(rpc);
      const signingClient = await SigningCosmWasmClient.createWithSigner(tmClient, signer);
      return {
        client: signingClient,
        owner
      };
    }
    const client = await CosmWasmClient.connect(rpc);
    return {
      client
    };
  } catch (error) {
    l(error);
  }
}
function getAddrByPrefix(address, prefix) {
  return toBech32(prefix, fromBech32(address).data);
}
function signAndBroadcastWrapper(client, signerAddress, gasAdjustment = 1.3) {
  const defaultGasAdjustment = gasAdjustment;
  return async (messages, gasPrice, gasAdjustment = 1, memo) => {
    const gasSimulated = await client.simulate(signerAddress, messages, memo);
    const gasWanted = Math.ceil(defaultGasAdjustment * gasAdjustment * gasSimulated);
    const fee = _calculateFee(gasWanted, gasPrice);
    return await client.signAndBroadcast(signerAddress, messages, fee, memo);
  };
}
function getGasPriceFromChainRegistryItem(chain) {
  const gasPriceAmountDefault = 0.005;
  let gasPriceAmount = 0;
  const minGasPrice = chain?.fees?.fee_tokens?.[0]?.average_gas_price;
  if (minGasPrice) gasPriceAmount = minGasPrice;
  gasPriceAmount = Math.max(gasPriceAmountDefault, gasPriceAmount);
  const gasPrice = `${gasPriceAmount}${chain.fees?.fee_tokens[0]?.denom}`;
  return gasPrice;
}
function getExecuteContractMsg(contractAddress, senderAddress, msg, funds) {
  return {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: MsgExecuteContract.fromPartial({
      sender: senderAddress,
      contract: contractAddress,
      msg: toUtf8(JSON.stringify(msg)),
      funds
    })
  };
}
export { getSgClient, getCwClient, getAddrByPrefix, signAndBroadcastWrapper, getGasPriceFromChainRegistryItem, getExecuteContractMsg };
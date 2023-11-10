import { l } from "../utils";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { fromBech32, toBech32 } from "@cosmjs/encoding";
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
function signAndBroadcastWrapper(client, signerAddress, margin = 1.2) {
  return async (messages, gasPrice, memo) => {
    const gasSimulated = await client.simulate(signerAddress, messages, memo);
    const gasWanted = Math.ceil(margin * gasSimulated);
    const fee = _calculateFee(gasWanted, gasPrice);
    return await client.signAndBroadcast(signerAddress, messages, fee, memo);
  };
}
function getGasPriceFromChainRegistryItem(chain) {
  const gasPriceAmountDefault = 0.04;
  let gasPriceAmount = 0;
  const minGasPrice = chain?.fees?.fee_tokens?.[0]?.fixed_min_gas_price;
  if (minGasPrice) gasPriceAmount = minGasPrice;
  gasPriceAmount = Math.max(gasPriceAmountDefault, gasPriceAmount);
  const gasPrice = `${gasPriceAmount}${chain.fees?.fee_tokens[0]?.denom}`;
  return gasPrice;
}
export { getSgClient, getCwClient, getAddrByPrefix, signAndBroadcastWrapper, getGasPriceFromChainRegistryItem };
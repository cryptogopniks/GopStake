import { l } from "../utils";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { fromBech32, toBech32, toUtf8 } from "@cosmjs/encoding";
import { Chain } from "@chain-registry/types";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import {
  SigningCosmWasmClient,
  CosmWasmClient,
  MsgExecuteContractEncodeObject,
} from "@cosmjs/cosmwasm-stargate";
import {
  OfflineDirectSigner,
  EncodeObject,
  OfflineSigner,
  DirectSecp256k1HdWallet,
  Coin,
} from "@cosmjs/proto-signing";
import {
  SigningStargateClient,
  StargateClient,
  calculateFee as _calculateFee,
  GasPrice,
  DeliverTxResponse,
} from "@cosmjs/stargate";

async function getSgClient(
  rpc: string,
  owner?: string,
  signer?: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet
): Promise<
  | {
      client: SigningStargateClient;
      owner: string;
    }
  | {
      client: StargateClient;
    }
  | undefined
> {
  try {
    if (owner && signer) {
      const tmClient = await Tendermint37Client.connect(rpc);
      const signingClient = await SigningStargateClient.createWithSigner(
        tmClient,
        signer
      );

      return { client: signingClient, owner };
    }

    const client = await StargateClient.connect(rpc);
    return { client };
  } catch (error) {
    l(error);
  }
}

async function getCwClient(
  rpc: string,
  owner?: string,
  signer?: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet
): Promise<
  | {
      client: SigningCosmWasmClient;
      owner: string;
    }
  | {
      client: CosmWasmClient;
    }
  | undefined
> {
  try {
    if (owner && signer) {
      const tmClient = await Tendermint37Client.connect(rpc);
      const signingClient = await SigningCosmWasmClient.createWithSigner(
        tmClient,
        signer
      );
      return { client: signingClient, owner };
    }

    const client = await CosmWasmClient.connect(rpc);
    return { client };
  } catch (error) {
    l(error);
  }
}

function getAddrByPrefix(address: string, prefix: string): string {
  return toBech32(prefix, fromBech32(address).data);
}

function signAndBroadcastWrapper(
  client: SigningStargateClient | SigningCosmWasmClient,
  signerAddress: string,
  gasAdjustment: number = 1.3
) {
  const defaultGasAdjustment = gasAdjustment;

  return async (
    messages: readonly EncodeObject[],
    gasPrice: string | GasPrice,
    gasAdjustment: number = 1,
    memo?: string
  ): Promise<DeliverTxResponse> => {
    const gasSimulated = await client.simulate(signerAddress, messages, memo);
    const gasWanted = Math.ceil(
      defaultGasAdjustment * gasAdjustment * gasSimulated
    );
    const fee = _calculateFee(gasWanted, gasPrice);

    return await client.signAndBroadcast(signerAddress, messages, fee, memo);
  };
}

function getGasPriceFromChainRegistryItem(chain: Chain): string {
  const gasPriceAmountDefault = 0.005;
  let gasPriceAmount = 0;

  const minGasPrice = chain?.fees?.fee_tokens?.[0]?.average_gas_price;
  if (minGasPrice) gasPriceAmount = minGasPrice;

  gasPriceAmount = Math.max(gasPriceAmountDefault, gasPriceAmount);
  const gasPrice = `${gasPriceAmount}${chain.fees?.fee_tokens[0]?.denom}`;

  return gasPrice;
}

function getExecuteContractMsg(
  contractAddress: string,
  senderAddress: string,
  msg: any,
  funds: Coin[]
): MsgExecuteContractEncodeObject {
  return {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: MsgExecuteContract.fromPartial({
      sender: senderAddress,
      contract: contractAddress,
      msg: toUtf8(JSON.stringify(msg)),
      funds,
    }),
  };
}

export {
  getSgClient,
  getCwClient,
  getAddrByPrefix,
  signAndBroadcastWrapper,
  getGasPriceFromChainRegistryItem,
  getExecuteContractMsg,
};

import { Chain } from "@chain-registry/types";
import { SigningCosmWasmClient, CosmWasmClient, MsgExecuteContractEncodeObject } from "@cosmjs/cosmwasm-stargate";
import { OfflineDirectSigner, EncodeObject, OfflineSigner, DirectSecp256k1HdWallet, Coin } from "@cosmjs/proto-signing";
import { SigningStargateClient, StargateClient, GasPrice, DeliverTxResponse } from "@cosmjs/stargate";
declare function getSgClient(rpc: string, owner?: string, signer?: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet): Promise<{
    client: SigningStargateClient;
    owner: string;
} | {
    client: StargateClient;
} | undefined>;
declare function getCwClient(rpc: string, owner?: string, signer?: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet): Promise<{
    client: SigningCosmWasmClient;
    owner: string;
} | {
    client: CosmWasmClient;
} | undefined>;
declare function getAddrByPrefix(address: string, prefix: string): string;
declare function signAndBroadcastWrapper(client: SigningStargateClient | SigningCosmWasmClient, signerAddress: string, gasAdjustment?: number): (messages: readonly EncodeObject[], gasPrice: string | GasPrice, gasAdjustment?: number, memo?: string) => Promise<DeliverTxResponse>;
declare function getGasPriceFromChainRegistryItem(chain: Chain): string;
declare function getExecuteContractMsg(contractAddress: string, senderAddress: string, msg: any, funds: Coin[]): MsgExecuteContractEncodeObject;
export { getSgClient, getCwClient, getAddrByPrefix, signAndBroadcastWrapper, getGasPriceFromChainRegistryItem, getExecuteContractMsg, };

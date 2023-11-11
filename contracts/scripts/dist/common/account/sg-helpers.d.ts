import { DirectSecp256k1HdWallet, OfflineSigner, OfflineDirectSigner } from "@cosmjs/proto-signing";
import { Coin } from "@cosmjs/stargate";
declare function getSgExecHelpers(rpc: string, owner: string, signer: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet): Promise<{
    sgSend: (recipient: string, amount: Coin, gasPrice: string) => Promise<import("@cosmjs/stargate").DeliverTxResponse>;
}>;
declare function getSgQueryHelpers(rpc: string): Promise<{
    getAllBalances: (address: string) => Promise<import("cosmjs-types/cosmos/base/v1beta1/coin").Coin[]>;
    getMetadata: (denom: string) => Promise<import("cosmjs-types/cosmos/bank/v1beta1/bank").Metadata>;
}>;
export { getSgExecHelpers, getSgQueryHelpers };

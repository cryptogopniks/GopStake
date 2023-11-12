import { Coin } from "@cosmjs/stargate";
import { MsgBroadcaster } from "@injectivelabs/wallet-ts";
import { MsgBroadcasterWithPk } from "@injectivelabs/sdk-ts";
declare function getSgExecHelpers(owner: string, msgBroadcaster: MsgBroadcasterWithPk | MsgBroadcaster): Promise<{
    sgSend: (recipient: string, amount: Coin, _gasPrice?: string) => Promise<import("@injectivelabs/sdk-ts").TxResponse>;
}>;
declare function getSgQueryHelpers(): Promise<{
    getAllBalances: (address: string) => Promise<{
        balances: import("@injectivelabs/ts-types").Coin[];
        pagination: import("@injectivelabs/sdk-ts").Pagination;
    }>;
    getMetadata: (denom: string) => Promise<import("@injectivelabs/core-proto-ts/cjs/cosmos/bank/v1beta1/bank").Metadata>;
}>;
export { getSgExecHelpers, getSgQueryHelpers };

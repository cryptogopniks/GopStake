import { PrivateKey } from "@injectivelabs/sdk-ts";
declare function getPrivateKey(seed: string): {
    privateKey: PrivateKey;
    injectiveAddress: string;
};
export { getPrivateKey };

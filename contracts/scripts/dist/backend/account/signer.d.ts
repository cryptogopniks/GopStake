import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
declare function getSigner(prefix: string, seed: string): Promise<{
    signer: DirectSecp256k1HdWallet;
    owner: string;
}>;
export { getSigner };

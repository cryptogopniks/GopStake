import { Timestamp } from "cosmjs-types/google/protobuf/timestamp";
interface UpdateConfigStruct {
    stakingPlatform?: string;
    owner?: string;
    minter?: string;
}
interface Cw20SendMsg {
    send: {
        contract: string;
        amount: string;
        msg: string;
    };
}
interface Metadata {
    base: string;
    denom_units: {
        aliases: string[];
        denom: string;
        exponent: string;
    }[];
    description: string;
    display: string;
    name: string;
    symbol: string;
    uri?: string;
    uri_hash?: string;
}
interface SetMetadataMsg {
    set_metadata: {
        metadata: Metadata;
    };
}
interface ApproveMsg {
    approve: {
        spender: string;
        token_id: string;
        expires?: Expiration;
    };
}
interface RevokeMsg {
    revoke: {
        spender: string;
        token_id: string;
    };
}
interface QueryApprovalsMsg {
    approvals: {
        token_id: string;
        include_expired?: boolean;
    };
}
interface Approval {
    spender: string;
    expires: Expiration;
}
type Expiration = {
    at_height: number;
} | {
    at_time: Timestamp;
} | {
    never: {};
};
interface ApprovalsResponse {
    approvals: Approval[];
}
interface QueryTokens {
    tokens: {
        owner: string;
        start_after?: string;
        limit?: number;
    };
}
interface TokensResponse {
    tokens: string[];
}
interface QueryOwnerOf {
    owner_of: {
        token_id: string;
        include_expired?: boolean;
    };
}
interface OwnerOfResponse {
    owner: string;
    approvals: Approval[];
}
type NetworkName = "STARGAZE" | "INJECTIVE";
type NetworkConfig = {
    [network in NetworkName]: {
        BASE: BaseNetworkConfig;
        CONTRACTS: ContractsConfig[];
    };
};
type BaseNetworkConfig = {
    PREFIX: string;
    DENOM: string;
    CHAIN_ID: string;
    RPC_LIST: string[];
    GAS_PRICE_AMOUNT: number;
    STORE_CODE_GAS_MULTIPLIER: number;
};
type ContractsConfig = {
    WASM: string;
    LABEL: string;
    INIT_MSG: any;
    DATA: ContractData;
};
type ContractData = {
    CODE: number;
    ADDRESS: string;
};
export type { NetworkConfig, NetworkName, ContractsConfig };
export { SetMetadataMsg, Metadata, UpdateConfigStruct, QueryApprovalsMsg, ApprovalsResponse, Cw20SendMsg, BaseNetworkConfig, ContractData, ApproveMsg, RevokeMsg, QueryTokens, TokensResponse, QueryOwnerOf, OwnerOfResponse, };

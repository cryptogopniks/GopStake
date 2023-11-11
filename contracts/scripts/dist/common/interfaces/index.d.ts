import { Timestamp } from "cosmjs-types/google/protobuf/timestamp";
interface UpdateStakingPlatformConfigStruct {
    owner?: string;
    minter?: string;
}
interface UpdateMinterConfigStruct {
    stakingPlatform?: string;
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
interface ApproveCollectionMsg {
    approve_all: {
        operator: string;
    };
    expires?: Expiration;
}
interface RevokeCollectionMsg {
    revoke_all: {
        operator: string;
    };
}
interface QueryApprovalsMsg {
    token_id: string;
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
interface ChainResponse {
    $schema: string;
    chain_name: string;
    status: string;
    network_type: string;
    pretty_name: string;
    chain_id: string;
    bech32_prefix: string;
    daemon_name: string;
    node_home: string;
    genesis: {
        genesis_url: string;
    };
    key_algos: string[];
    slip44: number;
    fees: {
        fee_tokens: {
            denom: string;
            fixed_min_gas_price?: number;
            low_gas_price?: number;
            average_gas_price?: number;
            high_gas_price?: number;
        }[];
    };
    codebase: {
        git_repo: string;
        recommended_version: string;
        compatible_versions: string[];
        binaries: {
            "linux/amd64": string;
            "linux/arm64": string;
            "darwin/amd64": string;
            "darwin/arm64": string;
            "windows/amd64": string;
        };
    };
    peers: {
        seeds: {
            id: string;
            address: string;
        }[];
        persistent_peers: {
            id: string;
            address: string;
            provider: string;
        }[];
    };
    apis: {
        rpc: {
            address: string;
            provider: string;
        }[];
        rest: {
            address: string;
            provider: string;
        }[];
        grpc: {
            address: string;
            provider: string;
        }[];
    };
    explorers: {
        kind: string;
        url: string;
        tx_page: string;
    }[];
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
export type { NetworkConfig, NetworkName };
export { ChainResponse, SetMetadataMsg, Metadata, UpdateMinterConfigStruct, UpdateStakingPlatformConfigStruct, ApproveCollectionMsg, RevokeCollectionMsg, QueryApprovalsMsg, ApprovalsResponse, Cw20SendMsg, BaseNetworkConfig, ContractData, };

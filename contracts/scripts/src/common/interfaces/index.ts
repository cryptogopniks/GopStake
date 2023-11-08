interface UpdateStakingPlatformConfigStruct {
  owner?: string;
  minter?: string;
}

interface UpdateMinterConfigStruct {
  owner?: string;
  staking_platform?: string;
}

interface TokenfactoryConfigResponse {
  params: {
    denom_creation_fee: {
      denom: string;
      amount: string;
    }[];
    denom_creation_gas_consume: string;
  };
}

interface Metadata {
  base: string;
  denom_units: { aliases: string[]; denom: string; exponent: string }[];
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

interface Pagination {
  next_key: null;
  total: string;
}

type NetworkConfig = {
  [network: string]: {
    PREFIX: string;
    DENOM: string;
    CHAIN_ID: string;
    RPC: string;
    GAS_PRICE_AMOUNT: number;
  };
};

export type { NetworkConfig };

export {
  ChainResponse,
  TokenfactoryConfigResponse,
  SetMetadataMsg,
  Metadata,
  UpdateMinterConfigStruct,
  UpdateStakingPlatformConfigStruct,
};

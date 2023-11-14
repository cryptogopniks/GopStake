/**
* This file was automatically generated by @cosmwasm/ts-codegen@0.35.3.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

import { CosmWasmClient, SigningCosmWasmClient, ExecuteResult } from "@cosmjs/cosmwasm-stargate";
import { Coin, StdFee } from "@cosmjs/amino";
import { FactoryType, InstantiateMsg, ExecuteMsg, Uint128, Metadata, DenomUnit, QueryMsg, MigrateMsg, QueryDenomsFromCreatorResponse, Addr, Config } from "./Minter.types";
export interface MinterReadOnlyInterface {
  contractAddress: string;
  denomsByCreator: ({
    creator
  }: {
    creator: string;
  }) => Promise<QueryDenomsFromCreatorResponse>;
  queryConfig: () => Promise<Config>;
}
export class MinterQueryClient implements MinterReadOnlyInterface {
  client: CosmWasmClient;
  contractAddress: string;

  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client;
    this.contractAddress = contractAddress;
    this.denomsByCreator = this.denomsByCreator.bind(this);
    this.queryConfig = this.queryConfig.bind(this);
  }

  denomsByCreator = async ({
    creator
  }: {
    creator: string;
  }): Promise<QueryDenomsFromCreatorResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      denoms_by_creator: {
        creator
      }
    });
  };
  queryConfig = async (): Promise<Config> => {
    return this.client.queryContractSmart(this.contractAddress, {
      query_config: {}
    });
  };
}
export interface MinterInterface extends MinterReadOnlyInterface {
  contractAddress: string;
  sender: string;
  createDenom: ({
    subdenom
  }: {
    subdenom: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  mintTokens: ({
    amount,
    denom,
    mintToAddress
  }: {
    amount: Uint128;
    denom: string;
    mintToAddress: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  burnTokens: (fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  setMetadata: ({
    metadata
  }: {
    metadata: Metadata;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  updateConfig: ({
    factoryType,
    stakingPlatform
  }: {
    factoryType?: FactoryType;
    stakingPlatform?: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
}
export class MinterClient extends MinterQueryClient implements MinterInterface {
  client: SigningCosmWasmClient;
  sender: string;
  contractAddress: string;

  constructor(client: SigningCosmWasmClient, sender: string, contractAddress: string) {
    super(client, contractAddress);
    this.client = client;
    this.sender = sender;
    this.contractAddress = contractAddress;
    this.createDenom = this.createDenom.bind(this);
    this.mintTokens = this.mintTokens.bind(this);
    this.burnTokens = this.burnTokens.bind(this);
    this.setMetadata = this.setMetadata.bind(this);
    this.updateConfig = this.updateConfig.bind(this);
  }

  createDenom = async ({
    subdenom
  }: {
    subdenom: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      create_denom: {
        subdenom
      }
    }, fee, memo, _funds);
  };
  mintTokens = async ({
    amount,
    denom,
    mintToAddress
  }: {
    amount: Uint128;
    denom: string;
    mintToAddress: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      mint_tokens: {
        amount,
        denom,
        mint_to_address: mintToAddress
      }
    }, fee, memo, _funds);
  };
  burnTokens = async (fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      burn_tokens: {}
    }, fee, memo, _funds);
  };
  setMetadata = async ({
    metadata
  }: {
    metadata: Metadata;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      set_metadata: {
        metadata
      }
    }, fee, memo, _funds);
  };
  updateConfig = async ({
    factoryType,
    stakingPlatform
  }: {
    factoryType?: FactoryType;
    stakingPlatform?: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      update_config: {
        factory_type: factoryType,
        staking_platform: stakingPlatform
      }
    }, fee, memo, _funds);
  };
}
/**
* This file was automatically generated by @cosmwasm/ts-codegen@0.35.3.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

export class MinterQueryClient {
  constructor(client, contractAddress) {
    this.client = client;
    this.contractAddress = contractAddress;
    this.denomsByCreator = this.denomsByCreator.bind(this);
    this.queryConfig = this.queryConfig.bind(this);
  }
  denomsByCreator = async ({
    creator
  }) => {
    return this.client.queryContractSmart(this.contractAddress, {
      denoms_by_creator: {
        creator
      }
    });
  };
  queryConfig = async () => {
    return this.client.queryContractSmart(this.contractAddress, {
      query_config: {}
    });
  };
}
export class MinterClient extends MinterQueryClient {
  constructor(client, sender, contractAddress) {
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
    subdenom,
    tokenOwner
  }, fee = "auto", memo, _funds) => {
    return await this.client.execute(this.sender, this.contractAddress, {
      create_denom: {
        subdenom,
        token_owner: tokenOwner
      }
    }, fee, memo, _funds);
  };
  mintTokens = async ({
    amount,
    denom,
    mintToAddress
  }, fee = "auto", memo, _funds) => {
    return await this.client.execute(this.sender, this.contractAddress, {
      mint_tokens: {
        amount,
        denom,
        mint_to_address: mintToAddress
      }
    }, fee, memo, _funds);
  };
  burnTokens = async (fee = "auto", memo, _funds) => {
    return await this.client.execute(this.sender, this.contractAddress, {
      burn_tokens: {}
    }, fee, memo, _funds);
  };
  setMetadata = async ({
    metadata
  }, fee = "auto", memo, _funds) => {
    return await this.client.execute(this.sender, this.contractAddress, {
      set_metadata: {
        metadata
      }
    }, fee, memo, _funds);
  };
  updateConfig = async ({
    owner,
    stakingPlatform
  }, fee = "auto", memo, _funds) => {
    return await this.client.execute(this.sender, this.contractAddress, {
      update_config: {
        owner,
        staking_platform: stakingPlatform
      }
    }, fee, memo, _funds);
  };
}
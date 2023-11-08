import { l } from "../utils";
import { getCwClient, signAndBroadcastWrapper } from "./clients";
import { toUtf8 } from "@cosmjs/encoding";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { MinterMsgComposer } from "../codegen/Minter.message-composer";
import { MinterQueryClient } from "../codegen/Minter.client";
import { StakingPlatformMsgComposer } from "../codegen/StakingPlatform.message-composer";
import { StakingPlatformQueryClient } from "../codegen/StakingPlatform.client";
import {
  ProposalForStringAndTokenUnverified,
  StakedCollectionInfoForString,
} from "../codegen/StakingPlatform.types";
import {
  SigningCosmWasmClient,
  CosmWasmClient,
  MsgExecuteContractEncodeObject,
} from "@cosmjs/cosmwasm-stargate";
import {
  DirectSecp256k1HdWallet,
  OfflineSigner,
  OfflineDirectSigner,
  Coin,
} from "@cosmjs/proto-signing";
import {
  SetMetadataMsg,
  Metadata,
  UpdateMinterConfigStruct,
  UpdateStakingPlatformConfigStruct,
} from "../interfaces";

function getExecuteContractMsg(
  minterContractAddress: string,
  senderAddress: string,
  msg: any,
  funds: Coin[]
): MsgExecuteContractEncodeObject {
  return {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: MsgExecuteContract.fromPartial({
      sender: senderAddress,
      contract: minterContractAddress,
      msg: toUtf8(JSON.stringify(msg)),
      funds,
    }),
  };
}

function getSetMetadataMsg(
  minterContractAddress: string,
  senderAddress: string,
  setMetadataMsg: SetMetadataMsg,
  funds: Coin[]
): MsgExecuteContractEncodeObject {
  return getExecuteContractMsg(
    minterContractAddress,
    senderAddress,
    setMetadataMsg,
    funds
  );
}

// symbol - PINJ
// description - Awesome DAO Pinjeons NFT collection staking token
// full_denom - factory/osmo1ggnqrq28tk7tlyp4c5f2mv4907wa92f5y4gvfhqv5t43fxx4mdxsd8kfs0/upinj
function createMetadata(
  creatorAddress: string,
  symbol: string,
  description: string,
  uri: string = "",
  uriHash: string = ""
): Metadata {
  const decimals = 6;

  let subdenom = symbol.toLowerCase();
  let fullDenom = `factory/${creatorAddress}/u${subdenom}`;

  if (symbol != symbol.toUpperCase()) {
    throw new Error("Symbol must be uppercased!");
  }

  return {
    base: fullDenom,
    denom_units: [
      {
        aliases: [],
        denom: fullDenom,
        exponent: "0",
      },
      {
        aliases: [],
        denom: subdenom,
        exponent: `${decimals}`,
      },
    ],
    description,
    display: subdenom,
    name: symbol,
    symbol,
    uri,
    uri_hash: uriHash,
  };
}

async function getCwExecHelpers(
  stakingPlatformContractAddress: string,
  minterContractAddress: string,
  rpc: string,
  owner: string,
  signer: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet
) {
  const cwClient = await getCwClient(rpc, owner, signer);
  if (!cwClient) throw new Error("cwClient is not found!");

  const signingClient = cwClient.client as SigningCosmWasmClient;
  const _signAndBroadcast = signAndBroadcastWrapper(signingClient, owner);

  const stakingPlatformMsgComposer = new StakingPlatformMsgComposer(
    owner,
    stakingPlatformContractAddress
  );
  const minterMsgComposer = new MinterMsgComposer(owner, minterContractAddress);

  async function _msgWrapperWithGasPrice(
    msg: MsgExecuteContractEncodeObject,
    gasPrice: string
  ) {
    const tx = await _signAndBroadcast([msg], gasPrice);
    l("\n", tx, "\n");
    return tx;
  }

  // TODO: add NFT approve and send with CW20

  async function cwStake(
    collectionsToStake: StakedCollectionInfoForString[],
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      stakingPlatformMsgComposer.stake({ collectionsToStake }),
      gasPrice
    );
  }

  async function cwUnstake(
    collectionsToUnstake: StakedCollectionInfoForString[],
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      stakingPlatformMsgComposer.unstake({ collectionsToUnstake }),
      gasPrice
    );
  }

  async function cwClaimStakingRewards(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      stakingPlatformMsgComposer.claimStakingRewards(),
      gasPrice
    );
  }

  async function cwUpdateStakingPlatformConfig(
    updateStakingPlatformConfigStruct: UpdateStakingPlatformConfigStruct,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      stakingPlatformMsgComposer.updateConfig(
        updateStakingPlatformConfigStruct
      ),
      gasPrice
    );
  }

  async function cwDistributeFunds(
    addressAndWeightList: [string, string][],
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      stakingPlatformMsgComposer.distributeFunds({ addressAndWeightList }),
      gasPrice
    );
  }

  async function cwRemoveCollection(address: string, gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      stakingPlatformMsgComposer.removeCollection({ address }),
      gasPrice
    );
  }

  async function cwCreateProposal(
    proposal: ProposalForStringAndTokenUnverified,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      stakingPlatformMsgComposer.createProposal({ proposal }),
      gasPrice
    );
  }

  // RejectProposal {
  //     id: Uint128,
  // },

  // // projects
  // AcceptProposal {
  //     id: Uint128,
  // },

  // DepositTokens {
  //     collection_address: String,
  // },

  // WithdrawTokens {
  //     collection_address: String,
  //     amount: Uint128,
  // },

  async function cwCreateDenom(
    subdenom: string,
    funds: Coin,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      minterMsgComposer.createDenom({ subdenom }, [funds]),
      gasPrice
    );
  }

  async function cwMintTokens(
    denom: string,
    amount: number,
    mintToAddress: string,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      minterMsgComposer.mintTokens({
        denom,
        amount: `${amount}`,
        mintToAddress,
      }),
      gasPrice
    );
  }

  async function cwBurnTokens(
    denom: string,
    amount: number,
    burnFromAddress: string,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      minterMsgComposer.burnTokens({
        denom,
        amount: `${amount}`,
        burnFromAddress,
      }),
      gasPrice
    );
  }

  async function cwSetMetadata(
    creatorAddress: string,
    symbol: string,
    description: string,
    uri: string = "",
    uriHash: string = "",
    gasPrice: string
  ) {
    const metadata = createMetadata(
      creatorAddress,
      symbol,
      description,
      uri,
      uriHash
    );
    const setMetadataMsg: SetMetadataMsg = {
      set_metadata: { metadata },
    };

    return await _msgWrapperWithGasPrice(
      getSetMetadataMsg(minterContractAddress, owner, setMetadataMsg, []),
      gasPrice
    );
  }

  async function cwUpdateMinterConfig(
    stakingPlatform: string,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      minterMsgComposer.updateConfig({
        stakingPlatform,
      }),
      gasPrice
    );
  }

  return {
    // frontend

    // backend
    cwCreateDenom,
    cwMintTokens,
    cwBurnTokens,
    cwSetMetadata,
    cwUpdateMinterConfig,
  };
}

async function getCwQueryHelpers(
  stakingPlatformContractAddress: string,
  minterContractAddress: string,
  rpc: string
) {
  const cwClient = await getCwClient(rpc);
  if (!cwClient) throw new Error("cwClient is not found!");

  const cosmwasmQueryClient: CosmWasmClient = cwClient.client;
  const queryClient = new MinterQueryClient(
    cosmwasmQueryClient,
    minterContractAddress
  );

  async function cwQueryDenomsByCreator(creator: string) {
    const res = await queryClient.denomsByCreator({ creator });
    l("\n", res, "\n");
    return res;
  }

  async function cwQueryConfig() {
    const res = await queryClient.queryConfig();
    l("\n", res, "\n");
    return res;
  }

  return {
    cwQueryDenomsByCreator,
    cwQueryConfig,
  };
}

export { getCwExecHelpers, getCwQueryHelpers, SetMetadataMsg };
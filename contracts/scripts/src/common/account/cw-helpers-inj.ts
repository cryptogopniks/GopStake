import { l } from "../utils";
import { getCwClient, signAndBroadcastWrapper } from "./clients";
import { toUtf8, toBase64 } from "@cosmjs/encoding";
import { MinterMsgComposer } from "../codegen/Minter.message-composer";
import { MinterQueryClient } from "../codegen/Minter.client";
import { StakingPlatformMsgComposer } from "../codegen/StakingPlatform.message-composer";
import { StakingPlatformQueryClient } from "../codegen/StakingPlatform.client";
import {
  ProposalForStringAndTokenUnverified,
  StakedCollectionInfoForString,
  TokenUnverified,
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
  coin,
} from "@cosmjs/proto-signing";
import { NETWORK_CONFIG, MINTER_WASM, STAKING_PLATFORM_WASM } from "../config";
import {
  SetMetadataMsg,
  Metadata,
  UpdateMinterConfigStruct,
  UpdateStakingPlatformConfigStruct,
  ApproveCollectionMsg,
  RevokeCollectionMsg,
  QueryApprovalsMsg,
  ApprovalsResponse,
  Cw20SendMsg,
  NetworkName,
} from "../interfaces";

import { getGasPriceFromChainRegistryItem } from "../../common/account/clients";
import { chains } from "chain-registry";
import { fromUtf8 } from "@cosmjs/encoding";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";
import {
  MsgBroadcasterWithPk,
  ChainGrpcWasmApi,
  MsgExecuteContract,
} from "@injectivelabs/sdk-ts";

function getInjExecMsgFromComposerObj(
  obj: MsgExecuteContractEncodeObject
): MsgExecuteContract {
  const {
    value: { contract, sender, msg, funds },
  } = obj;

  if (!(contract && sender && msg)) {
    throw new Error(`${msg} parameters error!`);
  }

  return MsgExecuteContract.fromJSON({
    contractAddress: contract,
    sender,
    msg: JSON.parse(fromUtf8(msg)),
    funds,
  });
}

async function queryInjContract(
  chainGrpcWasmApi: ChainGrpcWasmApi,
  contractAddress: string,
  queryMsg: any
): Promise<string> {
  const { data } = await chainGrpcWasmApi.fetchSmartContractState(
    contractAddress,
    toBase64(toUtf8(JSON.stringify(queryMsg)))
  );

  return fromUtf8(data);
}

export { getInjExecMsgFromComposerObj, queryInjContract };

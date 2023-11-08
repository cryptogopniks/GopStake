import { coin, Coin } from "@cosmjs/stargate";
import { getSigner } from "./signer";
import { l, specifyTimeout as _specifyTimeout } from "../../common/utils";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers";
import {
  getSgExecHelpers,
  getSgQueryHelpers,
} from "../../common/account/sg-helpers";
import {
  CONTRACT_ADDRESS,
  PREFIX,
  RPC,
  CHAIN_ID,
} from "../../common/config/stars-testnet-config.json";
// import {
//   CONTRACT_ADDRESS,
//   PREFIX,
//   RPC,
// } from "../../common/config/osmo-testnet-config.json";

async function init(seed?: string, gasPrice?: string) {
  // query functions
  const dappCwQueryHelpers = await getCwQueryHelpers(CONTRACT_ADDRESS, RPC);
  if (!dappCwQueryHelpers) throw new Error("dappCwQueryHelpers are not found!");

  const dappSgQueryHelpers = await getSgQueryHelpers(RPC);
  if (!dappSgQueryHelpers) throw new Error("dappSgQueryHelpers are not found!");

  const {
    cwQueryDenomsByCreator: _cwQueryDenomsByCreator,
    cwQueryConfig: _cwQueryConfig,
  } = dappCwQueryHelpers;

  const {
    getAllBalances: _getAllBalances,
    getMetadata: _getMetadata,
    getTokenfactoryConfig: _getTokenfactoryConfig,
  } = dappSgQueryHelpers;

  async function cwQueryDenomsByCreator(creator: string) {
    try {
      return await _cwQueryDenomsByCreator(creator);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwQueryConfig() {
    try {
      return await _cwQueryConfig();
    } catch (error) {
      l(error, "\n");
    }
  }

  async function sgGetAllBalances(address: string) {
    try {
      return await _getAllBalances(address);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function sgGetMetadata(denom: string) {
    try {
      return await _getMetadata(denom);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function sgGetTokenfactoryConfig() {
    try {
      return await _getTokenfactoryConfig(CHAIN_ID);
    } catch (error) {
      l(error, "\n");
    }
  }

  if (!seed) {
    return {
      cwQueryDenomsByCreator,
      cwQueryConfig,
      sgGetAllBalances,
      sgGetMetadata,
      sgGetTokenfactoryConfig,
    };
  }

  if (typeof gasPrice != "string") throw new Error("gasPrice is not found!");
  const gasPriceStr = gasPrice;

  // execute functions
  const { signer, owner } = await getSigner(RPC, PREFIX, seed);

  // dapp cosmwasm helpers
  const dappCwExecHelpers = await getCwExecHelpers(
    CONTRACT_ADDRESS,
    RPC,
    owner,
    signer
  );
  if (!dappCwExecHelpers) throw new Error("dappCwExecHelpers are not found!");

  const {
    cwCreateDenom: _cwCreateDenom,
    cwMintTokens: _cwMintTokens,
    cwBurnTokens: _cwBurnTokens,
    cwSetMetadata: _cwSetMetadata,
    cwUpdateConfig: _cwUpdateConfig,
  } = dappCwExecHelpers;

  // dapp stargate helpers
  const dappSgExecHelpers = await getSgExecHelpers(RPC, owner, signer);
  if (!dappSgExecHelpers) throw new Error("dappSgExecHelpers are not found!");

  const { sgSend: _sgSend } = dappSgExecHelpers;

  async function cwCreateDenom(subdenom: string, funds: Coin) {
    try {
      return await _cwCreateDenom(subdenom, funds, gasPriceStr);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwMintTokens(
    denom: string,
    amount: number,
    mintToAddress: string
  ) {
    try {
      return await _cwMintTokens(denom, amount, mintToAddress, gasPriceStr);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwBurnTokens(
    denom: string,
    amount: number,
    burnFromAddress: string
  ) {
    try {
      return await _cwBurnTokens(denom, amount, burnFromAddress, gasPriceStr);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwSetMetadata(
    creatorAddress: string,
    symbol: string,
    description: string,
    uri: string = "",
    uriHash: string = ""
  ) {
    try {
      return await _cwSetMetadata(
        creatorAddress,
        symbol,
        description,
        uri,
        uriHash,
        gasPriceStr
      );
    } catch (error) {
      l(error, "\n");
    }
  }

  async function cwUpdateConfig(stakingPlatform: string) {
    try {
      return await _cwUpdateConfig(stakingPlatform, gasPriceStr);
    } catch (error) {
      l(error, "\n");
    }
  }

  async function sgSend(recipient: string, amount: number, denom: string) {
    try {
      return await _sgSend(recipient, coin(amount, denom), gasPriceStr);
    } catch (error) {
      l(error, "\n");
    }
  }

  return {
    owner,

    cwQueryDenomsByCreator,
    cwQueryConfig,
    sgGetAllBalances,
    sgGetMetadata,
    sgGetTokenfactoryConfig,

    cwCreateDenom,
    cwMintTokens,
    cwBurnTokens,
    cwSetMetadata,
    cwUpdateConfig,
    sgSend,
  };
}

export { init };

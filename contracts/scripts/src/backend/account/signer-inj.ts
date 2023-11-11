import { PrivateKey } from "@injectivelabs/sdk-ts";

const ethereumDerivationPath = "m/44'/60'/0'/0/0"; // slip44: 60

function getPrivateKey(seed: string) {
  const privateKey = PrivateKey.fromMnemonic(seed, ethereumDerivationPath);
  const injectiveAddress = privateKey.toAddress().bech32Address;

  return { privateKey, injectiveAddress };
}

export { getPrivateKey };

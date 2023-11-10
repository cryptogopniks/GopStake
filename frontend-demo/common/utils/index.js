import { SHA256, AES, enc } from "crypto-js";
import axios from "axios";
const l = console.log.bind(console);
const getID = () => Date.now() + "" + Math.random();
function r(num, digits = 0) {
  let k = 10 ** digits;
  return Math.round(k * num) / k;
}
function getLast(arr) {
  return arr[arr.length - 1];
}
class Request {
  constructor(config = {}) {
    this.req = axios.create(config);
  }
  async get(url, config) {
    return (await this.req.get(url, config)).data;
  }
  async post(url, params, config) {
    return (await this.req.post(url, params, config)).data;
  }
}
async function specifyTimeout(promise, timeout = 5_000, exception = () => {
  throw new Error("Timeout!");
}) {
  let timer;
  return Promise.race([promise, new Promise((_r, rej) => timer = setTimeout(rej, timeout, exception))]).finally(() => clearTimeout(timer));
}

/**
 * Returns destination denom of coin/token on chain A transferred from chain A to chain B, where
 * @param channelId - id of IBC channel from chain B to chain A
 * @param srcDenom - denom of coin/token on chain A
 * @param portId - port id, 'transfer' by default
 * @returns destination denom in form of 'ibc/{hash}'
 */
function getIbcDenom(channelId, srcDenom, portId = "transfer") {
  return "ibc/" + SHA256(`${portId}/${channelId}/${srcDenom}`).toString().toUpperCase();
}

/**
 * Returns id of IBC channel from chain B to chain A for coin/token
 * transferred from chain A to chain B, where
 * @param srcDenom - denom of coin/token on chain A
 * @param dstDenom - destination denom of coin/token from chain A on chain B in form of 'ibc/{hash}'
 * @param portId - port id, 'transfer' by default
 * @returns id of IBC channel from chain B to chain A
 */
function getChannelId(srcDenom, dstDenom, portId = "transfer") {
  const maxChannelId = 10_000;
  const targetHash = dstDenom.split("/")[1].toLowerCase();
  for (let i = 0; i < maxChannelId; i++) {
    const channelId = `channel-${i}`;
    const hash = SHA256(`${portId}/${channelId}/${srcDenom}`).toString();
    if (hash === targetHash) return channelId;
  }
}
function encrypt(data, key) {
  return AES.encrypt(data, key).toString();
}
function decrypt(encryptedData, key) {
  // "Malformed UTF-8 data" workaround
  try {
    const bytes = AES.decrypt(encryptedData, key);
    return bytes.toString(enc.Utf8);
  } catch (error) {
    return;
  }
}
export { Request, getID, l, r, getLast, specifyTimeout, getIbcDenom, getChannelId, encrypt, decrypt };
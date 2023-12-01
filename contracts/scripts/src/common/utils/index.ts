import { AES, enc } from "crypto-js";
import axios, {
  AxiosRequestConfig,
  AxiosInstance,
  CreateAxiosDefaults,
} from "axios";

const l = console.log.bind(console);

function getLast<T>(arr: T[]) {
  return arr[arr.length - 1];
}

class Request {
  private req: AxiosInstance;

  constructor(config: CreateAxiosDefaults = {}) {
    this.req = axios.create(config);
  }

  async get(url: string, config?: Object) {
    return (await this.req.get(url, config)).data;
  }

  async post(url: string, params: Object, config?: AxiosRequestConfig) {
    return (await this.req.post(url, params, config)).data;
  }
}

function encrypt(data: string, key: string): string {
  return AES.encrypt(data, key).toString();
}

function decrypt(encryptedData: string, key: string): string | undefined {
  // "Malformed UTF-8 data" workaround
  try {
    const bytes = AES.decrypt(encryptedData, key);
    return bytes.toString(enc.Utf8);
  } catch (error) {
    return;
  }
}

export { Request, l, getLast, encrypt, decrypt };

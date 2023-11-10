import { access, readFile } from "fs/promises";
import { decrypt, l } from "../../common/utils";
import { PATH, rootPath } from "../envs";

async function getSeed(seedEncrypted: string): Promise<string | undefined> {
  const keyPath = rootPath(PATH.TO_ENCRYPTION_KEY);

  try {
    await access(keyPath);
    const encryptionKey = await readFile(keyPath, { encoding: "utf-8" });
    const seed = decrypt(seedEncrypted, encryptionKey);
    if (!seed) throw new Error("Can not get seed!");
    return seed;
  } catch (error) {
    l(error);
  }
}

export { getSeed };

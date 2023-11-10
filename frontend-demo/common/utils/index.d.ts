import { AxiosRequestConfig, CreateAxiosDefaults } from "axios";
declare const l: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
};
declare const getID: () => string;
declare function r(num: number, digits?: number): number;
declare function getLast<T>(arr: T[]): T;
declare class Request {
    private req;
    constructor(config?: CreateAxiosDefaults);
    get(url: string, config?: Object): Promise<any>;
    post(url: string, params: Object, config?: AxiosRequestConfig): Promise<any>;
}
declare function specifyTimeout(promise: Promise<any>, timeout?: number, exception?: Function): Promise<any>;
/**
 * Returns destination denom of coin/token on chain A transferred from chain A to chain B, where
 * @param channelId - id of IBC channel from chain B to chain A
 * @param srcDenom - denom of coin/token on chain A
 * @param portId - port id, 'transfer' by default
 * @returns destination denom in form of 'ibc/{hash}'
 */
declare function getIbcDenom(channelId: string, srcDenom: string, portId?: string): string;
/**
 * Returns id of IBC channel from chain B to chain A for coin/token
 * transferred from chain A to chain B, where
 * @param srcDenom - denom of coin/token on chain A
 * @param dstDenom - destination denom of coin/token from chain A on chain B in form of 'ibc/{hash}'
 * @param portId - port id, 'transfer' by default
 * @returns id of IBC channel from chain B to chain A
 */
declare function getChannelId(srcDenom: string, dstDenom: string, portId?: string): string | undefined;
declare function encrypt(data: string, key: string): string;
declare function decrypt(encryptedData: string, key: string): string | undefined;
export { Request, getID, l, r, getLast, specifyTimeout, getIbcDenom, getChannelId, encrypt, decrypt, };

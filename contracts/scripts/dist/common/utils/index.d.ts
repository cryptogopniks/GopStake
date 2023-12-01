import { AxiosRequestConfig, CreateAxiosDefaults } from "axios";
declare const l: {
    (...data: any[]): void;
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
};
declare function getLast<T>(arr: T[]): T;
declare class Request {
    private req;
    constructor(config?: CreateAxiosDefaults);
    get(url: string, config?: Object): Promise<any>;
    post(url: string, params: Object, config?: AxiosRequestConfig): Promise<any>;
}
declare function encrypt(data: string, key: string): string;
declare function decrypt(encryptedData: string, key: string): string | undefined;
export { Request, l, getLast, encrypt, decrypt };

export declare class EncryptionService {
    private readonly algorithm;
    private readonly keyLength;
    private getKey;
    encrypt(text: string): string;
    decrypt(text: string): string;
}

import { EncryptionService } from './encryption.service';
export declare class CredentialsService {
    private encryptionService;
    constructor(encryptionService: EncryptionService);
    getOrgCredential(organizationId: string, service: string): Promise<string>;
    setOrgCredential(organizationId: string, service: string, key: string, label?: string): Promise<void>;
    getClientCredential(clientId: string, service: string): Promise<{
        token: string;
        refreshToken?: string;
    }>;
    setClientCredential(clientId: string, service: string, token: string, refreshToken?: string, scope?: string, tokenExpiryAt?: Date): Promise<void>;
}

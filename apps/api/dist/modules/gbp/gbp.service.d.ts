import { CredentialsService } from '../security/credentials.service';
export declare class GbpService {
    private credentialsService;
    constructor(credentialsService: CredentialsService);
    private getOAuth2Client;
    getAuthUrl(clientId: string): string;
    handleOAuthCallback(code: string, clientId: string): Promise<void>;
    getLocations(clientId: string): Promise<import("googleapis").mybusinessbusinessinformation_v1.Schema$Location[]>;
    updateProfile(clientId: string, data: {
        description?: string;
        phone?: string;
        websiteUrl?: string;
        secondaryCategories?: string[];
        serviceAreas?: any[];
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}

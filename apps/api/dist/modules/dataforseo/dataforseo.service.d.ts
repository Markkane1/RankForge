import { CredentialsService } from '../security/credentials.service';
export declare class DataforseoService {
    private credentialsService;
    private readonly apiUrl;
    constructor(credentialsService: CredentialsService);
    private getAuthHeaders;
    getKeywordRankings(organizationId: string, keyword: string, location: string): Promise<any>;
}

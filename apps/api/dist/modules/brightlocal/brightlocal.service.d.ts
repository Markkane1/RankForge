import { CredentialsService } from '../security/credentials.service';
export declare class BrightlocalService {
    private credentialsService;
    private readonly apiUrl;
    constructor(credentialsService: CredentialsService);
    getCitationAudits(organizationId: string, locationId: string): Promise<any>;
}

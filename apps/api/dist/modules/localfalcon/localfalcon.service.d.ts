import { CredentialsService } from '../security/credentials.service';
export declare class LocalfalconService {
    private credentialsService;
    private readonly apiUrl;
    constructor(credentialsService: CredentialsService);
    triggerGeoGridScan(organizationId: string, keyword: string, lat: number, lng: number): Promise<any>;
}

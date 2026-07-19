import { LocalfalconService } from './localfalcon.service';
export declare class LocalfalconController {
    private readonly lfService;
    constructor(lfService: LocalfalconService);
    triggerScan(orgId: string, keyword: string, lat: number, lng: number): Promise<any>;
}

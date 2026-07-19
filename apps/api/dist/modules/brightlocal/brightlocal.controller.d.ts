import { BrightlocalService } from './brightlocal.service';
export declare class BrightlocalController {
    private readonly blService;
    constructor(blService: BrightlocalService);
    getCitations(orgId: string, locationId: string): Promise<any>;
}

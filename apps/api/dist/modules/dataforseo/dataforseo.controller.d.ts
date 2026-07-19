import { DataforseoService } from './dataforseo.service';
export declare class DataforseoController {
    private readonly dfsService;
    constructor(dfsService: DataforseoService);
    getKeywords(orgId: string, keyword: string, location: string): Promise<any>;
}

import { SiteAuditService } from './site-audit.service';
export declare class SiteAuditController {
    private readonly siteAuditService;
    constructor(siteAuditService: SiteAuditService);
    crawl(clientId: string): Promise<({
        issues: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            url: string;
            siteAuditId: string;
            severity: string;
            issueType: string;
            isResolved: boolean;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        status: string;
        crawlDate: Date;
        totalUrls: number;
    }) | null>;
    createRestorePoint(clientId: string, snapshotData: string, description?: string): Promise<{
        id: string;
        createdAt: Date;
        clientId: string;
        description: string | null;
        snapshotData: string;
        restoredAt: Date | null;
    }>;
    executeFix(clientId: string, issueId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        url: string;
        siteAuditId: string;
        severity: string;
        issueType: string;
        isResolved: boolean;
    }>;
}

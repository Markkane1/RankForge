import { PageMatrixService } from './page-matrix.service';
import { UpdatePageMatrixEntryDto } from './page-matrix.dto';
export declare class PageMatrixController {
    private readonly pageMatrixService;
    constructor(pageMatrixService: PageMatrixService);
    createEntry(clientId: string, body: {
        slug: string;
        pageType: string;
        primaryKeyword: string;
        targetArea?: string;
        priority?: number;
        status?: string;
        content?: string;
        schemaJson?: string;
    }): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        priority: number;
        status: string;
        content: string | null;
        pageType: string;
        primaryKeyword: string;
        targetArea: string | null;
        schemaJson: string | null;
    }>;
    listEntries(clientId: string): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        priority: number;
        status: string;
        content: string | null;
        pageType: string;
        primaryKeyword: string;
        targetArea: string | null;
        schemaJson: string | null;
    }[]>;
    updateEntry(clientId: string, entryId: string, body: UpdatePageMatrixEntryDto): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        priority: number;
        status: string;
        content: string | null;
        pageType: string;
        primaryKeyword: string;
        targetArea: string | null;
        schemaJson: string | null;
    }>;
    getChecklist(clientId: string, entryId: string): Promise<{
        titleUnique: boolean;
        schemaValid: boolean;
        napExact: boolean;
        mobileOk: any;
        cwvPass: boolean;
        trackingFires: any;
        allPassed: boolean;
        errors: string[];
    }>;
    trackConversion(clientId: string, source: string, value?: number, contactInfo?: string): Promise<{
        id: string;
        notes: string | null;
        createdAt: Date;
        clientId: string;
        source: import("@prisma/client").$Enums.LeadSource;
        value: number | null;
        contactInfo: string | null;
        convertedAt: Date | null;
    }>;
    deleteEntry(clientId: string, entryId: string): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        priority: number;
        status: string;
        content: string | null;
        pageType: string;
        primaryKeyword: string;
        targetArea: string | null;
        schemaJson: string | null;
    }>;
}

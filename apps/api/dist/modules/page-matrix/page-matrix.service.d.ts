export declare class PageMatrixService {
    createEntry(clientId: string, data: {
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
    updateEntry(clientId: string, entryId: string, data: {
        slug?: string;
        pageType?: string;
        primaryKeyword?: string;
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
    validateTemplateBlocks(content: string | null): void;
    private validateTextBlocks;
    validateSchemaJson(schemaJson: string | null): void;
    getChecklistDetails(clientId: string, entryId: string, updateData?: any): Promise<{
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
        source: import("@rankforge/database").$Enums.LeadSource;
        value: number | null;
        contactInfo: string | null;
        convertedAt: Date | null;
    }>;
}

export declare class CreatePageMatrixEntryDto {
    slug: string;
    pageType: string;
    primaryKeyword: string;
    targetArea?: string;
    priority?: number;
    status?: string;
    content?: string;
    schemaJson?: string;
}
export declare class UpdatePageMatrixEntryDto {
    slug?: string;
    pageType?: string;
    primaryKeyword?: string;
    targetArea?: string;
    priority?: number;
    status?: string;
    content?: string;
    schemaJson?: string;
}

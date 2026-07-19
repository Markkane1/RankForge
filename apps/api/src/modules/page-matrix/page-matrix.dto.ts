export class CreatePageMatrixEntryDto {
  slug: string;
  pageType: string; // 'LOCATION_PAGE' | 'SERVICE_PAGE'
  primaryKeyword: string;
  targetArea?: string;
  priority?: number;
  status?: string;
  content?: string;
  schemaJson?: string;
}

export class UpdatePageMatrixEntryDto {
  slug?: string;
  pageType?: string;
  primaryKeyword?: string;
  targetArea?: string;
  priority?: number;
  status?: string;
  content?: string;
  schemaJson?: string;
}

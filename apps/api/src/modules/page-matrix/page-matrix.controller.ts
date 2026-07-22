import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PageMatrixService } from './page-matrix.service';
import { UpdatePageMatrixEntryDto } from './page-matrix.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Page Matrix Builder & Cannibalization Matrix')
@Controller('api/clients/:id/page-matrix')
export class PageMatrixController {
  constructor(private readonly pageMatrixService: PageMatrixService) {}

  @ApiOperation({ summary: 'Create a page matrix entry' })
  @ApiResponse({
    status: 201,
    description: 'Page matrix entry created successfully',
  })
  @ApiResponse({ status: 409, description: 'Keyword cannibalization detected' })
  @Post()
  async createEntry(
    @Param('id') clientId: string,
    @Body()
    body: {
      slug: string;
      pageType: string;
      primaryKeyword: string;
      targetArea?: string;
      priority?: number;
      status?: string;
      content?: string;
      schemaJson?: string;
    },
  ) {
    return this.pageMatrixService.createEntry(clientId, body);
  }

  @ApiOperation({ summary: 'List all page matrix entries for a client' })
  @ApiResponse({
    status: 200,
    description: 'List of page matrix entries returned successfully',
  })
  @Get()
  async listEntries(@Param('id') clientId: string) {
    return this.pageMatrixService.listEntries(clientId);
  }

  @ApiOperation({ summary: 'Update a page matrix entry with checks' })
  @ApiResponse({ status: 200, description: 'Entry updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation or template checks failed',
  })
  @Put(':entryId')
  async updateEntry(
    @Param('id') clientId: string,
    @Param('entryId') entryId: string,
    @Body() body: UpdatePageMatrixEntryDto,
  ) {
    return this.pageMatrixService.updateEntry(clientId, entryId, body);
  }

  @ApiOperation({ summary: 'Get programmatic pre-launch checklist details' })
  @ApiResponse({ status: 200, description: 'Pre-launch checklist evaluation' })
  @Get(':entryId/checklist')
  async getChecklist(
    @Param('id') clientId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.pageMatrixService.getChecklistDetails(clientId, entryId);
  }

  @ApiOperation({ summary: 'Log a tracked conversion event' })
  @ApiResponse({
    status: 201,
    description: 'Conversion event logged successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid source enum' })
  @Post('conversions')
  async trackConversion(
    @Param('id') clientId: string,
    @Body('source') source: string,
    @Body('value') value?: number,
    @Body('contactInfo') contactInfo?: string,
  ) {
    return this.pageMatrixService.trackConversion(
      clientId,
      source,
      value,
      contactInfo,
    );
  }

  @ApiOperation({ summary: 'Delete a page matrix entry' })
  @ApiResponse({
    status: 200,
    description: 'Page matrix entry deleted successfully',
  })
  @Delete(':entryId')
  @HttpCode(HttpStatus.OK)
  async deleteEntry(
    @Param('id') clientId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.pageMatrixService.deleteEntry(clientId, entryId);
  }
}

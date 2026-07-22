import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SiteAuditService } from './site-audit.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Site Audit & Restore Points')
@Controller('api/clients/:id/site-audit')
export class SiteAuditController {
  constructor(private readonly siteAuditService: SiteAuditService) {}

  @ApiOperation({ summary: 'Crawl sitemap and generate fix list' })
  @ApiResponse({ status: 200, description: 'Audit completed successfully' })
  @Post('crawl')
  @HttpCode(HttpStatus.OK)
  async crawl(@Param('id') clientId: string) {
    return this.siteAuditService.crawlClientWebsite(clientId);
  }

  @ApiOperation({ summary: 'Create a restore point' })
  @ApiResponse({
    status: 201,
    description: 'Restore point created successfully',
  })
  @Post('restore-point')
  async createRestorePoint(
    @Param('id') clientId: string,
    @Body('snapshotData') snapshotData: string,
    @Body('description') description?: string,
  ) {
    return this.siteAuditService.createRestorePoint(
      clientId,
      snapshotData,
      description,
    );
  }

  @ApiOperation({ summary: 'Execute a fix for an issue' })
  @ApiResponse({ status: 200, description: 'Fix successfully executed' })
  @Post('issues/:issueId/fix')
  async executeFix(
    @Param('id') clientId: string,
    @Param('issueId') issueId: string,
  ) {
    return this.siteAuditService.executeFix(clientId, issueId);
  }
}

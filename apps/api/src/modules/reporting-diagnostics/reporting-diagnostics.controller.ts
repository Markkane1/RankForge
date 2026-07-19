import { Controller, Post, Get, Param, Query, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { ReportingDiagnosticsService } from './reporting-diagnostics.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Reporting & Diagnostics (Module 5)')
@Controller('api/clients/:id/reporting')
export class ReportingDiagnosticsController {
  constructor(private readonly reportingService: ReportingDiagnosticsService) {}

  @ApiOperation({ summary: 'Sync GA4 property conversion logs' })
  @ApiResponse({ status: 200, description: 'Events sync complete' })
  @Post('ga4/sync')
  async syncGa4Events(
    @Param('id') clientId: string,
    @Body('propertyId') propertyId: string,
    @Body('customDimensionConfig') customDimensionConfig?: string
  ) {
    return this.reportingService.syncGa4Events(clientId, propertyId, customDimensionConfig);
  }

  @ApiOperation({ summary: 'Capture onboarding baseline snapshot' })
  @ApiResponse({ status: 201, description: 'Baseline snapshot created successfully' })
  @ApiResponse({ status: 400, description: 'Baseline snapshot already exists and is locked' })
  @Post('baseline')
  async captureBaseline(@Param('id') clientId: string) {
    return this.reportingService.captureBaseline(clientId);
  }

  @ApiOperation({ summary: 'Evaluate weekly performance anomalies' })
  @ApiResponse({ status: 200, description: 'Metric anomaly list returned' })
  @Get('anomalies')
  async checkAnomalies(@Param('id') clientId: string) {
    return this.reportingService.checkMetricAnomalies(clientId);
  }

  @ApiOperation({ summary: 'Get auto diagnostic checklist suggestions' })
  @ApiResponse({ status: 200, description: 'KPI diagnostic checklists' })
  @Get('diagnostics')
  async getDiagnostics(@Param('id') clientId: string) {
    return this.reportingService.getDiagnosticChecklist(clientId);
  }
}

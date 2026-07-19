import { Module } from '@nestjs/common';
import { ReportingDiagnosticsService } from './reporting-diagnostics.service';
import { ReportingDiagnosticsController } from './reporting-diagnostics.controller';

@Module({
  providers: [ReportingDiagnosticsService],
  controllers: [ReportingDiagnosticsController],
  exports: [ReportingDiagnosticsService],
})
export class ReportingDiagnosticsModule {}

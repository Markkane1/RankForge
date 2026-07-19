import { Module } from '@nestjs/common';
import { SiteAuditService } from './site-audit.service';
import { SiteAuditController } from './site-audit.controller';

@Module({
  providers: [SiteAuditService],
  controllers: [SiteAuditController],
  exports: [SiteAuditService],
})
export class SiteAuditModule {}

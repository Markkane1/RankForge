import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SecurityModule } from './modules/security/security.module';
import { GbpModule } from './modules/gbp/gbp.module';
import { DataforseoModule } from './modules/dataforseo/dataforseo.module';
import { LocalfalconModule } from './modules/localfalcon/localfalcon.module';
import { BrightlocalModule } from './modules/brightlocal/brightlocal.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SiteAuditModule } from './modules/site-audit/site-audit.module';
import { PageMatrixModule } from './modules/page-matrix/page-matrix.module';
import { LocalAuthorityModule } from './modules/local-authority/local-authority.module';
import { ContentPipelineModule } from './modules/content-pipeline/content-pipeline.module';
import { ReportingDiagnosticsModule } from './modules/reporting-diagnostics/reporting-diagnostics.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    SecurityModule,
    GbpModule,
    DataforseoModule,
    LocalfalconModule,
    BrightlocalModule,
    TasksModule,
    SiteAuditModule,
    PageMatrixModule,
    LocalAuthorityModule,
    ContentPipelineModule,
    ReportingDiagnosticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}

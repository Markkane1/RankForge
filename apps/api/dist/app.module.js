"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const security_module_1 = require("./modules/security/security.module");
const gbp_module_1 = require("./modules/gbp/gbp.module");
const dataforseo_module_1 = require("./modules/dataforseo/dataforseo.module");
const localfalcon_module_1 = require("./modules/localfalcon/localfalcon.module");
const brightlocal_module_1 = require("./modules/brightlocal/brightlocal.module");
const tasks_module_1 = require("./modules/tasks/tasks.module");
const site_audit_module_1 = require("./modules/site-audit/site-audit.module");
const page_matrix_module_1 = require("./modules/page-matrix/page-matrix.module");
const local_authority_module_1 = require("./modules/local-authority/local-authority.module");
const content_pipeline_module_1 = require("./modules/content-pipeline/content-pipeline.module");
const reporting_diagnostics_module_1 = require("./modules/reporting-diagnostics/reporting-diagnostics.module");
const tenant_middleware_1 = require("./common/middleware/tenant.middleware");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(tenant_middleware_1.TenantMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            security_module_1.SecurityModule,
            gbp_module_1.GbpModule,
            dataforseo_module_1.DataforseoModule,
            localfalcon_module_1.LocalfalconModule,
            brightlocal_module_1.BrightlocalModule,
            tasks_module_1.TasksModule,
            site_audit_module_1.SiteAuditModule,
            page_matrix_module_1.PageMatrixModule,
            local_authority_module_1.LocalAuthorityModule,
            content_pipeline_module_1.ContentPipelineModule,
            reporting_diagnostics_module_1.ReportingDiagnosticsModule
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
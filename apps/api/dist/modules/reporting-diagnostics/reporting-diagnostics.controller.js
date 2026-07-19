"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingDiagnosticsController = void 0;
const common_1 = require("@nestjs/common");
const reporting_diagnostics_service_1 = require("./reporting-diagnostics.service");
const swagger_1 = require("@nestjs/swagger");
let ReportingDiagnosticsController = class ReportingDiagnosticsController {
    reportingService;
    constructor(reportingService) {
        this.reportingService = reportingService;
    }
    async syncGa4Events(clientId, propertyId, customDimensionConfig) {
        return this.reportingService.syncGa4Events(clientId, propertyId, customDimensionConfig);
    }
    async captureBaseline(clientId) {
        return this.reportingService.captureBaseline(clientId);
    }
    async checkAnomalies(clientId) {
        return this.reportingService.checkMetricAnomalies(clientId);
    }
    async getDiagnostics(clientId) {
        return this.reportingService.getDiagnosticChecklist(clientId);
    }
};
exports.ReportingDiagnosticsController = ReportingDiagnosticsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Sync GA4 property conversion logs' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Events sync complete' }),
    (0, common_1.Post)('ga4/sync'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('propertyId')),
    __param(2, (0, common_1.Body)('customDimensionConfig')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportingDiagnosticsController.prototype, "syncGa4Events", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Capture onboarding baseline snapshot' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Baseline snapshot created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Baseline snapshot already exists and is locked' }),
    (0, common_1.Post)('baseline'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportingDiagnosticsController.prototype, "captureBaseline", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Evaluate weekly performance anomalies' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Metric anomaly list returned' }),
    (0, common_1.Get)('anomalies'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportingDiagnosticsController.prototype, "checkAnomalies", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get auto diagnostic checklist suggestions' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'KPI diagnostic checklists' }),
    (0, common_1.Get)('diagnostics'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportingDiagnosticsController.prototype, "getDiagnostics", null);
exports.ReportingDiagnosticsController = ReportingDiagnosticsController = __decorate([
    (0, swagger_1.ApiTags)('Reporting & Diagnostics (Module 5)'),
    (0, common_1.Controller)('api/clients/:id/reporting'),
    __metadata("design:paramtypes", [reporting_diagnostics_service_1.ReportingDiagnosticsService])
], ReportingDiagnosticsController);
//# sourceMappingURL=reporting-diagnostics.controller.js.map
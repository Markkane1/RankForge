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
exports.SiteAuditController = void 0;
const common_1 = require("@nestjs/common");
const site_audit_service_1 = require("./site-audit.service");
const swagger_1 = require("@nestjs/swagger");
let SiteAuditController = class SiteAuditController {
    siteAuditService;
    constructor(siteAuditService) {
        this.siteAuditService = siteAuditService;
    }
    async crawl(clientId) {
        return this.siteAuditService.crawlClientWebsite(clientId);
    }
    async createRestorePoint(clientId, snapshotData, description) {
        return this.siteAuditService.createRestorePoint(clientId, snapshotData, description);
    }
    async executeFix(clientId, issueId) {
        return this.siteAuditService.executeFix(clientId, issueId);
    }
};
exports.SiteAuditController = SiteAuditController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Crawl sitemap and generate fix list' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Audit completed successfully' }),
    (0, common_1.Post)('crawl'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SiteAuditController.prototype, "crawl", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a restore point' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Restore point created successfully' }),
    (0, common_1.Post)('restore-point'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('snapshotData')),
    __param(2, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SiteAuditController.prototype, "createRestorePoint", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Execute a fix for an issue' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Fix successfully executed' }),
    (0, common_1.Post)('issues/:issueId/fix'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('issueId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SiteAuditController.prototype, "executeFix", null);
exports.SiteAuditController = SiteAuditController = __decorate([
    (0, swagger_1.ApiTags)('Site Audit & Restore Points'),
    (0, common_1.Controller)('api/clients/:id/site-audit'),
    __metadata("design:paramtypes", [site_audit_service_1.SiteAuditService])
], SiteAuditController);
//# sourceMappingURL=site-audit.controller.js.map
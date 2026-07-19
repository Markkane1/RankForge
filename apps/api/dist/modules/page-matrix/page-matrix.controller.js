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
exports.PageMatrixController = void 0;
const common_1 = require("@nestjs/common");
const page_matrix_service_1 = require("./page-matrix.service");
const page_matrix_dto_1 = require("./page-matrix.dto");
const swagger_1 = require("@nestjs/swagger");
let PageMatrixController = class PageMatrixController {
    pageMatrixService;
    constructor(pageMatrixService) {
        this.pageMatrixService = pageMatrixService;
    }
    async createEntry(clientId, body) {
        return this.pageMatrixService.createEntry(clientId, body);
    }
    async listEntries(clientId) {
        return this.pageMatrixService.listEntries(clientId);
    }
    async updateEntry(clientId, entryId, body) {
        return this.pageMatrixService.updateEntry(clientId, entryId, body);
    }
    async getChecklist(clientId, entryId) {
        return this.pageMatrixService.getChecklistDetails(clientId, entryId);
    }
    async trackConversion(clientId, source, value, contactInfo) {
        return this.pageMatrixService.trackConversion(clientId, source, value, contactInfo);
    }
    async deleteEntry(clientId, entryId) {
        return this.pageMatrixService.deleteEntry(clientId, entryId);
    }
};
exports.PageMatrixController = PageMatrixController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a page matrix entry' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Page matrix entry created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Keyword cannibalization detected' }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PageMatrixController.prototype, "createEntry", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'List all page matrix entries for a client' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of page matrix entries returned successfully' }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PageMatrixController.prototype, "listEntries", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a page matrix entry with checks' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Entry updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation or template checks failed' }),
    (0, common_1.Put)(':entryId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('entryId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, page_matrix_dto_1.UpdatePageMatrixEntryDto]),
    __metadata("design:returntype", Promise)
], PageMatrixController.prototype, "updateEntry", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get programmatic pre-launch checklist details' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pre-launch checklist evaluation' }),
    (0, common_1.Get)(':entryId/checklist'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('entryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PageMatrixController.prototype, "getChecklist", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Log a tracked conversion event' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Conversion event logged successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid source enum' }),
    (0, common_1.Post)('conversions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('source')),
    __param(2, (0, common_1.Body)('value')),
    __param(3, (0, common_1.Body)('contactInfo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, String]),
    __metadata("design:returntype", Promise)
], PageMatrixController.prototype, "trackConversion", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a page matrix entry' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Page matrix entry deleted successfully' }),
    (0, common_1.Delete)(':entryId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('entryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PageMatrixController.prototype, "deleteEntry", null);
exports.PageMatrixController = PageMatrixController = __decorate([
    (0, swagger_1.ApiTags)('Page Matrix Builder & Cannibalization Matrix'),
    (0, common_1.Controller)('api/clients/:id/page-matrix'),
    __metadata("design:paramtypes", [page_matrix_service_1.PageMatrixService])
], PageMatrixController);
//# sourceMappingURL=page-matrix.controller.js.map
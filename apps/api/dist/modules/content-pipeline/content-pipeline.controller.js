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
exports.ContentPipelineController = void 0;
const common_1 = require("@nestjs/common");
const content_pipeline_service_1 = require("./content-pipeline.service");
const swagger_1 = require("@nestjs/swagger");
let ContentPipelineController = class ContentPipelineController {
    contentPipelineService;
    constructor(contentPipelineService) {
        this.contentPipelineService = contentPipelineService;
    }
    async schedulePost(clientId, body) {
        return this.contentPipelineService.schedulePost(clientId, body);
    }
    async listScheduledPosts(clientId, start, end) {
        return this.contentPipelineService.listScheduledPosts(clientId, start, end);
    }
    async updateScheduledPost(clientId, postId, body) {
        return this.contentPipelineService.updateScheduledPost(clientId, postId, body);
    }
    async deleteScheduledPost(clientId, postId) {
        return this.contentPipelineService.deleteScheduledPost(clientId, postId);
    }
    async generateContentDraft(clientId, topic, primaryKeywords) {
        return this.contentPipelineService.generateContentDraft(clientId, topic, primaryKeywords);
    }
    async syncSearchVisibility(clientId, query) {
        return this.contentPipelineService.syncSearchVisibility(clientId, query);
    }
    async scanStaleContent(clientId) {
        return this.contentPipelineService.scanStaleContent(clientId);
    }
};
exports.ContentPipelineController = ContentPipelineController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Schedule a new GBP post' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Post scheduled successfully' }),
    (0, common_1.Post)('posts'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ContentPipelineController.prototype, "schedulePost", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'List scheduled posts for content calendar' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of scheduled posts returned' }),
    (0, common_1.Get)('posts'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ContentPipelineController.prototype, "listScheduledPosts", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update/reschedule a scheduled post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Scheduled post updated successfully' }),
    (0, common_1.Put)('posts/:postId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('postId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ContentPipelineController.prototype, "updateScheduledPost", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a scheduled post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Scheduled post deleted' }),
    (0, common_1.Delete)('posts/:postId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ContentPipelineController.prototype, "deleteScheduledPost", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Generate content draft draft using LLM model rules' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'AI content draft generated successfully' }),
    (0, common_1.Post)('posts/generate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('topic')),
    __param(2, (0, common_1.Body)('primaryKeywords')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Array]),
    __metadata("design:returntype", Promise)
], ContentPipelineController.prototype, "generateContentDraft", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Track AI visibility search snippets' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Search visibility tracking information' }),
    (0, common_1.Get)('search-visibility'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('query')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ContentPipelineController.prototype, "syncSearchVisibility", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Trigger quarterly stale content check' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Scanned posts and flagged stale ones' }),
    (0, common_1.Post)('stale-scan'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContentPipelineController.prototype, "scanStaleContent", null);
exports.ContentPipelineController = ContentPipelineController = __decorate([
    (0, swagger_1.ApiTags)('Content Calendar & AI Pipeline (Module 4)'),
    (0, common_1.Controller)('api/clients/:id/content-pipeline'),
    __metadata("design:paramtypes", [content_pipeline_service_1.ContentPipelineService])
], ContentPipelineController);
//# sourceMappingURL=content-pipeline.controller.js.map
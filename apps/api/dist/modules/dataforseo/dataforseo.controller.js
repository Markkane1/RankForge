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
exports.DataforseoController = void 0;
const common_1 = require("@nestjs/common");
const dataforseo_service_1 = require("./dataforseo.service");
let DataforseoController = class DataforseoController {
    dfsService;
    constructor(dfsService) {
        this.dfsService = dfsService;
    }
    async getKeywords(orgId, keyword, location) {
        if (!orgId || !keyword) {
            throw new common_1.HttpException('orgId and keyword are required', common_1.HttpStatus.BAD_REQUEST);
        }
        return this.dfsService.getKeywordRankings(orgId, keyword, location || 'United States');
    }
};
exports.DataforseoController = DataforseoController;
__decorate([
    (0, common_1.Get)('keywords'),
    __param(0, (0, common_1.Query)('orgId')),
    __param(1, (0, common_1.Query)('keyword')),
    __param(2, (0, common_1.Query)('location')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], DataforseoController.prototype, "getKeywords", null);
exports.DataforseoController = DataforseoController = __decorate([
    (0, common_1.Controller)('api/dataforseo'),
    __metadata("design:paramtypes", [dataforseo_service_1.DataforseoService])
], DataforseoController);
//# sourceMappingURL=dataforseo.controller.js.map
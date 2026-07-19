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
exports.LocalfalconController = void 0;
const common_1 = require("@nestjs/common");
const localfalcon_service_1 = require("./localfalcon.service");
let LocalfalconController = class LocalfalconController {
    lfService;
    constructor(lfService) {
        this.lfService = lfService;
    }
    async triggerScan(orgId, keyword, lat, lng) {
        if (!orgId || !keyword || !lat || !lng) {
            throw new common_1.HttpException('orgId, keyword, lat, and lng are required', common_1.HttpStatus.BAD_REQUEST);
        }
        return this.lfService.triggerGeoGridScan(orgId, keyword, lat, lng);
    }
};
exports.LocalfalconController = LocalfalconController;
__decorate([
    (0, common_1.Post)('scan'),
    __param(0, (0, common_1.Body)('orgId')),
    __param(1, (0, common_1.Body)('keyword')),
    __param(2, (0, common_1.Body)('lat')),
    __param(3, (0, common_1.Body)('lng')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], LocalfalconController.prototype, "triggerScan", null);
exports.LocalfalconController = LocalfalconController = __decorate([
    (0, common_1.Controller)('api/localfalcon'),
    __metadata("design:paramtypes", [localfalcon_service_1.LocalfalconService])
], LocalfalconController);
//# sourceMappingURL=localfalcon.controller.js.map
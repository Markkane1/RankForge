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
exports.GbpController = void 0;
const common_1 = require("@nestjs/common");
const gbp_service_1 = require("./gbp.service");
const gbp_dto_1 = require("./gbp.dto");
const swagger_1 = require("@nestjs/swagger");
let GbpController = class GbpController {
    gbpService;
    constructor(gbpService) {
        this.gbpService = gbpService;
    }
    initOAuth(clientId, res) {
        if (!clientId) {
            throw new common_1.HttpException('clientId is required', common_1.HttpStatus.BAD_REQUEST);
        }
        const url = this.gbpService.getAuthUrl(clientId);
        return res.redirect(url);
    }
    async oauthCallback(code, clientId, error, res) {
        if (error) {
            return res.redirect(`${process.env.FRONTEND_URL}/clients/${clientId}?error=${error}`);
        }
        if (!code || !clientId) {
            throw new common_1.HttpException('code and state are required', common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            await this.gbpService.handleOAuthCallback(code, clientId);
            return res.redirect(`${process.env.FRONTEND_URL}/clients/${clientId}?gbp_connected=true`);
        }
        catch (err) {
            return res.redirect(`${process.env.FRONTEND_URL}/clients/${clientId}?error=oauth_failed`);
        }
    }
    async updateProfile(clientId, body) {
        return this.gbpService.updateProfile(clientId, body);
    }
};
exports.GbpController = GbpController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Initialize GBP OAuth flow' }),
    (0, swagger_1.ApiResponse)({ status: 302, description: 'Redirects to Google Consent Screen' }),
    (0, common_1.Get)('init'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GbpController.prototype, "initOAuth", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], GbpController.prototype, "oauthCallback", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update GBP Profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profile successfully updated and validated' }),
    (0, common_1.Put)('profile/:clientId'),
    __param(0, (0, common_1.Param)('clientId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, gbp_dto_1.UpdateGbpProfileDto]),
    __metadata("design:returntype", Promise)
], GbpController.prototype, "updateProfile", null);
exports.GbpController = GbpController = __decorate([
    (0, swagger_1.ApiTags)('GBP OAuth'),
    (0, common_1.Controller)('api/gbp/oauth'),
    __metadata("design:paramtypes", [gbp_service_1.GbpService])
], GbpController);
//# sourceMappingURL=gbp.controller.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrightlocalService = void 0;
const common_1 = require("@nestjs/common");
const credentials_service_1 = require("../security/credentials.service");
let BrightlocalService = class BrightlocalService {
    credentialsService;
    apiUrl = 'https://tools.brightlocal.com/seo-tools/api/v4';
    constructor(credentialsService) {
        this.credentialsService = credentialsService;
    }
    async getCitationAudits(organizationId, locationId) {
        const apiKey = await this.credentialsService.getOrgCredential(organizationId, 'BRIGHTLOCAL');
        try {
            const response = await fetch(`${this.apiUrl}/lsc/report/get?api-key=${apiKey}&location-id=${locationId}`);
            if (!response.ok) {
                throw new Error('BrightLocal API Error');
            }
            return await response.json();
        }
        catch (e) {
            throw new common_1.HttpException('BrightLocal API Integration not fully configured', common_1.HttpStatus.NOT_IMPLEMENTED);
        }
    }
};
exports.BrightlocalService = BrightlocalService;
exports.BrightlocalService = BrightlocalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [credentials_service_1.CredentialsService])
], BrightlocalService);
//# sourceMappingURL=brightlocal.service.js.map
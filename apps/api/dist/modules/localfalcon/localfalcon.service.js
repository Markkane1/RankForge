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
exports.LocalfalconService = void 0;
const common_1 = require("@nestjs/common");
const credentials_service_1 = require("../security/credentials.service");
let LocalfalconService = class LocalfalconService {
    credentialsService;
    apiUrl = 'https://api.localfalcon.com/v1';
    constructor(credentialsService) {
        this.credentialsService = credentialsService;
    }
    async triggerGeoGridScan(organizationId, keyword, lat, lng) {
        const apiKey = await this.credentialsService.getOrgCredential(organizationId, 'LOCAL_FALCON');
        try {
            const response = await fetch(`${this.apiUrl}/scans`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ keyword, lat, lng })
            });
            if (!response.ok) {
                throw new Error('Local Falcon API Error');
            }
            return await response.json();
        }
        catch (e) {
            throw new common_1.HttpException('LocalFalcon API Integration not fully configured', common_1.HttpStatus.NOT_IMPLEMENTED);
        }
    }
};
exports.LocalfalconService = LocalfalconService;
exports.LocalfalconService = LocalfalconService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [credentials_service_1.CredentialsService])
], LocalfalconService);
//# sourceMappingURL=localfalcon.service.js.map
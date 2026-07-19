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
exports.DataforseoService = void 0;
const common_1 = require("@nestjs/common");
const credentials_service_1 = require("../security/credentials.service");
let DataforseoService = class DataforseoService {
    credentialsService;
    apiUrl = 'https://api.dataforseo.com/v3';
    constructor(credentialsService) {
        this.credentialsService = credentialsService;
    }
    async getAuthHeaders(organizationId) {
        const credsStr = await this.credentialsService.getOrgCredential(organizationId, 'DATAFORSEO');
        const encoded = Buffer.from(credsStr).toString('base64');
        return {
            'Authorization': `Basic ${encoded}`,
            'Content-Type': 'application/json'
        };
    }
    async getKeywordRankings(organizationId, keyword, location) {
        const headers = await this.getAuthHeaders(organizationId);
        const postData = [{
                keyword,
                location_name: location,
                language_name: 'English'
            }];
        try {
            const response = await fetch(`${this.apiUrl}/serp/google/organic/live/regular`, {
                method: 'POST',
                headers,
                body: JSON.stringify(postData)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new common_1.HttpException(data, response.status);
            }
            return data;
        }
        catch (e) {
            throw new common_1.HttpException('DataForSEO API Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.DataforseoService = DataforseoService;
exports.DataforseoService = DataforseoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [credentials_service_1.CredentialsService])
], DataforseoService);
//# sourceMappingURL=dataforseo.service.js.map
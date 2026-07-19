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
exports.CredentialsService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@rankforge/database");
const encryption_service_1 = require("./encryption.service");
let CredentialsService = class CredentialsService {
    encryptionService;
    constructor(encryptionService) {
        this.encryptionService = encryptionService;
    }
    async getOrgCredential(organizationId, service) {
        const cred = await database_1.prisma.orgCredential.findFirst({
            where: { organizationId, service, isValid: true }
        });
        if (!cred) {
            throw new common_1.NotFoundException(`Valid credential for ${service} not found`);
        }
        return this.encryptionService.decrypt(cred.encryptedKey);
    }
    async setOrgCredential(organizationId, service, key, label) {
        const encryptedKey = this.encryptionService.encrypt(key);
        await database_1.prisma.orgCredential.updateMany({
            where: { organizationId, service },
            data: { isValid: false }
        });
        await database_1.prisma.orgCredential.create({
            data: {
                organizationId,
                service,
                encryptedKey,
                label,
                isValid: true
            }
        });
    }
    async getClientCredential(clientId, service) {
        const cred = await database_1.prisma.clientCredential.findFirst({
            where: { clientId, service, isValid: true }
        });
        if (!cred) {
            throw new common_1.NotFoundException(`Valid credential for ${service} not found for client`);
        }
        return {
            token: this.encryptionService.decrypt(cred.encryptedToken),
            refreshToken: cred.refreshToken ? this.encryptionService.decrypt(cred.refreshToken) : undefined,
        };
    }
    async setClientCredential(clientId, service, token, refreshToken, scope, tokenExpiryAt) {
        const encryptedToken = this.encryptionService.encrypt(token);
        const encryptedRefresh = refreshToken ? this.encryptionService.encrypt(refreshToken) : undefined;
        await database_1.prisma.clientCredential.updateMany({
            where: { clientId, service },
            data: { isValid: false }
        });
        await database_1.prisma.clientCredential.create({
            data: {
                clientId,
                service,
                encryptedToken,
                refreshToken: encryptedRefresh,
                scope,
                tokenExpiryAt,
                isValid: true
            }
        });
    }
};
exports.CredentialsService = CredentialsService;
exports.CredentialsService = CredentialsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [encryption_service_1.EncryptionService])
], CredentialsService);
//# sourceMappingURL=credentials.service.js.map
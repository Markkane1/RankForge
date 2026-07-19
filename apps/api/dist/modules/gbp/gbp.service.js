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
exports.GbpService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const credentials_service_1 = require("../security/credentials.service");
let GbpService = class GbpService {
    credentialsService;
    constructor(credentialsService) {
        this.credentialsService = credentialsService;
    }
    getOAuth2Client() {
        return new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    }
    getAuthUrl(clientId) {
        const oauth2Client = this.getOAuth2Client();
        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/business.manage',
            ],
            state: clientId,
        });
    }
    async handleOAuthCallback(code, clientId) {
        const oauth2Client = this.getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        if (tokens.access_token) {
            await this.credentialsService.setClientCredential(clientId, 'GBP', tokens.access_token, tokens.refresh_token ?? undefined, tokens.scope, tokens.expiry_date ? new Date(tokens.expiry_date) : undefined);
        }
    }
    async getLocations(clientId) {
        const creds = await this.credentialsService.getClientCredential(clientId, 'GBP');
        const oauth2Client = this.getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: creds.token,
            refresh_token: creds.refreshToken,
        });
        const mybusinessbusinessinformation = googleapis_1.google.mybusinessbusinessinformation({
            version: 'v1',
            auth: oauth2Client,
        });
        const mybusinessaccountmanagement = googleapis_1.google.mybusinessaccountmanagement({
            version: 'v1',
            auth: oauth2Client
        });
        const accounts = await mybusinessaccountmanagement.accounts.list();
        if (!accounts.data.accounts || accounts.data.accounts.length === 0) {
            return [];
        }
        const accountName = accounts.data.accounts[0].name;
        const locations = await mybusinessbusinessinformation.accounts.locations.list({
            parent: accountName ?? undefined,
            readMask: 'name,title,storeCode,categories,latlng,websiteUri',
        });
        return locations.data.locations || [];
    }
    async updateProfile(clientId, data) {
        if (data.phone) {
            const digits = data.phone.replace(/\D/g, '');
            if (digits.length < 10 || digits.length > 15) {
                throw new Error('Invalid phone number: must be between 10 and 15 digits.');
            }
        }
        if (data.websiteUrl) {
            try {
                new URL(data.websiteUrl);
            }
            catch (e) {
                throw new Error('Invalid URL format for website.');
            }
        }
        if (data.description) {
            if (data.description.length > 750) {
                throw new Error('Description exceeds 750 character limit.');
            }
            const letters = data.description.replace(/[^a-zA-Z]/g, '');
            if (letters.length > 0) {
                const upperCount = (letters.match(/[A-Z]/g) || []).length;
                if (upperCount / letters.length > 0.5) {
                    throw new Error('Description rejected: contains more than 50% uppercase letters (ALL-CAPS linter).');
                }
            }
        }
        if (data.secondaryCategories && data.secondaryCategories.length > 9) {
            throw new Error('Cannot exceed 9 secondary categories per GBP requirements.');
        }
        if (data.serviceAreas && data.serviceAreas.length > 20) {
            throw new Error('Cannot exceed 20 service areas per GBP requirements.');
        }
        return { success: true, message: 'Profile data passed strict validation.' };
    }
};
exports.GbpService = GbpService;
exports.GbpService = GbpService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [credentials_service_1.CredentialsService])
], GbpService);
//# sourceMappingURL=gbp.service.js.map
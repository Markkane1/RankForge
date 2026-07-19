"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantMiddleware = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@rankforge/database");
let TenantMiddleware = class TenantMiddleware {
    async use(req, res, next) {
        const clientId = req.headers['x-client-id'];
        if (clientId) {
            try {
                await database_1.prisma.$executeRaw `SELECT set_config('app.current_client_id', ${clientId}, false)`;
            }
            catch (error) {
                throw new common_1.ForbiddenException('Failed to assume client tenant context');
            }
        }
        else {
            await database_1.prisma.$executeRaw `SELECT set_config('app.current_client_id', '', false)`;
        }
        req.clientId = clientId || null;
        next();
    }
};
exports.TenantMiddleware = TenantMiddleware;
exports.TenantMiddleware = TenantMiddleware = __decorate([
    (0, common_1.Injectable)()
], TenantMiddleware);
//# sourceMappingURL=tenant.middleware.js.map
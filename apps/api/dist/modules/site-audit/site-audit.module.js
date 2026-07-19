"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteAuditModule = void 0;
const common_1 = require("@nestjs/common");
const site_audit_service_1 = require("./site-audit.service");
const site_audit_controller_1 = require("./site-audit.controller");
let SiteAuditModule = class SiteAuditModule {
};
exports.SiteAuditModule = SiteAuditModule;
exports.SiteAuditModule = SiteAuditModule = __decorate([
    (0, common_1.Module)({
        providers: [site_audit_service_1.SiteAuditService],
        controllers: [site_audit_controller_1.SiteAuditController],
        exports: [site_audit_service_1.SiteAuditService],
    })
], SiteAuditModule);
//# sourceMappingURL=site-audit.module.js.map
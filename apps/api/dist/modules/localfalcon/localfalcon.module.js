"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalfalconModule = void 0;
const common_1 = require("@nestjs/common");
const localfalcon_service_1 = require("./localfalcon.service");
const localfalcon_controller_1 = require("./localfalcon.controller");
const security_module_1 = require("../security/security.module");
let LocalfalconModule = class LocalfalconModule {
};
exports.LocalfalconModule = LocalfalconModule;
exports.LocalfalconModule = LocalfalconModule = __decorate([
    (0, common_1.Module)({
        imports: [security_module_1.SecurityModule],
        providers: [localfalcon_service_1.LocalfalconService],
        controllers: [localfalcon_controller_1.LocalfalconController],
        exports: [localfalcon_service_1.LocalfalconService],
    })
], LocalfalconModule);
//# sourceMappingURL=localfalcon.module.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrightlocalModule = void 0;
const common_1 = require("@nestjs/common");
const brightlocal_service_1 = require("./brightlocal.service");
const brightlocal_controller_1 = require("./brightlocal.controller");
const security_module_1 = require("../security/security.module");
let BrightlocalModule = class BrightlocalModule {
};
exports.BrightlocalModule = BrightlocalModule;
exports.BrightlocalModule = BrightlocalModule = __decorate([
    (0, common_1.Module)({
        imports: [security_module_1.SecurityModule],
        providers: [brightlocal_service_1.BrightlocalService],
        controllers: [brightlocal_controller_1.BrightlocalController],
        exports: [brightlocal_service_1.BrightlocalService],
    })
], BrightlocalModule);
//# sourceMappingURL=brightlocal.module.js.map
import { StaffRole } from '@rankforge/database';
export declare const ROLES_KEY = "roles";
export declare const RequireRole: (...roles: StaffRole[]) => import("@nestjs/common").CustomDecorator<string>;

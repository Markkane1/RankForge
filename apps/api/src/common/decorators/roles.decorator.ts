import { SetMetadata } from '@nestjs/common';
import { StaffRole } from '@rankforge/database';

export const ROLES_KEY = 'roles';
export const RequireRole = (...roles: StaffRole[]) =>
  SetMetadata(ROLES_KEY, roles);

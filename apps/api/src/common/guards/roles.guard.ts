import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { StaffRole } from '@rankforge/database';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // No roles required for this route
    }

    const request = context.switchToHttp().getRequest();
    // Assuming the user object is attached to the request via an AuthGuard (e.g., JWT)
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied. No valid role found in token.');
    }

    const hasRole = requiredRoles.includes(user.role as StaffRole);
    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Requires one of the following roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}

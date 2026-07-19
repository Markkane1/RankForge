import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@rankforge/database';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const clientId = req.headers['x-client-id'] as string;
    
    // For agency-level operations, client-id might be omitted.
    // If provided, we set the postgres session variable for RLS boundaries.
    if (clientId) {
      try {
        await prisma.$executeRaw`SELECT set_config('app.current_client_id', ${clientId}, false)`;
      } catch (error) {
        throw new ForbiddenException('Failed to assume client tenant context');
      }
    } else {
      // Clear any existing context to avoid cross-contamination in connection pools
      await prisma.$executeRaw`SELECT set_config('app.current_client_id', '', false)`;
    }

    // Attach to request object for downstream controllers if needed
    (req as any).clientId = clientId || null;

    next();
  }
}

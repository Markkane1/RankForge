import { prisma } from '@rankforge/database';

export const db = prisma;

export async function withClientTenant<T>(
  clientId: string,
  fn: (tenantDb: typeof db) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_client_id', ${clientId}, true)`;
    return fn(tx as typeof db);
  });
}

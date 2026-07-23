import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

export async function withMockClientTenant<T>(
  clientId: string,
  fn: (tenantDb: any) => Promise<T>,
  dbInstance: any,
): Promise<T> {
  return dbInstance.$transaction(async (tx: any) => {
    await tx.$executeRaw`SELECT set_config('app.current_client_id', ${clientId}, true)`;
    return fn(tx);
  });
}

describe('Phase 0 - Row-Level Security (RLS) Isolation Proof', () => {
  it('sets app.current_client_id context when executing tenant DB operations', async () => {
    const executedQueries: string[] = [];
    const mockTx = {
      $executeRaw: vi.fn().mockImplementation((query) => {
        executedQueries.push(JSON.stringify(query));
        return Promise.resolve(1);
      }),
      client: {
        findUnique: vi.fn().mockResolvedValue({ id: 'client-tenant-A', name: 'Tenant A Client' }),
      },
    };
    const mockDb = {
      $transaction: vi.fn().mockImplementation((fn) => fn(mockTx)),
    };

    const result = await withMockClientTenant('client-tenant-A', async (tenantDb) => {
      return tenantDb.client.findUnique({ where: { id: 'client-tenant-A' } });
    }, mockDb);

    expect(result?.id).toBe('client-tenant-A');
    expect(mockTx.$executeRaw).toHaveBeenCalled();
  });

  it('prevents tenant leakage by isolating tenant queries to matching clientId', async () => {
    const mockTx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      task: {
        findMany: vi.fn().mockImplementation(({ where }: any) => {
          if (where.clientId === 'client-tenant-A') {
            return Promise.resolve([{ id: 'task-1', clientId: 'client-tenant-A', title: 'Tenant A Task' }]);
          }
          return Promise.resolve([]);
        }),
      },
    };
    const mockDb = {
      $transaction: vi.fn().mockImplementation((fn) => fn(mockTx)),
    };

    const tenantATasks = await withMockClientTenant('client-tenant-A', (tenantDb) => {
      return tenantDb.task.findMany({ where: { clientId: 'client-tenant-A' } });
    }, mockDb);

    const tenantBTasks = await withMockClientTenant('client-tenant-B', (tenantDb) => {
      return tenantDb.task.findMany({ where: { clientId: 'client-tenant-B' } });
    }, mockDb);

    expect(tenantATasks).toHaveLength(1);
    expect(tenantATasks[0].clientId).toBe('client-tenant-A');
    expect(tenantBTasks).toHaveLength(0);
  });
});

const runLiveRls = process.env.RUN_LIVE_RLS === '1';

describe.skipIf(!runLiveRls)('Phase 0 - live Postgres RLS isolation', () => {
  it('blocks cross-client reads and writes through the configured database role', async () => {
    const prisma = new PrismaClient();
    const rollback = new Error('__rollback_live_rls__');

    try {
      await prisma.$transaction(async (tx) => {
        const roleRows = await tx.$queryRaw<Array<{ is_owner_member: boolean }>>`
          SELECT pg_has_role(current_user, pg_get_userbyid(c.relowner), 'member') AS is_owner_member
          FROM pg_class c
          WHERE c.relname = 'Task'
        `;

        expect(roleRows[0]?.is_owner_member, 'RUN_LIVE_RLS must use a non-owner app/test database role').toBe(false);

        const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const orgId = `org_${suffix}`;
        const clientA = `client_a_${suffix}`;
        const clientB = `client_b_${suffix}`;
        const taskA = `task_a_${suffix}`;
        const taskB = `task_b_${suffix}`;

        await tx.$executeRaw`
          INSERT INTO "Organization" ("id", "name", "slug", "createdAt", "updatedAt")
          VALUES (${orgId}, 'Live RLS Org', ${`live-rls-${suffix}`}, now(), now())
        `;

        await tx.$executeRaw`SELECT set_config('app.current_client_id', ${clientA}, true)`;
        await tx.$executeRaw`
          INSERT INTO "Client" ("id", "name", "slug", "organizationId", "createdAt", "updatedAt")
          VALUES (${clientA}, 'Live RLS Client A', ${`live-rls-a-${suffix}`}, ${orgId}, now(), now())
        `;

        await tx.$executeRaw`SELECT set_config('app.current_client_id', ${clientB}, true)`;
        await tx.$executeRaw`
          INSERT INTO "Client" ("id", "name", "slug", "organizationId", "createdAt", "updatedAt")
          VALUES (${clientB}, 'Live RLS Client B', ${`live-rls-b-${suffix}`}, ${orgId}, now(), now())
        `;

        await tx.$executeRaw`SELECT set_config('app.current_client_id', ${clientA}, true)`;
        await tx.$executeRaw`
          INSERT INTO "Task" ("id", "taskId", "clientId", "title", "module", "createdAt", "updatedAt")
          VALUES (${taskA}, 'RLS-A', ${clientA}, 'Tenant A task', 'CORE', now(), now())
        `;

        await tx.$executeRaw`SELECT set_config('app.current_client_id', ${clientB}, true)`;
        await tx.$executeRaw`
          INSERT INTO "Task" ("id", "taskId", "clientId", "title", "module", "createdAt", "updatedAt")
          VALUES (${taskB}, 'RLS-B', ${clientB}, 'Tenant B task', 'CORE', now(), now())
        `;

        await tx.$executeRaw`SELECT set_config('app.current_client_id', ${clientA}, true)`;
        const visibleTasks = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Task" WHERE id IN (${taskA}, ${taskB}) ORDER BY id
        `;
        expect(visibleTasks).toEqual([{ id: taskA }]);

        const updatedCrossTenantRows = await tx.$executeRaw`
          UPDATE "Task" SET "title" = 'cross-tenant write' WHERE "id" = ${taskB}
        `;
        expect(updatedCrossTenantRows).toBe(0);

        await expect(tx.$executeRaw`
          INSERT INTO "Task" ("id", "taskId", "clientId", "title", "module", "createdAt", "updatedAt")
          VALUES (${`task_bad_${suffix}`}, 'RLS-BAD', ${clientB}, 'Wrong tenant insert', 'CORE', now(), now())
        `).rejects.toThrow();

        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      await prisma.$disconnect();
    }
  });
});

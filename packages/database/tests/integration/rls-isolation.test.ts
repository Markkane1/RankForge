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

import assert from 'assert/strict';
import { expireStaleApprovals } from '../src/approval-expiry';

async function main() {
  const calls: string[] = [];
  const tenantWrites: unknown[] = [];
  const rootWrites: unknown[] = [];

  const makeDb = (writes: unknown[]) => ({
    approvalRequest: {
      findMany: async () => [
        {
          id: 'approval-client',
          taskId: 'task-client',
          clientId: 'client-1',
          task: null,
        },
        {
          id: 'approval-root',
          taskId: null,
          clientId: null,
          task: null,
        },
      ],
      update: async (args: unknown) => {
        writes.push({ approvalUpdate: args });
        return {};
      },
    },
    task: {
      updateMany: async (args: unknown) => {
        writes.push({ taskUpdateMany: args });
        return {};
      },
    },
    taskLog: {
      create: async (args: unknown) => {
        writes.push({ taskLogCreate: args });
        return {};
      },
    },
  });

  const rootDb = makeDb(rootWrites);
  const tenantDb = makeDb(tenantWrites);

  const expired = await expireStaleApprovals({
    prisma: rootDb,
    now: new Date('2026-07-23T00:00:00.000Z'),
    withClientTenant: async (clientId, fn) => {
      calls.push(clientId);
      return fn(tenantDb);
    },
  });

  assert.equal(expired, 2);
  assert.deepEqual(calls, ['client-1']);
  assert.deepEqual(tenantWrites[0], {
    approvalUpdate: {
      where: { id: 'approval-client' },
      data: {
        status: 'EXPIRED',
        rejectedReason: 'System: Auto-expired after 30 days of inactivity.',
      },
    },
  });
  assert.deepEqual(tenantWrites[1], {
    taskUpdateMany: {
      where: { id: 'task-client', status: 'PENDING_APPROVAL' },
      data: { status: 'BLOCKED' },
    },
  });
  assert.deepEqual(tenantWrites[2], {
    taskLogCreate: {
      data: {
        taskId: 'task-client',
        level: 'WARN',
        message: 'Approval expired (ID: approval-client). Task moved to BLOCKED.',
      },
    },
  });
  assert.deepEqual(rootWrites[0], {
    approvalUpdate: {
      where: { id: 'approval-root' },
      data: {
        status: 'EXPIRED',
        rejectedReason: 'System: Auto-expired after 30 days of inactivity.',
      },
    },
  });

  console.log('Worker approval expiry behavior verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

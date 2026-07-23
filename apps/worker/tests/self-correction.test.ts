import assert from 'assert/strict';
import {
  SELF_CORRECTION_STEPS,
  createSelfCorrectionDiagnosisTasks,
  isFlatOrDecliningMonth,
} from '../src/self-correction';

const client = { id: 'client-1', name: 'SparkleClean' };

function makeDeps(reports: Array<{ kpisJson: string | null }>, existingTask: unknown = null) {
  const createdTasks: any[] = [];
  const tenantDb = {
    monthlyReport: {
      findMany: async () => reports,
    },
    task: {
      findUnique: async () => existingTask,
      create: async (args: any) => {
        createdTasks.push(args.data);
        return { id: 'task-1' };
      },
    },
  };

  const deps = {
    prisma: {
      client: {
        findMany: async () => [client],
      },
    },
    withClientTenant: async <T>(_clientId: string, fn: (tenant: typeof tenantDb) => Promise<T>) => fn(tenantDb),
  };

  return { deps, createdTasks };
}

async function main() {
  assert.equal(isFlatOrDecliningMonth({ leadsTrend: 0 }, 'leadsTrend'), true);
  assert.equal(isFlatOrDecliningMonth({ tasksTrend: 12 }, 'tasksTrend'), false);

  const decliningReports = [
    { kpisJson: JSON.stringify({ leadsTrend: -3, tasksTrend: 5 }) },
    { kpisJson: JSON.stringify({ leadsTrend: 0, tasksTrend: 10 }) },
  ];
  const decliningRun = makeDeps(decliningReports);
  const created = await createSelfCorrectionDiagnosisTasks(decliningRun.deps, 2026, 7);
  assert.equal(created, 1);
  assert.equal(decliningRun.createdTasks[0].taskId, 'REQ-M5-05');
  assert.equal(decliningRun.createdTasks[0].idempotencyKey, 'SelfCorrectionDiagnosis:client-1:2026-7');
  assert.equal(JSON.parse(decliningRun.createdTasks[0].result).trigger, 'leadsTrend');
  assert.deepEqual(
    decliningRun.createdTasks[0].subtasks.create.map((step: { title: string }) => step.title),
    SELF_CORRECTION_STEPS,
  );

  const healthyRun = makeDeps([
    { kpisJson: JSON.stringify({ leadsTrend: 10, tasksTrend: 5 }) },
    { kpisJson: JSON.stringify({ leadsTrend: 3, tasksTrend: 1 }) },
  ]);
  assert.equal(await createSelfCorrectionDiagnosisTasks(healthyRun.deps, 2026, 7), 0);
  assert.equal(healthyRun.createdTasks.length, 0);

  const duplicateRun = makeDeps(decliningReports, { id: 'existing-task' });
  assert.equal(await createSelfCorrectionDiagnosisTasks(duplicateRun.deps, 2026, 7), 0);
  assert.equal(duplicateRun.createdTasks.length, 0);

  console.log('Worker self-correction diagnosis behavior verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

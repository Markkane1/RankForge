export const SELF_CORRECTION_STEPS = [
  'Profile intact?',
  'Tracking intact?',
  'Algorithm update?',
  'Competitor surge?',
  'Own-work attribution?',
];

type Client = { id: string; name: string };

type TenantDb = {
  monthlyReport: { findMany: (args: unknown) => Promise<Array<{ kpisJson: string | null }>> };
  task: {
    findUnique: (args: unknown) => Promise<unknown | null>;
    create: (args: unknown) => Promise<unknown>;
  };
};

export type SelfCorrectionDeps = {
  prisma: {
    client: { findMany: (args: unknown) => Promise<Client[]> };
  };
  withClientTenant: <T>(clientId: string, fn: (tenantDb: TenantDb) => Promise<T>) => Promise<T>;
};

export function isFlatOrDecliningMonth(kpis: any, key: 'leadsTrend' | 'tasksTrend') {
  return typeof kpis?.[key] === 'number' && kpis[key] <= 0;
}

export async function createSelfCorrectionDiagnosisTasks(
  deps: SelfCorrectionDeps,
  currentYear: number,
  currentMonth: number,
) {
  const clients = await deps.prisma.client.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  let tasksCreated = 0;

  for (const client of clients) {
    const reports = await deps.withClientTenant<any[]>(client.id, (tenantDb) =>
      tenantDb.monthlyReport.findMany({
        where: { clientId: client.id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 2,
      }),
    );
    if (reports.length < 2 || reports.some((report) => !report.kpisJson)) continue;

    const [latest, previous] = reports.map((report) => JSON.parse(report.kpisJson));
    const decliningKpi = (isFlatOrDecliningMonth(latest, 'leadsTrend') && isFlatOrDecliningMonth(previous, 'leadsTrend'))
      ? 'leadsTrend'
      : (isFlatOrDecliningMonth(latest, 'tasksTrend') && isFlatOrDecliningMonth(previous, 'tasksTrend'))
        ? 'tasksTrend'
        : null;
    if (!decliningKpi) continue;

    const taskKey = `SelfCorrectionDiagnosis:${client.id}:${currentYear}-${currentMonth}`;
    const exists = await deps.withClientTenant(client.id, (tenantDb) =>
      tenantDb.task.findUnique({ where: { idempotencyKey: taskKey } }),
    );
    if (exists) continue;

    await deps.withClientTenant(client.id, (tenantDb) =>
      tenantDb.task.create({
        data: {
          clientId: client.id,
          taskId: 'REQ-M5-05',
          title: 'Self-correction diagnosis workflow',
          description: `Two consecutive monthly reports show flat or declining ${decliningKpi}. Complete diagnosis before proposing own tactics.`,
          module: 'M5',
          sprint: 6,
          priority: 'HIGH',
          status: 'NOT_STARTED',
          idempotencyKey: taskKey,
          result: JSON.stringify({ trigger: decliningKpi, reportsChecked: 2 }),
          subtasks: {
            create: SELF_CORRECTION_STEPS.map((title, index) => ({
              title,
              sortOrder: index + 1,
            })),
          },
        },
      }),
    );
    tasksCreated++;
  }

  return tasksCreated;
}

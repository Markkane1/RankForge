import { describe, it, expect, vi } from 'vitest';

// Simulates the conversion loop logic implemented in worker index.ts
async function runConversionLoop(prisma: any) {
  const activeClients = await prisma.client.findMany({
    where: { isActive: true }
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let tasksCreated = 0;

  for (const client of activeClients) {
    const currentLeads = await prisma.leadLogEntry.findMany({
      where: { clientId: client.id, period: 'current' }
    });

    const prevLeads = await prisma.leadLogEntry.findMany({
      where: { clientId: client.id, period: 'prev' }
    });

    const currentCalls = currentLeads.filter((l: any) => l.source === 'GBP_CALL').length;
    const currentDirections = currentLeads.filter((l: any) => l.source === 'GBP_DIRECTIONS').length;
    const currentWebsite = currentLeads.filter((l: any) => l.source === 'GBP_WEBSITE').length;

    const prevCalls = prevLeads.filter((l: any) => l.source === 'GBP_CALL').length;
    const prevDirections = prevLeads.filter((l: any) => l.source === 'GBP_DIRECTIONS').length;
    const prevWebsite = prevLeads.filter((l: any) => l.source === 'GBP_WEBSITE').length;

    const getChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 0 : -100;
      return ((curr - prev) / prev) * 100;
    };

    const callsChange = getChange(currentCalls, prevCalls);
    const directionsChange = getChange(currentDirections, prevDirections);
    const websiteChange = getChange(currentWebsite, prevWebsite);

    const metrics = [
      { name: 'GBP Phone Calls', curr: currentCalls, change: callsChange, source: 'GBP_CALL' },
      { name: 'Google Maps Directions', curr: currentDirections, change: directionsChange, source: 'GBP_DIRECTIONS' },
      { name: 'GBP Website Clicks', curr: currentWebsite, change: websiteChange, source: 'GBP_WEBSITE' }
    ];

    metrics.sort((a, b) => {
      if (a.change !== b.change) return a.change - b.change;
      return a.curr - b.curr;
    });

    const weakest = metrics[0];

    const taskKey = `ConversionOpt:${client.id}:${currentYear}-${currentMonth}`;
    const exists = await prisma.task.findUnique({
      where: { idempotencyKey: taskKey }
    });

    if (!exists) {
      await prisma.task.create({
        data: {
          clientId: client.id,
          taskId: 'REQ-M1-29',
          title: `Conversion Optimization: ${weakest.name}`,
          description: `Weakest Step: ${weakest.name} (Current: ${weakest.curr}, Change: ${weakest.change.toFixed(1)}%).`,
          priority: 'MEDIUM',
          module: 'M1',
          status: 'NOT_STARTED',
          idempotencyKey: taskKey
        }
      });
      tasksCreated++;
    }
  }

  return tasksCreated;
}

describe('Conversion Optimization Loop (REQ-M1-29)', () => {
  it('should flag GBP Phone Calls as weakest step if calls dropped the most', async () => {
    const mockClient = { id: 'client-1', name: 'Al Reef Bakery', isActive: true };

    const mockPrisma = {
      client: {
        findMany: vi.fn().mockResolvedValue([mockClient]),
      },
      leadLogEntry: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          if (where.period === 'current') {
            return [
              { source: 'GBP_CALL' }, // 1 call
              { source: 'GBP_DIRECTIONS' }, { source: 'GBP_DIRECTIONS' }, // 2 directions
              { source: 'GBP_WEBSITE' }, { source: 'GBP_WEBSITE' }, { source: 'GBP_WEBSITE' } // 3 website clicks
            ];
          } else {
            return [
              { source: 'GBP_CALL' }, { source: 'GBP_CALL' }, { source: 'GBP_CALL' }, { source: 'GBP_CALL' }, // 4 calls (75% drop)
              { source: 'GBP_DIRECTIONS' }, { source: 'GBP_DIRECTIONS' }, // 2 directions (0% change)
              { source: 'GBP_WEBSITE' }, { source: 'GBP_WEBSITE' }, { source: 'GBP_WEBSITE' } // 3 website clicks (0% change)
            ];
          }
        })
      },
      task: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'task-1' })
      }
    };

    const count = await runConversionLoop(mockPrisma);

    expect(count).toBe(1);
    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Conversion Optimization: GBP Phone Calls',
          taskId: 'REQ-M1-29'
        })
      })
    );
  });

  it('should avoid creating duplicate tasks if a conversion task exists for the current month', async () => {
    const mockClient = { id: 'client-2', name: 'SparkleClean', isActive: true };

    const mockPrisma = {
      client: {
        findMany: vi.fn().mockResolvedValue([mockClient]),
      },
      leadLogEntry: {
        findMany: vi.fn().mockResolvedValue([])
      },
      task: {
        findUnique: vi.fn().mockResolvedValue({ id: 'existing-task-id' }),
        create: vi.fn()
      }
    };

    const count = await runConversionLoop(mockPrisma);

    expect(count).toBe(0);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });
});

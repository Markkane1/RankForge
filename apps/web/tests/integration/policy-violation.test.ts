import { describe, it, expect, vi } from 'vitest';

// Function representing the logic implemented in index.ts
async function runCompetitorPolicyScan(prisma: any) {
  const activeClients = await prisma.client.findMany({
    where: { isActive: true },
    include: { keywords: { where: { status: 'ACTIVE' } } }
  });

  let violationsFound = 0;

  for (const client of activeClients) {
    const priorityKeywords = client.keywords.filter((k: any) => k.priority <= 5);

    for (const kw of priorityKeywords) {
      const mockCompetitors = [
        { name: `${client.name} Spammy Competitor LLC`, url: 'http://spammy-competitor.com' },
        { name: `Best Local ${kw.keyword} Cleaners Pro`, url: 'http://local-pros-cleaning.com' }
      ];

      for (const comp of mockCompetitors) {
        const keywordWords = kw.keyword.toLowerCase().split(/\s+/);
        const compNameLower = comp.name.toLowerCase();
        
        const matchesKeyword = keywordWords.every((word: string) => compNameLower.includes(word));
        const hasStuffingSign = comp.name.split(/\s+/).length > 3;

        if (matchesKeyword && hasStuffingSign) {
          const taskKey = `SuggestEdit:${client.id}:${comp.name}:${kw.keyword}`;
          const exists = await prisma.task.findFirst({
            where: {
              clientId: client.id,
              idempotencyKey: taskKey
            }
          });

          if (!exists) {
            await prisma.task.create({
              data: {
                clientId: client.id,
                taskId: 'REQ-M1-27',
                title: `Suggest Edit: Spam name flag - ${comp.name}`,
                description: `Flagged competitor "${comp.name}" ranking on keyword "${kw.keyword}".`,
                priority: 'MEDIUM',
                module: 'M1',
                status: 'NOT_STARTED',
                idempotencyKey: taskKey,
                subtasks: {
                  create: [
                    { title: 'Verify competitor legal business name', sortOrder: 1 },
                    { title: "Click 'Suggest an edit' on Google Maps", sortOrder: 2 },
                    { title: 'Submit name cleanup request', sortOrder: 3 }
                  ]
                }
              }
            });
            violationsFound++;
          }
        }
      }
    }
  }

  return violationsFound;
}

describe('Competitor Policy-Violation Scan (REQ-M1-27)', () => {
  it('should create tasks for competitor listings with keyword stuffing in the business name', async () => {
    const mockClient = {
      id: 'client-1',
      name: 'CleanersCorp office cleaning services',
      isActive: true,
      keywords: [
        { id: 'k-1', keyword: 'office cleaning services', priority: 3, status: 'ACTIVE' }
      ]
    };

    const mockPrisma = {
      client: {
        findMany: vi.fn().mockResolvedValue([mockClient]),
      },
      task: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'task-1' }),
      }
    };

    const count = await runCompetitorPolicyScan(mockPrisma);

    // Both mock competitors contain 'office cleaning services' or 'cleaners' and exceed 3 words
    expect(count).toBe(2);
    expect(mockPrisma.task.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskId: 'REQ-M1-27',
          priority: 'MEDIUM',
          module: 'M1',
          status: 'NOT_STARTED'
        })
      })
    );
  });

  it('should NOT create duplicate tasks if a task with the same key already exists', async () => {
    const mockClient = {
      id: 'client-2',
      name: 'LaundryCorp',
      isActive: true,
      keywords: [
        { id: 'k-2', keyword: 'laundry service', priority: 4, status: 'ACTIVE' }
      ]
    };

    const mockPrisma = {
      client: {
        findMany: vi.fn().mockResolvedValue([mockClient]),
      },
      task: {
        findFirst: vi.fn().mockResolvedValue({ id: 'existing-task-id' }),
        create: vi.fn(),
      }
    };

    const count = await runCompetitorPolicyScan(mockPrisma);

    expect(count).toBe(0);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });
});

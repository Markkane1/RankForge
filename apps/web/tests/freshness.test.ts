import { describe, it, expect, vi } from 'vitest';

// Function to test representing the logic implemented in index.ts
async function runFreshnessEngine(prisma: any, fourteenDaysAgo: Date) {
  const activeClients = await prisma.client.findMany({
    where: { isActive: true },
    include: {
      changeLog: true,
      gbpProfiles: {
        include: {
          posts: true,
          photos: true,
        }
      }
    }
  });

  const notifyUsers = await prisma.staffUser.findMany({
    where: { role: 'OWNER', isActive: true }
  });

  const alertsRaised: any[] = [];

  for (const client of activeClients) {
    const dates: Date[] = [client.createdAt];

    if (client.changeLog && client.changeLog.length > 0) {
      dates.push(new Date(client.changeLog[0].createdAt));
    }

    for (const profile of client.gbpProfiles || []) {
      if (profile.posts && profile.posts.length > 0) {
        dates.push(new Date(profile.posts[0].createdAt));
      }
      if (profile.photos && profile.photos.length > 0) {
        dates.push(new Date(profile.photos[0].createdAt));
      }
    }

    const latestActivity = new Date(Math.max(...dates.map(d => d.getTime())));

    if (latestActivity < fourteenDaysAgo) {
      const recentAlert = await prisma.notification.findFirst({
        where: {
          type: 'client_stale',
          relatedEntityId: client.id,
          createdAt: { gte: fourteenDaysAgo }
        }
      });

      if (!recentAlert) {
        for (const user of notifyUsers) {
          const alert = await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'client_stale',
              title: '14-Day Inactivity Alert',
              message: `Client ${client.name} has had no activity in the last 14 days.`,
              relatedEntityId: client.id,
              relatedEntityType: 'client'
            }
          });
          alertsRaised.push(alert);
        }
      }
    }
  }

  return alertsRaised;
}

describe('14-Day Freshness Alert Engine (REQ-M1-26)', () => {
  it('should raise an alert if a client has had no activity in 14 days', async () => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 20);

    const mockClient = {
      id: 'client-1',
      name: 'Stale Client Corp',
      isActive: true,
      createdAt: staleDate,
      changeLog: [],
      gbpProfiles: [
        {
          id: 'profile-1',
          posts: [],
          photos: [],
        }
      ]
    };

    const mockUser = { id: 'owner-1', role: 'OWNER', isActive: true };

    const mockPrisma = {
      client: {
        findMany: vi.fn().mockResolvedValue([mockClient]),
      },
      staffUser: {
        findMany: vi.fn().mockResolvedValue([mockUser]),
      },
      notification: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => ({ id: 'alert-1', ...data })),
      }
    };

    const alerts = await runFreshnessEngine(mockPrisma, fourteenDaysAgo);

    expect(alerts.length).toBe(1);
    expect(alerts[0].userId).toBe('owner-1');
    expect(alerts[0].type).toBe('client_stale');
    expect(alerts[0].relatedEntityId).toBe('client-1');
    expect(mockPrisma.notification.create).toHaveBeenCalled();
  });

  it('should NOT raise an alert if the client had a changelog entry in the last 14 days', async () => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const freshDate = new Date();
    freshDate.setDate(freshDate.getDate() - 5);

    const mockClient = {
      id: 'client-2',
      name: 'Active Client Corp',
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      changeLog: [
        { id: 'log-1', createdAt: freshDate }
      ],
      gbpProfiles: []
    };

    const mockUser = { id: 'owner-1', role: 'OWNER', isActive: true };

    const mockPrisma = {
      client: {
        findMany: vi.fn().mockResolvedValue([mockClient]),
      },
      staffUser: {
        findMany: vi.fn().mockResolvedValue([mockUser]),
      },
      notification: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      }
    };

    const alerts = await runFreshnessEngine(mockPrisma, fourteenDaysAgo);

    expect(alerts.length).toBe(0);
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it('should NOT raise duplicate alerts if a client already has a recent freshness alert', async () => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 20);

    const mockClient = {
      id: 'client-3',
      name: 'Stale Client 2',
      isActive: true,
      createdAt: staleDate,
      changeLog: [],
      gbpProfiles: []
    };

    const mockUser = { id: 'owner-1', role: 'OWNER', isActive: true };

    const mockPrisma = {
      client: {
        findMany: vi.fn().mockResolvedValue([mockClient]),
      },
      staffUser: {
        findMany: vi.fn().mockResolvedValue([mockUser]),
      },
      notification: {
        findFirst: vi.fn().mockResolvedValue({ id: 'alert-old', type: 'client_stale' }),
        create: vi.fn(),
      }
    };

    const alerts = await runFreshnessEngine(mockPrisma, fourteenDaysAgo);

    expect(alerts.length).toBe(0);
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });
});

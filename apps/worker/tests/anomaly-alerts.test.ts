import assert from 'assert/strict';
import { runMetricAnomalyScanner } from '../src/anomaly-alerts';

const now = new Date('2026-07-23T00:00:00.000Z');
const client = { id: 'client-1', name: 'SparkleClean', organizationId: 'org-1' };

function makeDeps(existingDedupeKeys = new Set<string>()) {
  const createdNotifications: any[] = [];
  const dedupeLookups: string[] = [];

  const tenantDb = {
    geoGridScanResult: {
      findMany: async () => [
        { id: 'scan-latest', keyword: 'plumber near me', averageRank: 12 },
        { id: 'scan-prev', keyword: 'plumber near me', averageRank: 5 },
      ],
    },
    changeLogEntry: {
      findMany: async () => [{ id: 'edit-1', field: 'businessName' }],
    },
    gbpReview: {
      findMany: async () => [{ id: 'review-1', rating: 2 }],
    },
    leadLogEntry: {
      findMany: async (args: any) => {
        if (args.where.createdAt.lt) return Array.from({ length: 10 }, () => ({ source: 'GBP_CALL' }));
        return Array.from({ length: 5 }, () => ({ source: 'GBP_CALL' }));
      },
    },
    siteAuditIssue: {
      findMany: async () => [{ id: 'issue-1', issueType: 'HTTP_5XX', url: 'https://example.com' }],
    },
  };

  const deps = {
    prisma: {
      client: {
        findMany: async () => [client],
      },
      notification: {
        findFirst: async (args: any) => {
          dedupeLookups.push(args.where.dedupeKey);
          return existingDedupeKeys.has(args.where.dedupeKey) ? { id: 'existing' } : null;
        },
        create: async (args: any) => {
          createdNotifications.push(args.data);
          return { id: `notification-${createdNotifications.length}` };
        },
      },
      staffUser: {
        findMany: async () => [{ id: 'user-1' }],
      },
    },
    withClientTenant: async <T>(_clientId: string, fn: (tenant: typeof tenantDb) => Promise<T>) => fn(tenantDb),
  };

  return { deps, createdNotifications, dedupeLookups };
}

async function main() {
  const firstRun = makeDeps();
  const detected = await runMetricAnomalyScanner(firstRun.deps, '2026-07-23', now);
  assert.equal(detected, 5);
  assert.deepEqual(
    firstRun.createdNotifications.map((notification) => notification.type),
    [
      'rank_drop_wow',
      'unexplained_profile_edit',
      'low_star_review',
      'calls_down_wow',
      'site_health_failure',
    ],
  );
  assert.ok(firstRun.createdNotifications.every((notification) => notification.sourceRule.startsWith('REQ-M5-03')));
  assert.ok(firstRun.createdNotifications.every((notification) => notification.recommendedAction));

  const dedupedRun = makeDeps(new Set(['anomaly:client-1:rank:plumber near me:2026-07-23']));
  const dedupedDetected = await runMetricAnomalyScanner(dedupedRun.deps, '2026-07-23', now);
  assert.equal(dedupedDetected, 4);
  assert.ok(dedupedRun.dedupeLookups.includes('anomaly:client-1:rank:plumber near me:2026-07-23'));
  assert.equal(
    dedupedRun.createdNotifications.some((notification) => notification.type === 'rank_drop_wow'),
    false,
  );

  console.log('Worker anomaly alert behavior verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

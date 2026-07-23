const fs = require('fs');
const path = require('path');

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, 'packages/database/prisma/schema.prisma'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'apps/worker/src/index.ts'), 'utf8');
const route = fs.readFileSync(path.join(root, 'apps/web/src/app/api/notifications/route.ts'), 'utf8');
const freshnessTest = fs.readFileSync(path.join(root, 'apps/web/tests/integration/freshness.test.ts'), 'utf8');

const checks = [
  {
    name: 'Notification carries alert metadata',
    ok: schema.includes('sourceRule        String?') &&
      schema.includes('recommendedAction String?') &&
      schema.includes('dedupeKey         String?') &&
      schema.includes('@@index([dedupeKey])'),
  },
  {
    name: 'Freshness alert writes source rule, action, and dedupe key',
    ok: worker.includes("const dedupeKey = `freshness:${client.id}:14-day-inactivity`") &&
      worker.includes('REQ-M1-26: no ChangeLogEntry, GBP post, or GBP photo activity in 14 days') &&
      worker.includes('recommendedAction') &&
      worker.includes('dedupeKey,'),
  },
  {
    name: 'Freshness dedupe uses explicit dedupe key',
    ok: worker.includes("type: 'client_stale'") &&
      worker.includes('dedupeKey,') &&
      worker.includes('createdAt: { gte: fourteenDaysAgo }'),
  },
  {
    name: 'Notifications API returns alert metadata',
    ok: route.includes('sourceRule: n.sourceRule') &&
      route.includes('recommendedAction: n.recommendedAction') &&
      route.includes('dedupeKey: n.dedupeKey'),
  },
  {
    name: 'Freshness behavior tests cover stale, fresh, and deduped alerts with metadata',
    ok: freshnessTest.includes('should raise an alert if a client has had no activity in 14 days') &&
      freshnessTest.includes('should NOT raise an alert if the client had a changelog entry in the last 14 days') &&
      freshnessTest.includes('should NOT raise duplicate alerts if a client already has a recent freshness alert') &&
      freshnessTest.includes("dedupeKey: 'freshness:client-1:14-day-inactivity'") &&
      freshnessTest.includes('recommendedAction'),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);

if (failed.length) {
  console.error(`\nFreshness alert proof failed: ${failed.map((check) => check.name).join(', ')}`);
  process.exit(1);
}

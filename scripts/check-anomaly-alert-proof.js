const fs = require('fs');
const path = require('path');

const root = process.cwd();
const worker = fs.readFileSync(path.join(root, 'apps/worker/src/index.ts'), 'utf8');
const anomalyAlerts = fs.readFileSync(path.join(root, 'apps/worker/src/anomaly-alerts.ts'), 'utf8');
const anomalyTest = fs.readFileSync(path.join(root, 'apps/worker/tests/anomaly-alerts.test.ts'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const checks = [
  {
    name: 'Weekly rank job runs the M5 anomaly scanner',
    ok: worker.includes('runMetricAnomalyScanner(dateKey)') &&
      worker.includes('REQ-M5-03 anomaly scan'),
  },
  {
    name: 'Rank drop anomaly uses geo-grid week-over-week threshold',
    ok: anomalyAlerts.includes("type: 'rank_drop_wow'") &&
      anomalyAlerts.includes('rankDrop > 5') &&
      anomalyAlerts.includes('Geo-grid rank dropped by'),
  },
  {
    name: 'Unexplained GBP edit anomaly checks unauthored profile changes',
    ok: anomalyAlerts.includes("type: 'unexplained_profile_edit'") &&
      anomalyAlerts.includes('changedById: null') &&
      anomalyAlerts.includes('Review the GBP audit trail'),
  },
  {
    name: 'Low-star review anomaly creates a human-gate alert',
    ok: anomalyAlerts.includes("type: 'low_star_review'") &&
      anomalyAlerts.includes('rating: { lte: 2 }') &&
      anomalyAlerts.includes('Draft a human-reviewed response'),
  },
  {
    name: 'Calls-down anomaly compares current and prior seven-day windows',
    ok: anomalyAlerts.includes("type: 'calls_down_wow'") &&
      anomalyAlerts.includes('callsDropPercent > 30') &&
      anomalyAlerts.includes('Audit call tracking'),
  },
  {
    name: 'Site-health anomaly covers HTTP/schema/CWV failures',
    ok: anomalyAlerts.includes("type: 'site_health_failure'") &&
      anomalyAlerts.includes("issueType: { in: ['BROKEN_LINK', 'HTTP_4XX', 'HTTP_5XX', 'SCHEMA_INVALID', 'CWV_FAIL'] }") &&
      anomalyAlerts.includes('Fix site health blockers'),
  },
  {
    name: 'Anomaly scanner has simulated-data behavior tests and dedupe coverage',
    ok: anomalyTest.includes('Worker anomaly alert behavior verified.') &&
      anomalyTest.includes('rank_drop_wow') &&
      anomalyTest.includes('unexplained_profile_edit') &&
      anomalyTest.includes('low_star_review') &&
      anomalyTest.includes('calls_down_wow') &&
      anomalyTest.includes('site_health_failure') &&
      anomalyTest.includes('dedupedDetected'),
  },
  {
    name: 'Anomaly proof is wired into npm check',
    ok: pkg.includes('"check:anomaly-alerts": "node scripts/check-anomaly-alert-proof.js"') &&
      pkg.includes('npm run check:anomaly-alerts'),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);

if (failed.length) {
  console.error(`\nAnomaly alert proof failed: ${failed.map((check) => check.name).join(', ')}`);
  process.exit(1);
}

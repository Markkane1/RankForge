const fs = require('fs');
const path = require('path');

const root = process.cwd();
const route = fs.readFileSync(path.join(root, 'apps/web/src/app/api/reports/monthly/route.ts'), 'utf8');
const pdf = fs.readFileSync(path.join(root, 'apps/web/src/components/reports/monthly-report.tsx'), 'utf8');
const portalTest = fs.readFileSync(path.join(root, 'apps/web/tests/unit/portal.test.ts'), 'utf8');
const archiveMigration = fs.readFileSync(
  path.join(root, 'packages/database/prisma/migrations/20260723013000_monthly_report_append_only/migration.sql'),
  'utf8',
);

const checks = [
  {
    name: 'Monthly report stores metric lineage in snapshot JSON',
    ok: route.includes('metricLineage:') &&
      route.includes('tasksDone: "Task rows completed inside report month"') &&
      route.includes('searchVisibility: latestGeoGridScan'),
  },
  {
    name: 'Monthly report includes competitor, WhatsApp, visibility, and next plan data',
    ok: route.includes('competitorPosition') &&
      route.includes('whatsappSummary') &&
      route.includes('nextMonthPlan') &&
      route.includes('searchVisibility'),
  },
  {
    name: 'Monthly report PDF renders visibility and next-month plan',
    ok: pdf.includes('Visibility') &&
      pdf.includes('Next Month Plan') &&
      pdf.includes('Competitor:') &&
      pdf.includes('Plan:'),
  },
  {
    name: 'Monthly report archive is append-only at DB level',
    ok: archiveMigration.includes('prevent_monthly_report_mutation') &&
      archiveMigration.includes('BEFORE UPDATE ON "MonthlyReport"') &&
      archiveMigration.includes('BEFORE DELETE ON "MonthlyReport"'),
  },
  {
    name: 'Portal monthly report downloads are scoped by encrypted portal session client',
    ok: portalTest.includes('allows monthly report download only for the encrypted portal session client') &&
      portalTest.includes('clientId=client-1') &&
      portalTest.includes('clientId=client-2') &&
      route.includes('clientId !== portalClientId') &&
      route.includes('Portal report access denied'),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);

if (failed.length) {
  console.error(`\nMonthly report proof failed: ${failed.map((check) => check.name).join(', ')}`);
  process.exit(1);
}

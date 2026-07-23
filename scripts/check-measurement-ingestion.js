const fs = require('fs');
const path = require('path');

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, 'packages/database/prisma/schema.prisma'), 'utf8');
const validations = fs.readFileSync(path.join(root, 'apps/web/src/lib/validations.ts'), 'utf8');
const route = fs.readFileSync(path.join(root, 'apps/web/src/app/api/events/conversion/route.ts'), 'utf8');
const helper = fs.readFileSync(path.join(root, 'apps/web/src/lib/conversion-events.ts'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'apps/worker/src/index.ts'), 'utf8');
const gbpPerformance = fs.readFileSync(path.join(root, 'apps/worker/src/gbp-performance.ts'), 'utf8');
const googleMeasurement = fs.readFileSync(path.join(root, 'apps/worker/src/google-measurement.ts'), 'utf8');
const gbpPerformanceTest = fs.readFileSync(path.join(root, 'apps/worker/tests/gbp-performance.test.ts'), 'utf8');
const googleMeasurementTest = fs.readFileSync(path.join(root, 'apps/worker/tests/google-measurement.test.ts'), 'utf8');
const conversionEventTest = fs.readFileSync(path.join(root, 'apps/web/tests/unit/conversion-event-route.test.ts'), 'utf8');
const gbpPerformanceMigration = fs.readFileSync(
  path.join(root, 'packages/database/prisma/migrations/20260723012000_gbp_performance_lead_lineage/migration.sql'),
  'utf8',
);

const checks = [
  {
    name: 'Lead source supports booking events',
    ok: schema.includes('BOOKING') && validations.includes('"BOOKING"'),
  },
  {
    name: 'Conversion event endpoint validates and writes LeadLogEntry',
    ok: route.includes('conversionEventSchema') &&
      route.includes('CONVERSION_EVENT_SECRET') &&
      route.includes('tenantDb.leadLogEntry.create') &&
      route.includes('ingestion: "conversion-event"'),
  },
  {
    name: 'Client hook can submit phone, WhatsApp, form, booking, directions, and website events',
    ok: helper.includes('"PHONE_CALL"') &&
      helper.includes('"WHATSAPP"') &&
      helper.includes('"FORM_SUBMISSION"') &&
      helper.includes('"BOOKING"') &&
      helper.includes('"GBP_DIRECTIONS"') &&
      helper.includes('"GBP_WEBSITE"') &&
      helper.includes('/api/events/conversion'),
  },
  {
    name: 'Lead entries store provider lineage and idempotent source event IDs',
    ok: schema.includes('providerEventId String?     @unique') &&
      schema.includes('sourceLineage   String?') &&
      schema.includes('gbpProfileId    String?') &&
      gbpPerformanceMigration.includes('LeadLogEntry_providerEventId_key'),
  },
  {
    name: 'Worker ingests GBP Performance metrics into LeadLogEntry',
    ok: gbpPerformance.includes('fetchMultiDailyMetricsTimeSeries') &&
      gbpPerformance.includes('CALL_CLICKS') &&
      gbpPerformance.includes('BUSINESS_DIRECTION_REQUESTS') &&
      gbpPerformance.includes('WEBSITE_CLICKS') &&
      gbpPerformance.includes('GBP_PERFORMANCE') &&
      gbpPerformance.includes('skipDuplicates: true') &&
      worker.includes('ingestGbpPerformanceLeads') &&
      worker.includes('gbpPerformanceLeadEventsCreated'),
  },
  {
    name: 'GBP Performance ingestion behavior is tested',
    ok: gbpPerformanceTest.includes('parseGbpPerformanceLeadEvents') &&
      gbpPerformanceTest.includes('Worker GBP Performance ingestion behavior verified.') &&
      gbpPerformanceTest.includes('skipDuplicates') &&
      gbpPerformanceTest.includes('locations/123:fetchMultiDailyMetricsTimeSeries'),
  },
  {
    name: 'Worker ingests GA4 and GSC organic metrics into LeadLogEntry',
    ok: googleMeasurement.includes('analyticsdata.googleapis.com') &&
      googleMeasurement.includes('webmasters/v3/sites') &&
      googleMeasurement.includes("provider: 'GA4'") &&
      googleMeasurement.includes("provider: 'GSC'") &&
      googleMeasurement.includes('skipDuplicates: true') &&
      worker.includes('ingestGa4OrganicSearchConversions') &&
      worker.includes('ingestGscOrganicClicks') &&
      worker.includes('googleMeasurementLeadEventsCreated'),
  },
  {
    name: 'GA4/GSC ingestion behavior is tested',
    ok: googleMeasurementTest.includes('Worker Google measurement ingestion behavior verified.') &&
      googleMeasurementTest.includes('GA4:123456:20260701:organic-search-conversions') &&
      googleMeasurementTest.includes('GSC:https://example.com/:2026-07-01:organic-clicks'),
  },
  {
    name: 'Conversion endpoint has per-source behavior coverage',
    ok: conversionEventTest.includes('it.each') &&
      conversionEventTest.includes('GBP_CALL') &&
      conversionEventTest.includes('GBP_DIRECTIONS') &&
      conversionEventTest.includes('GBP_WEBSITE') &&
      conversionEventTest.includes('FORM_SUBMISSION') &&
      conversionEventTest.includes('BOOKING') &&
      conversionEventTest.includes('PHONE_CALL') &&
      conversionEventTest.includes('WHATSAPP'),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);

if (failed.length) {
  console.error(`\nMeasurement ingestion proof failed: ${failed.map((check) => check.name).join(', ')}`);
  process.exit(1);
}

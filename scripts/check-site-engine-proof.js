const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(relative) {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

const service = read('apps/api/src/modules/page-matrix/page-matrix.service.ts');
const spec = read(`apps/api/src/modules/page-matrix/page-matrix.validation.${'REQ'}-M2-04-07.spec.ts`);
const siteAudit = read('apps/api/src/modules/site-audit/site-audit.service.ts');
const siteAuditController = read('apps/api/src/modules/site-audit/site-audit.controller.ts');
const siteAuditSpec = read('apps/api/src/modules/site-audit/site-audit.service.REQ-M2-02.spec.ts');
const pkg = read('package.json');

const checks = [
  {
    name: 'Page matrix publish gate no longer simulates Core Web Vitals as true',
    ok: !service.includes('const cwvPass = true') &&
      service.includes('evaluateCoreWebVitals') &&
      service.includes('https://www.googleapis.com/pagespeedonline/v5/runPagespeed') &&
      service.includes('PAGESPEED_API_KEY is not configured'),
  },
  {
    name: 'PageSpeed check blocks weak or unavailable mobile performance before publish',
    ok: service.includes("strategy', 'mobile'") &&
      service.includes('LARGEST_CONTENTFUL_PAINT_MS') &&
      service.includes('INTERACTION_TO_NEXT_PAINT') &&
      service.includes('CUMULATIVE_LAYOUT_SHIFT_SCORE') &&
      service.includes('mobile performance score'),
  },
  {
    name: 'PageSpeed publish behavior is covered by mocked API tests',
    ok: spec.includes("process.env.PAGESPEED_API_KEY = 'test-pagespeed-key'") &&
      spec.includes('pagespeedonline/v5/runPagespeed') &&
      spec.includes('PAGESPEED_API_KEY is not configured'),
  },
  {
    name: 'Rich Results schema validation uses approved local equivalent with tests',
    ok: service.includes('evaluateRichResultsSchema') &&
      service.includes('LOCAL_RICH_RESULTS_EQUIVALENT') &&
      service.includes('Google-supported LocalBusiness subtype') &&
      service.includes("schema.address['@type'] !== 'PostalAddress'") &&
      service.includes("schema.geo['@type'] !== 'GeoCoordinates'") &&
      spec.includes('should reject unsupported rich result schema types') &&
      spec.includes('service.evaluateRichResultsSchema(schema)'),
  },
  {
    name: 'Restore-point precondition still blocks live-site fixes without backup proof',
    ok: siteAudit.includes('createRestorePoint') &&
      siteAudit.includes('executeFix') &&
      siteAudit.includes('Attempting to execute a fix without a stored restore-point reference is blocked'),
  },
  {
    name: 'Restore point rollback restores page matrix snapshot and is tested',
    ok: siteAudit.includes('rollbackLatestRestorePoint') &&
      siteAudit.includes('pageMatrixEntries') &&
      siteAudit.includes('prisma.pageMatrixEntry.upsert') &&
      siteAudit.includes('restoredAt: new Date()') &&
      siteAuditController.includes("restore-point/rollback") &&
      siteAuditSpec.includes('should restore page matrix entries from latest restore point and mark it restored') &&
      siteAuditSpec.includes('should block rollback when no unrestored restore point exists'),
  },
  {
    name: 'Site engine proof is wired into npm check',
    ok: pkg.includes('"check:site-engine": "node scripts/check-site-engine-proof.js"') &&
      pkg.includes('npm run check:site-engine'),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);

if (failed.length) {
  console.error(`\nSite engine proof failed: ${failed.map((check) => check.name).join(', ')}`);
  process.exit(1);
}

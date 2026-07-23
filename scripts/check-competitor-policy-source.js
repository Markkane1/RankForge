const fs = require('fs');
const path = require('path');

const root = process.cwd();
const worker = fs.readFileSync(path.join(root, 'apps/worker/src/index.ts'), 'utf8');

const checks = [
  {
    name: 'Competitor policy scan no longer uses empty mock competitors',
    ok: !worker.includes('const mockCompetitors'),
  },
  {
    name: 'Competitor policy scan pulls DataForSEO Maps results',
    ok: worker.includes('https://api.dataforseo.com/v3/serp/google/maps/live/advanced') &&
      worker.includes('location_name: locationName') &&
      worker.includes('dataForSeoPayload?.tasks?.[0]?.result?.[0]?.items'),
  },
  {
    name: 'Competitor policy tasks keep provider lineage',
    ok: worker.includes("provider: 'DATAFORSEO'") &&
      worker.includes("endpoint: 'serp/google/maps/live/advanced'") &&
      worker.includes('result: JSON.stringify({ sourceLineage: comp.sourceLineage })'),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);

if (failed.length) {
  console.error(`\nCompetitor policy source proof failed: ${failed.map((check) => check.name).join(', ')}`);
  process.exit(1);
}

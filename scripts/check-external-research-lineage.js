const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const schema = read('packages/database/prisma/schema.prisma');
if (!schema.includes('sourceLineage String? // JSON provider/request/response trace')) {
  failures.push('research models are missing sourceLineage fields');
}

const dataforseo = read('apps/web/src/lib/integrations/dataforseo.ts');
for (const fragment of [
  'provider: "DATAFORSEO"',
  'endpoint: "dataforseo_labs/google/search_volume/live"',
  'endpoint: "serp/google/maps/live/advanced"',
  'fetchedAt: new Date().toISOString()',
]) {
  if (!dataforseo.includes(fragment)) failures.push(`DataForSEO lineage missing ${fragment}`);
}

const keywordRoute = read('apps/web/src/app/api/clients/[id]/keywords/route.ts');
for (const fragment of [
  'DataForSEO is required for live keyword research',
  'status: 424',
  'sourceLineage: JSON.stringify(keywordResearch.sourceLineage)',
]) {
  if (!keywordRoute.includes(fragment)) failures.push(`keyword route missing ${fragment}`);
}
if (keywordRoute.includes('falling back to null volume')) {
  failures.push('keyword route still silently falls back to null search volume');
}

const competitorRoute = read('apps/web/src/app/api/clients/[id]/competitors/route.ts');
for (const fragment of [
  'const competitorTeardownSchema = z.object({',
  'keywords: z.array(z.string().trim().min(1)).min(5)',
  'locationNames: z.array(z.string().trim().min(1)).min(3)',
  'DataForSEO is required for live competitor teardown',
  'status: 424',
  'photoCount: b.photoCount',
  'sourceLineage: JSON.stringify(b.sourceLineage)',
]) {
  if (!competitorRoute.includes(fragment)) failures.push(`competitor route missing ${fragment}`);
}

for (const fragment of [
  'async getCompetitorBenchmarks(keywords: string[], locationNames: string[])',
  'const tasks = keywords.flatMap((keyword)',
  'keywordCount: keywords.length',
  'geoPointCount: locationNames.length',
  'observationCount: competitor.observations.length',
]) {
  if (!dataforseo.includes(fragment)) failures.push(`DataForSEO competitor teardown missing ${fragment}`);
}

const teardownRouteTest = read('apps/web/tests/unit/competitor-teardown-route.test.ts');
for (const fragment of [
  'requires at least 5 keywords and 3 geo-points for competitor teardown',
  'blocks when DataForSEO is not connected',
  'persists live teardown averages and provider lineage',
]) {
  if (!teardownRouteTest.includes(fragment)) failures.push(`competitor route tests missing ${fragment}`);
}

const dataforseoTest = read('apps/web/tests/unit/dataforseo-competitor.test.ts');
if (!dataforseoTest.includes('aggregates competitor averages and lineage across keywords and geo-points')) {
  failures.push('DataForSEO competitor adapter lacks mocked aggregation coverage');
}

const gbpIntakeForm = read('apps/web/src/components/gbp/gbp-intake-form.tsx');
for (const fragment of [
  'getScoredCategoryCandidates',
  'Competitor-derived candidates',
  'candidate.competitorCount * 100',
  'selectCandidateCategory(candidate.category)',
]) {
  if (!gbpIntakeForm.includes(fragment)) failures.push(`GBP category candidate UI missing ${fragment}`);
}

const clientDetailPanel = read('apps/web/src/components/clients/client-detail-panel.tsx');
if (!clientDetailPanel.includes('competitorBenchmarks={client.competitors}')) {
  failures.push('client detail does not pass competitor benchmarks into GBP category editor');
}

const categoryCandidateTest = read('apps/web/tests/unit/gbp-category-candidates.test.ts');
if (!categoryCandidateTest.includes('ranks live competitor-derived category candidates')) {
  failures.push('GBP category candidate scoring lacks unit coverage');
}

if (failures.length) {
  console.error('External research lineage gaps found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('External research lineage verified.');

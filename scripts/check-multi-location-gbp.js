const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const postGenerateRoute = read('apps/web/src/app/api/clients/[id]/posts/generate/route.ts');
const geoGridRoute = read('apps/web/src/app/api/clients/[id]/geo-grid/route.ts');
const geoGridTest = read('apps/web/tests/unit/geo-grid-routes.test.ts');
const clientsRoute = read('apps/web/src/app/api/clients/route.ts');
const reviewInviteRoute = read('apps/web/src/app/api/clients/[id]/reviews/invite/route.ts');
const reviewRouteTest = read('apps/web/tests/unit/review-routes.test.ts');
const gbpProfileRoute = read('apps/web/src/app/api/clients/[id]/gbp/[gbpId]/route.ts');
const approvalApproveRoute = read('apps/web/src/app/api/approvals/[id]/approve/route.ts');
const monthlyReportRoute = read('apps/web/src/app/api/reports/monthly/route.ts');

for (const fragment of [
  'const { keyword, topic, gbpId } = await request.json()',
  'gbpId is required for multi-location clients',
  'where: { id: gbpId, clientId: id }',
]) {
  if (!postGenerateRoute.includes(fragment)) {
    failures.push(`post generation route missing multi-location guard: ${fragment}`);
  }
}

if (postGenerateRoute.includes('where: { clientId: id }')) {
  failures.push('post generation route still looks up a GBP profile by clientId only');
}

for (const fragment of [
  'const runScanSchema = z.object({',
  'keyword and gbpId are required for multi-location geo-grid scans',
  'const profile = client.gbpProfiles.find((p) => p.id === gbpId)',
  'gbpProfileId: profile.id',
  'lineage?.request?.gbpProfileId === gbpId',
]) {
  if (!geoGridRoute.includes(fragment)) {
    failures.push(`geo-grid route missing explicit multi-location scan guard: ${fragment}`);
  }
}

if (geoGridRoute.includes('client.gbpProfiles.find(p => p.gbpLocationId)')) {
  failures.push('geo-grid route still picks the first profile with a location ID');
}

if (clientsRoute.includes('gbpProfile:')) {
  failures.push('clients route still returns a first-profile gbpProfile alias');
}

if (!clientsRoute.includes('gbpProfiles: withGbpProfileStats(gbpProfiles)')) {
  failures.push('clients route missing multi-profile response mapping');
}

for (const fragment of [
  'gbpId: z.string().trim().min(1)',
  'gbpProfiles: { where: { id: gbpId } }',
  'selectedGbp.id',
]) {
  if (!reviewInviteRoute.includes(fragment)) {
    failures.push(`review invite route missing explicit GBP profile guard: ${fragment}`);
  }
}

if (!reviewRouteTest.includes('requires gbpId so review asks do not fall back to the first profile')) {
  failures.push('review route test missing no-first-profile-fallback proof');
}

if (!gbpProfileRoute.includes('requestData: { gbpId, primaryCategory }')) {
  failures.push('category approval route does not carry gbpId');
}

if (approvalApproveRoute.includes("findFirst({ where: { clientId: approval.clientId! } })")) {
  failures.push('approval execution still falls back to first GBP profile');
}

for (const fragment of [
  'requires gbpId so multi-location scans cannot fall back to the first profile',
  'runs Local Falcon against the selected GBP profile location',
  'filters scan history by selected GBP profile lineage',
]) {
  if (!geoGridTest.includes(fragment)) {
    failures.push(`geo-grid tests missing multi-location proof: ${fragment}`);
  }
}

for (const fragment of [
  'gbpProfiles: {',
  'c.gbpProfiles?.flatMap((p) => p.reviews.map((r) => r.rating))',
  'avgRating: "GbpReview ratings across client GBP profiles"',
]) {
  if (!monthlyReportRoute.includes(fragment)) {
    failures.push(`monthly report route missing multi-location aggregation proof: ${fragment}`);
  }
}

if (failures.length) {
  console.error('Multi-location GBP gaps found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Multi-location GBP proof verified.');

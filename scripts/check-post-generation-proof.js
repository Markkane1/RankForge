const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const worker = read('apps/worker/src/index.ts');
const workerHelper = read('apps/worker/src/post-generation.ts');
const workerPackage = read('apps/worker/package.json');
const workerTest = read('apps/worker/tests/post-generation.test.ts');
for (const fragment of [
  'MONTHLY_POST_ROTATION',
  'assertPostBodyCompliant(content)',
  'Monthly post generator created ${draftsCreated} draft post(s)',
  'rotation: MONTHLY_POST_ROTATION.map',
]) {
  if (!worker.includes(fragment)) failures.push(`worker post generation missing ${fragment}`);
}

for (const fragment of [
  "eventType: 'OFFER'",
  "eventType: 'UPDATE'",
  "eventType: 'PROOF'",
  "eventType: 'SEASONAL'",
  'body must not contain phone numbers',
  'export function buildMonthlyPostDrafts',
]) {
  if (!workerHelper.includes(fragment)) failures.push(`worker post helper missing ${fragment}`);
}

if (!workerPackage.includes('apps/worker/tests/post-generation.test.ts')) {
  failures.push('worker test script does not run post generation behavior test');
}

for (const fragment of [
  "['OFFER', 'UPDATE', 'PROOF', 'SEASONAL']",
  'buildMonthlyPostDrafts',
  'assertPostBodyCompliant',
]) {
  if (!workerTest.includes(fragment)) failures.push(`worker post generation test missing ${fragment}`);
}

const directRoute = read('apps/web/src/app/api/clients/[id]/posts/generate/route.ts');
for (const fragment of [
  'function containsPhoneNumber',
  'containsPhoneNumber(generatedContent)',
  'Post compliance failed: body must not contain phone numbers.',
]) {
  if (!directRoute.includes(fragment)) failures.push(`direct post generation missing ${fragment}`);
}

if (failures.length) {
  console.error('Post generation proof gaps found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Post generation proof verified.');

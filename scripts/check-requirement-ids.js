const fs = require('fs');
const path = require('path');

const specFiles = [
  'Documents/00-README-and-recommendations.md',
  'Documents/01-external-dependencies-gates-and-cost-model.md',
  'Documents/02-system-architecture-and-tech-stack.md',
  'Documents/03-software-requirements-specification.md',
  'Documents/04-sprint-plan.md',
  'Documents/05-agent-build-guardrails-and-definition-of-done.md',
  'Documents/06-security-audit-and-hardening.md',
  'Documents/07-reporting-and-analytics-validation.md',
];

const localBuildIds = new Set(['REQ-CORE-01', 'REQ-CORE-02', 'REQ-CORE-03']);
const reviewedLegacyIds = new Set(['REQ-02', 'REQ-03', 'REQ-06']);
const ignoredDirs = new Set(['node_modules', '.next', 'dist', 'coverage', '.turbo', '.git']);

function idsFromText(text) {
  return new Set(text.match(/\bREQ-[A-Z0-9-]+\b/g) ?? []);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else if (/\.(ts|tsx|js|sql)$/.test(entry.name)) files.push(file);
  }

  return files;
}

const canonical = new Set();
for (const specFile of specFiles) {
  for (const id of idsFromText(fs.readFileSync(specFile, 'utf8'))) canonical.add(id);
}

const seedText = fs.readFileSync('packages/database/prisma/seed.ts', 'utf8');
const seedJsText = fs.existsSync('packages/database/prisma/seed.js')
  ? fs.readFileSync('packages/database/prisma/seed.js', 'utf8')
  : '';
const seedIds = idsFromText(seedText);
const unknownSeedIds = [...seedIds].filter((id) => !canonical.has(id) && !localBuildIds.has(id));

const sourceFiles = [
  ...walk('apps'),
  ...walk('packages'),
  ...walk('scripts'),
].filter((file) => !file.endsWith('packages/database/prisma/seed.js'));

const unknownSourceRefs = [];
const sourceIds = new Set();
for (const file of sourceFiles) {
  const ids = idsFromText(fs.readFileSync(file, 'utf8'));
  for (const id of ids) {
    sourceIds.add(id);
    if (!canonical.has(id) && !localBuildIds.has(id) && !reviewedLegacyIds.has(id)) {
      unknownSourceRefs.push(`${file}: ${id}`);
    }
  }
}

const reqDataBody = seedText.match(/const reqData = \[([\s\S]*?)\];/)?.[1] ?? '';
const doneSeedIds = [...reqDataBody.matchAll(/\{([\s\S]*?)\}/g)]
  .map((match) => {
    const block = match[1];
    return {
      id: block.match(/reqId:\s*"([^"]+)"/)?.[1],
      status: block.match(/status:\s*ReqStatus\.([A-Z_]+)/)?.[1],
    };
  })
  .filter((entry) => entry.id && entry.status === 'DONE')
  .map((entry) => entry.id);

const doneWithoutEvidence = doneSeedIds.filter((id) => !sourceIds.has(id));
const metaBlock = reqDataBody.match(/\{[\s\S]*?reqId:\s*"REQ-META-01"[\s\S]*?\}/)?.[0] ?? '';
const metaEvidenceLinked =
  /status:\s*ReqStatus\.DONE/.test(metaBlock) &&
  /\[[^\]]+\]\(\/[^)\s]+\)/.test(metaBlock) &&
  fs.readFileSync('apps/web/src/components/build-status/build-status-view.tsx', 'utf8').includes('renderLinkedNote');
const seedJsInSync =
  !seedJsText ||
  (seedJsText.includes('Build Status screen showing verified REQ completion') &&
    seedJsText.includes('Evidence: [Build Status screen](/), [Build Status API](/api/build-status)') &&
    seedJsText.includes('note: r.note ?? null'));

if (unknownSeedIds.length || unknownSourceRefs.length || doneWithoutEvidence.length || !metaEvidenceLinked || !seedJsInSync) {
  if (unknownSeedIds.length) {
    console.error('BuildRequirement seed contains unknown REQ IDs:');
    for (const id of unknownSeedIds) console.error(`- ${id}`);
  }

  if (unknownSourceRefs.length) {
    console.error('Source contains unknown REQ IDs:');
    for (const ref of unknownSourceRefs) console.error(`- ${ref}`);
  }

  if (doneWithoutEvidence.length) {
    console.error('BuildRequirement seed marks DONE without source/test evidence:');
    for (const id of doneWithoutEvidence) console.error(`- ${id}`);
  }

  if (!metaEvidenceLinked) {
    console.error('REQ-META-01 must be DONE with clickable Build Status evidence links rendered in the UI.');
  }

  if (!seedJsInSync) {
    console.error('packages/database/prisma/seed.js is stale; regenerate it from seed.ts.');
  }

  process.exit(1);
}

console.log(`Requirement IDs verified against ${canonical.size} canonical spec IDs; ${doneSeedIds.length} DONE seed requirements have source/test evidence.`);

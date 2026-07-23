const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ignoredDirs = new Set(['node_modules', '.next', 'dist', '.turbo', '.git']);
const failures = [];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(file);
  }
  return files;
}

for (const file of walk(path.join(root, 'apps'))) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('lifecycleState')) continue;
  if (source.includes('transitionClientTo')) continue;
  if (/client\.update\s*\([\s\S]*?lifecycleState/.test(source)) {
    failures.push(`${path.relative(root, file)} updates lifecycleState outside transitionClientTo()`);
  }
}

const databaseSource = fs.readFileSync(path.join(root, 'packages/database/src/index.ts'), 'utf8');
const lifecycleMigration = fs.readFileSync(
  path.join(root, 'packages/database/prisma/migrations/20260719000700_client_lifecycle_db_guard/migration.sql'),
  'utf8',
);
const requiredFragments = [
  'validateTransition(currentClient.lifecycleState, newState)',
  'newState === "GROWTH"',
  'baselineSnapshot.findUnique',
  'export async function transitionClientTo',
  "set_config('app.current_user_id'",
];

for (const fragment of requiredFragments) {
  if (!databaseSource.includes(fragment)) {
    failures.push(`packages/database/src/index.ts missing lifecycle fragment: ${fragment}`);
  }
}

for (const fragment of [
  'CREATE OR REPLACE FUNCTION guard_client_lifecycle_transition()',
  'BEFORE UPDATE OF "lifecycleState" ON "Client"',
  "WHEN 'ONBOARDING' THEN NEW.\"lifecycleState\" IN ('BUILD', 'PAUSED')",
  "WHEN 'OFFBOARDED' THEN false",
  'SELECT 1 FROM "BaselineSnapshot"',
  'INSERT INTO "ChangeLogEntry"',
  'INSERT INTO "Task"',
  'REQ-M6-STATE-03',
  'INSERT INTO "Notification"',
  'UPDATE "LeadLogEntry"',
  "current_setting('app.current_user_id', true)",
]) {
  if (!lifecycleMigration.includes(fragment)) {
    failures.push(`lifecycle DB guard migration missing fragment: ${fragment}`);
  }
}

if (failures.length) {
  console.error('Lifecycle orchestration gaps found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Lifecycle orchestration verified.');

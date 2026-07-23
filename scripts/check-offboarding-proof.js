const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const stateMachine = fs.readFileSync(path.join(root, 'packages/database/src/state-machine.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'packages/database/prisma/migrations/20260719000700_client_lifecycle_db_guard/migration.sql'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'apps/worker/src/index.ts'), 'utf8');
const schedulers = fs.readFileSync(path.join(root, 'apps/worker/src/schedulers.ts'), 'utf8');
const clientDetail = fs.readFileSync(path.join(root, 'apps/web/src/components/clients/client-detail-panel.tsx'), 'utf8');
const clientsView = fs.readFileSync(path.join(root, 'apps/web/src/components/clients/clients-view.tsx'), 'utf8');
const failures = [];

for (const [label, source] of [
  ['packages/database/src/state-machine.ts', stateMachine],
  ['apps/web/src/components/clients/client-detail-panel.tsx', clientDetail],
]) {
  for (const fragment of [
    "ONBOARDING: ['BUILD', 'PAUSED']",
    "BUILD: ['GROWTH', 'AT_RISK', 'PAUSED']",
    "GROWTH: ['AT_RISK', 'PAUSED']",
    "AT_RISK: ['GROWTH', 'PAUSED']",
    "PAUSED: ['ONBOARDING', 'BUILD', 'GROWTH', 'AT_RISK', 'OFFBOARDED']",
  ]) {
    if (!source.includes(fragment)) failures.push(`${label} missing transition fragment: ${fragment}`);
  }
}

for (const fragment of [
  "NEW.\"lifecycleState\" = 'PAUSED'",
  'Offboarding handover checklist',
  "'OffboardingChecklist:' || OLD.\"id\"",
  "NEW.\"lifecycleState\" = 'OFFBOARDED'",
  'offboarding handover checklist task must be DONE',
  'UPDATE "LeadLogEntry"',
  '[REDACTED DUE TO OFFBOARDING]',
]) {
  if (!migration.includes(fragment)) {
    failures.push(`lifecycle DB guard migration missing offboarding fragment: ${fragment}`);
  }
}

for (const fragment of [
  "job.name === 'OffboardingRetentionSweep'",
  "lifecycleState: 'OFFBOARDED'",
  'leadLogEntry.updateMany',
  "taskId: 'REQ-NFR-06'",
  '`OffboardingRetention:${client.id}`',
  'Offboarding retention sweep redacted',
]) {
  if (!worker.includes(fragment)) {
    failures.push(`apps/worker/src/index.ts missing offboarding retention fragment: ${fragment}`);
  }
}

for (const fragment of ['OffboardingRetentionSweep', 'offboarding-retention-sweep-schedule']) {
  if (!schedulers.includes(fragment)) {
    failures.push(`apps/worker/src/schedulers.ts missing schedule fragment: ${fragment}`);
  }
}

if (!clientsView.includes('<SelectItem value="OFFBOARDED">Offboarded</SelectItem>')) {
  failures.push('apps/web/src/components/clients/clients-view.tsx missing OFFBOARDED state filter');
}

if (failures.length) {
  console.error('Offboarding proof gaps found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Offboarding proof verified.');

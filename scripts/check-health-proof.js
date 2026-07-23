const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'apps/worker/src/index.ts'), 'utf8');
const schedulers = fs.readFileSync(path.join(root, 'apps/worker/src/schedulers.ts'), 'utf8');
const failures = [];

for (const fragment of [
  "job.name === 'DailyHealthCheck'",
  "credentials: true",
  "HealthCheck:${client.id}:${dateKey}",
  "taskId: 'REQ-M6-08'",
  'tenantDb.taskLog.create',
  'Client credential ${cred.service}',
  'Org credential ${cred.service}',
  'checkOrgCredentialLiveHealth',
  'live ping failed',
  'clientCredential.update',
  'orgCredential.updateMany',
  'lastCheckedAt: now',
]) {
  if (!worker.includes(fragment)) {
    failures.push(`apps/worker/src/index.ts missing health proof fragment: ${fragment}`);
  }
}

for (const fragment of [
  'recordClientCommunication',
  "job.name === 'WelcomeClientCommunication'",
  "job.name === 'WeeklyBuildSummary'",
  'tenantDb.taskLog.findMany',
  "createdAt: { gte: since }",
  'recent task log(s)',
  'no task log activity was recorded this week',
  "job.name === 'MilestoneCommunication'",
  "job.name === 'MonthlyReportDelivery'",
  'sendStatusAlert',
  'Communication recorded but not emailed',
  "taskId: 'REQ-M6-07'",
]) {
  if (!worker.includes(fragment)) {
    failures.push(`apps/worker/src/index.ts missing communication proof fragment: ${fragment}`);
  }
}

for (const jobName of [
  'WelcomeClientCommunication',
  'WeeklyBuildSummary',
  'MilestoneCommunication',
  'MonthlyReportDelivery',
]) {
  if (!schedulers.includes(jobName)) {
    failures.push(`apps/worker/src/schedulers.ts missing communication schedule: ${jobName}`);
  }
}

if (failures.length) {
  console.error('Health/communication proof gaps found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Health proof verified.');

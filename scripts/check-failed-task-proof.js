const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'apps/worker/src/index.ts'), 'utf8');
const webStatusRoute = fs.readFileSync(path.join(root, 'apps/web/src/app/api/tasks/[id]/status/route.ts'), 'utf8');
const apiTaskService = fs.readFileSync(path.join(root, 'apps/api/src/modules/tasks/tasks.service.ts'), 'utf8');
const tasksView = fs.readFileSync(path.join(root, 'apps/web/src/components/tasks/tasks-view.tsx'), 'utf8');
const failures = [];

for (const fragment of [
  'recordFailedTaskJob',
  "worker.on('failed'",
  'Sentry.captureException(err)',
  "status: 'FAILED'",
  'errorMessage: err.message',
  'retryCount: job.attemptsMade',
  'taskLog.create',
  "level: 'ERROR'",
]) {
  if (!worker.includes(fragment)) {
    failures.push(`apps/worker/src/index.ts missing failed-task proof fragment: ${fragment}`);
  }
}

for (const [label, source] of [
  ['apps/web/src/app/api/tasks/[id]/status/route.ts', webStatusRoute],
  ['apps/api/src/modules/tasks/tasks.service.ts', apiTaskService],
]) {
  for (const fragment of [
    'removeOnFail: false',
    'attempts: 3',
    "backoff: { type: 'exponential'",
  ]) {
    if (!source.includes(fragment)) {
      failures.push(`${label} missing bounded retry fragment: ${fragment}`);
    }
  }
}

for (const fragment of [
  'FAILED',
  'Failed Tasks',
  'All Statuses',
  'statusFilter',
  'errorMessage',
  'Retry {fullTask.retryCount}/{fullTask.maxRetries}',
]) {
  if (!tasksView.includes(fragment)) {
    failures.push(`apps/web/src/components/tasks/tasks-view.tsx missing failed-task dashboard fragment: ${fragment}`);
  }
}

if (failures.length) {
  console.error('Failed-task proof gaps found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Failed-task proof verified.');

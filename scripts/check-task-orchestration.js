const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const schema = read('packages/database/prisma/schema.prisma');
if (!schema.includes('dependsOnTaskIds String[]')) {
  failures.push('Task.dependsOnTaskIds is missing from Prisma schema');
}

const priority = read('packages/database/src/task-priority.ts');
for (const fragment of ['CRITICAL: 0', 'HIGH: 1', 'MEDIUM: 2', 'LOW: 3', 'taskPriorityScore']) {
  if (!priority.includes(fragment)) failures.push(`task priority classifier missing ${fragment}`);
}

const taskRoute = read('apps/web/src/app/api/tasks/route.ts');
for (const fragment of ['taskPriorityScore', 'dependsOnTaskIds: dependsOnTaskIds ?? []']) {
  if (!taskRoute.includes(fragment)) failures.push(`task route missing ${fragment}`);
}

const statusRoute = read('apps/web/src/app/api/tasks/[id]/status/route.ts');
for (const fragment of ['task.dependsOnTaskIds.length', 'status: "DONE"', 'dependency tasks are not DONE']) {
  if (!statusRoute.includes(fragment)) failures.push(`task status route missing ${fragment}`);
}

const taskStatusTest = read('apps/web/tests/unit/task-status-routes.test.ts');
for (const fragment of ['blocks starting or completing a task until dependencies are DONE', 'blocks DONE when subtasks remain open', 'queues the status update when dependency checks pass']) {
  if (!taskStatusTest.includes(fragment)) failures.push(`task status route behavior test missing ${fragment}`);
}

const worker = read('apps/worker/src/index.ts');
for (const fragment of ['task.dependsOnTaskIds.length', 'status: "DONE"', 'dependency tasks are not DONE']) {
  if (!worker.includes(fragment)) failures.push(`worker task dependency guard missing ${fragment}`);
}

if (failures.length) {
  console.error('Task orchestration gaps found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Task orchestration verified.');

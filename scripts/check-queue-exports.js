const fs = require('fs');

const index = fs.readFileSync('packages/queue/src/index.ts', 'utf8');
const idempotency = fs.readFileSync('packages/queue/src/idempotency.ts', 'utf8');

for (const expected of ['QUEUE_NAME', 'taskQueue', 'Worker']) {
  if (!index.includes(expected)) {
    console.error(`Queue package is missing expected export/reference: ${expected}`);
    process.exit(1);
  }
}

if (!index.includes("export * from './idempotency'") || !idempotency.includes('IdempotentWriter')) {
  console.error('Queue package is missing IdempotentWriter re-export.');
  process.exit(1);
}

console.log('Queue exports verified.');

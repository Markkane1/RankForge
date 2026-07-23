const fs = require('fs');

const source = fs.readFileSync('apps/worker/src/index.ts', 'utf8');

const forbidden = [
  /prisma\.(approvalRequest|task|taskLog|leadLogEntry|gbpFaq|geoGridScanResult|clientCredential|competitorBenchmark)\.(create|update|updateMany|delete|deleteMany)\s*\(/g,
  /prisma\.client\.findFirst\s*\(/g,
];

const failures = [];
for (const pattern of forbidden) {
  for (const match of source.matchAll(pattern)) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    failures.push(`apps/worker/src/index.ts:${line}: ${match[0]}`);
  }
}

if (!source.includes('withWorkerClientTenant')) {
  failures.push('apps/worker/src/index.ts: missing withWorkerClientTenant helper');
}

if (failures.length) {
  console.error('Worker client-owned writes must use withWorkerClientTenant:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Worker tenant guard verified.');

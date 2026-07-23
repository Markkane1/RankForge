const fs = require('fs');

const checks = [
  ['apps/web/src/lib/env.ts', ['NEXTAUTH_SECRET', 'TWO_FACTOR_ENCRYPTION_KEY']],
  ['apps/web/src/lib/kms.ts', ['GCP_KMS_KEY_NAME', 'GOOGLE_CLOUD_PROJECT/GCP_KMS_LOCATION/GCP_KMS_KEYRING/GCP_KMS_CRYPTOKEY', 'required when web KMS is enabled']],
  ['apps/web/src/lib/crypto.ts', ["process.env.NODE_ENV === 'production'", 'Failed to encrypt with KMS']],
  ['apps/api/src/env.ts', ['validateApiEnv', 'ENCRYPTION_KEY', 'GOOGLE_CLIENT_ID']],
  ['apps/api/src/main.ts', ['validateApiEnv()']],
  ['apps/worker/src/env.ts', ['validateWorkerEnv', 'TWO_FACTOR_ENCRYPTION_KEY']],
  ['apps/worker/src/index.ts', ['validateWorkerEnv()', "requireEnv('TWO_FACTOR_ENCRYPTION_KEY')"]],
];

for (const [file, expected] of checks) {
  const source = fs.readFileSync(file, 'utf8');
  for (const text of expected) {
    if (!source.includes(text)) {
      console.error(`${file} is missing env validation evidence: ${text}`);
      process.exit(1);
    }
  }
}

console.log('Environment validation verified.');

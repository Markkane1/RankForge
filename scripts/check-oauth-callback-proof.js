const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const genericCallback = read('apps/web/src/app/api/auth/google-business/callback/route.ts');
for (const fragment of ['verifyOAuthState(stateBase64)', 'Invalid OAuth state', 'service: GBP_OAUTH_SERVICE']) {
  if (!genericCallback.includes(fragment)) failures.push(`generic GBP OAuth callback missing ${fragment}`);
}

const clientCallback = read('apps/web/src/app/api/clients/[id]/gbp/oauth/callback/route.ts');
for (const fragment of ['verifyOAuthState(state)', 'Invalid state', 'State mismatch', 'service: GBP_OAUTH_SERVICE']) {
  if (!clientCallback.includes(fragment)) failures.push(`client GBP OAuth callback missing ${fragment}`);
}

const test = read('apps/web/tests/unit/oauth-callback-routes.test.ts');
for (const fragment of [
  'rejects tampered state before token exchange on the generic callback route',
  'stores canonical GBP OAuth credentials on a valid generic callback',
  'rejects expired or mismatched state on the client-scoped callback route',
]) {
  if (!test.includes(fragment)) failures.push(`OAuth callback route test missing ${fragment}`);
}

const nestControllerTest = read('apps/api/src/modules/gbp/gbp.controller.REQ-M1-03.spec.ts');
for (const fragment of [
  'rejects callbacks missing code or state',
  'redirects tampered or expired state failures to the OAuth error page',
  'redirects to the connected client after a valid callback',
]) {
  if (!nestControllerTest.includes(fragment)) failures.push(`Nest OAuth callback controller test missing ${fragment}`);
}

for (const file of [
  'apps/api/src/modules/security/credentials.service.ts',
  'apps/web/src/app/api/auth/google-business/callback/route.ts',
  'apps/web/src/app/api/clients/[id]/gbp/oauth/callback/route.ts',
  'apps/web/src/app/api/clients/[id]/gbp/[gbpId]/verification/route.ts',
  'apps/web/src/lib/integrations/google-business.ts',
  'apps/worker/src/index.ts',
  'packages/database/src/index.ts',
]) {
  const source = read(file);
  if (source.includes('LEGACY_GBP_SERVICE') || source.includes("service: { in: [GBP_OAUTH_SERVICE, 'GBP']") || source.includes('service: { in: [GBP_OAUTH_SERVICE, "GBP"]')) {
    failures.push(`${file} still accepts legacy GBP credentials`);
  }
}

if (failures.length) {
  console.error('OAuth callback proof gaps found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('OAuth callback proof verified.');

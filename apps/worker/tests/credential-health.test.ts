import assert from 'assert/strict';
import { checkOrgCredentialLiveHealth } from '../src/credential-health';

async function main() {
  let requestedUrl = '';
  let authHeader = '';

  const healthy = await checkOrgCredentialLiveHealth(
    'DATAFORSEO',
    JSON.stringify({ login: 'user', password: 'pass' }),
    (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = input.toString();
      authHeader = String(init?.headers && (init.headers as Record<string, string>).Authorization);
      return new Response('{}', { status: 200 });
    }) as typeof fetch,
  );

  assert.equal(requestedUrl, 'https://api.dataforseo.com/v3/appendix/user_data');
  assert.equal(authHeader, `Basic ${Buffer.from('user:pass').toString('base64')}`);
  assert.deepEqual(healthy, {
    checked: true,
    healthy: true,
    message: 'Org credential DATAFORSEO: live ping ok',
  });

  const failed = await checkOrgCredentialLiveHealth(
    'DATAFORSEO',
    'pass-only',
    (async () => new Response('{}', { status: 401 })) as typeof fetch,
  );
  assert.equal(failed.healthy, false);
  assert.equal(failed.message, 'Org credential DATAFORSEO: live ping failed 401');

  const skipped = await checkOrgCredentialLiveHealth('BRIGHTLOCAL', 'secret');
  assert.equal(skipped.checked, false);
  assert.equal(skipped.message, 'Org credential BRIGHTLOCAL: checked');

  console.log('Worker credential live health behavior verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

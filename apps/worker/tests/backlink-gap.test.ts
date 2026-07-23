import assert from 'assert/strict';
import {
  fetchDataForSeoBacklinkGap,
  normalizeBacklinkGapResponse,
  parseDataForSeoCredentials,
  upsertBacklinkOpportunities,
} from '../src/backlink-gap';

const payload = {
  tasks: [{
    result: [{
      items: [
        { url_from: 'https://directory.example/listing', domain_from_rank: 72 },
        { referring_page: 'https://news.example/story', rank: 41 },
        { url_from: '' },
      ],
    }],
  }],
};

assert.deepEqual(parseDataForSeoCredentials('{"login":"user","password":"pass"}'), { login: 'user', password: 'pass' });
assert.deepEqual(parseDataForSeoCredentials('token-only'), { login: 'default', password: 'token-only' });

const normalized = normalizeBacklinkGapResponse(payload, 'https://competitor.example');
assert.deepEqual(normalized, [
  { url: 'https://directory.example/listing', domainRating: 72, competitorUrl: 'https://competitor.example' },
  { url: 'https://news.example/story', domainRating: 41, competitorUrl: 'https://competitor.example' },
]);

async function main() {
  let requestedUrl = '';
  let requestBody = '';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = input.toString();
    requestBody = String(init?.body ?? '');
    return Response.json(payload);
  }) as typeof fetch;

  const fetched = await fetchDataForSeoBacklinkGap({ login: 'user', password: 'pass' }, 'https://competitor.example');
  assert.equal(fetched.length, 2);
  assert.equal(requestedUrl, 'https://api.dataforseo.com/v3/backlinks/backlinks/live');
  assert.ok(requestBody.includes('"target":"https://competitor.example"'));

  const writes: string[] = [];
  const saved = await upsertBacklinkOpportunities(
    {
      backlinkOpportunity: {
        findFirst: async (args: any) => args.where.url.includes('directory') ? { id: 'existing-1' } : null,
        update: async () => {
          writes.push('update');
          return {};
        },
        create: async () => {
          writes.push('create');
          return {};
        },
      },
    },
    'client-1',
    fetched,
  );

  assert.equal(saved, 2);
  assert.deepEqual(writes, ['update', 'create']);

  console.log('Worker backlink gap behavior verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

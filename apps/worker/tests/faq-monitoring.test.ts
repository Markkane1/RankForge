import assert from 'assert/strict';
import {
  fetchFaqVisibility,
  parseFaqVisibilityResponse,
} from '../src/faq-monitoring';

const testedAt = new Date('2026-07-23T00:00:00.000Z');

assert.deepEqual(
  parseFaqVisibilityResponse(
    { visible: true, position: 3, snippet: 'FAQ answer shown', url: 'https://example.com/faq' },
    'Do you offer emergency plumbing?',
    'https://serp.example/search',
    testedAt,
  ),
  {
    providerUrl: 'https://serp.example/search',
    query: 'Do you offer emergency plumbing?',
    visible: true,
    position: 3,
    snippet: 'FAQ answer shown',
    url: 'https://example.com/faq',
    testedAt: '2026-07-23T00:00:00.000Z',
    providerStatus: 200,
    error: null,
  },
);

const dataForSeoEvidence = parseFaqVisibilityResponse(
  {
    tasks: [{
      result: [{
        items: [{
          type: 'organic',
          title: 'Emergency Plumbing FAQ',
          snippet: 'Do you offer emergency plumbing? Yes.',
          url: 'https://example.com/faq',
          rank_group: 2,
        }],
      }],
    }],
  },
  'Do you offer emergency plumbing?',
  'https://api.dataforseo.com/v3/serp/google/organic/live/advanced',
  testedAt,
);
assert.equal(dataForSeoEvidence.visible, true);
assert.equal(dataForSeoEvidence.position, 2);
assert.equal(dataForSeoEvidence.url, 'https://example.com/faq');

const missingEvidence = parseFaqVisibilityResponse(
  { organic: [{ title: 'Unrelated result', snippet: 'Nothing useful' }] },
  'Do you offer emergency plumbing?',
  'https://serp.example/search',
  testedAt,
);
assert.equal(missingEvidence.visible, false);
assert.equal(missingEvidence.position, null);

async function main() {
  globalThis.fetch = (async () =>
    new Response('rate limited', { status: 429 })) as typeof fetch;
  const errorEvidence = await fetchFaqVisibility(
    'https://serp.example/search',
    'api-key',
    'Do you offer emergency plumbing?',
    testedAt,
  );
  assert.equal(errorEvidence.visible, false);
  assert.equal(errorEvidence.providerStatus, 429);
  assert.equal(errorEvidence.error, 'SERP provider returned 429');

  console.log('Worker FAQ monitoring behavior verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

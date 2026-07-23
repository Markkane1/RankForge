import assert from 'node:assert/strict';

import { ingestGa4OrganicSearchConversions, ingestGscOrganicClicks } from '../src/google-measurement';

const created: Array<Record<string, unknown>> = [];
const db = {
  leadLogEntry: {
    async createMany(args: { data: Array<Record<string, unknown>>; skipDuplicates: boolean }) {
      assert.equal(args.skipDuplicates, true);
      created.push(...args.data);
      return { count: args.data.length };
    },
  },
};

async function main() {
  created.length = 0;
  global.fetch = (async (url: string, init: RequestInit) => {
    if (url.includes('analyticsdata.googleapis.com')) {
      assert.equal(init.method, 'POST');
      assert.equal((init.headers as Record<string, string>).authorization, 'Bearer ga4-token');
      assert.match(String(init.body), /Organic Search/);
      return {
        ok: true,
        json: async () => ({
          rows: [{
            dimensionValues: [{ value: '20260701' }, { value: 'Organic Search' }],
            metricValues: [{ value: '3' }],
          }],
        }),
      } as Response;
    }
    if (url.includes('webmasters/v3/sites/')) {
      assert.equal(init.method, 'POST');
      assert.equal((init.headers as Record<string, string>).authorization, 'Bearer gsc-token');
      return {
        ok: true,
        json: async () => ({
          rows: [{ keys: ['2026-07-01'], clicks: 9 }],
        }),
      } as Response;
    }
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;

  const startDate = new Date('2026-07-01T00:00:00.000Z');
  const endDate = new Date('2026-07-31T00:00:00.000Z');
  const ga4Count = await ingestGa4OrganicSearchConversions({
    db,
    clientId: 'client-1',
    propertyId: '123456',
    accessToken: 'ga4-token',
    startDate,
    endDate,
  });
  const gscCount = await ingestGscOrganicClicks({
    db,
    clientId: 'client-1',
    siteUrl: 'https://example.com/',
    accessToken: 'gsc-token',
    startDate,
    endDate,
  });

  assert.equal(ga4Count, 1);
  assert.equal(gscCount, 1);
  assert.equal(created[0].providerEventId, 'GA4:123456:20260701:organic-search-conversions');
  assert.equal(created[1].providerEventId, 'GSC:https://example.com/:2026-07-01:organic-clicks');
  assert.equal(JSON.parse(created[0].sourceLineage as string).provider, 'GA4');
  assert.equal(JSON.parse(created[1].sourceLineage as string).provider, 'GSC');
  console.log('Worker Google measurement ingestion behavior verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

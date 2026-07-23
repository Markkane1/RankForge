import assert from 'assert/strict';
import {
  fetchGbpPerformancePayload,
  ingestGbpPerformanceLeads,
  parseGbpPerformanceLeadEvents,
} from '../src/gbp-performance';

const fetchedAt = new Date('2026-07-23T00:00:00.000Z');
const payload = {
  multiDailyMetricTimeSeries: [
    {
      dailyMetric: 'CALL_CLICKS',
      timeSeries: {
        datedValues: [
          { date: { year: 2026, month: 7, day: 1 }, value: '2' },
        ],
      },
    },
    {
      dailyMetric: 'BUSINESS_DIRECTION_REQUESTS',
      timeSeries: {
        datedValues: [
          { date: { year: 2026, month: 7, day: 1 }, value: 1 },
        ],
      },
    },
    {
      dailyMetric: 'WEBSITE_CLICKS',
      timeSeries: {
        datedValues: [
          { date: { year: 2026, month: 7, day: 2 }, value: 0 },
        ],
      },
    },
  ],
};

const events = parseGbpPerformanceLeadEvents(payload, {
  clientId: 'client-1',
  gbpProfileId: 'gbp-1',
  locationName: 'locations/123',
  startDate: new Date('2026-07-01T00:00:00.000Z'),
  endDate: new Date('2026-07-31T00:00:00.000Z'),
  fetchedAt,
});

assert.equal(events.length, 3);
assert.deepEqual(events.map((event) => event.source), ['GBP_CALL', 'GBP_CALL', 'GBP_DIRECTIONS']);
assert.equal(events[0].providerEventId, 'GBP_PERFORMANCE:gbp-1:2026-07-01:CALL_CLICKS:1');
assert.equal(JSON.parse(events[0].notes).ingestion, 'gbp-performance');
assert.equal(JSON.parse(events[0].sourceLineage).provider, 'GBP_PERFORMANCE');
assert.equal(JSON.parse(events[2].sourceLineage).request.dailyMetric, 'BUSINESS_DIRECTION_REQUESTS');

async function main() {
  let requestedUrl = '';
  globalThis.fetch = (async (input: string | URL | Request) => {
    requestedUrl = input.toString();
    return Response.json(payload);
  }) as typeof fetch;

  await fetchGbpPerformancePayload({
    clientId: 'client-1',
    gbpProfileId: 'gbp-1',
    locationName: '123',
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    endDate: new Date('2026-07-31T00:00:00.000Z'),
    accessToken: 'token',
    fetchedAt,
  });
  assert.ok(requestedUrl.includes('locations/123:fetchMultiDailyMetricsTimeSeries'));
  assert.ok(requestedUrl.includes('dailyMetrics=CALL_CLICKS'));
  assert.ok(requestedUrl.includes('dailyMetrics=BUSINESS_DIRECTION_REQUESTS'));
  assert.ok(requestedUrl.includes('dailyMetrics=WEBSITE_CLICKS'));

  const writes: unknown[] = [];
  const result = await ingestGbpPerformanceLeads(
    {
      leadLogEntry: {
        createMany: async (args) => {
          writes.push(args);
          return { count: args.data.length };
        },
      },
    },
    {
      clientId: 'client-1',
      gbpProfileId: 'gbp-1',
      locationName: 'locations/123',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-31T00:00:00.000Z'),
      accessToken: 'token',
      fetchedAt,
    },
  );

  assert.equal(result.created, 3);
  assert.equal(writes.length, 1);
  assert.equal((writes[0] as { skipDuplicates: boolean }).skipDuplicates, true);

  console.log('Worker GBP Performance ingestion behavior verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

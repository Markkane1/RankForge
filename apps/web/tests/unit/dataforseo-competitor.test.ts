import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findCredential: vi.fn(),
  decryptSecret: vi.fn(),
}));

vi.mock('../../src/lib/db', () => ({
  db: {
    orgCredential: {
      findFirst: mocks.findCredential,
    },
  },
}));

vi.mock('../../src/lib/crypto', () => ({
  decryptSecret: mocks.decryptSecret,
}));

import { DataForSeoClient } from '../../src/lib/integrations/dataforseo';

describe('DataForSEO competitor teardown adapter', () => {
  beforeEach(() => {
    mocks.findCredential.mockReset();
    mocks.decryptSecret.mockReset();

    mocks.findCredential.mockResolvedValue({
      encryptedKey: 'encrypted-dataforseo',
      keyId: 'key-1',
    });
    mocks.decryptSecret.mockResolvedValue(JSON.stringify({ login: 'login', password: 'password' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        tasks: [
          {
            id: 'task-1',
            result: [{
              items: [{
                title: 'Rival Plumbing',
                cid: 'cid-1',
                url: 'https://rival.example',
                category: 'Plumber',
                rating: { value: 4.6, votes_count: 100 },
                photos_count: 20,
                rank_group: 1,
              }],
            }],
          },
          {
            id: 'task-2',
            result: [{
              items: [{
                title: 'Rival Plumbing',
                cid: 'cid-1',
                url: 'https://rival.example',
                category: 'Emergency Plumber',
                rating: { value: 4.8, votes_count: 140 },
                photos_count: 28,
                rank_group: 2,
              }],
            }],
          },
        ],
      }),
    }));
  });

  it('aggregates competitor averages and lineage across keywords and geo-points', async () => {
    const client = new DataForSeoClient('org-1');
    await client.init();

    const benchmarks = await client.getCompetitorBenchmarks(
      ['plumber', 'emergency plumber'],
      ['Dubai Marina,Dubai,United Arab Emirates'],
    );

    expect(fetch).toHaveBeenCalledWith(
      'https://api.dataforseo.com/v3/serp/google/maps/live/advanced',
      expect.objectContaining({
        body: JSON.stringify([
          {
            keyword: 'plumber',
            location_name: 'Dubai Marina,Dubai,United Arab Emirates',
            language_code: 'en',
            depth: 10,
          },
          {
            keyword: 'emergency plumber',
            location_name: 'Dubai Marina,Dubai,United Arab Emirates',
            language_code: 'en',
            depth: 10,
          },
        ]),
      }),
    );
    expect(benchmarks).toHaveLength(1);
    expect(benchmarks[0]).toEqual(expect.objectContaining({
      competitorName: 'Rival Plumbing',
      categories: JSON.stringify(['Plumber', 'Emergency Plumber']),
      avgRating: 4.7,
      reviewCount: 120,
      photoCount: 24,
      sourceLineage: expect.objectContaining({
        provider: 'DATAFORSEO',
        endpoint: 'serp/google/maps/live/advanced',
        keywordCount: 2,
        geoPointCount: 1,
        observationCount: 2,
      }),
    }));
  });
});

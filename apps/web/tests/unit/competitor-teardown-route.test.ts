import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireClientRole: vi.fn(),
  withClientTenant: vi.fn(),
  findClient: vi.fn(),
  createBenchmark: vi.fn(),
  dataForSeoClient: {
    init: vi.fn(),
    getCompetitorBenchmarks: vi.fn(),
    isConnected: true,
  },
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireClientRole: mocks.requireClientRole,
}));

vi.mock('../../src/lib/db', () => ({
  withClientTenant: mocks.withClientTenant,
}));

vi.mock('../../src/lib/integrations/dataforseo', () => ({
  DataForSeoClient: vi.fn(function DataForSeoClient() {
    return mocks.dataForSeoClient;
  }),
}));

import { POST } from '../../src/app/api/clients/[id]/competitors/route';

const params = { params: Promise.resolve({ id: 'client-1' }) };
const validBody = {
  keywords: ['plumber', 'emergency plumber', 'drain repair', 'water heater', 'leak repair'],
  locationNames: ['Dubai Marina,Dubai,United Arab Emirates', 'Jumeirah,Dubai,United Arab Emirates', 'Deira,Dubai,United Arab Emirates'],
};

describe('competitor teardown route', () => {
  beforeEach(() => {
    mocks.requireClientRole.mockReset();
    mocks.withClientTenant.mockReset();
    mocks.findClient.mockReset();
    mocks.createBenchmark.mockReset();
    mocks.dataForSeoClient.init.mockReset();
    mocks.dataForSeoClient.getCompetitorBenchmarks.mockReset();
    mocks.dataForSeoClient.isConnected = true;

    mocks.requireClientRole.mockResolvedValue({ ok: true, user: { id: 'user-1' } });
    mocks.findClient.mockResolvedValue({ id: 'client-1', organizationId: 'org-1' });
    mocks.createBenchmark.mockImplementation(({ data }) => Promise.resolve({ id: 'benchmark-1', ...data }));
    mocks.withClientTenant.mockImplementation((_clientId: string, fn: (db: unknown) => unknown) =>
      fn({
        client: { findUnique: mocks.findClient },
        competitorBenchmark: { create: mocks.createBenchmark },
      }),
    );
    mocks.dataForSeoClient.getCompetitorBenchmarks.mockResolvedValue([
      {
        competitorName: 'Rival Plumbing',
        competitorGbpId: 'cid-1',
        competitorUrl: 'https://rival.example',
        categories: JSON.stringify(['Plumber']),
        avgRating: 4.7,
        reviewCount: 120,
        photoCount: 24,
        sourceLineage: {
          provider: 'DATAFORSEO',
          keywordCount: 5,
          geoPointCount: 3,
        },
      },
    ]);
  });

  it('requires at least 5 keywords and 3 geo-points for competitor teardown', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/clients/client-1/competitors', {
        method: 'POST',
        body: JSON.stringify({ keywords: ['plumber'], locationNames: ['Dubai'] }),
      }),
      params,
    );

    expect(response.status).toBe(400);
    expect(mocks.findClient).not.toHaveBeenCalled();
  });

  it('blocks when DataForSEO is not connected', async () => {
    mocks.dataForSeoClient.isConnected = false;

    const response = await POST(
      new NextRequest('http://localhost/api/clients/client-1/competitors', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
      params,
    );

    expect(response.status).toBe(424);
    await expect(response.json()).resolves.toEqual({
      error: 'DataForSEO is required for live competitor teardown',
    });
    expect(mocks.createBenchmark).not.toHaveBeenCalled();
  });

  it('persists live teardown averages and provider lineage', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/clients/client-1/competitors', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
      params,
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ imported: 1 });
    expect(mocks.dataForSeoClient.getCompetitorBenchmarks).toHaveBeenCalledWith(validBody.keywords, validBody.locationNames);
    expect(mocks.createBenchmark).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-1',
        competitorName: 'Rival Plumbing',
        avgRating: 4.7,
        reviewCount: 120,
        photoCount: 24,
        sourceLineage: JSON.stringify({
          provider: 'DATAFORSEO',
          keywordCount: 5,
          geoPointCount: 3,
        }),
      }),
    });
  });
});

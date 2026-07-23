import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireClientRole: vi.fn(),
  withClientTenant: vi.fn(),
  findClient: vi.fn(),
  createScan: vi.fn(),
  findScans: vi.fn(),
  findCredential: vi.fn(),
  decryptSecret: vi.fn(),
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireClientRole: mocks.requireClientRole,
}));

vi.mock('../../src/lib/db', () => ({
  db: {
    orgCredential: {
      findFirst: mocks.findCredential,
    },
  },
  withClientTenant: mocks.withClientTenant,
}));

vi.mock('../../src/lib/crypto', () => ({
  decryptSecret: mocks.decryptSecret,
}));

import { GET, POST } from '../../src/app/api/clients/[id]/geo-grid/route';

const params = { params: Promise.resolve({ id: 'client-1' }) };

describe('geo-grid routes', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();

    mocks.requireClientRole.mockResolvedValue({ ok: true });
    mocks.findCredential.mockResolvedValue({
      encryptedKey: 'encrypted-local-falcon-key',
      keyId: 'key-1',
    });
    mocks.decryptSecret.mockResolvedValue('local-falcon-key');
    mocks.createScan.mockImplementation(({ data }) => Promise.resolve({ id: 'scan-1', ...data }));
    mocks.findScans.mockResolvedValue([]);
    mocks.withClientTenant.mockImplementation((_clientId: string, fn: (db: unknown) => unknown) =>
      fn({
        client: { findUnique: mocks.findClient },
        geoGridScanResult: {
          create: mocks.createScan,
          findMany: mocks.findScans,
        },
      }),
    );

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        average_rank: 2.4,
        points: [{ lat: 25.2, lng: 55.3, rank: 2 }],
        run_id: 'run-1',
      }),
    }));
  });

  it('requires gbpId so multi-location scans cannot fall back to the first profile', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/clients/client-1/geo-grid', {
        method: 'POST',
        body: JSON.stringify({ keyword: 'plumber dubai' }),
      }),
      params,
    );

    expect(response.status).toBe(400);
    expect(mocks.findClient).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('runs Local Falcon against the selected GBP profile location', async () => {
    mocks.findClient.mockResolvedValue({
      id: 'client-1',
      organizationId: 'org-1',
      gbpProfiles: [
        { id: 'gbp-first', gbpLocationId: 'locations/first' },
        { id: 'gbp-selected', gbpLocationId: 'locations/selected' },
      ],
    });

    const response = await POST(
      new NextRequest('http://localhost/api/clients/client-1/geo-grid', {
        method: 'POST',
        body: JSON.stringify({ keyword: 'plumber dubai', gbpId: 'gbp-selected' }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.localfalcon.com/api/v1/reports/run',
      expect.objectContaining({
        body: expect.stringContaining('"location_id":"locations/selected"'),
      }),
    );
    expect(mocks.createScan).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceLineage: expect.objectContaining({
          request: expect.objectContaining({
            gbpProfileId: 'gbp-selected',
            locationId: 'locations/selected',
          }),
        }),
      }),
    }));
  });

  it('rejects a selected GBP profile that is not available on the client', async () => {
    mocks.findClient.mockResolvedValue({
      id: 'client-1',
      organizationId: 'org-1',
      gbpProfiles: [{ id: 'gbp-first', gbpLocationId: 'locations/first' }],
    });

    const response = await POST(
      new NextRequest('http://localhost/api/clients/client-1/geo-grid', {
        method: 'POST',
        body: JSON.stringify({ keyword: 'plumber dubai', gbpId: 'gbp-other' }),
      }),
      params,
    );

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.createScan).not.toHaveBeenCalled();
  });

  it('filters scan history by selected GBP profile lineage', async () => {
    mocks.findScans.mockResolvedValue([
      {
        id: 'scan-selected',
        sourceLineage: { request: { gbpProfileId: 'gbp-selected' } },
      },
      {
        id: 'scan-other',
        sourceLineage: { request: { gbpProfileId: 'gbp-other' } },
      },
    ]);

    const response = await GET(
      new NextRequest('http://localhost/api/clients/client-1/geo-grid?gbpId=gbp-selected'),
      params,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 'scan-selected',
        sourceLineage: { request: { gbpProfileId: 'gbp-selected' } },
      },
    ]);
  });
});

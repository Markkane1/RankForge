import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireClientRole: vi.fn(),
  withClientTenant: vi.fn(),
  findClient: vi.fn(),
  findExisting: vi.fn(),
  updateOpportunity: vi.fn(),
  createOpportunity: vi.fn(),
  findManyOpportunities: vi.fn(),
  dataForSeo: {
    isConnected: true,
    init: vi.fn(),
    getBacklinkGap: vi.fn(),
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
    return mocks.dataForSeo;
  }),
}));

import { GET, POST } from '../../src/app/api/clients/[id]/backlinks/gap/route';

describe('backlink gap routes', () => {
  beforeEach(() => {
    mocks.requireClientRole.mockReset();
    mocks.withClientTenant.mockReset();
    mocks.findClient.mockReset();
    mocks.findExisting.mockReset();
    mocks.updateOpportunity.mockReset();
    mocks.createOpportunity.mockReset();
    mocks.findManyOpportunities.mockReset();
    mocks.dataForSeo.init.mockReset();
    mocks.dataForSeo.getBacklinkGap.mockReset();
    mocks.dataForSeo.isConnected = true;

    mocks.requireClientRole.mockResolvedValue({ ok: true });
    mocks.withClientTenant.mockImplementation((_clientId: string, fn: (db: unknown) => unknown) =>
      fn({
        client: { findUnique: mocks.findClient },
        backlinkOpportunity: {
          findMany: mocks.findManyOpportunities,
          findFirst: mocks.findExisting,
          update: mocks.updateOpportunity,
          create: mocks.createOpportunity,
        },
      }),
    );
  });

  it('imports DataForSEO backlink opportunities and updates existing rows', async () => {
    mocks.findClient.mockResolvedValue({ id: 'client-1', organizationId: 'org-1' });
    mocks.dataForSeo.getBacklinkGap.mockResolvedValue([
      { url: 'https://directory.example/listing', domainRating: 42 },
      { url: 'https://blog.example/review', domainRating: 31 },
    ]);
    mocks.findExisting
      .mockResolvedValueOnce({ id: 'existing-1' })
      .mockResolvedValueOnce(null);
    mocks.updateOpportunity.mockResolvedValue({ id: 'existing-1' });
    mocks.createOpportunity.mockResolvedValue({ id: 'created-1' });

    const response = await POST(
      new Request('http://localhost/api/clients/client-1/backlinks/gap', {
        method: 'POST',
        body: JSON.stringify({ competitorUrl: 'https://competitor.example' }),
      }),
      { params: Promise.resolve({ id: 'client-1' }) },
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.imported).toBe(2);
    expect(body.policy).toContain('Paid link placement is prohibited');
    expect(mocks.updateOpportunity).toHaveBeenCalledWith({
      where: { id: 'existing-1' },
      data: { domainRating: 42 },
    });
    expect(mocks.createOpportunity).toHaveBeenCalledWith({
      data: {
        clientId: 'client-1',
        url: 'https://blog.example/review',
        domainRating: 31,
        competitorUrl: 'https://competitor.example',
        status: 'NEW',
      },
    });
  });

  it('rejects paid-link placement flags before provider access', async () => {
    const response = await POST(
      new Request('http://localhost/api/clients/client-1/backlinks/gap', {
        method: 'POST',
        body: JSON.stringify({
          competitorUrl: 'https://competitor.example',
          allowPaidPlacement: true,
        }),
      }),
      { params: Promise.resolve({ id: 'client-1' }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.withClientTenant).not.toHaveBeenCalled();
    expect(mocks.dataForSeo.init).not.toHaveBeenCalled();
  });

  it('uses tenant scope for read-only backlink opportunity reads', async () => {
    mocks.findManyOpportunities.mockResolvedValue([{ id: 'op-1' }]);

    const response = await GET(
      new Request('http://localhost/api/clients/client-1/backlinks/gap'),
      { params: Promise.resolve({ id: 'client-1' }) },
    );

    await expect(response.json()).resolves.toEqual([{ id: 'op-1' }]);
    expect(mocks.findManyOpportunities).toHaveBeenCalledWith({
      where: { clientId: 'client-1' },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  });

  it('returns auth failures before tenant or provider work', async () => {
    mocks.requireClientRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const response = await POST(
      new Request('http://localhost/api/clients/client-1/backlinks/gap', {
        method: 'POST',
        body: JSON.stringify({ competitorUrl: 'https://competitor.example' }),
      }),
      { params: Promise.resolve({ id: 'client-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.withClientTenant).not.toHaveBeenCalled();
    expect(mocks.dataForSeo.init).not.toHaveBeenCalled();
  });
});

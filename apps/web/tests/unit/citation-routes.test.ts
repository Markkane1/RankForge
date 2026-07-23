import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireClientRole: vi.fn(),
  withClientTenant: vi.fn(),
  findClient: vi.fn(),
  upsertCitation: vi.fn(),
  findCitation: vi.fn(),
  updateCitation: vi.fn(),
  brightLocal: {
    isConnected: true,
    init: vi.fn(),
    getCitationTrackerReport: vi.fn(),
  },
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireClientRole: mocks.requireClientRole,
}));

vi.mock('../../src/lib/db', () => ({
  withClientTenant: mocks.withClientTenant,
}));

vi.mock('../../src/lib/integrations/brightlocal', () => ({
  BrightLocalClient: vi.fn(function BrightLocalClient() {
    return mocks.brightLocal;
  }),
}));

import { POST as auditCitations } from '../../src/app/api/clients/[id]/citations/audit/route';
import { POST as submitCitation } from '../../src/app/api/clients/[id]/citations/[citationId]/submit/route';

describe('citation workflow routes', () => {
  beforeEach(() => {
    mocks.requireClientRole.mockReset();
    mocks.withClientTenant.mockReset();
    mocks.findClient.mockReset();
    mocks.upsertCitation.mockReset();
    mocks.findCitation.mockReset();
    mocks.updateCitation.mockReset();
    mocks.brightLocal.init.mockReset();
    mocks.brightLocal.getCitationTrackerReport.mockReset();
    mocks.brightLocal.isConnected = true;

    mocks.requireClientRole.mockResolvedValue({ ok: true });
    mocks.withClientTenant.mockImplementation((_clientId: string, fn: (db: unknown) => unknown) =>
      fn({
        client: { findUnique: mocks.findClient },
        citationRecord: {
          upsert: mocks.upsertCitation,
          findUnique: mocks.findCitation,
          update: mocks.updateCitation,
        },
      }),
    );
  });

  it('imports BrightLocal citations with classified NAP status', async () => {
    mocks.findClient.mockResolvedValue({ id: 'client-1', organizationId: 'org-1' });
    mocks.brightLocal.getCitationTrackerReport.mockResolvedValue({
      citations: [
        { platform: 'Google Maps', url: 'https://maps.example', napStatus: 'match', tier: 1 },
        { site: 'Old Directory', status: 'duplicate', tier: 2 },
      ],
    });
    mocks.upsertCitation.mockImplementation(({ create }) => Promise.resolve(create));

    const response = await auditCitations(
      new Request('http://localhost/api/clients/client-1/citations/audit', {
        method: 'POST',
        body: JSON.stringify({ locationId: 'loc-1' }),
      }),
      { params: Promise.resolve({ id: 'client-1' }) },
    );

    await expect(response.json()).resolves.toEqual({ imported: 2 });
    expect(response.status).toBe(201);
    expect(mocks.upsertCitation).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ napStatus: 'CORRECT', status: 'VERIFIED' }),
    }));
    expect(mocks.upsertCitation).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ napStatus: 'DUPLICATE', status: 'NEEDS_REVIEW' }),
    }));
  });

  it('submits only same-client citations with a credential reference', async () => {
    mocks.findCitation.mockResolvedValue({ id: 'citation-1', clientId: 'client-1' });
    mocks.updateCitation.mockResolvedValue({ id: 'citation-1', status: 'SUBMITTED' });

    const allowed = await submitCitation(
      new Request('http://localhost/api/clients/client-1/citations/citation-1/submit', {
        method: 'POST',
        body: JSON.stringify({ credentialsRef: 'cred-ref-1' }),
      }),
      { params: Promise.resolve({ id: 'client-1', citationId: 'citation-1' }) },
    );

    expect(allowed.status).toBe(200);
    expect(mocks.updateCitation).toHaveBeenCalledWith({
      where: { id: 'citation-1' },
      data: {
        status: 'SUBMITTED',
        submittedAt: expect.any(Date),
        credentialsRef: 'cred-ref-1',
      },
    });

    mocks.findCitation.mockResolvedValue({ id: 'citation-2', clientId: 'client-2' });
    mocks.updateCitation.mockClear();
    const denied = await submitCitation(
      new Request('http://localhost/api/clients/client-1/citations/citation-2/submit', {
        method: 'POST',
        body: JSON.stringify({ credentialsRef: 'cred-ref-1' }),
      }),
      { params: Promise.resolve({ id: 'client-1', citationId: 'citation-2' }) },
    );

    expect(denied.status).toBe(404);
    expect(mocks.updateCitation).not.toHaveBeenCalled();
  });

  it('returns auth failures before touching providers or tenant data', async () => {
    mocks.requireClientRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const response = await auditCitations(
      new Request('http://localhost/api/clients/client-1/citations/audit', {
        method: 'POST',
        body: JSON.stringify({ locationId: 'loc-1' }),
      }),
      { params: Promise.resolve({ id: 'client-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.withClientTenant).not.toHaveBeenCalled();
    expect(mocks.brightLocal.init).not.toHaveBeenCalled();
  });
});

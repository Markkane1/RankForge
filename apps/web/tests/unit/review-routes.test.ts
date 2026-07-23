import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireClientRole: vi.fn(),
  withClientTenant: vi.fn(),
  findClient: vi.fn(),
  findOptOut: vi.fn(),
  createReviewAsk: vi.fn(),
  queueAdd: vi.fn(),
  findShortLink: vi.fn(),
  updateShortLink: vi.fn(),
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireClientRole: mocks.requireClientRole,
}));

vi.mock('../../src/lib/db', () => ({
  withClientTenant: mocks.withClientTenant,
  db: {
    reviewAsk: {
      findUnique: mocks.findShortLink,
      update: mocks.updateShortLink,
    },
  },
}));

vi.mock('@rankforge/queue', () => ({
  taskQueue: {
    add: mocks.queueAdd,
  },
}));

import { POST as inviteReview } from '../../src/app/api/clients/[id]/reviews/invite/route';
import { GET as followReviewLink } from '../../src/app/api/reviews/r/[code]/route';

describe('review ask routes', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();

    mocks.requireClientRole.mockResolvedValue({ ok: true });
    mocks.findClient.mockResolvedValue({
      id: 'client-1',
      gbpProfiles: [{ id: 'gbp-1', websiteUrl: 'https://g.page/r/real-destination/review' }],
    });
    mocks.findOptOut.mockResolvedValue(null);
    mocks.createReviewAsk.mockImplementation(({ data }) => Promise.resolve({ id: 'ask-1', ...data }));
    mocks.withClientTenant.mockImplementation((_clientId: string, fn: (db: unknown) => unknown) =>
      fn({
        client: { findUnique: mocks.findClient },
        reviewAsk: {
          findFirst: mocks.findOptOut,
          create: mocks.createReviewAsk,
        },
      }),
    );
  });

  it('creates a tracked review short link and QR code for scheduled asks', async () => {
    const response = await inviteReview(
      new NextRequest('http://localhost/api/clients/client-1/reviews/invite', {
        method: 'POST',
        body: JSON.stringify({
          gbpId: 'gbp-1',
          phoneNumber: '+15550100',
          customerName: 'Customer One',
        }),
      }),
      { params: Promise.resolve({ id: 'client-1' }) },
    );

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.reviewUrl).toMatch(/^http:\/\/localhost\/api\/reviews\/r\/[-_a-zA-Z0-9]+$/);
    expect(body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(mocks.createReviewAsk).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reviewUrl: body.reviewUrl,
        targetReviewUrl: 'https://g.page/r/real-destination/review',
        shortCode: expect.any(String),
        qrCodeDataUrl: body.qrCodeDataUrl,
      }),
    });
    expect(mocks.queueAdd).toHaveBeenCalledTimes(2);
  });

  it('requires gbpId so review asks do not fall back to the first profile', async () => {
    const response = await inviteReview(
      new NextRequest('http://localhost/api/clients/client-1/reviews/invite', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '+15550100',
          customerName: 'Customer One',
        }),
      }),
      { params: Promise.resolve({ id: 'client-1' }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.findClient).not.toHaveBeenCalled();
    expect(mocks.createReviewAsk).not.toHaveBeenCalled();
  });

  it('tracks short-link clicks before redirecting to the original review URL', async () => {
    mocks.findShortLink.mockResolvedValue({
      id: 'ask-1',
      targetReviewUrl: 'https://g.page/r/real-destination/review',
      reviewUrl: 'http://localhost/api/reviews/r/abc123',
    });
    mocks.updateShortLink.mockResolvedValue({ id: 'ask-1' });

    const response = await followReviewLink(
      new NextRequest('http://localhost/api/reviews/r/abc123'),
      { params: Promise.resolve({ code: 'abc123' }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://g.page/r/real-destination/review');
    expect(mocks.updateShortLink).toHaveBeenCalledWith({
      where: { id: 'ask-1' },
      data: {
        clickCount: { increment: 1 },
        lastClickedAt: expect.any(Date),
      },
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  withClientTenant: vi.fn(),
  findClient: vi.fn(),
  createLead: vi.fn(),
}));

vi.mock('../../src/lib/db', () => ({
  withClientTenant: mocks.withClientTenant,
}));

import { POST } from '../../src/app/api/events/conversion/route';

describe('conversion event route', () => {
  beforeEach(() => {
    vi.stubEnv('CONVERSION_EVENT_SECRET', 'secret-1');
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.findClient.mockResolvedValue({ id: 'client-1' });
    mocks.createLead.mockImplementation(({ data }) => Promise.resolve({
      id: 'lead-1',
      source: data.source,
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
    }));
    mocks.withClientTenant.mockImplementation((_clientId: string, fn: (db: unknown) => unknown) =>
      fn({
        client: { findUnique: mocks.findClient },
        leadLogEntry: { create: mocks.createLead },
      }),
    );
  });

  it.each([
    'GBP_CALL',
    'GBP_DIRECTIONS',
    'GBP_WEBSITE',
    'FORM_SUBMISSION',
    'BOOKING',
    'PHONE_CALL',
    'WHATSAPP',
  ])('accepts %s source events and writes a LeadLogEntry', async (source) => {
    const response = await POST(new NextRequest('http://localhost/api/events/conversion', {
      method: 'POST',
      headers: { 'x-rankforge-event-secret': 'secret-1' },
      body: JSON.stringify({ clientId: 'client-1', source, value: 10, metadata: { href: '/booking' } }),
    }));

    expect(response.status).toBe(201);
    expect(mocks.createLead).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-1',
        source,
        value: 10,
      }),
    });
  });
});

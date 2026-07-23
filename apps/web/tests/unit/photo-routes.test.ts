import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireClientRole: vi.fn(),
  withClientTenant: vi.fn(),
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireClientRole: mocks.requireClientRole,
}));

vi.mock('../../src/lib/db', () => ({
  withClientTenant: mocks.withClientTenant,
}));

import { POST } from '../../src/app/api/clients/[id]/gbp/[gbpId]/photos/route';

describe('GBP photo routes', () => {
  beforeEach(() => {
    mocks.requireClientRole.mockReset();
    mocks.withClientTenant.mockReset();
    mocks.requireClientRole.mockResolvedValue({ ok: true });
  });

  it('blocks uploads without an explicit category tag', async () => {
    const formData = new FormData();
    formData.set('file', new File(['photo-bytes'], 'front-door.jpg', { type: 'image/jpeg' }));

    const response = await POST(
      new NextRequest('http://localhost/api/clients/client-1/gbp/gbp-1/photos', {
        method: 'POST',
        body: formData,
      }),
      { params: Promise.resolve({ id: 'client-1', gbpId: 'gbp-1' }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Photo category tag is required' });
    expect(mocks.withClientTenant).not.toHaveBeenCalled();
  });
});

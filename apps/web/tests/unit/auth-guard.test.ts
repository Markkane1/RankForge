import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireClientRole } from '../../src/lib/auth-guard';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findClient: vi.fn(),
}));

vi.mock('../../src/auth', () => ({
  auth: mocks.auth,
}));

vi.mock('../../src/lib/db', () => ({
  db: {
    client: {
      findFirst: mocks.findClient,
    },
  },
}));

describe('requireClientRole', () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.findClient.mockReset();
  });

  it('allows a permitted role only when the client belongs to the session organization', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'Owner',
        email: 'owner@example.com',
        role: 'OWNER',
        organizationId: 'org-1',
      },
    });
    mocks.findClient.mockResolvedValue({ id: 'client-1' });

    const result = await requireClientRole('client-1', 'OWNER', 'COORDINATOR');

    expect(result.ok).toBe(true);
    expect(mocks.findClient).toHaveBeenCalledWith({
      where: { id: 'client-1', organizationId: 'org-1' },
      select: { id: true },
    });
  });

  it('denies cross-organization client access', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'Owner',
        email: 'owner@example.com',
        role: 'OWNER',
        organizationId: 'org-1',
      },
    });
    mocks.findClient.mockResolvedValue(null);

    const result = await requireClientRole('client-2', 'OWNER');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
    }
  });

  it('denies a valid client when the role is too weak', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'Viewer',
        email: 'viewer@example.com',
        role: 'VIEWER',
        organizationId: 'org-1',
      },
    });

    const result = await requireClientRole('client-1', 'OWNER');

    expect(result.ok).toBe(false);
    expect(mocks.findClient).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  requireRole: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  findStaffUser: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireSession: mocks.requireSession,
  requireRole: mocks.requireRole,
}));

vi.mock('../../src/lib/db', () => ({
  db: {
    notification: {
      findMany: mocks.findMany,
      count: mocks.count,
      create: mocks.create,
      updateMany: mocks.updateMany,
      deleteMany: mocks.deleteMany,
    },
    staffUser: {
      findFirst: mocks.findStaffUser,
    },
  },
}));

import { DELETE } from '../../src/app/api/notifications/[id]/route';
import { GET, PATCH, POST } from '../../src/app/api/notifications/route';

const auth = {
  ok: true,
  user: {
    id: 'user-1',
    name: 'User One',
    email: 'one@example.com',
    role: 'VIEWER',
    organizationId: 'org-1',
  },
};

describe('notification routes', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.requireSession.mockResolvedValue(auth);
    mocks.requireRole.mockResolvedValue({ ...auth, user: { ...auth.user, role: 'OWNER' } });
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
  });

  it('denies cross-user notification reads for non-admin roles', async () => {
    const response = await GET(new Request('http://localhost/api/notifications?userId=user-2'));

    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('scopes default reads and read updates to the current user', async () => {
    const getResponse = await GET(new Request('http://localhost/api/notifications'));
    expect(getResponse.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
    }));

    mocks.updateMany.mockResolvedValue({ count: 1 });
    const patchResponse = await PATCH(new Request('http://localhost/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ ids: ['note-1', 'note-2'] }),
    }));

    expect(patchResponse.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['note-1', 'note-2'] }, userId: 'user-1' },
      data: { isRead: true },
    });
  });

  it('creates notifications only for users in the current organization', async () => {
    mocks.findStaffUser.mockResolvedValue(null);

    const missing = await POST(new Request('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-2', type: 'alert', title: 'Alert', message: 'Message' }),
    }));

    expect(missing.status).toBe(404);
    expect(mocks.create).not.toHaveBeenCalled();

    mocks.findStaffUser.mockResolvedValue({ id: 'user-2' });
    mocks.create.mockResolvedValue({
      id: 'note-1',
      userId: 'user-2',
      type: 'alert',
      title: 'Alert',
      message: 'Message',
      sourceRule: null,
      recommendedAction: null,
      dedupeKey: null,
      isRead: false,
      relatedEntityId: null,
      relatedEntityType: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });

    const created = await POST(new Request('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-2', type: 'alert', title: 'Alert', message: 'Message' }),
    }));

    expect(created.status).toBe(201);
    expect(mocks.requireRole).toHaveBeenCalledWith('OWNER', 'COORDINATOR');
    expect(mocks.findStaffUser).toHaveBeenCalledWith({
      where: { id: 'user-2', organizationId: 'org-1' },
      select: { id: true },
    });
  });

  it('deletes only the current user notification', async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });
    const denied = await DELETE(new Request('http://localhost/api/notifications/note-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'note-1' }),
    });
    expect(denied.status).toBe(404);

    mocks.deleteMany.mockResolvedValue({ count: 1 });
    const deleted = await DELETE(new Request('http://localhost/api/notifications/note-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'note-1' }),
    });

    expect(deleted.status).toBe(200);
    expect(mocks.deleteMany).toHaveBeenLastCalledWith({ where: { id: 'note-1', userId: 'user-1' } });
  });
});

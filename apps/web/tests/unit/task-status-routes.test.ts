import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  rateLimitSensitive: vi.fn(),
  getSignInIp: vi.fn(),
  findTask: vi.fn(),
  countTasks: vi.fn(),
  queueAdd: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireRole: mocks.requireRole,
}));

vi.mock('../../src/lib/rate-limit', () => ({
  rateLimitSensitive: mocks.rateLimitSensitive,
}));

vi.mock('../../src/lib/crypto', () => ({
  getSignInIp: mocks.getSignInIp,
}));

vi.mock('../../src/lib/db', () => ({
  db: {
    task: {
      findUnique: mocks.findTask,
      count: mocks.countTasks,
    },
  },
}));

vi.mock('@rankforge/queue', () => ({
  taskQueue: {
    add: mocks.queueAdd,
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.captureException,
}));

import { PUT } from '../../src/app/api/tasks/[id]/status/route';

const params = { params: Promise.resolve({ id: 'task-1' }) };

describe('task status route', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.requireRole.mockResolvedValue({ ok: true, user: { id: 'user-1', role: 'OWNER' } });
    mocks.rateLimitSensitive.mockResolvedValue({ success: true });
    mocks.getSignInIp.mockReturnValue('127.0.0.1');
    mocks.queueAdd.mockResolvedValue({});
  });

  it('blocks starting or completing a task until dependencies are DONE', async () => {
    mocks.findTask.mockResolvedValue({
      id: 'task-1',
      dependsOnTaskIds: ['dep-1', 'dep-2'],
      subtasks: [],
    });
    mocks.countTasks.mockResolvedValue(1);

    const response = await PUT(new Request('http://localhost/api/tasks/task-1/status', {
      method: 'PUT',
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    }), params);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Cannot start task: dependency tasks are not DONE.',
    });
    expect(mocks.queueAdd).not.toHaveBeenCalled();
  });

  it('blocks DONE when subtasks remain open', async () => {
    mocks.findTask.mockResolvedValue({
      id: 'task-1',
      dependsOnTaskIds: [],
      subtasks: [{ isCompleted: false }],
    });

    const response = await PUT(new Request('http://localhost/api/tasks/task-1/status', {
      method: 'PUT',
      body: JSON.stringify({ status: 'DONE' }),
    }), params);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Cannot mark task as DONE: Pending subtasks exist.',
    });
    expect(mocks.queueAdd).not.toHaveBeenCalled();
  });

  it('queues the status update when dependency checks pass', async () => {
    mocks.findTask.mockResolvedValue({
      id: 'task-1',
      dependsOnTaskIds: ['dep-1'],
      subtasks: [{ isCompleted: true }],
    });
    mocks.countTasks.mockResolvedValue(1);

    const response = await PUT(new Request('http://localhost/api/tasks/task-1/status', {
      method: 'PUT',
      body: JSON.stringify({ status: 'DONE' }),
    }), params);

    expect(response.status).toBe(202);
    expect(mocks.queueAdd).toHaveBeenCalledWith('UpdateTaskStatus', {
      id: 'task-1',
      status: 'DONE',
      timestamp: expect.any(Number),
    }, expect.objectContaining({
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }));
  });
});

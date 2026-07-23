import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  findTask: vi.fn(),
  updateManySubtask: vi.fn(),
  findManySubtasks: vi.fn(),
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireRole: mocks.requireRole,
}));

vi.mock('../../src/lib/db', () => ({
  db: {
    subtask: {
      findUnique: mocks.findSubtask,
      update: mocks.updateSubtask,
      updateMany: mocks.updateManySubtask,
      findMany: mocks.findManySubtasks,
    },
    task: {
      findUnique: mocks.findTask,
    },
  },
}));

import { PATCH as toggleSubtask } from '../../src/app/api/tasks/[id]/subtasks/[subtaskId]/route';
import { PATCH as reorderSubtasks } from '../../src/app/api/tasks/[id]/subtasks/reorder/route';

describe('self-correction diagnosis routes', () => {
  beforeEach(() => {
    mocks.requireRole.mockReset();
    mocks.findSubtask.mockReset();
    mocks.updateSubtask.mockReset();
    mocks.findTask.mockReset();
    mocks.updateManySubtask.mockReset();
    mocks.findManySubtasks.mockReset();
    mocks.requireRole.mockResolvedValue({ ok: true });
  });

  it('blocks completing later diagnosis steps before earlier open steps', async () => {
    mocks.findSubtask.mockResolvedValue({
      id: 'step-2',
      taskId: 'task-1',
      sortOrder: 2,
      isCompleted: false,
      task: {
        taskId: 'REQ-M5-05',
        subtasks: [
          { id: 'step-1', sortOrder: 1, isCompleted: false },
          { id: 'step-2', sortOrder: 2, isCompleted: false },
        ],
      },
    });

    const response = await toggleSubtask(
      new NextRequest('http://localhost/api/tasks/task-1/subtasks/step-2', { method: 'PATCH' }),
      { params: Promise.resolve({ id: 'task-1', subtaskId: 'step-2' }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Complete the diagnosis checklist in order before proposing own tactics.',
    });
    expect(mocks.updateSubtask).not.toHaveBeenCalled();
  });

  it('allows the next diagnosis step when previous steps are complete', async () => {
    mocks.findSubtask.mockResolvedValue({
      id: 'step-2',
      taskId: 'task-1',
      sortOrder: 2,
      isCompleted: false,
      task: {
        taskId: 'REQ-M5-05',
        subtasks: [
          { id: 'step-1', sortOrder: 1, isCompleted: true },
          { id: 'step-2', sortOrder: 2, isCompleted: false },
        ],
      },
    });
    mocks.updateSubtask.mockResolvedValue({ id: 'step-2', isCompleted: true });

    const response = await toggleSubtask(
      new NextRequest('http://localhost/api/tasks/task-1/subtasks/step-2', { method: 'PATCH' }),
      { params: Promise.resolve({ id: 'task-1', subtaskId: 'step-2' }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.updateSubtask).toHaveBeenCalledWith({
      where: { id: 'step-2' },
      data: { isCompleted: true },
    });
  });

  it('blocks reordering the canonical diagnosis checklist', async () => {
    mocks.findTask.mockResolvedValue({ id: 'task-1', taskId: 'REQ-M5-05' });

    const response = await reorderSubtasks(
      new NextRequest('http://localhost/api/tasks/task-1/subtasks/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ subtaskIds: ['step-2', 'step-1'] }),
      }),
      { params: Promise.resolve({ id: 'task-1' }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Cannot reorder self-correction diagnosis checklist.',
    });
    expect(mocks.updateManySubtask).not.toHaveBeenCalled();
  });

  it('returns auth failures before reading subtasks', async () => {
    mocks.requireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const response = await toggleSubtask(
      new NextRequest('http://localhost/api/tasks/task-1/subtasks/step-1', { method: 'PATCH' }),
      { params: Promise.resolve({ id: 'task-1', subtaskId: 'step-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.findSubtask).not.toHaveBeenCalled();
  });
});

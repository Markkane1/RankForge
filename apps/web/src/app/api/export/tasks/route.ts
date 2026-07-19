import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOwner } from '@/lib/auth-guard';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const tasks = await db.task.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      client: { select: { name: true } },
      assignedTo: { select: { name: true } },
      requestedBy: { select: { name: true } },
    },
  });

  if (tasks.length === 0) {
    return new NextResponse('No tasks found', { headers: { 'Content-Type': 'text/plain' } });
  }

  const header = 'Task ID,Title,Client,Module,Sprint,Priority,Status,Assigned To,Requested By,Due Date,Created At,Updated At';
  const rows = tasks.map((t) => {
    const esc = (v?: string | null) => {
      if (!v) return '';
      return `"${v.replace(/"/g, '""')}"`;
    };
    return [
      t.taskId,
      esc(t.title),
      esc(t.client?.name),
      t.module,
      t.sprint ?? '',
      t.priority,
      t.status,
      esc(t.assignedTo?.name),
      esc(t.requestedBy?.name),
      t.dueDate ?? '',
      t.createdAt.toISOString(),
      t.updatedAt.toISOString(),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tasks-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
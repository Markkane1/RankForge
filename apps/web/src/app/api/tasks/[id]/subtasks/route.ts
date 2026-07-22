import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('OWNER', 'COORDINATOR');
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await db.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const maxSort = await db.subtask.findFirst({
      where: { taskId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    // REQ-M6-TASK-03: task log/subtask entries track execution work under a task.
    const subtask = await db.subtask.create({
      data: {
        taskId: id,
        title: title.trim(),
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(subtask);
  } catch (error) {
    console.error("Create subtask API error:", error);
    return NextResponse.json(
      { error: "Failed to create subtask" },
      { status: 500 }
    );
  }
}

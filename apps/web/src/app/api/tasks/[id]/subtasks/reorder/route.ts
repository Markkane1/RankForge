import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('OWNER', 'COORDINATOR');
    if (!auth.ok) return auth.response;

    const { id: taskId } = await params;
    const body = await request.json();
    const { subtaskIds } = body as { subtaskIds: string[] };

    if (!Array.isArray(subtaskIds)) {
      return NextResponse.json(
        { error: "subtaskIds must be an array" },
        { status: 400 }
      );
    }

    // Verify task exists
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.taskId === 'REQ-M5-05') {
      return NextResponse.json(
        { error: "Cannot reorder self-correction diagnosis checklist." },
        { status: 400 }
      );
    }

    // Update sortOrder for each subtask based on array position
    const updates = subtaskIds.map((subtaskId, index) =>
      db.subtask.updateMany({
        where: { id: subtaskId, taskId },
        data: { sortOrder: index },
      })
    );

    await Promise.all(updates);

    // Return updated subtasks
    const updatedSubtasks = await db.subtask.findMany({
      where: { taskId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(updatedSubtasks);
  } catch (error) {
    console.error("Subtask reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder subtasks" },
      { status: 500 }
    );
  }
}

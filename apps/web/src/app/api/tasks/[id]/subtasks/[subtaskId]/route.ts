import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const auth = await requireRole('OWNER', 'COORDINATOR');
    if (!auth.ok) return auth.response;

    const { id, subtaskId } = await params;

    const subtask = await db.subtask.findUnique({
      where: { id: subtaskId, taskId: id },
      include: { task: { include: { subtasks: true } } },
    });

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const task = subtask.task;
    if (!subtask.isCompleted && task.taskId === 'REQ-M5-05') {
      const previousOpenStep = task.subtasks
        .filter((step) => step.sortOrder < subtask.sortOrder)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .find((step) => !step.isCompleted);
      if (previousOpenStep) {
        return NextResponse.json(
          { error: "Complete the diagnosis checklist in order before proposing own tactics." },
          { status: 400 }
        );
      }
    }

    const updated = await db.subtask.update({
      where: { id: subtaskId },
      data: { isCompleted: !subtask.isCompleted },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Toggle subtask API error:", error);
    return NextResponse.json(
      { error: "Failed to toggle subtask" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const auth = await requireRole('OWNER', 'COORDINATOR');
    if (!auth.ok) return auth.response;

    const { id, subtaskId } = await params;

    const subtask = await db.subtask.findUnique({
      where: { id: subtaskId, taskId: id },
    });

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    await db.subtask.delete({ where: { id: subtaskId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete subtask API error:", error);
    return NextResponse.json(
      { error: "Failed to delete subtask" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { id, subtaskId } = await params;

    const subtask = await db.subtask.findUnique({
      where: { id: subtaskId, taskId: id },
    });

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
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
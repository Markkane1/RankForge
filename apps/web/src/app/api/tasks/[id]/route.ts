import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await db.task.findUnique({
      where: { id },
      include: {
        client: { select: { name: true } },
        assignedTo: { select: { name: true, role: true } },
        requestedBy: { select: { name: true, role: true } },
        subtasks: { orderBy: { sortOrder: 'asc' } },
        logs: {
          orderBy: { createdAt: "asc" },
        },
        approvals: {
          orderBy: { createdAt: "desc" },
          include: {
            requestedBy: { select: { name: true, role: true } },
            approvedBy: { select: { name: true, role: true } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Task detail API error:", error);
    return NextResponse.json(
      { error: "Failed to load task" },
      { status: 500 }
    );
  }
}
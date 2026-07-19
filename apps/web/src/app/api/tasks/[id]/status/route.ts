import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { TaskStatus } from "@rankforge/database";
import { emitRealtimeEvent } from "@/lib/realtime-server";
import { taskQueue } from "@rankforge/queue";
import * as Sentry from "@sentry/nextjs";

import { rateLimitSensitive } from "@/lib/rate-limit";
import { getSignInIp } from "@/lib/crypto";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getSignInIp(request);
    const rl = await rateLimitSensitive(ip, 'update_task');
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = z.object({
      status: z.enum([
        "NOT_STARTED", "IN_PROGRESS", "PENDING_APPROVAL", 
        "DONE", "FAILED", "BLOCKED", "DEFERRED"
      ])
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const newStatus = parsed.data.status as TaskStatus;

    // Ponytail: Synchronous state-machine validation before enqueuing
    if (newStatus === "DONE") {
      const task = await db.task.findUnique({
        where: { id },
        include: { subtasks: true }
      });
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      if (task.subtasks?.some(st => !st.isCompleted)) {
        return NextResponse.json(
          { error: "Cannot mark task as DONE: Pending subtasks exist." },
          { status: 400 }
        );
      }
    }

    // Ponytail: dispatch job to background queue instead of synchronous db write
    await taskQueue.add('UpdateTaskStatus', {
      id,
      status: newStatus,
      timestamp: Date.now()
    }, {
      removeOnComplete: true,
      removeOnFail: false,
    });

    // Return 202 Accepted instantly
    return NextResponse.json({ message: "Task update queued" }, { status: 202 });
  } catch (error) {
    // File 05 Guardrail: Replace empty/silent console log with Sentry
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to update task status" },
      { status: 500 }
    );
  }
}

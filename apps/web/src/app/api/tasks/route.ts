import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TaskStatus, TaskPriority } from "@rankforge/database";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { createTaskSchema } from "@/lib/validations";

const VALID_MODULES = ["M1", "M2", "M3", "M4", "M5", "M6", "META", "CORE"];

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rl = await rateLimitSensitive(ip, "task_create");
    if (!rl.success) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();

    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { title, description, clientId, module, priority, sprint, dueDate } = parsed.data;

    // Get first staff user as requester
    const firstStaff = await db.staffUser.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    const requestedById = firstStaff?.id ?? "system";

    const task = await db.task.create({
      data: {
        taskId: `NEW-${Date.now()}`,
        title: title.trim(),
        description: description?.trim() || null,
        clientId: clientId || null,
        module,
        priority,
        sprint: sprint ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "NOT_STARTED",
        requestedById,
      },
      include: {
        client: { select: { name: true } },
        assignedTo: { select: { name: true } },
        requestedBy: { select: { name: true, role: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Task create API error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const taskModule = searchParams.get("module");
    const priority = searchParams.get("priority");
    const clientId = searchParams.get("clientId");
    const search = searchParams.get("search");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : null;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : null;

    const where: Record<string, unknown> = {};

    if (status && Object.values(TaskStatus).includes(status as TaskStatus)) {
      where.status = status;
    }

    if (taskModule) {
      where.module = taskModule;
    }

    if (priority && Object.values(TaskPriority).includes(priority as TaskPriority)) {
      where.priority = priority;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const totalCount = await db.task.count({ where });

    let skip: number | undefined = undefined;
    let take: number | undefined = undefined;
    if (page !== null && limit !== null) {
      skip = (page - 1) * limit;
      take = limit;
    }

    const tasks = await db.task.findMany({
      where,
      orderBy: [
        { priority: "asc" },
        { updatedAt: "desc" },
      ],
      skip,
      take,
      include: {
        client: { select: { name: true } },
        assignedTo: { select: { name: true } },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (page !== null && limit !== null) {
      return NextResponse.json({
        data: tasks,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Tasks list API error:", error);
    return NextResponse.json(
      { error: "Failed to load tasks" },
      { status: 500 }
    );
  }
}

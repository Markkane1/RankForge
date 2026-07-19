import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Only CSV files are accepted" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const titleIdx = headers.indexOf("title");
    if (titleIdx === -1) {
      return NextResponse.json({ error: "CSV must have a 'title' column" }, { status: 400 });
    }

    const fieldMap: Record<string, number> = {};
    for (const key of ["client", "module", "priority", "status", "description", "duedate"]) {
      fieldMap[key] = headers.indexOf(key);
    }

    const VALID_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    const VALID_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "PENDING_APPROVAL", "DONE", "FAILED", "BLOCKED", "DEFERRED"];

    const errors: string[] = [];
    const tasks: Array<{
      title: string;
      taskId: string;
      clientId?: string;
      module: string;
      priority: string;
      status: string;
      description?: string;
      dueDate?: Date;
      organizationId: string;
    }> = [];

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 500 });
    }

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const title = cols[titleIdx]?.trim();
      if (!title) {
        errors.push(`Row ${i + 1}: empty title, skipped`);
        continue;
      }

      const getValue = (idx: number) => (idx >= 0 && cols[idx] ? cols[idx].trim() : undefined);

      // Resolve client
      let clientId: string | undefined;
      const clientValue = getValue(fieldMap.client);
      if (clientValue) {
        const client = await db.client.findFirst({
          where: {
            OR: [
              { slug: { contains: clientValue.toLowerCase() } },
              { name: { contains: clientValue } },
              { businessName: { contains: clientValue } },
            ],
            organizationId: org.id,
          },
        });
        if (client) {
          clientId = client.id;
        } else {
          errors.push(`Row ${i + 1}: client "${clientValue}" not found, task created without client`);
        }
      }

      const priority = getValue(fieldMap.priority)?.toUpperCase();
      const status = getValue(fieldMap.status)?.toUpperCase();
      const dueDateStr = getValue(fieldMap.duedate);
      const taskModule = getValue(fieldMap.module) || "M1";

      tasks.push({
        title,
        taskId: `TASK-${Date.now()}-${i}`,
        clientId,
        module: taskModule,
        priority: priority && VALID_PRIORITIES.includes(priority) ? priority : "MEDIUM",
        status: status && VALID_STATUSES.includes(status) ? status : "NOT_STARTED",
        description: getValue(fieldMap.description) || undefined,
        dueDate: dueDateStr ? new Date(dueDateStr) : undefined,
        organizationId: org.id,
      });
    }

    if (tasks.length === 0) {
      return NextResponse.json({ imported: 0, errors });
    }

    await db.task.createMany({
      data: tasks.map((t) => ({
        taskId: t.taskId,
        title: t.title,
        clientId: t.clientId,
        module: t.module,
        priority: t.priority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        status: t.status as "NOT_STARTED" | "IN_PROGRESS" | "PENDING_APPROVAL" | "DONE" | "FAILED" | "BLOCKED" | "DEFERRED",
        description: t.description,
        dueDate: t.dueDate,
        organizationId: t.organizationId,
      })),
    });

    return NextResponse.json({ imported: tasks.length, errors });
  } catch (error) {
    console.error("Task CSV import error:", error);
    return NextResponse.json({ error: "Failed to import tasks" }, { status: 500 });
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (inQuotes) {
      if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
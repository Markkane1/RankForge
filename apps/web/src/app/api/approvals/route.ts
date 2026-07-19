import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApprovalStatus } from "@rankforge/database";
import { requireSession } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { clientId, taskId, title, description, requestType, requestData } = body;

    // Validation
    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json(
        { error: "Title is required and must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim().length < 3) {
      return NextResponse.json(
        { error: "Description is required and must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (!requestType || typeof requestType !== "string" || requestType.trim().length === 0) {
      return NextResponse.json(
        { error: "Request type is required" },
        { status: 400 }
      );
    }

    // Get first staff user as requester
    const firstStaff = await db.staffUser.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    const requestedById = firstStaff?.id ?? "system";

    const approval = await db.approvalRequest.create({
      data: {
        clientId: clientId || null,
        taskId: taskId || null,
        title: title.trim(),
        description: description.trim(),
        requestType: requestType.trim(),
        requestData: requestData?.trim() || null,
        status: "PENDING",
        requestedById,
      },
      include: {
        client: { select: { name: true } },
        requestedBy: { select: { name: true, role: true } },
        approvedBy: { select: { name: true } },
      },
    });

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    console.error("Approval create API error:", error);
    return NextResponse.json(
      { error: "Failed to create approval request" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (status && Object.values(ApprovalStatus).includes(status as ApprovalStatus)) {
      where.status = status;
    }

    const include = {
      client: { select: { name: true } },
      requestedBy: { select: { name: true, role: true } },
      approvedBy: { select: { name: true } },
    };

    // If filtering to a specific status, just do a single query
    if (status) {
      const approvals = await db.approvalRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include,
      });
      return NextResponse.json(approvals);
    }

    // Otherwise: PENDING first (by createdAt asc), then others by updatedAt desc
    const [pending, others] = await Promise.all([
      db.approvalRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include,
      }),
      db.approvalRequest.findMany({
        where: { status: { not: "PENDING" } },
        orderBy: { updatedAt: "desc" },
        include,
      }),
    ]);

    return NextResponse.json([...pending, ...others]);
  } catch (error) {
    console.error("Approvals list API error:", error);
    return NextResponse.json(
      { error: "Failed to load approvals" },
      { status: 500 }
    );
  }
}

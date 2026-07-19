import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const organization = await db.organization.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const [staff, clientCount, taskCount, approvalCount] = await Promise.all([
      db.staffUser.findMany({
        where: { organizationId: organization.id },
        orderBy: { createdAt: "asc" },
      }),
      db.client.count({
        where: { organizationId: organization.id },
      }),
      db.task.count(),
      db.approvalRequest.count(),
    ]);

    return NextResponse.json({
      organization,
      staff,
      summary: {
        clients: clientCount,
        tasks: taskCount,
        approvals: approvalCount,
      },
    });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { error: "Failed to load settings data" },
      { status: 500 }
    );
  }
}
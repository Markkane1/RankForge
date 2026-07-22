import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const orgId = auth.user.organizationId;
    const organization = await db.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const [staff, clientCount, taskCount, approvalCount] = await Promise.all([
      db.staffUser.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "asc" },
      }),
      db.client.count({
        where: { organizationId: orgId },
      }),
      db.task.count({
        where: {
          OR: [
            { client: { organizationId: orgId } },
            { requestedBy: { organizationId: orgId } },
          ],
        },
      }),
      db.approvalRequest.count({
        where: {
          OR: [
            { client: { organizationId: orgId } },
            { requestedBy: { organizationId: orgId } },
          ],
        },
      }),
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
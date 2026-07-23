import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string }> },
) {
  try {
    const { id: clientId, gbpId } = await params;
    const auth = await requireClientRole(
      clientId,
      "OWNER",
      "COORDINATOR",
      "VIEWER",
      "APPROVER",
    );
    if (!auth.ok) return auth.response;

    const posts = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpPost.findMany({
        where: { gbpProfileId: gbpId, gbpProfile: { clientId } },
        orderBy: { startDate: "asc" },
      }),
    );

    return NextResponse.json(posts);
  } catch (error) {
    console.error("GBP posts GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GBP posts" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { requireClientRole } from "@/lib/auth-guard";
import { withClientTenant } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  const auth = await requireClientRole(
    clientId,
    "OWNER",
    "COORDINATOR",
    "APPROVER",
    "VIEWER",
  );
  if (!auth.ok) return auth.response;

  const metric = await withClientTenant(clientId, (tenantDb) =>
    tenantDb.secondaryReviewMetric.findUnique({ where: { clientId } }),
  );

  return NextResponse.json(
    metric ?? {
      clientId,
      facebookCount: 0,
      facebookRating: 0,
      trustpilotCount: 0,
      trustpilotRating: 0,
      lastSyncedAt: null,
    },
  );
}

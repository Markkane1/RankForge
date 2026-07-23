import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clientId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const newProfile = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProfile.create({
        data: {
          clientId,
          gbpAccountId: body.gbpAccountId || null,
          gbpLocationId: body.gbpLocationId || null,
          gbpLocationName: body.gbpLocationName || null,
        },
        include: { reviews: { select: { rating: true } } },
      }),
    );

    return NextResponse.json(newProfile, { status: 201 });
  } catch (error) {
    console.error("GBP profile POST error:", error);
    return NextResponse.json(
      { error: "Failed to create GBP profile" },
      { status: 500 },
    );
  }
}

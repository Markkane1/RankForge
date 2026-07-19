import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId } = await params;
    const body = await request.json();

    const newProfile = await db.gbpProfile.create({
      data: {
        clientId,
        gbpAccountId: body.gbpAccountId || null,
        gbpLocationId: body.gbpLocationId || null,
        gbpLocationName: body.gbpLocationName || null,
      },
      include: { reviews: { select: { rating: true } } },
    });

    return NextResponse.json(newProfile, { status: 201 });
  } catch (error) {
    console.error("GBP profile POST error:", error);
    return NextResponse.json(
      { error: "Failed to create GBP profile" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR', 'VIEWER');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId } = await params;

    const posts = await db.gbpPost.findMany({
      where: { gbpProfileId: gbpId, gbpProfile: { clientId } },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("GBP posts GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GBP posts" },
      { status: 500 }
    );
  }
}

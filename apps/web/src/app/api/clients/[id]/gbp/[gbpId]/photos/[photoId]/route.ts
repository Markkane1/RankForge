import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string; photoId: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId, photoId } = await params;

    const photo = await db.gbpPhoto.findFirst({
      where: { id: photoId, gbpProfileId: gbpId, gbpProfile: { clientId } },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    await db.gbpPhoto.delete({
      where: { id: photoId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("GBP photo DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete GBP photo" },
      { status: 500 }
    );
  }
}

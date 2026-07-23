import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { readFile, unlink } from "fs/promises";
import path from "path";

function storedPhotoPath(gbpId: string, url: string) {
  const parsed = new URL(url, "http://rankforge.local");
  const storedName =
    parsed.searchParams.get("name") ?? parsed.pathname.split("/").pop();
  if (!storedName) return null;
  return path.join(process.cwd(), ".storage", "gbp-photos", gbpId, storedName);
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; gbpId: string; photoId: string }> },
) {
  try {
    const { id: clientId, gbpId, photoId } = await params;
    const auth = await requireClientRole(
      clientId,
      "OWNER",
      "COORDINATOR",
      "VIEWER",
      "APPROVER",
    );
    if (!auth.ok) return auth.response;

    const photo = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpPhoto.findFirst({
        where: { id: photoId, gbpProfileId: gbpId, gbpProfile: { clientId } },
      }),
    );

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const filePath = storedPhotoPath(gbpId, photo.url);
    if (!filePath) {
      return NextResponse.json(
        { error: "Photo file not found" },
        { status: 404 },
      );
    }

    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("GBP photo GET error:", error);
    return NextResponse.json(
      { error: "Failed to read GBP photo" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; gbpId: string; photoId: string }> },
) {
  try {
    const { id: clientId, gbpId, photoId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const photo = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpPhoto.findFirst({
        where: { id: photoId, gbpProfileId: gbpId, gbpProfile: { clientId } },
      }),
    );

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const filePath = storedPhotoPath(gbpId, photo.url);
    await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpPhoto.delete({
        where: { id: photoId },
      }),
    );
    if (filePath) {
      await unlink(filePath).catch(() => undefined);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("GBP photo DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete GBP photo" },
      { status: 500 },
    );
  }
}

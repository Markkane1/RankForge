import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const NAME_REGEX = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9]+$/;

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

    const photos = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpPhoto.findMany({
        where: { gbpProfileId: gbpId, gbpProfile: { clientId } },
        orderBy: { createdAt: "desc" },
      }),
    );

    return NextResponse.json(photos);
  } catch (error) {
    console.error("GBP photos GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GBP photos" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string }> },
) {
  try {
    const { id: clientId, gbpId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;
    const normalizedCategory = category?.trim();

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!normalizedCategory) {
      return NextResponse.json(
        { error: "Photo category tag is required" },
        { status: 400 },
      );
    }

    // 1. LINTER: File Size Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image size exceeds 5MB limit. Please optimize your photo." },
        { status: 400 },
      );
    }

    // 2. LINTER: Mime Type Validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file format. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 },
      );
    }

    // 3. LINTER: File Naming Rules
    if (!NAME_REGEX.test(file.name)) {
      return NextResponse.json(
        {
          error:
            "Invalid filename. No spaces or special characters allowed. Use alphanumeric, dashes, or underscores.",
        },
        { status: 400 },
      );
    }

    // Verify profile exists
    const profile = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProfile.findUnique({
        where: { id: gbpId, clientId },
      }),
    );

    if (!profile) {
      return NextResponse.json(
        { error: "GBP profile not found" },
        { status: 404 },
      );
    }

    const uploadDir = path.join(process.cwd(), ".storage", "gbp-photos", gbpId);
    const storedName = `${Date.now()}-${file.name}`;
    await mkdir(uploadDir, { recursive: true });
    await writeFile(
      path.join(uploadDir, storedName),
      Buffer.from(await file.arrayBuffer()),
    );
    const photoUrl = `/api/clients/${clientId}/gbp/${gbpId}/photos/__PHOTO_ID__`;

    const newPhoto = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpPhoto.create({
        data: {
          gbpProfileId: gbpId,
          url: photoUrl,
          category: normalizedCategory,
          uploadedAt: new Date(),
        },
      }),
    );

    const photoWithReadUrl = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpPhoto.update({
        where: { id: newPhoto.id },
        data: {
          url: `/api/clients/${clientId}/gbp/${gbpId}/photos/${newPhoto.id}?name=${encodeURIComponent(storedName)}`,
        },
      }),
    );

    return NextResponse.json(photoWithReadUrl, { status: 201 });
  } catch (error) {
    console.error("GBP photos POST error:", error);
    return NextResponse.json(
      { error: "Failed to upload GBP photo" },
      { status: 500 },
    );
  }
}

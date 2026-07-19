import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const NAME_REGEX = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9]+$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR', 'VIEWER');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId } = await params;

    const photos = await db.gbpPhoto.findMany({
      where: { gbpProfileId: gbpId, gbpProfile: { clientId } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("GBP photos GET error:", error);
    return NextResponse.json({ error: "Failed to fetch GBP photos" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. LINTER: File Size Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image size exceeds 5MB limit. Please optimize your photo." }, { status: 400 });
    }

    // 2. LINTER: Mime Type Validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file format. Only JPEG, PNG, and WebP are allowed." }, { status: 400 });
    }

    // 3. LINTER: File Naming Rules
    if (!NAME_REGEX.test(file.name)) {
      return NextResponse.json(
        { error: "Invalid filename. No spaces or special characters allowed. Use alphanumeric, dashes, or underscores." },
        { status: 400 }
      );
    }

    // Verify profile exists
    const profile = await db.gbpProfile.findUnique({
      where: { id: gbpId, clientId },
    });

    if (!profile) {
      return NextResponse.json({ error: "GBP profile not found" }, { status: 404 });
    }

    // Mock an upload path instead of writing to disk/S3
    const mockUrl = `/mock-uploads/${gbpId}-${Date.now()}-${file.name}`;

    const newPhoto = await db.gbpPhoto.create({
      data: {
        gbpProfileId: gbpId,
        url: mockUrl,
        category: category || "EXTERIOR",
        uploadedAt: new Date(),
      },
    });

    return NextResponse.json(newPhoto, { status: 201 });
  } catch (error) {
    console.error("GBP photos POST error:", error);
    return NextResponse.json(
      { error: "Failed to upload GBP photo" },
      { status: 500 }
    );
  }
}

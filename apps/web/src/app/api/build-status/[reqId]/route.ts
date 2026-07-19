import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ReqStatus } from "@rankforge/database";
import { requireOwner } from "@/lib/auth-guard";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reqId: string }> }
) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const { reqId } = await params;
    const body = await request.json();
    const { status, note } = body as { status: string; note?: string };

    if (!status || !Object.values(ReqStatus).includes(status as ReqStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Object.values(ReqStatus).join(", ")}` },
        { status: 400 }
      );
    }

    const requirement = await db.buildRequirement.findUnique({
      where: { reqId },
    });

    if (!requirement) {
      return NextResponse.json(
        { error: "Build requirement not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      status: status as ReqStatus,
    };

    if (note !== undefined) {
      updateData.note = note;
    }

    const updated = await db.buildRequirement.update({
      where: { reqId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Build requirement update API error:", error);
    return NextResponse.json(
      { error: "Failed to update build requirement" },
      { status: 500 }
    );
  }
}

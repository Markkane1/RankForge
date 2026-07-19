import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";
import { updateClientNotesSchema } from "@/lib/validations";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    
    const parsed = updateClientNotesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }
    
    const { notes } = parsed.data;

    const client = await db.client.findUnique({ where: { id } });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const updated = await db.client.update({
      where: { id },
      data: { notes },
    });

    // Create change log entry for the notes update
    await db.changeLogEntry.create({
      data: {
        clientId: id,
        module: "CORE",
        entityType: "Client",
        entityId: id,
        field: "notes",
        oldValue: client.notes || "",
        newValue: notes,
        changedById: auth.user.id,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Client notes update API error:", error);
    return NextResponse.json(
      { error: "Failed to update client notes" },
      { status: 500 }
    );
  }
}
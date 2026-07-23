import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { updateClientNotesSchema } from "@/lib/validations";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireClientRole(id, "OWNER", "COORDINATOR");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    const parsed = updateClientNotesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { notes } = parsed.data;

    const client = await withClientTenant(id, (tenantDb) =>
      tenantDb.client.findUnique({ where: { id } }),
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const updated = await withClientTenant(id, async (tenantDb) => {
      const updated = await tenantDb.client.update({
        where: { id },
        data: { notes },
      });

      await tenantDb.changeLogEntry.create({
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

      return updated;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Client notes update API error:", error);
    return NextResponse.json(
      { error: "Failed to update client notes" },
      { status: 500 },
    );
  }
}

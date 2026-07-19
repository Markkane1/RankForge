import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const client = await db.client.findUnique({ where: { id } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const entries = await db.changeLogEntry.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        module: true,
        entityType: true,
        entityId: true,
        field: true,
        oldValue: true,
        newValue: true,
        changedById: true,
        createdAt: true,
        changedBy: {
          select: { name: true },
        },
      },
    });

    const result = entries.map((e) => ({
      id: e.id,
      module: e.module,
      entityType: e.entityType,
      entityId: e.entityId,
      field: e.field,
      oldValue: e.oldValue,
      newValue: e.newValue,
      changedById: e.changedById,
      changedByName: e.changedBy?.name ?? null,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Audit trail API error:", error);
    return NextResponse.json(
      { error: "Failed to load audit trail" },
      { status: 500 }
    );
  }
}
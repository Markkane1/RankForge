import { NextRequest, NextResponse } from "next/server";
import { db, withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await requireClientRole(
      id,
      "OWNER",
      "COORDINATOR",
      "VIEWER",
      "APPROVER",
    );
    if (!auth.ok) return auth.response;

    const client = await withClientTenant(id, (tenantDb) =>
      tenantDb.client.findUnique({ where: { id } }),
    );
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const entries = await withClientTenant(id, (tenantDb) =>
      tenantDb.changeLogEntry.findMany({
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
        },
      }),
    );

    // ponytail: resolve changedBy names in one batch lookup rather than N queries
    const uniqueUserIds = [
      ...new Set(entries.map((e) => e.changedById).filter(Boolean)),
    ] as string[];
    const users = uniqueUserIds.length
      ? await db.staffUser.findMany({
          where: { id: { in: uniqueUserIds } },
          select: { id: true, name: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

    const result = entries.map((e) => ({
      id: e.id,
      module: e.module,
      entityType: e.entityType,
      entityId: e.entityId,
      field: e.field,
      oldValue: e.oldValue,
      newValue: e.newValue,
      changedById: e.changedById,
      changedByName: e.changedById ? (userMap[e.changedById] ?? null) : null,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Audit trail API error:", error);
    return NextResponse.json(
      { error: "Failed to load audit trail" },
      { status: 500 },
    );
  }
}

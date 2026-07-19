import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1), 100);

    const where: Record<string, unknown> = {};
    if (userId) {
      where.userId = userId;
    }

    const [items, total, unread] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { ...where, isRead: false } }),
    ]);

    return NextResponse.json({
      items: items.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        relatedEntityId: n.relatedEntityId,
        relatedEntityType: n.relatedEntityType,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      total,
      unread,
    });
  } catch (error) {
    console.error("Notifications GET API error:", error);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { userId, type, title, message, relatedEntityId, relatedEntityType } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!type || typeof type !== "string") {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedEntityId: relatedEntityId ?? null,
        relatedEntityType: relatedEntityType ?? null,
      },
    });

    return NextResponse.json(
      {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.isRead,
        relatedEntityId: notification.relatedEntityId,
        relatedEntityType: notification.relatedEntityType,
        createdAt: notification.createdAt.toISOString(),
        updatedAt: notification.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Notifications POST API error:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { ids, id } = body as { ids?: string[]; id?: string };

    const idsToUpdate = ids ?? (id ? [id] : null);
    if (!idsToUpdate || !Array.isArray(idsToUpdate) || idsToUpdate.length === 0) {
      return NextResponse.json(
        { error: "ids (array) or id (string) is required" },
        { status: 400 }
      );
    }

    const result = await db.notification.updateMany({
      where: { id: { in: idsToUpdate } },
      data: { isRead: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Notifications PATCH API error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
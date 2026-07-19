import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LeadSource } from "@rankforge/database";
import { emitRealtimeEvent } from "@/lib/realtime-server";
import { requireSession } from "@/lib/auth-guard";
import { createLeadSchema } from "@/lib/validations";

const VALID_SOURCES = Object.values(LeadSource);

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const limitParam = searchParams.get("limit");
    const source = searchParams.get("source");

    const where: Record<string, unknown> = {};

    if (clientId) {
      where.clientId = clientId;
    }

    if (source && VALID_SOURCES.includes(source as LeadSource)) {
      where.source = source;
    }

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100) : 20;

    const leads = await db.leadLogEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        client: { select: { name: true } },
      },
    });

    return NextResponse.json(
      leads.map((l) => ({
        id: l.id,
        clientId: l.clientId,
        client: l.client,
        source: l.source,
        value: l.value,
        contactInfo: l.contactInfo,
        notes: l.notes,
        convertedAt: l.convertedAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Leads list API error:", error);
    return NextResponse.json(
      { error: "Failed to load leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { clientId, source, value, contactInfo, notes } = parsed.data;

    // Verify client exists
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const lead = await db.leadLogEntry.create({
      data: {
        clientId,
        source,
        value: value ?? null,
        contactInfo: contactInfo?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        client: { select: { name: true } },
      },
    });

    // Emit real-time event for new lead
    emitRealtimeEvent('notification', {
      userId: 'all',
      type: 'lead_converted',
      title: 'New Lead',
      message: `New lead created for ${client.name} via ${source}`,
    });

    return NextResponse.json(
      {
        id: lead.id,
        clientId: lead.clientId,
        client: lead.client,
        source: lead.source,
        value: lead.value,
        contactInfo: lead.contactInfo,
        notes: lead.notes,
        convertedAt: lead.convertedAt?.toISOString() ?? null,
        createdAt: lead.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lead create API error:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}

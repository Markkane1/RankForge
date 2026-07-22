import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { z } from "zod";

const conversionEventSchema = z.object({
  clientId: z.string().min(1),
  source: z.enum([
    "GBP_CALL",
    "GBP_DIRECTIONS",
    "GBP_WEBSITE",
    "FORM_SUBMISSION",
    "BOOKING",
    "PHONE_CALL",
    "WHATSAPP",
  ]),
  value: z.number().optional().nullable(),
  contactInfo: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const secret = process.env.CONVERSION_EVENT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Conversion event ingestion is not configured" }, { status: 503 });
  }

  if (request.headers.get("x-rankforge-event-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = conversionEventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid conversion event", details: parsed.error.format() }, { status: 400 });
  }

  const { clientId, source, value, contactInfo, metadata } = parsed.data;

  const lead = await withClientTenant(clientId, async (tenantDb) => {
    const client = await tenantDb.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) return null;

    return tenantDb.leadLogEntry.create({
      data: {
        clientId,
        source,
        value: value ?? null,
        contactInfo: contactInfo?.trim() || null,
        notes: JSON.stringify({
          ingestion: "conversion-event",
          receivedAt: new Date().toISOString(),
          metadata: metadata ?? {},
        }),
      },
    });
  });

  if (!lead) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ id: lead.id, source: lead.source, createdAt: lead.createdAt.toISOString() }, { status: 201 });
}

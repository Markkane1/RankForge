import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withClientTenant } from "@/lib/db";

const browserConversionSchema = z.object({
  clientId: z.string().min(1),
  source: z.enum(["PHONE_CALL", "WHATSAPP", "FORM_SUBMISSION", "BOOKING", "GBP_WEBSITE"]),
  value: z.number().optional().nullable(),
  contactInfo: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = browserConversionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid browser conversion event", details: parsed.error.format() }, { status: 400 });
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
          ingestion: "landing-page-conversion-element",
          receivedAt: new Date().toISOString(),
          metadata: metadata ?? {},
        }),
      },
    });
  });

  if (!lead) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  return NextResponse.json({ id: lead.id, source: lead.source, createdAt: lead.createdAt.toISOString() }, { status: 201 });
}

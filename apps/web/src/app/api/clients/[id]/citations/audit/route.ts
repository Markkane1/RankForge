import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClientRole } from "@/lib/auth-guard";
import { withClientTenant } from "@/lib/db";
import { BrightLocalClient } from "@/lib/integrations/brightlocal";

const citationAuditSchema = z.object({
  locationId: z.string().min(1),
});

function classifyNapStatus(raw: any) {
  const status = String(
    raw.napStatus ?? raw.nap_status ?? raw.status ?? "",
  ).toUpperCase();
  if (["CORRECT", "MATCHING", "MATCH"].includes(status)) return "CORRECT";
  if (["DUPLICATE", "DUPLICATES"].includes(status)) return "DUPLICATE";
  if (["DEAD", "BROKEN", "NOT_FOUND"].includes(status)) return "DEAD";
  return "WRONG";
}

function normalizeCitation(raw: any) {
  const platform = String(
    raw.platform ?? raw.site ?? raw.name ?? raw.directory ?? "",
  ).trim();
  if (!platform) return null;
  return {
    platform,
    url: raw.url ? String(raw.url) : null,
    napStatus: classifyNapStatus(raw),
    tier: Number(raw.tier ?? 1) || 1,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
  if (!auth.ok) return auth.response;

  const parsed = citationAuditSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid citation audit request",
        details: parsed.error.format(),
      },
      { status: 400 },
    );
  }

  const client = await withClientTenant(clientId, (tenantDb) =>
    tenantDb.client.findUnique({
      where: { id: clientId },
      select: { id: true, organizationId: true },
    }),
  );
  if (!client)
    return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const brightLocal = new BrightLocalClient(client.organizationId);
  await brightLocal.init();
  if (!brightLocal.isConnected) {
    return NextResponse.json(
      { error: "BrightLocal is required for citation audits" },
      { status: 424 },
    );
  }

  const report = await brightLocal.getCitationTrackerReport(
    parsed.data.locationId,
  );
  const rawCitations =
    report.citations ?? report.results ?? report.listings ?? [];
  const citations = rawCitations.map(normalizeCitation).filter(Boolean);

  const saved = await withClientTenant(clientId, (tenantDb) =>
    Promise.all(
      citations.map((citation: any) =>
        tenantDb.citationRecord.upsert({
          where: { id: `${clientId}:${citation.platform}` },
          update: {
            url: citation.url,
            napStatus: citation.napStatus,
            tier: citation.tier,
            status:
              citation.napStatus === "CORRECT" ? "VERIFIED" : "NEEDS_REVIEW",
            lastVerifiedAt: new Date(),
          },
          create: {
            id: `${clientId}:${citation.platform}`,
            clientId,
            platform: citation.platform,
            url: citation.url,
            napStatus: citation.napStatus,
            tier: citation.tier,
            status:
              citation.napStatus === "CORRECT" ? "VERIFIED" : "NEEDS_REVIEW",
            lastVerifiedAt: new Date(),
          },
        }),
      ),
    ),
  );

  return NextResponse.json({ imported: saved.length }, { status: 201 });
}

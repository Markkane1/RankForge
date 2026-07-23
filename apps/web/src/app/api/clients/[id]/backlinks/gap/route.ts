import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClientRole } from "@/lib/auth-guard";
import { withClientTenant } from "@/lib/db";
import { DataForSeoClient } from "@/lib/integrations/dataforseo";

const backlinkGapSchema = z.object({
  competitorUrl: z.string().url(),
  allowPaidPlacement: z.literal(false).optional(),
});

const PAID_LINK_PLACEMENT_PROHIBITED =
  "Paid link placement is prohibited; this endpoint only records reviewable backlink opportunities.";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  const auth = await requireClientRole(
    clientId,
    "OWNER",
    "COORDINATOR",
    "APPROVER",
    "VIEWER",
  );
  if (!auth.ok) return auth.response;

  const opportunities = await withClientTenant(clientId, (tenantDb) =>
    tenantDb.backlinkOpportunity.findMany({
      where: { clientId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  );

  return NextResponse.json(opportunities);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  if (body.allowPaidPlacement === true || body.purchaseLinks === true) {
    return NextResponse.json(
      { error: PAID_LINK_PLACEMENT_PROHIBITED },
      { status: 400 },
    );
  }

  const parsed = backlinkGapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid backlink gap request", details: parsed.error.format() },
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

  const dataForSeo = new DataForSeoClient(client.organizationId);
  await dataForSeo.init();
  if (!dataForSeo.isConnected) {
    return NextResponse.json(
      { error: "DataForSEO Backlinks API is required for backlink gap pulls" },
      { status: 424 },
    );
  }

  const opportunities = await dataForSeo.getBacklinkGap(
    parsed.data.competitorUrl,
  );
  const saved = await withClientTenant(clientId, async (tenantDb) => {
    const rows = [];
    for (const opportunity of opportunities) {
      const existing = await tenantDb.backlinkOpportunity.findFirst({
        where: {
          clientId,
          competitorUrl: parsed.data.competitorUrl,
          url: opportunity.url,
        },
      });

      if (existing) {
        rows.push(
          await tenantDb.backlinkOpportunity.update({
            where: { id: existing.id },
            data: { domainRating: opportunity.domainRating },
          }),
        );
      } else {
        rows.push(
          await tenantDb.backlinkOpportunity.create({
            data: {
              clientId,
              url: opportunity.url,
              domainRating: opportunity.domainRating,
              competitorUrl: parsed.data.competitorUrl,
              status: "NEW",
            },
          }),
        );
      }
    }
    return rows;
  });

  return NextResponse.json(
    { imported: saved.length, policy: PAID_LINK_PLACEMENT_PROHIBITED },
    { status: 201 },
  );
}

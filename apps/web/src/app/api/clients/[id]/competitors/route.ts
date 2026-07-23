import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { DataForSeoClient } from "@/lib/integrations/dataforseo";
import { z } from "zod";

const competitorTeardownSchema = z.object({
  keywords: z.array(z.string().trim().min(1)).min(5),
  locationNames: z.array(z.string().trim().min(1)).min(3),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clientId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = competitorTeardownSchema.safeParse({
      keywords: body.keywords,
      locationNames: body.locationNames ?? body.location_names,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "At least 5 keywords and 3 geo-points are required for competitor teardown",
        },
        { status: 400 },
      );
    }
    const { keywords, locationNames } = parsed.data;

    const client = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.client.findUnique({ where: { id: clientId } }),
    );
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const dataForSeo = new DataForSeoClient(client.organizationId);
    await dataForSeo.init();

    if (!dataForSeo.isConnected) {
      return NextResponse.json(
        { error: "DataForSEO is required for live competitor teardown" },
        { status: 424 },
      );
    }

    // Trigger live SERP scraper
    const liveBenchmarks = await dataForSeo.getCompetitorBenchmarks(
      keywords,
      locationNames,
    );

    if (!liveBenchmarks || liveBenchmarks.length === 0) {
      return NextResponse.json(
        { message: "No competitors found" },
        { status: 200 },
      );
    }

    // Save to database
    await withClientTenant(clientId, (tenantDb) =>
      Promise.all(
        liveBenchmarks.map((b: any) =>
          tenantDb.competitorBenchmark.create({
            data: {
              clientId,
              competitorName: b.competitorName,
              competitorGbpId: b.competitorGbpId,
              competitorUrl: b.competitorUrl,
              categories: b.categories,
              avgRating: b.avgRating,
              reviewCount: b.reviewCount,
              photoCount: b.photoCount,
              sourceLineage: JSON.stringify(b.sourceLineage),
            },
          }),
        ),
      ),
    );

    return NextResponse.json(
      { imported: liveBenchmarks.length },
      { status: 201 },
    );
  } catch (error) {
    console.error("Competitor live fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch competitor benchmarks" },
      { status: 500 },
    );
  }
}

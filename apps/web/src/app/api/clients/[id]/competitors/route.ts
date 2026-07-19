import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { DataForSeoClient } from "@/lib/integrations/dataforseo";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId } = await params;
    const { keyword, location_name } = await request.json();

    if (!keyword || !location_name) {
      return NextResponse.json({ error: "keyword and location_name are required" }, { status: 400 });
    }

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const dataForSeo = new DataForSeoClient(client.organizationId);
    await dataForSeo.init();
    
    if (!dataForSeo.isConnected) {
       return NextResponse.json({ error: "DataForSEO is not connected for this organization" }, { status: 400 });
    }

    // Trigger live SERP scraper
    const liveBenchmarks = await dataForSeo.getCompetitorBenchmarks(keyword, location_name);
    
    if (!liveBenchmarks || liveBenchmarks.length === 0) {
       return NextResponse.json({ message: "No competitors found" }, { status: 200 });
    }

    // Save to database
    const operations = liveBenchmarks.map((b: any) => 
      db.competitorBenchmark.create({
        data: {
          clientId,
          competitorName: b.competitorName,
          competitorGbpId: b.competitorGbpId,
          competitorUrl: b.competitorUrl,
          categories: b.categories,
          avgRating: b.avgRating,
          reviewCount: b.reviewCount,
        }
      })
    );

    await db.$transaction([
      // Optionally clear old competitors for this keyword footprint
      // db.competitorBenchmark.deleteMany({ where: { clientId } }), 
      ...operations
    ]);

    return NextResponse.json({ imported: liveBenchmarks.length }, { status: 201 });
  } catch (error) {
    console.error("Competitor live fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch competitor benchmarks" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db, withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { decryptSecret } from "@/lib/crypto";
import { z } from "zod";

const runScanSchema = z.object({
  keyword: z.string().trim().min(1),
  gbpId: z.string().trim().min(1),
});

export async function GET(
  request: NextRequest,
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
    const gbpId = request.nextUrl.searchParams.get("gbpId");

    const scans = await withClientTenant(id, (tenantDb) =>
      tenantDb.geoGridScanResult.findMany({
        where: { clientId: id },
        orderBy: { scanDate: "desc" },
      }),
    );

    const filteredScans = gbpId
      ? scans.filter((scan) => {
          const lineage = scan.sourceLineage as {
            request?: { gbpProfileId?: string };
          } | null;
          return lineage?.request?.gbpProfileId === gbpId;
        })
      : scans;

    return NextResponse.json(filteredScans);
  } catch (error) {
    console.error("Geo-grid API error:", error);
    return NextResponse.json(
      { error: "Failed to load geo-grid scans" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await requireClientRole(id, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;
    const parsed = runScanSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "keyword and gbpId are required for multi-location geo-grid scans",
        },
        { status: 400 },
      );
    }
    const { keyword, gbpId } = parsed.data;

    // Fetch client and GBP profiles
    const client = await withClientTenant(id, (tenantDb) =>
      tenantDb.client.findUnique({
        where: { id },
        include: { gbpProfiles: true },
      }),
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const profile = client.gbpProfiles.find((p) => p.id === gbpId);
    if (!profile || !profile.gbpLocationId) {
      return NextResponse.json(
        { error: "Selected GBP profile does not have a location ID" },
        { status: 400 },
      );
    }

    let scanData: any = null;
    let averageRank = 0;
    let pointResults: any[] = [];

    // Check credentials
    const cred = await db.orgCredential.findFirst({
      where: {
        organizationId: client.organizationId,
        service: "LOCAL_FALCON",
        isValid: true,
      },
    });

    if (cred) {
      try {
        const apiKey = await decryptSecret(
          cred.encryptedKey,
          cred.keyId || undefined,
        );
        const response = await fetch(
          "https://api.localfalcon.com/api/v1/reports/run",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              location_id: profile.gbpLocationId,
              keyword: keyword,
              grid_size: "3x3",
              grid_radius: "1.0mi",
            }),
          },
        );
        if (response.ok) {
          scanData = await response.json();
        }
      } catch (err: any) {
        console.error("Local Falcon API error:", err);
      }
    }

    if (!scanData) {
      return NextResponse.json(
        {
          error:
            "Local Falcon scan unavailable. Configure a valid LOCAL_FALCON credential before saving geo-grid results.",
        },
        { status: 424 },
      );
    }

    averageRank = Number(
      scanData.averageRank ??
        scanData.average_rank ??
        scanData.report?.average_rank ??
        0,
    );
    pointResults =
      scanData.pointResults ?? scanData.points ?? scanData.results ?? scanData;
    const sourceLineage = {
      provider: "LOCAL_FALCON",
      endpoint: "https://api.localfalcon.com/api/v1/reports/run",
      request: {
        gbpProfileId: profile.id,
        locationId: profile.gbpLocationId,
        keyword,
        gridSize: "3x3",
        gridRadius: "1.0mi",
      },
      providerRunId:
        scanData.runId ?? scanData.run_id ?? scanData.report?.id ?? null,
      rawResponse: scanData,
    };

    // Save GeoGridScanResult
    const scan = await withClientTenant(id, (tenantDb) =>
      tenantDb.geoGridScanResult.create({
        data: {
          clientId: id,
          keyword,
          gridSize: 3,
          scanDate: new Date(),
          averageRank: parseFloat(averageRank.toFixed(2)),
          pointResults,
          sourceLineage,
        },
      }),
    );

    return NextResponse.json(scan);
  } catch (error) {
    console.error("Geo-grid scan POST error:", error);
    return NextResponse.json(
      { error: "Failed to run geo-grid scan" },
      { status: 500 },
    );
  }
}

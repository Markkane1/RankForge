import { NextRequest, NextResponse } from "next/server";
import { db, withClientTenant } from "@/lib/db";
import { requireClientRole, requireRole } from "@/lib/auth-guard";
import { requireApproval } from "@/lib/approval-guard";
import {
  hasKeywordStuffedBusinessName,
  updateClientSettingsSchema,
} from "@/lib/validations";
import { BrightLocalClient } from "@/lib/integrations/brightlocal";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await requireClientRole(id, "OWNER", "COORDINATOR", "VIEWER", "APPROVER");
    if (!auth.ok) return auth.response;

    const client = await withClientTenant(id, (tenantDb) =>
      tenantDb.client.findUnique({
        where: { id },
        include: {
          gbpProfiles: {
            include: {
              reviews: { select: { rating: true } },
            },
          },
          keywords: { orderBy: { priority: "asc" } },
          competitors: true,
          serviceAreas: { orderBy: { isPrimary: "desc" } },
          changeLog: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
          tasks: {
            orderBy: { updatedAt: "desc" },
            take: 10,
            include: {
              assignedTo: { select: { name: true } },
            },
          },
          leads: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      }),
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Compute GBP review stats
    const gbpProfilesData = client.gbpProfiles.map((profile) => {
      const { reviews, ...profileRest } = profile;
      const ratings = reviews.map((r) => r.rating);
      return {
        ...profileRest,
        reviewCount: ratings.length,
        avgRating:
          ratings.length > 0
            ? Number(
                (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(
                  1,
                ),
              )
            : null,
      };
    });

    // ─── Off-Profile Citation Consistency (REQ-M1-24) ───
    let totalCitations = 0;
    let weightedScoreSum = 0;
    let citationAverageScore = 0;

    const profileWithLocation = client.gbpProfiles.find((p) => p.gbpLocationId);

    if (client.organizationId && profileWithLocation?.gbpLocationId) {
      try {
        const blClient = new BrightLocalClient(client.organizationId);
        await blClient.init();
        const report = await blClient.getCitationTrackerReport(
          profileWithLocation.gbpLocationId,
        );
        const citations = report.citations ?? [];
        for (const c of citations) {
          const count = c.citationCount ?? 0;
          const score = c.keyCitationScore ?? 0;
          totalCitations += count;
          weightedScoreSum += score * count;
        }
        if (totalCitations > 0) {
          citationAverageScore =
            Math.round((weightedScoreSum / totalCitations) * 10) / 10;
        }
      } catch (e) {
        console.error("BrightLocal client citation fetch error:", e);
      }
    }

    // ─── Off-Profile Landing Page Schema Status (REQ-M1-24) ───
    let schemaStatus = "UNCHECKED";
    if (client.website) {
      try {
        const response = await fetch(client.website, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          next: { revalidate: 3600 },
        });
        const html = await response.text();
        if (
          html.includes("ld+json") &&
          (html.includes("LocalBusiness") ||
            html.includes("Organization") ||
            html.includes("PostalAddress"))
        ) {
          schemaStatus = "VALID";
        } else {
          schemaStatus = "MISSING_LOCAL_BUSINESS_SCHEMA";
        }
      } catch (e) {
        schemaStatus = "UNREACHABLE";
      }
    } else {
      schemaStatus = "WEBSITE_NOT_SET";
    }

    const { gbpProfiles: _gbpProfiles, ...clientWithoutGbp } = client;

    return NextResponse.json({
      ...clientWithoutGbp,
      gbpProfiles: gbpProfilesData,
      citationMetrics: {
        totalCitations,
        averageScore: totalCitations > 0 ? citationAverageScore : null,
      },
      landingPageSchemaStatus: schemaStatus,
    });
  } catch (error) {
    console.error("Client detail API error:", error);
    return NextResponse.json(
      { error: "Failed to load client" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("OWNER", "COORDINATOR");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = updateClientSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const client = await withClientTenant(id, (tenantDb) =>
      tenantDb.client.findUnique({ where: { id } }),
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const {
      businessName,
      phone,
      email,
      website,
      address,
      city,
      state,
      postalCode,
    } = parsed.data;

    // REQ-M1-09: Name keyword-stuffing linter
    if (businessName && businessName !== client.name) {
      if (hasKeywordStuffedBusinessName(businessName, client.name)) {
        return NextResponse.json(
          {
            error:
              "Linter Error: Keyword stuffing detected. The business name contains suspicious separators or location modifiers.",
          },
          { status: 400 },
        );
      }
    }

    const sensitiveChanges = {
      ...(businessName !== undefined && businessName !== client.businessName && { businessName }),
      ...(address !== undefined && address !== client.address && { address }),
      ...(city !== undefined && city !== client.city && { city }),
      ...(state !== undefined && state !== client.state && { state }),
      ...(postalCode !== undefined && postalCode !== client.postalCode && { postalCode }),
    };

    if (Object.keys(sensitiveChanges).length > 0) {
      await withClientTenant(id, (tenantDb) =>
        requireApproval(tenantDb, {
          clientId: id,
          title: "Client name/address change request",
          description: "Requested change to client identity or address fields.",
          requestType: "CLIENT_PROFILE_CHANGE",
          requestData: sensitiveChanges,
          requestedById: auth.user.id,
        }),
      );

      return NextResponse.json(
        { message: "Sensitive mutation intercepted. Approval request created." },
        { status: 202 },
      );
    }

    const updated = await withClientTenant(id, async (tenantDb) => {
      const saved = await tenantDb.client.update({
        where: { id },
        data: {
          ...(businessName !== undefined && { businessName }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(website !== undefined && { website }),
          ...(address !== undefined && { address }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(postalCode !== undefined && { postalCode }),
        },
      });

      await tenantDb.changeLogEntry.create({
        data: {
          clientId: id,
          module: "CORE",
          entityType: "Client",
          entityId: id,
          field: "client_settings",
          oldValue: "PREVIOUS_STATE",
          newValue: "UPDATED",
          changedById: auth.user.id,
        },
      });

      return saved;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Client update API error:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 },
    );
  }
}

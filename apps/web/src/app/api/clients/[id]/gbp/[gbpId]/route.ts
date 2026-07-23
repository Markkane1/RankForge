import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { requireApproval } from "@/lib/approval-guard";
import { containsListedName, updateGbpProfileSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string }> },
) {
  try {
    const { id: clientId, gbpId } = await params;
    const auth = await requireClientRole(
      clientId,
      "OWNER",
      "COORDINATOR",
      "VIEWER",
      "APPROVER",
    );
    if (!auth.ok) return auth.response;

    const profile = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProfile.findUnique({
        where: { id: gbpId, clientId },
        include: { reviews: { select: { rating: true } } },
      }),
    );

    if (!profile) {
      return NextResponse.json(
        { error: "GBP profile not found" },
        { status: 404 },
      );
    }

    const { reviews, ...rest } = profile;
    const ratings = reviews.map((r) => r.rating);

    return NextResponse.json({
      ...rest,
      reviewCount: ratings.length,
      avgRating:
        ratings.length > 0
          ? Number(
              (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
            )
          : null,
    });
  } catch (error) {
    console.error("GBP profile GET error:", error);
    return NextResponse.json(
      { error: "Failed to load GBP profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string }> },
) {
  try {
    const { id: clientId, gbpId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;
    const body = await request.json();

    const parsed = updateGbpProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const profile = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProfile.findUnique({
        where: { id: gbpId, clientId },
      }),
    );

    if (!profile) {
      return NextResponse.json(
        { error: "GBP profile not found" },
        { status: 404 },
      );
    }

    const {
      isVerified,
      gbpAccountId,
      gbpLocationId,
      primaryCategory,
      secondaryCategories,
      description,
      phone,
      websiteUrl,
    } = parsed.data;

    // ─── LINTERS & COMPLIANCE (`REQ-M1-09`, `REQ-M1-15`) ───
    if (description && description.length > 750) {
      return NextResponse.json(
        { error: "Linter Error: Description exceeds 750 characters limit." },
        { status: 400 },
      );
    }

    if (description) {
      const competitors = await withClientTenant(clientId, (tenantDb) =>
        tenantDb.competitorBenchmark.findMany({
          where: { clientId },
          select: { competitorName: true },
        }),
      );

      if (
        containsListedName(
          description,
          competitors.map((c) => c.competitorName),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Linter Error: Description cannot mention competitor business names.",
          },
          { status: 400 },
        );
      }
    }

    if (websiteUrl) {
      const isPrivateNetwork =
        /^(https?:\/\/)?(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/i.test(
          websiteUrl,
        );
      if (isPrivateNetwork) {
        return NextResponse.json(
          { error: "Linter Error: Private network URLs are not allowed." },
          { status: 400 },
        );
      }
    }

    const { bookingUrl, bookingUrlOverrideNote } = parsed.data;
    let bookingUrlWarning: { code: string; details: string } | null = null;

    // ─── LIVE BOOKING URL REACHABILITY CHECK (`REQ-M1-23`) ───
    if (bookingUrl && bookingUrl !== profile.bookingUrl) {
      const isPrivateNetwork =
        /^(https?:\/\/)?(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/i.test(
          bookingUrl,
        );
      if (isPrivateNetwork) {
        return NextResponse.json(
          {
            error:
              "Linter Error: Private network URLs are not allowed for booking links.",
          },
          { status: 400 },
        );
      }

      try {
        const fetchResult = await fetch(bookingUrl, {
          method: "HEAD",
          redirect: "follow",
        });
        if (!fetchResult.ok) {
          bookingUrlWarning = {
            code: "BOOKING_URL_UNREACHABLE",
            details: `URL returned status ${fetchResult.status}`,
          };
        }
      } catch (e) {
        bookingUrlWarning = {
          code: "BOOKING_URL_UNREACHABLE",
          details: "Failed to resolve booking URL",
        };
      }

      if (bookingUrlWarning && !bookingUrlOverrideNote) {
        return NextResponse.json(
          {
            error: bookingUrlWarning.code,
            warning: bookingUrlWarning,
            requiresOverrideNote: true,
          },
          { status: 422 },
        );
      }
    }

    // ─── 4-EYES APPROVAL GUARDS (`REQ-M6-APPR-01`) ───
    if (
      isVerified !== undefined &&
      Boolean(isVerified) !== profile.isVerified
    ) {
      await withClientTenant(clientId, (tenantDb) =>
        requireApproval(tenantDb, {
          clientId,
          title: "GBP verification status change request",
          description: `Requested to change GBP verification status from ${profile.isVerified} to ${Boolean(isVerified)}.`,
          requestType: "GBP_VERIFICATION",
          requestData: { gbpId, isVerified: Boolean(isVerified) },
          requestedById: auth.user.id,
        }),
      );

      return NextResponse.json(
        {
          message: "Sensitive mutation intercepted. Approval request created.",
        },
        { status: 202 },
      );
    }

    if (primaryCategory && primaryCategory !== profile.primaryCategory) {
      // Intercept sensitive mutation and route to Approval Queue
      await withClientTenant(clientId, (tenantDb) =>
        requireApproval(tenantDb, {
          clientId,
          title: "Primary Category Change Request",
          description: `Requested to change primary category from '${profile.primaryCategory || "None"}' to '${primaryCategory}'.`,
          requestType: "CATEGORY_CHANGE",
          requestData: { gbpId, primaryCategory },
          requestedById: auth.user.id,
        }),
      );

      return NextResponse.json(
        {
          message: "Sensitive mutation intercepted. Approval request created.",
        },
        { status: 202 },
      );
    }

    const { appendUtmTags } = await import("@/lib/utils");

    const updated = await withClientTenant(clientId, async (tenantDb) => {
      const updated = await tenantDb.gbpProfile.update({
        where: { id: gbpId, clientId },
        data: {
          ...(isVerified !== undefined && { isVerified: Boolean(isVerified) }),
          ...(gbpAccountId !== undefined && {
            gbpAccountId: String(gbpAccountId) || null,
          }),
          ...(gbpLocationId !== undefined && {
            gbpLocationId: String(gbpLocationId) || null,
          }),
          ...(secondaryCategories !== undefined && {
            secondaryCategories: String(secondaryCategories) || null,
          }),
          ...(description !== undefined && {
            description: String(description) || null,
          }),
          ...(phone !== undefined && { phone: String(phone) || null }),
          ...(websiteUrl !== undefined && {
            websiteUrl: appendUtmTags(String(websiteUrl)) || null,
          }),
          ...(bookingUrl !== undefined && {
            bookingUrl: String(bookingUrl) || null,
          }),
          ...(bookingUrlOverrideNote !== undefined && {
            bookingUrlOverrideNote: String(bookingUrlOverrideNote) || null,
          }),
        },
        include: { reviews: { select: { rating: true } } },
      });

      await tenantDb.changeLogEntry.create({
        data: {
          clientId,
          module: "M2",
          entityType: "GbpProfile",
          entityId: profile.id,
          field: "profile_data",
          oldValue: "PREVIOUS_STATE",
          newValue: "UPDATED",
          changedById: auth.user.id,
        },
      });

      if (bookingUrlWarning && bookingUrlOverrideNote) {
        await tenantDb.changeLogEntry.create({
          data: {
            clientId,
            module: "M1",
            entityType: "GbpProfile",
            entityId: profile.id,
            field: "booking_url_reachability_override",
            oldValue: bookingUrlWarning.details,
            newValue: bookingUrlOverrideNote,
            changedById: auth.user.id,
          },
        });
      }

      return updated;
    });

    const { reviews, ...rest } = updated;
    const ratings = reviews.map((r) => r.rating);

    return NextResponse.json({
      ...rest,
      reviewCount: ratings.length,
      avgRating:
        ratings.length > 0
          ? Number(
              (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
            )
          : null,
      warnings: bookingUrlWarning ? [bookingUrlWarning] : [],
    });
  } catch (error) {
    console.error("GBP profile PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update GBP profile" },
      { status: 500 },
    );
  }
}

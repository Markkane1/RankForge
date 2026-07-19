import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-guard";
import { updateGbpProfileSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, gbpId: string }> }
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId } = await params;

    const profile = await db.gbpProfile.findUnique({
      where: { id: gbpId, clientId },
      include: { reviews: { select: { rating: true } } },
    });

    if (!profile) {
      return NextResponse.json({ error: "GBP profile not found" }, { status: 404 });
    }

    const { reviews, ...rest } = profile;
    const ratings = reviews.map((r) => r.rating);

    return NextResponse.json({
      ...rest,
      reviewCount: ratings.length,
      avgRating:
        ratings.length > 0
          ? Number(
              (
                ratings.reduce((a, b) => a + b, 0) / ratings.length
              ).toFixed(1)
            )
          : null,
    });
  } catch (error) {
    console.error("GBP profile GET error:", error);
    return NextResponse.json(
      { error: "Failed to load GBP profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, gbpId: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId } = await params;
    const body = await request.json();

    const parsed = updateGbpProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const profile = await db.gbpProfile.findUnique({
      where: { id: gbpId, clientId },
    });

    if (!profile) {
      return NextResponse.json({ error: "GBP profile not found" }, { status: 404 });
    }

    const { isVerified, gbpAccountId, gbpLocationId, primaryCategory, secondaryCategories, description, phone, websiteUrl } = parsed.data;

    // ─── LINTERS & COMPLIANCE (`REQ-M1-09`, `REQ-M1-15`) ───
    if (description && description.length > 750) {
      return NextResponse.json({ error: "Linter Error: Description exceeds 750 characters limit." }, { status: 400 });
    }

    if (websiteUrl) {
      const isPrivateNetwork = /^(https?:\/\/)?(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/i.test(websiteUrl);
      if (isPrivateNetwork) {
        return NextResponse.json({ error: "Linter Error: Private network URLs are not allowed." }, { status: 400 });
      }
    }

    const { bookingUrl, bookingUrlOverrideNote } = parsed.data;

    // ─── LIVE BOOKING URL REACHABILITY CHECK (`REQ-M1-23`) ───
    if (bookingUrl && bookingUrl !== profile.bookingUrl) {
      const isPrivateNetwork = /^(https?:\/\/)?(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/i.test(bookingUrl);
      if (isPrivateNetwork) {
        return NextResponse.json({ error: "Linter Error: Private network URLs are not allowed for booking links." }, { status: 400 });
      }

      if (!bookingUrlOverrideNote) {
        try {
          const fetchResult = await fetch(bookingUrl, { method: 'HEAD', redirect: 'follow' });
          if (!fetchResult.ok) {
            return NextResponse.json(
              { error: "BOOKING_URL_UNREACHABLE", details: `URL returned status ${fetchResult.status}` },
              { status: 400 }
            );
          }
        } catch (e) {
          // fetch threw, e.g. dns fail
          return NextResponse.json(
            { error: "BOOKING_URL_UNREACHABLE", details: "Failed to resolve booking URL" },
            { status: 400 }
          );
        }
      }
    }

    // ─── 4-EYES APPROVAL GUARDS (`REQ-M6-APPR-01`) ───
    if (primaryCategory && primaryCategory !== profile.primaryCategory) {
      // Intercept sensitive mutation and route to Approval Queue
      await db.approvalRequest.create({
        data: {
          clientId,
          title: "Primary Category Change Request",
          description: `Requested to change primary category from '${profile.primaryCategory || "None"}' to '${primaryCategory}'.`,
          requestType: "CATEGORY_CHANGE",
          requestData: JSON.stringify({ primaryCategory }),
          status: "PENDING",
          requestedById: auth.user.id,
        }
      });
      
      return NextResponse.json(
        { message: "Sensitive mutation intercepted. Approval request created." },
        { status: 202 }
      );
    }

    const { appendUtmTags } = await import("@/lib/utils");
    
    const updated = await db.gbpProfile.update({
      where: { id: gbpId, clientId },
      data: {
        ...(isVerified !== undefined && { isVerified: Boolean(isVerified) }),
        ...(gbpAccountId !== undefined && { gbpAccountId: String(gbpAccountId) || null }),
        ...(gbpLocationId !== undefined && { gbpLocationId: String(gbpLocationId) || null }),
        ...(secondaryCategories !== undefined && { secondaryCategories: String(secondaryCategories) || null }),
        ...(description !== undefined && { description: String(description) || null }),
        ...(phone !== undefined && { phone: String(phone) || null }),
        ...(websiteUrl !== undefined && { websiteUrl: appendUtmTags(String(websiteUrl)) || null }),
        ...(bookingUrl !== undefined && { bookingUrl: String(bookingUrl) || null }),
        ...(bookingUrlOverrideNote !== undefined && { bookingUrlOverrideNote: String(bookingUrlOverrideNote) || null }),
      },
      include: { reviews: { select: { rating: true } } },
    });

    // Create change log entry for the GBP profile update
    await db.changeLogEntry.create({
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

    const { reviews, ...rest } = updated;
    const ratings = reviews.map((r) => r.rating);

    return NextResponse.json({
      ...rest,
      reviewCount: ratings.length,
      avgRating:
        ratings.length > 0
          ? Number(
              (
                ratings.reduce((a, b) => a + b, 0) / ratings.length
              ).toFixed(1)
            )
          : null,
    });
  } catch (error) {
    console.error("GBP profile PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update GBP profile" },
      { status: 500 }
    );
  }
}
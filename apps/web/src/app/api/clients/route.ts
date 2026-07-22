import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ClientState, ClientType } from "@rankforge/database";
import { requireSession, requireRole } from "@/lib/auth-guard";
import { requireApproval } from "@/lib/approval-guard";
import { createClientSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");
    const search = searchParams.get("search");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : null;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : null;

    const where: Record<string, unknown> = {};

    if (state && Object.values(ClientState).includes(state as ClientState)) {
      where.lifecycleState = state;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const totalCount = await db.client.count({ where });

    let skip: number | undefined = undefined;
    let take: number | undefined = undefined;
    if (page !== null && limit !== null) {
      skip = (page - 1) * limit;
      take = limit;
    }

    const clients = await db.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        gbpProfiles: {
          include: {
            reviews: { select: { rating: true } },
          },
        },
        tasks: {
          select: { status: true },
        },
      },
    });

    // Compute review aggregate and task counts by status
    const enriched = clients.map((client) => {
      const { tasks, gbpProfiles, ...rest } = client;

      // Task counts by status
      const taskCounts: Record<string, number> = {};
      for (const task of tasks) {
        taskCounts[task.status] = (taskCounts[task.status] || 0) + 1;
      }

      // GBP review stats
      let gbpProfileData: Record<string, unknown> | null = null;
      const gbpProfile = gbpProfiles[0] ?? null;
      if (gbpProfile) {
        const { reviews, ...profileRest } = gbpProfile;
        const ratings = reviews.map((r) => r.rating);
        gbpProfileData = {
          ...profileRest,
          reviewCount: ratings.length,
          avgRating:
            ratings.length > 0
              ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
              : null,
        };
      }

      return {
        ...rest,
        gbpProfile: gbpProfileData,
        taskCounts,
      };
    });

    if (page !== null && limit !== null) {
      return NextResponse.json({
        data: enriched,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    }

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Clients list API error:", error);
    return NextResponse.json(
      { error: "Failed to load clients" },
      { status: 500 }
    );
  }
}

import { rateLimitSensitive } from "@/lib/rate-limit";
import { getSignInIp } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const ip = getSignInIp(request);
    const rl = await rateLimitSensitive(ip, 'create_client');
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    
    // Validate required fields and sanitize URLs using Zod
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }
    
    const {
      name,
      businessName,
      phone,
      email,
      website,
      address,
      city,
      state,
      country,
      postalCode,
      type,
      notes,
      legalName,
      serviceList,
      whatsapp,
      existingGbpLoginDetails,
      pastSuspensions,
      photoAvailability,
      usps,
      bookingSystem,
      primaryCategory,
      secondaryCategories,
      gbpDescription,
      businessHours,
      serviceAreas,
    } = parsed.data;

    // Validate type if provided
    const clientType = type && Object.values(ClientType).includes(type as ClientType)
      ? (type as ClientType)
      : ClientType.SERVICE_AREA_BUSINESS;

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 500 }
      );
    }

    // ─── Conflict of Interest Scanner (`REQ-M6-06`) ───
    if (primaryCategory) {
      const overlappingClients = await db.client.findMany({
        where: {
          isActive: true,
          organizationId: org.id,
          gbpProfiles: { some: { primaryCategory } },
        },
        include: { serviceAreas: true }
      });

      for (const existing of overlappingClients) {
        let isConflict = false;
        if (city && existing.city?.toLowerCase() === city.toLowerCase()) {
          isConflict = true;
        }

        if (serviceAreas && serviceAreas.length > 0) {
          const incomingCities = serviceAreas.map((sa: any) => sa.city?.toLowerCase()).filter(Boolean);
          const existingCities = existing.serviceAreas.map(sa => sa.city?.toLowerCase()).filter(Boolean);
          if (incomingCities.some((c: string) => existingCities.includes(c))) {
            isConflict = true;
          }
        }

        if (isConflict) {
          const approval = await requireApproval(db, {
            title: `Conflict review: ${name}`,
            description: `Potential conflict with ${existing.name} in ${primaryCategory}.`,
            requestType: "CONFLICT_OF_INTEREST",
            requestData: {
              incoming: { name, businessName, primaryCategory, city, serviceAreas },
              existing: {
                id: existing.id,
                name: existing.name,
                city: existing.city,
                serviceAreas: existing.serviceAreas.map((sa) => ({
                  name: sa.name,
                  city: sa.city,
                  radiusMiles: sa.radiusMiles,
                })),
              },
            },
            requestedById: auth.user.id,
          });

          return NextResponse.json(
            {
              error: `Conflict of Interest: approval required before onboarding ${name}.`,
              approvalId: approval.id,
            },
            { status: 202 }
          );
        }
      }
    }

    // Auto-generate slug from name
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Create client with initial GBP profile
    const client = await db.client.create({
      data: {
        name: name.trim(),
        slug,
        businessName: businessName || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || "US",
        postalCode: postalCode || null,
        type: clientType,
        lifecycleState: "ONBOARDING",
        notes: notes || null,
        intakeData: JSON.stringify({
          legalName,
          serviceList: serviceList.split(",").map((item) => item.trim()).filter(Boolean),
          whatsapp: whatsapp || null,
          existingGbpLoginDetails,
          pastSuspensions,
          photoAvailability,
          usps,
          bookingSystem,
          businessHours,
          serviceAreaBusiness: clientType === ClientType.SERVICE_AREA_BUSINESS,
        }),
        isActive: true,
        organizationId: org.id,
        gbpProfiles: {
          create: {
            primaryCategory: primaryCategory || null,
            secondaryCategories: secondaryCategories || null,
            description: gbpDescription || null,
            phone: phone || null,
            websiteUrl: website || null,
            address: [address, city, state, postalCode].filter(Boolean).join(", ") || null,
          },
        },
        serviceAreas: serviceAreas && serviceAreas.length > 0
          ? {
              create: serviceAreas.map((sa: { name: string; city?: string; radiusMiles?: number; isPrimary: boolean }) => ({
                name: sa.name,
                city: sa.city || null,
                radiusMiles: sa.radiusMiles ?? null,
                isPrimary: sa.isPrimary ?? false,
              })),
            }
          : undefined,
      },
      include: {
        gbpProfile: {
          include: {
            reviews: { select: { rating: true } },
          },
        },
        tasks: {
          select: { status: true },
        },
      },
    });

    const { tasks, gbpProfiles, ...rest } = client;
    const taskCounts: Record<string, number> = {};
    for (const task of tasks) {
      taskCounts[task.status] = (taskCounts[task.status] || 0) + 1;
    }

    let gbpProfileData: Record<string, unknown> | null = null;
    const gbpProfile = gbpProfiles[0] ?? null;
    if (gbpProfile) {
      const { reviews, ...profileRest } = gbpProfile;
      gbpProfileData = {
        ...profileRest,
        reviewCount: reviews.length,
        avgRating: null,
      };
    }

    return NextResponse.json(
      { ...rest, gbpProfile: gbpProfileData, taskCounts },
      { status: 201 }
    );
  } catch (error) {
    console.error("Client creation API error:", error);
    const msg = error instanceof Error && error.message.includes("Unique")
      ? "A client with this slug already exists"
      : "Failed to create client";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

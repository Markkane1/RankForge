import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { gbpServiceSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string }> },
) {
  const auth = await requireRole("OWNER", "COORDINATOR", "VIEWER");
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId } = await params;

    const services = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpService.findMany({
        where: { gbpProfileId: gbpId, gbpProfile: { clientId } },
        orderBy: { createdAt: "desc" },
      })
    );

    return NextResponse.json(services);
  } catch (error) {
    console.error("GBP services GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GBP services" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string }> },
) {
  const auth = await requireRole("OWNER", "COORDINATOR");
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId } = await params;
    const body = await request.json();

    const parsed = gbpServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 },
      );
    }
    const { name, description, price, isPriceConfirmed } = parsed.data;

    // Verify GBP profile belongs to client
    const profile = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProfile.findUnique({
        where: { id: gbpId, clientId },
      })
    );

    if (!profile) {
      return NextResponse.json(
        { error: "GBP profile not found" },
        { status: 404 },
      );
    }

    const newService = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpService.create({
        data: {
          gbpProfileId: gbpId,
          name,
          description,
          price,
          isPriceConfirmed: Boolean(isPriceConfirmed),
        },
      })
    );

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    console.error("GBP services POST error:", error);
    return NextResponse.json(
      { error: "Failed to create GBP service" },
      { status: 500 },
    );
  }
}

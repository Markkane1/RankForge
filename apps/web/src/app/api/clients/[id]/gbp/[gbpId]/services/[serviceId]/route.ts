import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { updateGbpServiceSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; gbpId: string; serviceId: string }> },
) {
  try {
    const { id: clientId, gbpId, serviceId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const parsed = updateGbpServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 },
      );
    }
    const { name, description, price, isPriceConfirmed } = parsed.data;

    // Verify ownership
    const service = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpService.findFirst({
        where: { id: serviceId, gbpProfileId: gbpId, gbpProfile: { clientId } },
      }),
    );

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const updatedService = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpService.update({
        where: { id: serviceId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price }),
          ...(isPriceConfirmed !== undefined && {
            isPriceConfirmed: Boolean(isPriceConfirmed),
          }),
        },
      }),
    );

    return NextResponse.json(updatedService);
  } catch (error) {
    console.error("GBP service PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update GBP service" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; gbpId: string; serviceId: string }> },
) {
  try {
    const { id: clientId, gbpId, serviceId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    // Verify ownership
    const service = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpService.findFirst({
        where: { id: serviceId, gbpProfileId: gbpId, gbpProfile: { clientId } },
      }),
    );

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpService.delete({
        where: { id: serviceId },
      }),
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("GBP service DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete GBP service" },
      { status: 500 },
    );
  }
}

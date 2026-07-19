import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string; serviceId: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId, serviceId } = await params;
    const body = await request.json();

    const { name, description, price, isPriceConfirmed } = body;

    if (price && price > 0 && !isPriceConfirmed) {
      return NextResponse.json(
        { error: "Price confirmations must be strictly enforced before saving." },
        { status: 400 }
      );
    }

    // Verify ownership
    const service = await db.gbpService.findFirst({
      where: { id: serviceId, gbpProfileId: gbpId, gbpProfile: { clientId } },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const updatedService = await db.gbpService.update({
      where: { id: serviceId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(isPriceConfirmed !== undefined && { isPriceConfirmed: Boolean(isPriceConfirmed) }),
      },
    });

    return NextResponse.json(updatedService);
  } catch (error) {
    console.error("GBP service PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update GBP service" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string; serviceId: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId, serviceId } = await params;

    // Verify ownership
    const service = await db.gbpService.findFirst({
      where: { id: serviceId, gbpProfileId: gbpId, gbpProfile: { clientId } },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    await db.gbpService.delete({
      where: { id: serviceId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("GBP service DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete GBP service" },
      { status: 500 }
    );
  }
}

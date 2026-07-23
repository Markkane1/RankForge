import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { updateGbpProductSchema } from "@/lib/validations";

async function verifyLinkAlive(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000); // 5s timeout
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(id);
    return res.ok || (res.status >= 300 && res.status < 400); // Accept redirects
  } catch (err) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(id);
      return res.ok || (res.status >= 300 && res.status < 400);
    } catch {
      return false;
    }
  }
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; gbpId: string; productId: string }> },
) {
  try {
    const { id: clientId, gbpId, productId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const parsed = updateGbpProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 },
      );
    }
    const { name, description, price, category, url } = parsed.data;

    let isUrlValid = undefined;
    if (url !== undefined) {
      if (url === "" || url === null) {
        isUrlValid = false;
      } else {
        if (!/^https?:\/\//i.test(url)) {
          return NextResponse.json(
            { error: "Product URL must be a valid http or https link" },
            { status: 400 },
          );
        }

        isUrlValid = await verifyLinkAlive(url);
        if (!isUrlValid) {
          return NextResponse.json(
            {
              error:
                "Broken link detected. Please provide a live, accessible landing page URL.",
            },
            { status: 400 },
          );
        }
      }
    }

    const product = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProduct.findFirst({
        where: { id: productId, gbpProfileId: gbpId, gbpProfile: { clientId } },
      }),
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (category) {
      const service = await withClientTenant(clientId, (tenantDb) =>
        tenantDb.gbpService.findFirst({
          where: {
            gbpProfileId: gbpId,
            gbpProfile: { clientId },
            name: { equals: category, mode: "insensitive" },
          },
          select: { id: true },
        }),
      );

      if (!service) {
        return NextResponse.json(
          {
            error:
              "Product category must match an existing service for this GBP profile.",
          },
          { status: 400 },
        );
      }
    }

    const updatedProduct = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProduct.update({
        where: { id: productId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price }),
          ...(category !== undefined && { category }),
          ...(url !== undefined && { url }),
          ...(isUrlValid !== undefined && { isUrlValid }),
        },
      }),
    );

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("GBP product PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update GBP product" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; gbpId: string; productId: string }> },
) {
  try {
    const { id: clientId, gbpId, productId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const product = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProduct.findFirst({
        where: { id: productId, gbpProfileId: gbpId, gbpProfile: { clientId } },
      }),
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProduct.delete({
        where: { id: productId },
      }),
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("GBP product DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete GBP product" },
      { status: 500 },
    );
  }
}

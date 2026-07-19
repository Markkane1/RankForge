import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

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
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(id);
      return res.ok || (res.status >= 300 && res.status < 400);
    } catch {
      return false;
    }
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string; productId: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId, productId } = await params;
    const body = await request.json();

    const { name, description, price, category, url } = body;

    let isUrlValid = undefined;
    if (url !== undefined) {
      if (url === "" || url === null) {
        isUrlValid = false;
      } else {
        if (!/^https?:\/\//i.test(url)) {
          return NextResponse.json({ error: "Product URL must be a valid http or https link" }, { status: 400 });
        }
  
        isUrlValid = await verifyLinkAlive(url);
        if (!isUrlValid) {
          return NextResponse.json(
            { error: "Broken link detected. Please provide a live, accessible landing page URL." },
            { status: 400 }
          );
        }
      }
    }

    const product = await db.gbpProduct.findFirst({
      where: { id: productId, gbpProfileId: gbpId, gbpProfile: { clientId } },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updatedProduct = await db.gbpProduct.update({
      where: { id: productId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(category !== undefined && { category }),
        ...(url !== undefined && { url }),
        ...(isUrlValid !== undefined && { isUrlValid }),
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("GBP product PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update GBP product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string; productId: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId, productId } = await params;

    const product = await db.gbpProduct.findFirst({
      where: { id: productId, gbpProfileId: gbpId, gbpProfile: { clientId } },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await db.gbpProduct.delete({
      where: { id: productId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("GBP product DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete GBP product" },
      { status: 500 }
    );
  }
}

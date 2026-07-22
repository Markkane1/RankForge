import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { gbpProductSchema } from "@/lib/validations";

async function verifyLinkAlive(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000); // 5s timeout
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(id);
    return res.ok || (res.status >= 300 && res.status < 400); // Accept redirects
  } catch (err) {
    // If HEAD fails (e.g. CORS, method not allowed), try GET as fallback
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gbpId: string }> },
) {
  const auth = await requireRole("OWNER", "COORDINATOR", "VIEWER");
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId, gbpId } = await params;

    const products = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProduct.findMany({
        where: { gbpProfileId: gbpId, gbpProfile: { clientId } },
        orderBy: { createdAt: "desc" },
      })
    );

    return NextResponse.json(products);
  } catch (error) {
    console.error("GBP products GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GBP products" },
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

    const parsed = gbpProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 },
      );
    }
    const { name, description, price, category, url } = parsed.data;

    let isUrlValid = false;
    if (url) {
      // Validate the URL format and alive status
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

    const service = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpService.findFirst({
        where: {
          gbpProfileId: gbpId,
          gbpProfile: { clientId },
          name: { equals: category, mode: "insensitive" },
        },
        select: { id: true },
      })
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

    const newProduct = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.gbpProduct.create({
        data: {
          gbpProfileId: gbpId,
          name,
          description,
          price,
          category,
          url,
          isUrlValid,
        },
      })
    );

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("GBP products POST error:", error);
    return NextResponse.json(
      { error: "Failed to create GBP product" },
      { status: 500 },
    );
  }
}

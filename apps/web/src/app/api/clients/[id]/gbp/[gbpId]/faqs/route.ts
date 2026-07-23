import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { z } from "zod";

const createFaqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; gbpId: string } },
) {
  try {
    const auth = await requireClientRole(
      params.id,
      "OWNER",
      "COORDINATOR",
      "VIEWER",
      "APPROVER",
    );
    if (!auth.ok) return auth.response;

    const faqs = await withClientTenant(params.id, (tenantDb) =>
      tenantDb.gbpFaq.findMany({
        where: {
          gbpProfileId: params.gbpId,
          gbpProfile: { clientId: params.id },
        },
        orderBy: { createdAt: "desc" },
      }),
    );

    return NextResponse.json(faqs);
  } catch (error) {
    console.error("GET GBP FAQs error:", error);
    return NextResponse.json({ error: "Failed to load FAQs" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; gbpId: string } },
) {
  try {
    const auth = await requireClientRole(params.id, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = createFaqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const faq = await withClientTenant(params.id, async (tenantDb) => {
      const profile = await tenantDb.gbpProfile.findUnique({
        where: { id: params.gbpId, clientId: params.id },
      });

      if (!profile) {
        return null;
      }

      return tenantDb.gbpFaq.create({
        data: {
          gbpProfileId: params.gbpId,
          question: parsed.data.question,
          answer: parsed.data.answer,
        },
      });
    });

    if (!faq) {
      return NextResponse.json(
        { error: "GBP profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(faq, { status: 201 });
  } catch (error) {
    console.error("POST GBP FAQ error:", error);
    return NextResponse.json(
      { error: "Failed to create FAQ" },
      { status: 500 },
    );
  }
}

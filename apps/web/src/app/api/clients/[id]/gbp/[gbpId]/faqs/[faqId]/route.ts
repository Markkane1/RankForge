import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; gbpId: string; faqId: string } },
) {
  try {
    const auth = await requireClientRole(params.id, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const faq = await withClientTenant(params.id, async (tenantDb) => {
      const faq = await tenantDb.gbpFaq.findFirst({
        where: {
          id: params.faqId,
          gbpProfileId: params.gbpId,
          gbpProfile: { clientId: params.id },
        },
      });

      if (!faq) {
        return null;
      }

      await tenantDb.gbpFaq.delete({
        where: { id: params.faqId },
      });

      return faq;
    });

    if (!faq) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE GBP FAQ error:", error);
    return NextResponse.json(
      { error: "Failed to delete FAQ" },
      { status: 500 },
    );
  }
}

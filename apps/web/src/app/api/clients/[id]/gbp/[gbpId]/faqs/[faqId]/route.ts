import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { faqId: string } }
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    await db.gbpFaq.delete({
      where: { id: params.faqId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE GBP FAQ error:", error);
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const reviewAsk = await db.reviewAsk.findUnique({
    where: { shortCode: code },
    select: { id: true, targetReviewUrl: true, reviewUrl: true },
  });

  if (!reviewAsk) {
    return NextResponse.json({ error: "Review link not found" }, { status: 404 });
  }

  await db.reviewAsk.update({
    where: { id: reviewAsk.id },
    data: {
      clickCount: { increment: 1 },
      lastClickedAt: new Date(),
    },
  });

  return NextResponse.redirect(reviewAsk.targetReviewUrl || reviewAsk.reviewUrl);
}

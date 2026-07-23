import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { requireApproval } from "@/lib/approval-guard";
import { z } from "zod";

const reviewReplySchema = z.object({
  replyText: z.string().trim().min(1).max(4096),
});

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; gbpId: string; reviewId: string }> },
) {
  const { id: clientId, gbpId, reviewId } = await params;
  const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
  if (!auth.ok) return auth.response;

  const parsed = reviewReplySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid review reply payload" },
      { status: 400 },
    );
  }
  const { replyText } = parsed.data;

  const review = await withClientTenant(clientId, (tenantDb) =>
    tenantDb.gbpReview.findFirst({
      where: {
        id: reviewId,
        gbpProfileId: gbpId,
        gbpProfile: { clientId },
      },
    }),
  );

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (review.rating <= 2 || review.requiresHumanGate) {
    const approval = await withClientTenant(clientId, (tenantDb) =>
      requireApproval(tenantDb, {
        clientId,
        title: "Low-star review reply approval",
        description: `Review reply for ${review.rating}-star GBP review requires human approval before execution.`,
        requestType: "REVIEW_REPLY",
        requestData: { gbpId, reviewId, replyText },
        requestedById: auth.user.id,
      }),
    );

    return NextResponse.json(
      { status: "PENDING_APPROVAL", approval },
      { status: 202 },
    );
  }

  const updated = await withClientTenant(clientId, (tenantDb) =>
    tenantDb.gbpReview.update({
      where: { id: reviewId },
      data: {
        replyText,
        repliedAt: new Date(),
      },
    }),
  );

  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { taskQueue } from "@rankforge/queue";
import { z } from "zod";
import crypto from "crypto";
import QRCode from "qrcode";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const reviewInviteSchema = z.object({
  gbpId: z.string().trim().min(1),
  phoneNumber: z.string().trim().min(6),
  customerName: z.string().trim().min(1),
  optOut: z.boolean().optional(),
});

function customerKey(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, "") || phoneNumber.toLowerCase();
}

function createShortCode(): string {
  return crypto.randomBytes(6).toString("base64url");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireClientRole(id, "OWNER", "COORDINATOR");
  if (!auth.ok) return auth.response;

  try {
    const parsed = reviewInviteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid review invite payload" },
        { status: 400 },
      );
    }
    const { gbpId, phoneNumber, customerName, optOut } = parsed.data;
    const normalizedCustomerKey = customerKey(phoneNumber);

    const client = await withClientTenant(id, (tenantDb) =>
      tenantDb.client.findUnique({
        where: { id },
        include: {
          gbpProfiles: { where: { id: gbpId } },
        },
      }),
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const selectedGbp = client.gbpProfiles[0];
    if (!selectedGbp) {
      return NextResponse.json(
        { error: "GBP profile not found for review invite" },
        { status: 404 },
      );
    }
    const reviewLink =
      selectedGbp.websiteUrl ||
      `https://g.page/r/${selectedGbp.id}/review`;

    if (optOut) {
      const optOutAsk = await withClientTenant(client.id, (tenantDb) =>
        tenantDb.reviewAsk.upsert({
          where: {
            idempotencyKey: `ReviewOptOut:${client.id}:${normalizedCustomerKey}`,
          },
          update: {
            customerName,
            phoneNumber,
            status: "OPTED_OUT",
            optedOut: true,
          },
          create: {
            clientId: client.id,
            gbpProfileId: selectedGbp.id,
            customerName,
            phoneNumber,
            reviewUrl: reviewLink,
            status: "OPTED_OUT",
            optedOut: true,
            sendAfter: new Date(Date.now() + TWO_HOURS_MS),
            idempotencyKey: `ReviewOptOut:${client.id}:${normalizedCustomerKey}`,
          },
        }),
      );

      return NextResponse.json({
        success: true,
        reviewAskId: optOutAsk.id,
        status: "OPTED_OUT",
      });
    }

    const optedOutAsk = await withClientTenant(client.id, (tenantDb) =>
      tenantDb.reviewAsk.findFirst({
        where: {
          clientId: client.id,
          optedOut: true,
          phoneNumber,
        },
      }),
    );

    if (optedOutAsk) {
      return NextResponse.json(
        { error: "Customer has opted out of review asks" },
        { status: 409 },
      );
    }

    const now = Date.now();
    const sendAfter = new Date(now + TWO_HOURS_MS);
    const reminderAfter = new Date(now + TWO_HOURS_MS + THREE_DAYS_MS);
    const idempotencyKey = `ReviewAsk:${client.id}:${selectedGbp.id}:${normalizedCustomerKey}:${now}`;
    const shortCode = createShortCode();
    const shortReviewUrl = new URL(
      `/api/reviews/r/${shortCode}`,
      request.nextUrl.origin,
    ).toString();
    const qrCodeDataUrl = await QRCode.toDataURL(shortReviewUrl);

    const reviewAsk = await withClientTenant(client.id, (tenantDb) =>
      tenantDb.reviewAsk.create({
        data: {
          clientId: client.id,
          gbpProfileId: selectedGbp.id,
          customerName,
          phoneNumber,
          reviewUrl: shortReviewUrl,
          targetReviewUrl: reviewLink,
          shortCode,
          qrCodeDataUrl,
          sendAfter,
          reminderAfter,
          idempotencyKey,
        },
      }),
    );

    await taskQueue.add(
      "SendReviewAsk",
      { reviewAskId: reviewAsk.id },
      {
        delay: TWO_HOURS_MS,
        jobId: `SendReviewAsk:${reviewAsk.id}`,
      },
    );
    await taskQueue.add(
      "SendReviewAskReminder",
      { reviewAskId: reviewAsk.id },
      {
        delay: TWO_HOURS_MS + THREE_DAYS_MS,
        jobId: `SendReviewAskReminder:${reviewAsk.id}`,
      },
    );

    return NextResponse.json(
      {
        success: true,
        reviewAskId: reviewAsk.id,
        reviewUrl: shortReviewUrl,
        qrCodeDataUrl,
        sendAfter: sendAfter.toISOString(),
        reminderAfter: reminderAfter.toISOString(),
      },
      { status: 202 },
    );
  } catch (error: any) {
    console.error("Review invite scheduling error:", error);
    return NextResponse.json(
      { error: "Failed to schedule review invite", details: error.message },
      { status: 500 },
    );
  }
}

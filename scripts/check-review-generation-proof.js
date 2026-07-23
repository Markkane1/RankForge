const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const schema = read("packages/database/prisma/schema.prisma");
const inviteRoute = read(
  "apps/web/src/app/api/clients/[id]/reviews/invite/route.ts",
);
const redirectRoute = read("apps/web/src/app/api/reviews/r/[code]/route.ts");
const reviewRouteTest = read("apps/web/tests/unit/review-routes.test.ts");
const reviewReplyRoute = read(
  "apps/web/src/app/api/clients/[id]/gbp/[gbpId]/reviews/[reviewId]/reply/route.ts",
);
const approvalRoute = read(
  "apps/web/src/app/api/approvals/[id]/approve/route.ts",
);
const reviewReplyTest = read(
  "apps/web/tests/unit/review-reply-approval-routes.test.ts",
);
const worker = read("apps/worker/src/index.ts");

const hasSchemaLine = (pattern) => new RegExp(pattern).test(schema);

const checks = [
  {
    name: "ReviewAsk schema stores scheduled review asks",
    ok:
      schema.includes("model ReviewAsk") &&
      schema.includes("sendAfter") &&
      schema.includes("reminderAfter") &&
      schema.includes("optedOut") &&
      hasSchemaLine(String.raw`\bidempotencyKey\s+String\s+@unique\b`) &&
      hasSchemaLine(String.raw`\bshortCode\s+String\?\s+@unique\b`) &&
      schema.includes("qrCodeDataUrl") &&
      schema.includes("clickCount"),
  },
  {
    name: "Low-star reviews are schema-gated for human handling",
    ok: hasSchemaLine(
      String.raw`\brequiresHumanGate\s+Boolean\s+@default\(false\)`,
    ),
  },
  {
    name: "Low-star review replies require approval before update",
    ok:
      reviewReplyRoute.includes(
        "review.rating <= 2 || review.requiresHumanGate",
      ) &&
      reviewReplyRoute.includes('requestType: "REVIEW_REPLY"') &&
      reviewReplyRoute.includes("requireApproval") &&
      approvalRoute.includes("approval.requestType === 'REVIEW_REPLY'") &&
      approvalRoute.includes("requiresHumanGate: false"),
  },
  {
    name: "Invite route validates payload with zod",
    ok:
      inviteRoute.includes("z.object") &&
      inviteRoute.includes("reviewInviteSchema.safeParse"),
  },
  {
    name: "Invite route creates tracked short links and QR codes",
    ok:
      inviteRoute.includes("QRCode.toDataURL(shortReviewUrl)") &&
      inviteRoute.includes("targetReviewUrl: reviewLink") &&
      inviteRoute.includes("shortCode") &&
      inviteRoute.includes("qrCodeDataUrl"),
  },
  {
    name: "Invite route schedules 2-hour ask and 3-day reminder jobs",
    ok:
      inviteRoute.includes("2 * 60 * 60 * 1000") &&
      inviteRoute.includes("3 * 24 * 60 * 60 * 1000") &&
      /taskQueue\.add\(\s*"SendReviewAsk"/.test(inviteRoute) &&
      /taskQueue\.add\(\s*"SendReviewAskReminder"/.test(inviteRoute),
  },
  {
    name: "Invite route records and honors permanent opt-out",
    ok:
      inviteRoute.includes("ReviewOptOut:") &&
      inviteRoute.includes('status: "OPTED_OUT"') &&
      inviteRoute.includes("Customer has opted out of review asks"),
  },
  {
    name: "Worker processes delayed review ask and reminder jobs",
    ok:
      worker.includes("job.name === 'SendReviewAsk'") &&
      worker.includes("job.name === 'SendReviewAskReminder'") &&
      worker.includes("processReviewAsk(job.data.reviewAskId, false)") &&
      worker.includes("processReviewAsk(job.data.reviewAskId, true)"),
  },
  {
    name: "Worker sends reminder only after original ask was sent",
    ok:
      worker.includes("if (reminder && ask.status !== 'SENT')") &&
      worker.includes("status: 'REMINDER_SENT'"),
  },
  {
    name: "Review short-link redirect tracks clicks before redirect",
    ok:
      redirectRoute.includes("findUnique") &&
      redirectRoute.includes("shortCode: code") &&
      redirectRoute.includes("clickCount: { increment: 1 }") &&
      redirectRoute.includes(
        "NextResponse.redirect(reviewAsk.targetReviewUrl || reviewAsk.reviewUrl)",
      ),
  },
  {
    name: "Review routes have behavioral coverage",
    ok:
      reviewRouteTest.includes(
        "creates a tracked review short link and QR code for scheduled asks",
      ) &&
      reviewRouteTest.includes(
        "tracks short-link clicks before redirecting to the original review URL",
      ),
  },
  {
    name: "Review reply approval has behavioral coverage",
    ok:
      reviewReplyTest.includes(
        "routes low-star review replies to approval instead of updating directly",
      ) &&
      reviewReplyTest.includes(
        "allows non-low-star review replies without approval",
      ) &&
      reviewReplyTest.includes(
        "executes approved review replies and clears the human gate",
      ),
  },
];

const failed = checks.filter((check) => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
}

if (failed.length > 0) {
  console.error(
    `\nReview generation proof failed: ${failed.map((check) => check.name).join(", ")}`,
  );
  process.exit(1);
}

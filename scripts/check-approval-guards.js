const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appApiDir = path.join(root, "apps/web/src/app/api");
const failures = [];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else if (entry.name.endsWith(".ts")) files.push(file);
  }
  return files;
}

for (const file of walk(appApiDir)) {
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("approvalRequest.create(")) {
    failures.push(
      `${path.relative(root, file)} creates approval outside requireApproval()`,
    );
  }
}

const helper = fs.readFileSync(
  path.join(root, "apps/web/src/lib/approval-guard.ts"),
  "utf8",
);
for (const fragment of [
  "export async function requireApproval",
  "status: 'PENDING'",
  "requestedById",
]) {
  if (!helper.includes(fragment)) {
    failures.push(`apps/web/src/lib/approval-guard.ts missing ${fragment}`);
  }
}

const clientRoute = fs.readFileSync(
  path.join(root, "apps/web/src/app/api/clients/[id]/route.ts"),
  "utf8",
);
for (const fragment of [
  "sensitiveChanges",
  'requestType: "CLIENT_PROFILE_CHANGE"',
  "Sensitive mutation intercepted. Approval request created.",
]) {
  if (!clientRoute.includes(fragment)) {
    failures.push(
      `apps/web/src/app/api/clients/[id]/route.ts missing client profile approval gate: ${fragment}`,
    );
  }
}

const clientApprovalTest = fs.readFileSync(
  path.join(root, "apps/web/tests/unit/client-profile-approval-route.test.ts"),
  "utf8",
);
for (const [name, pattern] of [
  [
    "routes business identity changes to approval instead of updating directly",
    /routes business identity changes to approval instead of updating directly/,
  ],
  [
    "CLIENT_PROFILE_CHANGE request type",
    /requestType:\s*["']CLIENT_PROFILE_CHANGE["']/,
  ],
  [
    "allows non-sensitive contact updates without approval",
    /allows non-sensitive contact updates without approval/,
  ],
]) {
  if (!pattern.test(clientApprovalTest)) {
    failures.push(`client profile approval behavior test missing ${name}`);
  }
}

const gbpRoute = fs.readFileSync(
  path.join(root, "apps/web/src/app/api/clients/[id]/gbp/[gbpId]/route.ts"),
  "utf8",
);
for (const fragment of [
  'requestType: "GBP_VERIFICATION"',
  'requestType: "CATEGORY_CHANGE"',
  "Boolean(isVerified) !== profile.isVerified",
]) {
  if (!gbpRoute.includes(fragment)) {
    failures.push(
      `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/route.ts missing GBP approval gate: ${fragment}`,
    );
  }
}

const gbpApprovalTest = fs.readFileSync(
  path.join(root, "apps/web/tests/unit/gbp-approval-routes.test.ts"),
  "utf8",
);
for (const [name, pattern] of [
  [
    "routes GBP verification status changes to approval instead of updating directly",
    /routes GBP verification status changes to approval instead of updating directly/,
  ],
  ["GBP_VERIFICATION request type", /requestType:\s*["']GBP_VERIFICATION["']/],
  [
    "routes primary category changes to approval instead of updating directly",
    /routes primary category changes to approval instead of updating directly/,
  ],
  ["CATEGORY_CHANGE request type", /requestType:\s*["']CATEGORY_CHANGE["']/],
  [
    "routes verification wizard POST actions to approval without Google API calls",
    /routes verification wizard POST actions to approval without Google API calls/,
  ],
]) {
  if (!pattern.test(gbpApprovalTest)) {
    failures.push(`GBP approval behavior test missing ${name}`);
  }
}

const verificationRoute = fs.readFileSync(
  path.join(
    root,
    "apps/web/src/app/api/clients/[id]/gbp/[gbpId]/verification/route.ts",
  ),
  "utf8",
);
for (const fragment of [
  'requestType: "GBP_VERIFICATION"',
  "Verification step intercepted. Approval request created.",
]) {
  if (!verificationRoute.includes(fragment)) {
    failures.push(
      `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/verification/route.ts missing verification approval gate: ${fragment}`,
    );
  }
}

const postBody = verificationRoute.slice(
  verificationRoute.indexOf("export async function POST"),
);
if (
  postBody.includes("mybusinessverifications.locations.verify") ||
  postBody.includes("mybusinessverifications.locations.verifications.complete")
) {
  failures.push(
    "GBP verification POST still calls Google verification APIs directly",
  );
}

const reviewReplyRoute = fs.readFileSync(
  path.join(
    root,
    "apps/web/src/app/api/clients/[id]/gbp/[gbpId]/reviews/[reviewId]/reply/route.ts",
  ),
  "utf8",
);
for (const fragment of [
  "review.rating <= 2 || review.requiresHumanGate",
  'requestType: "REVIEW_REPLY"',
  "requireApproval",
]) {
  if (!reviewReplyRoute.includes(fragment)) {
    failures.push(
      `review reply route missing low-star approval gate: ${fragment}`,
    );
  }
}

const approvalRoute = fs.readFileSync(
  path.join(root, "apps/web/src/app/api/approvals/[id]/approve/route.ts"),
  "utf8",
);
for (const fragment of [
  "approval.requestType === 'REVIEW_REPLY'",
  "requiresHumanGate: false",
  "field: 'review_reply_approved'",
  "approval.requestType === 'CONTENT_PUBLISH'",
  "content-publish-approval-granted",
  "field: 'content_publish_approved'",
  "approval.requestType === 'CONFLICT_OF_INTEREST'",
  "ConflictOnboardingResume:${approval.id}",
  "field: 'conflict_approval_onboarding_resumed'",
]) {
  if (!approvalRoute.includes(fragment)) {
    failures.push(
      `approval execution route missing review reply handling: ${fragment}`,
    );
  }
}

const reviewReplyTest = fs.readFileSync(
  path.join(root, "apps/web/tests/unit/review-reply-approval-routes.test.ts"),
  "utf8",
);
for (const fragment of [
  "routes low-star review replies to approval instead of updating directly",
  "requestType: 'REVIEW_REPLY'",
  "executes approved review replies and clears the human gate",
  "executes approved content publish gates by marking the content piece approved",
  "resumes onboarding when a conflict-of-interest client approval is approved",
]) {
  if (!reviewReplyTest.includes(fragment)) {
    failures.push(`review reply approval behavior test missing ${fragment}`);
  }
}

if (failures.length) {
  console.error("Approval guard gaps found:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Approval guards verified.");

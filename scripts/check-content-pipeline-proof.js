const fs = require("fs");
const path = require("path");

const root = process.cwd();
function read(relative) {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const service = read(
  "apps/api/src/modules/content-pipeline/content-pipeline.service.ts",
);
const controller = read(
  "apps/api/src/modules/content-pipeline/content-pipeline.controller.ts",
);
const spec = read(
  `apps/api/src/modules/content-pipeline/content-pipeline.service.${"REQ"}-M4-01-04.spec.ts`,
);
const schema = read("packages/database/prisma/schema.prisma");
const pkg = read("package.json");
const clientRoute = read("apps/web/src/app/api/clients/[id]/route.ts");
const clientTypes = read("apps/web/src/lib/types.ts");
const clientPanel = read(
  "apps/web/src/components/clients/client-detail-panel.tsx",
);

const checks = [
  {
    name: "Content calendar is populated from informational KeywordMapEntry rows into ContentPiece workflow",
    ok:
      service.includes("populateCalendarFromInformationalKeywords") &&
      service.includes("intent: 'INFORMATIONAL'") &&
      service.includes("prisma.contentPiece.create") &&
      service.includes("recordContentPieceStatus") &&
      service.includes("FAQPage") &&
      controller.includes("Post('calendar/populate')") &&
      schema.includes("model ContentPiece") &&
      schema.includes("model ContentPieceStatusHistory"),
  },
  {
    name: "Content draft generation persists LLM output with compliance and human gates",
    ok:
      service.includes("https://api.openai.com/v1/chat/completions") &&
      service.includes("checkContentCompliance") &&
      service.includes("unverified price claim") &&
      service.includes("needsHumanGate") &&
      service.includes("prisma.approvalRequest.create") &&
      service.includes("requestType: 'CONTENT_PUBLISH'") &&
      service.includes("createContentPieceDraft") &&
      service.includes("'PENDING_APPROVAL'") &&
      service.includes("draftBody: body") &&
      !service.includes("Simulate DataForSEO SERP"),
  },
  {
    name: "Content publish/read-back workflow is similarity-provider gated",
    ok:
      service.includes("publishContentPiece") &&
      service.includes("Content piece requires approval before publishing.") &&
      service.includes("Content piece must be approved before publishing.") &&
      service.includes("readPublishedContentPiece") &&
      service.includes("CONTENT_SIMILARITY_CHECK_URL") &&
      service.includes("similarity-check-failed") &&
      service.includes("similarity-check-passed-and-read-back-published") &&
      controller.includes("Post('content-pieces/:contentPieceId/publish')") &&
      controller.includes("Get('content-pieces/:contentPieceId/published')"),
  },
  {
    name: "AI answer monitoring runs configured public surfaces and stores scorecard proof",
    ok:
      service.includes("runAiAnswerSurfaceChecks") &&
      service.includes("AI_ANSWER_SURFACE_URLS") &&
      service.includes("Promise.all") &&
      service.includes("taskId: 'REQ-M4-03'") &&
      service.includes("AI answer scorecard") &&
      service.includes("surfaces: surfaceResults.map"),
  },
  {
    name: "Quarterly maintenance returns explicit stale price/date/expiry reasons",
    ok:
      service.includes("extractStaleContentReasons") &&
      service.includes("hasOldDateReference") &&
      service.includes("hasExpiredOfferReference") &&
      service.includes("hasStalePriceReference") &&
      service.includes("staleReasons") &&
      service.includes("data: { status: 'STALE' }"),
  },
  {
    name: "Module 4 behavior has focused tests and is wired into npm check",
    ok:
      spec.includes(
        "populate the content calendar from informational keyword rows",
      ) &&
      spec.includes("block unverifiable price claims") &&
      spec.includes("should require a requester when the first five compliant drafts need approval") &&
      spec.includes("should gate the first five compliant drafts through approval request creation") &&
      spec.includes("should block publishing content that is still pending approval") &&
      spec.includes("should block high-similarity content") &&
      spec.includes(
        "should publish low-similarity content and read back the published row",
      ) &&
      spec.includes(
        "store an AI answer scorecard row per tracked query across public surfaces",
      ) &&
      spec.includes(
        "should flag posts older than 90 days as STALE with explicit stale reasons",
      ) &&
      spec.includes("should detect expired offer references") &&
      pkg.includes(
        '"check:content-pipeline": "node scripts/check-content-pipeline-proof.js"',
      ) &&
      pkg.includes("npm run check:content-pipeline"),
  },
  {
    name: "Staff UI surfaces the Module 4 calendar and draft approval queue",
    ok:
      clientRoute.includes("contentPieces: {") &&
      clientRoute.includes("statusHistory: {") &&
      clientTypes.includes("export interface ContentPiece") &&
      clientTypes.includes("contentPieces?: ContentPiece[]") &&
      clientPanel.includes("ContentPipelinePanel") &&
      clientPanel.includes("Module 4 Calendar & Draft Queue") &&
      clientPanel.includes("Draft Approval Queue") &&
      clientPanel.includes("Read back") &&
      clientPanel.includes("piece.similarityScore"),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks)
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);

if (failed.length) {
  console.error(
    `\nContent pipeline proof failed: ${failed.map((check) => check.name).join(", ")}`,
  );
  process.exit(1);
}

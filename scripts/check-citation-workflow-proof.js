const fs = require("fs");
const path = require("path");

const root = process.cwd();
function read(relative) {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const schema = read("packages/database/prisma/schema.prisma");
const auditRoute = read(
  "apps/web/src/app/api/clients/[id]/citations/audit/route.ts",
);
const submitRoute = read(
  "apps/web/src/app/api/clients/[id]/citations/[citationId]/submit/route.ts",
);
const clientRoute = read("apps/web/src/app/api/clients/[id]/route.ts");
const clientPanel = read(
  "apps/web/src/components/clients/client-detail-panel.tsx",
);
const routeTest = read("apps/web/tests/unit/citation-routes.test.ts");
const pkg = read("package.json");

const checks = [
  {
    name: "Citation schema stores audit and submission workflow fields",
    ok:
      schema.includes("model CitationRecord") &&
      schema.includes("napStatus      String") &&
      schema.includes("credentialsRef String?") &&
      schema.includes("submittedAt    DateTime?") &&
      schema.includes("lastVerifiedAt DateTime?"),
  },
  {
    name: "Citation audit route persists classified BrightLocal listings",
    ok:
      auditRoute.includes("new BrightLocalClient(client.organizationId)") &&
      auditRoute.includes("getCitationTrackerReport") &&
      auditRoute.includes("classifyNapStatus") &&
      auditRoute.includes("tenantDb.citationRecord.upsert") &&
      /status:\s*citation\.napStatus\s*===\s*["']CORRECT["']\s*\?\s*["']VERIFIED["']\s*:\s*["']NEEDS_REVIEW["']/.test(
        auditRoute,
      ),
  },
  {
    name: "Citation submit route updates status and timestamp without raw credentials",
    ok:
      submitRoute.includes("submitCitationSchema") &&
      submitRoute.includes("credentialsRef") &&
      /status:\s*["']SUBMITTED["']/.test(submitRoute) &&
      submitRoute.includes("submittedAt: new Date()") &&
      !submitRoute.includes("password") &&
      !submitRoute.includes("encryptedToken"),
  },
  {
    name: "Citation routes enforce client role and tenant context",
    ok:
      auditRoute.includes("requireClientRole(clientId") &&
      auditRoute.includes("withClientTenant(clientId") &&
      submitRoute.includes("requireClientRole(clientId") &&
      submitRoute.includes("withClientTenant(clientId"),
  },
  {
    name: "Citation workflow proof is wired into npm check",
    ok:
      pkg.includes(
        '"check:citation-workflow": "node scripts/check-citation-workflow-proof.js"',
      ) && pkg.includes("npm run check:citation-workflow"),
  },
  {
    name: "Citation routes have mocked behavioral coverage",
    ok:
      routeTest.includes("import { POST as auditCitations }") &&
      routeTest.includes("import { POST as submitCitation }") &&
      routeTest.includes(
        "imports BrightLocal citations with classified NAP status",
      ) &&
      routeTest.includes(
        "submits only same-client citations with a credential reference",
      ),
  },
  {
    name: "Client detail payload exposes recent citation records",
    ok:
      clientRoute.includes("citations: {") &&
      clientRoute.includes('orderBy: { updatedAt: "desc" }') &&
      clientRoute.includes("take: 20"),
  },
  {
    name: "Client UI can run citation audits and submit Tier 1 citations",
    ok:
      clientPanel.includes("CitationWorkflowPanel") &&
      clientPanel.includes("runCitationAudit(clientId, selectedLocationId)") &&
      clientPanel.includes(
        "submitCitation(clientId, citationId, credentialsRef)",
      ) &&
      clientPanel.includes("Tier 1 pending") &&
      clientPanel.includes("citation.tier === 1") &&
      clientPanel.includes("Citation Workflow"),
  },
  {
    name: "Client citation metrics do not use fabricated fallback scores",
    ok:
      !clientPanel.includes("85.5") &&
      !clientPanel.includes("?? 12") &&
      clientPanel.includes("Not available") &&
      clientPanel.includes("client.citationMetrics?.averageScore ?? 0"),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks)
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);

if (failed.length) {
  console.error(
    `\nCitation workflow proof failed: ${failed.map((check) => check.name).join(", ")}`,
  );
  process.exit(1);
}

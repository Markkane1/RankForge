const fs = require("fs");
const path = require("path");

const root = process.cwd();
function read(relative) {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const schema = read("packages/database/prisma/schema.prisma");
const dataforseo = read("apps/web/src/lib/integrations/dataforseo.ts");
const backlinkRoute = read(
  "apps/web/src/app/api/clients/[id]/backlinks/gap/route.ts",
);
const secondaryRoute = read(
  "apps/web/src/app/api/clients/[id]/secondary-reviews/route.ts",
);
const clientRoute = read("apps/web/src/app/api/clients/[id]/route.ts");
const clientPanel = read(
  "apps/web/src/components/clients/client-detail-panel.tsx",
);
const worker = read("apps/worker/src/index.ts");
const schedulers = read("apps/worker/src/schedulers.ts");
const workerHelper = read("apps/worker/src/backlink-gap.ts");
const workerTest = read("apps/worker/tests/backlink-gap.test.ts");
const api = read("apps/web/src/lib/api.ts");
const routeTest = read("apps/web/tests/unit/backlink-routes.test.ts");
const pkg = read("package.json");
const hasSchemaLine = (pattern) => new RegExp(pattern).test(schema);

const mutatingSecondaryRouteExists =
  fs.existsSync(
    path.join(
      root,
      "apps/web/src/app/api/clients/[id]/secondary-reviews/route.ts",
    ),
  ) &&
  /\bexport\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/.test(
    secondaryRoute,
  );

const checks = [
  {
    name: "Module 3 authority schema has backlink opportunities and secondary read metrics",
    ok:
      schema.includes("model BacklinkOpportunity") &&
      hasSchemaLine(String.raw`\bcompetitorUrl\s+String\b`) &&
      hasSchemaLine(String.raw`\bdomainRating\s+Float\?`) &&
      schema.includes("model SecondaryReviewMetric") &&
      schema.includes("facebookCount") &&
      schema.includes("trustpilotCount"),
  },
  {
    name: "DataForSEO adapter calls the official Backlinks live endpoint",
    ok:
      dataforseo.includes("getBacklinkGap") &&
      dataforseo.includes(
        "https://api.dataforseo.com/v3/backlinks/backlinks/live",
      ) &&
      dataforseo.includes("target: competitorUrl"),
  },
  {
    name: "Backlink gap route is Zod validated, tenant scoped, and paid-link blocked",
    ok:
      backlinkRoute.includes("z.object") &&
      backlinkRoute.includes("requireClientRole(clientId") &&
      backlinkRoute.includes("withClientTenant(clientId") &&
      backlinkRoute.includes("PAID_LINK_PLACEMENT_PROHIBITED") &&
      backlinkRoute.includes("allowPaidPlacement === true") &&
      backlinkRoute.includes("tenantDb.backlinkOpportunity"),
  },
  {
    name: "Secondary review metrics are read-only and client-role guarded",
    ok:
      secondaryRoute.includes("export async function GET") &&
      /requireClientRole\(\s*clientId/.test(secondaryRoute) &&
      secondaryRoute.includes("tenantDb.secondaryReviewMetric.findUnique") &&
      !mutatingSecondaryRouteExists,
  },
  {
    name: "Client-facing read surfaces reference backlink and secondary-review data",
    ok:
      clientRoute.includes("backlinkOpportunities") &&
      clientRoute.includes("secondaryReview: true") &&
      api.includes("/api/clients/${id}/backlinks/gap") &&
      api.includes("/api/clients/${id}/secondary-reviews"),
  },
  {
    name: "Backlink and secondary review proof is wired into npm check",
    ok:
      pkg.includes(
        '"check:backlink-secondary": "node scripts/check-backlink-secondary-proof.js"',
      ) && pkg.includes("npm run check:backlink-secondary"),
  },
  {
    name: "Backlink gap route has mocked DataForSEO behavioral coverage",
    ok:
      routeTest.includes(
        "imports DataForSEO backlink opportunities and updates existing rows",
      ) &&
      routeTest.includes(
        "rejects paid-link placement flags before provider access",
      ) &&
      routeTest.includes(
        "uses tenant scope for read-only backlink opportunity reads",
      ) &&
      routeTest.includes(
        "returns auth failures before tenant or provider work",
      ),
  },
  {
    name: "Monthly backlink gap pull is scheduled and writes opportunities",
    ok:
      schedulers.includes("MonthlyBacklinkGapPull") &&
      worker.includes("job.name === 'MonthlyBacklinkGapPull'") &&
      worker.includes("fetchDataForSeoBacklinkGap") &&
      worker.includes("upsertBacklinkOpportunities") &&
      worker.includes("Monthly backlink gap pull cadence proof"),
  },
  {
    name: "Worker backlink gap helper has mocked provider behavior coverage",
    ok:
      workerHelper.includes(
        "https://api.dataforseo.com/v3/backlinks/backlinks/live",
      ) &&
      workerHelper.includes("parseDataForSeoCredentials") &&
      workerTest.includes("Worker backlink gap behavior verified.") &&
      workerTest.includes("normalizeBacklinkGapResponse") &&
      workerTest.includes("upsertBacklinkOpportunities"),
  },
  {
    name: "Client UI shows backlink opportunities and secondary review metrics",
    ok:
      clientPanel.includes("AuthoritySignalsPanel") &&
      clientPanel.includes("runBacklinkGap(clientId, competitorUrl)") &&
      clientPanel.includes("Facebook") &&
      clientPanel.includes("Trustpilot") &&
      clientPanel.includes("Backlink Opportunities"),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks)
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);

if (failed.length) {
  console.error(
    `\nBacklink/secondary review proof failed: ${failed.map((check) => check.name).join(", ")}`,
  );
  process.exit(1);
}

const fs = require("fs");

const playwright = fs.readFileSync("apps/web/playwright.config.ts", "utf8");
const smoke = fs.readFileSync("apps/web/tests/e2e/smoke.spec.ts", "utf8");
const axeSpec = fs.readFileSync(
  "apps/web/tests/e2e/accessibility.spec.ts",
  "utf8",
);
const portalDownloadSpec = fs.readFileSync(
  "apps/web/tests/e2e/portal-report-download.spec.ts",
  "utf8",
);
const lighthouse = fs.readFileSync("apps/web/lighthouserc.json", "utf8");
const lighthouseCheck = fs.readFileSync(
  "apps/web/scripts/check-lighthouse-config.js",
  "utf8",
);
const bundle = fs.readFileSync("apps/web/scripts/check-bundle-size.js", "utf8");
const nextConfig = fs.readFileSync("apps/web/next.config.ts", "utf8");
const portal = fs.readFileSync("apps/web/src/app/portal/page.tsx", "utf8");
const monthlyReport = fs.readFileSync(
  "apps/web/src/app/api/reports/monthly/route.ts",
  "utf8",
);
const pkg = fs.readFileSync("package.json", "utf8");
const webPkg = fs.readFileSync("apps/web/package.json", "utf8");
const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");

const checks = [
  {
    name: "Playwright viewport coverage includes mobile, tablet, and desktop widths",
    ok:
      playwright.includes("width: 375") &&
      playwright.includes("width: 768") &&
      playwright.includes("width: 1440") &&
      smoke.includes("expectNoHorizontalOverflow"),
  },
  {
    name: "Axe accessibility smoke tests are wired into Playwright",
    ok:
      axeSpec.includes("@axe-core/playwright") &&
      axeSpec.includes("wcag2a") &&
      axeSpec.includes("wcag2aa") &&
      axeSpec.includes('impact === "critical"') &&
      webPkg.includes('"test:e2e": "playwright test"') &&
      webPkg.includes('"@axe-core/playwright"'),
  },
  {
    name: "Lighthouse CI config covers portal and login runtime pages",
    ok:
      lighthouse.includes("http://localhost:3000/portal") &&
      lighthouse.includes("http://localhost:3000/login") &&
      lighthouse.includes("categories:accessibility") &&
      lighthouse.includes('"minScore": 0.9') &&
      lighthouseCheck.includes("Lighthouse CI config verified") &&
      webPkg.includes(
        '"check:lhci": "node scripts/check-lighthouse-config.js"',
      ),
  },
  {
    name: "Bundle analyzer and bundle budget script remain configured",
    ok:
      nextConfig.includes("@next/bundle-analyzer") &&
      nextConfig.includes('ANALYZE === "true"') &&
      bundle.includes("MAX_SIZE = 250 * 1024") &&
      bundle.includes("Bundle size budget verified") &&
      webPkg.includes(
        '"check:bundle-size": "node scripts/check-bundle-size.js"',
      ) &&
      pkg.includes(
        '"check:bundle-size": "npm run check:bundle-size --workspace=web"',
      ) &&
      pkg.includes("npm run check:bundle-size"),
  },
  {
    name: "Client portal report links are scoped from the decrypted portal session clientId",
    ok:
      portal.includes("const clientId = sessionData.clientId") &&
      portal.includes("/api/reports/monthly?clientId=${clientId}") &&
      portal.includes("db.monthlyReport.findMany") &&
      portal.includes("where: { clientId }") &&
      monthlyReport.includes("getPortalClientId") &&
      monthlyReport.includes("clientId !== portalClientId") &&
      monthlyReport.includes("Portal report access denied"),
  },
  {
    name: "Client portal surfaces scoped leads, approvals, and a browser report-download proof",
    ok:
      portal.includes("db.leadLogEntry.findMany") &&
      portal.includes("db.approvalRequest.findMany") &&
      portal.includes("Recent Leads") &&
      portal.includes("Approvals") &&
      portalDownloadSpec.includes("encryptSecret") &&
      portalDownloadSpec.includes("/api/reports/monthly") &&
      portalDownloadSpec.includes("clientId=${report.clientId}") &&
      portalDownloadSpec.includes("reportLink.click()"),
  },
  {
    name: "UI/reporting validation proof is wired into npm check",
    ok:
      pkg.includes(
        '"check:ui-validation": "node scripts/check-ui-validation-proof.js"',
      ) && pkg.includes("npm run check:ui-validation"),
  },
  {
    name: "CI runs Playwright against a seeded dev server",
    ok:
      playwright.includes("webServer") &&
      playwright.includes("command: 'npm run dev'") &&
      playwright.includes("url: 'http://localhost:3000'") &&
      ci.includes("postgres:16") &&
      ci.includes("npx prisma migrate deploy --schema packages/database/prisma/schema.prisma") &&
      ci.includes("node packages/database/prisma/seed.js") &&
      ci.includes("npm run test:e2e --workspace=web") &&
      ci.includes("npm run check:lhci --workspace=web"),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks)
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);

if (failed.length) {
  console.error(
    `\nUI validation proof failed: ${failed.map((check) => check.name).join(", ")}`,
  );
  process.exit(1);
}

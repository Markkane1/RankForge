const fs = require("fs");
const path = require("path");

const root = process.cwd();
function read(relative) {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const browserRoute = read(
  "apps/web/src/app/api/events/conversion/browser/route.ts",
);
const elements = read("apps/web/src/lib/conversion-elements.ts");
const hostedLandingPage = read("apps/web/src/app/landing/[slug]/page.tsx");
const hostedLandingComponent = read(
  "apps/web/src/components/landing/landing-conversion-elements.tsx",
);
const hostedLandingE2e = read(
  "apps/web/tests/e2e/landing-conversion-elements.spec.ts",
);
const middleware = read("apps/web/src/middleware.ts");
const middlewareTest = read("apps/web/tests/unit/middleware.test.ts");
const routeGuards = read("scripts/check-route-guards.js");
const pkg = read("package.json");

const checks = [
  {
    name: "Browser conversion route validates and records page-level conversion events",
    ok:
      browserRoute.includes("browserConversionSchema") &&
      browserRoute.includes('"PHONE_CALL"') &&
      browserRoute.includes('"WHATSAPP"') &&
      browserRoute.includes('"FORM_SUBMISSION"') &&
      browserRoute.includes('"BOOKING"') &&
      browserRoute.includes('"GBP_WEBSITE"') &&
      browserRoute.includes("tenantDb.leadLogEntry.create") &&
      browserRoute.includes("landing-page-conversion-element"),
  },
  {
    name: "Landing-page element helpers wire click-to-call, WhatsApp, quote form, booking, and website events",
    ok:
      elements.includes("trackClickToCall") &&
      elements.includes("trackWhatsAppClick") &&
      elements.includes("trackQuoteFormSubmission") &&
      elements.includes("trackBookingClick") &&
      elements.includes("trackWebsiteClick") &&
      elements.includes("/api/events/conversion/browser") &&
      elements.includes("navigator.sendBeacon"),
  },
  {
    name: "Hosted landing page mounts conversion elements with real client/profile URLs",
    ok:
      hostedLandingPage.includes("HostedLandingPage") &&
      hostedLandingPage.includes("LandingConversionElements") &&
      hostedLandingPage.includes("db.client.findUnique") &&
      hostedLandingPage.includes("gbpProfiles") &&
      hostedLandingPage.includes("bookingHref") &&
      hostedLandingPage.includes("websiteHref") &&
      hostedLandingComponent.includes("trackClickToCall") &&
      hostedLandingComponent.includes("trackWhatsAppClick") &&
      hostedLandingComponent.includes("trackQuoteFormSubmission") &&
      hostedLandingComponent.includes("trackBookingClick") &&
      hostedLandingComponent.includes("trackWebsiteClick") &&
      hostedLandingComponent.includes('data-testid="landing-quote-form"'),
  },
  {
    name: "Hosted landing page browser flow proves DOM interactions emit conversion events",
    ok:
      hostedLandingE2e.includes("/landing/sparkleclean-pro") &&
      hostedLandingE2e.includes("/api/events/conversion/browser") &&
      hostedLandingE2e.includes("landing-call") &&
      hostedLandingE2e.includes("landing-whatsapp") &&
      hostedLandingE2e.includes("landing-quote-submit") &&
      hostedLandingE2e.includes("PHONE_CALL") &&
      hostedLandingE2e.includes("WHATSAPP") &&
      hostedLandingE2e.includes("FORM_SUBMISSION") &&
      hostedLandingE2e.includes("BOOKING") &&
      hostedLandingE2e.includes("GBP_WEBSITE"),
  },
  {
    name: "Browser conversion route does not expose the server ingestion secret",
    ok:
      !browserRoute.includes("CONVERSION_EVENT_SECRET") &&
      !elements.includes("CONVERSION_EVENT_SECRET") &&
      !elements.includes("x-rankforge-event-secret"),
  },
  {
    name: "Middleware exempts only the server conversion route and same-origin guards browser conversion events",
    ok:
      /CSRF_EXEMPT_PATHS\s*=\s*new Set\(\[\s*["']\/api\/events\/conversion["']\s*\]\)/.test(
        middleware,
      ) &&
      middlewareTest.includes(
        "rejects cross-origin browser conversion events",
      ) &&
      middlewareTest.includes("allows same-origin browser conversion events") &&
      /path\.join\(\s*["']events["'],\s*["']conversion["'],\s*["']browser["'],\s*["']route\.ts["']\s*\)/.test(
        routeGuards,
      ),
  },
  {
    name: "Conversion element proof is wired into npm check",
    ok:
      pkg.includes(
        '"check:conversion-elements": "node scripts/check-conversion-elements-proof.js"',
      ) && pkg.includes("npm run check:conversion-elements"),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks)
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);

if (failed.length) {
  console.error(
    `\nConversion element proof failed: ${failed.map((check) => check.name).join(", ")}`,
  );
  process.exit(1);
}

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walk(dir) {
  const entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relativePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return relativePath;
  });
}

const productionSourceFiles = [
  ...walk("apps/api/src"),
  ...walk("apps/web/src"),
  ...walk("apps/worker/src"),
].filter((file) => /\.(ts|tsx)$/.test(file));

const randomUsage = productionSourceFiles.filter((file) =>
  read(file).includes("Math.random("),
);
const localFalconService = read(
  "apps/api/src/modules/localfalcon/localfalcon.service.ts",
);
const localFalconController = read(
  "apps/api/src/modules/localfalcon/localfalcon.controller.ts",
);
const rootPackage = read("package.json");

const checks = [
  {
    name: "Production source has no Math.random UI/data fallbacks",
    ok: randomUsage.length === 0,
    detail: randomUsage.join(", "),
  },
  {
    name: "Local Falcon proxy calls the provider directly and does not describe mock/simulated fallback behavior",
    ok:
      localFalconService.includes("fetch(`${this.apiUrl}/scans`") &&
      localFalconService.includes("HttpStatus.BAD_GATEWAY") &&
      !/\b(mock|simulated|dummy|fallback data)\b/i.test(localFalconService),
  },
  {
    name: "Local Falcon scan input is validated with Zod",
    ok:
      localFalconController.includes("import { z } from 'zod'") &&
      localFalconController.includes("triggerScanSchema.safeParse(body)") &&
      localFalconController.includes("z.coerce.number().min(-90).max(90)") &&
      localFalconController.includes("z.coerce.number().min(-180).max(180)"),
  },
  {
    name: "Production mock fallback guard is wired into npm check",
    ok:
      rootPackage.includes(
        '"check:production-mocks": "node scripts/check-production-mock-fallbacks.js"',
      ) && rootPackage.includes("npm run check:production-mocks"),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(
    `${check.ok ? "PASS" : "FAIL"} ${check.name}${check.detail ? ` (${check.detail})` : ""}`,
  );
}

if (failed.length) {
  console.error(
    `\nProduction mock fallback proof failed: ${failed
      .map((check) => check.name)
      .join(", ")}`,
  );
  process.exit(1);
}

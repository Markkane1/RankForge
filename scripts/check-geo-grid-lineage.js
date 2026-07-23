const fs = require("fs");
const path = require("path");

const root = process.cwd();
const schema = fs.readFileSync(
  path.join(root, "packages/database/prisma/schema.prisma"),
  "utf8",
);
const route = fs.readFileSync(
  path.join(root, "apps/web/src/app/api/clients/[id]/geo-grid/route.ts"),
  "utf8",
);
const worker = fs.readFileSync(
  path.join(root, "apps/worker/src/index.ts"),
  "utf8",
);
const workerHelper = fs.readFileSync(
  path.join(root, "apps/worker/src/geo-grid.ts"),
  "utf8",
);
const workerPackage = fs.readFileSync(
  path.join(root, "apps/worker/package.json"),
  "utf8",
);
const workerTest = fs.readFileSync(
  path.join(root, "apps/worker/tests/geo-grid.test.ts"),
  "utf8",
);

const checks = [
  {
    name: "Geo-grid schema stores source lineage",
    ok:
      schema.includes("model GeoGridScanResult") &&
      schema.includes("sourceLineage Json?"),
  },
  {
    name: "Manual geo-grid route persists Local Falcon lineage",
    ok:
      route.includes('provider: "LOCAL_FALCON"') &&
      /providerRunId:\s*scanData\.runId\s*\?\?\s*scanData\.run_id\s*\?\?\s*scanData\.report\?\.id\s*\?\?\s*null/.test(
        route,
      ) &&
      route.includes("rawResponse: scanData") &&
      route.includes("sourceLineage,"),
  },
  {
    name: "Worker geo-grid scan persists Local Falcon lineage",
    ok:
      worker.includes("buildGeoGridScanResult(scanData") &&
      worker.includes("sourceLineage: scanResult.sourceLineage") &&
      workerHelper.includes("provider: 'LOCAL_FALCON'") &&
      workerHelper.includes(
        "providerRunId: scanData.runId ?? scanData.run_id ?? scanData.report?.id ?? null",
      ) &&
      workerHelper.includes("rawResponse: scanData"),
  },
  {
    name: "Worker geo-grid lineage behavior is tested",
    ok:
      workerPackage.includes("apps/worker/tests/geo-grid.test.ts") &&
      workerTest.includes("Worker geo-grid behavior verified.") &&
      workerTest.includes("local-falcon-run-1") &&
      workerTest.includes("provider: 'LOCAL_FALCON'"),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks)
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);

if (failed.length) {
  console.error(
    `\nGeo-grid lineage proof failed: ${failed.map((check) => check.name).join(", ")}`,
  );
  process.exit(1);
}

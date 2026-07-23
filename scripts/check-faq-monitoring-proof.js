const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const schema = read("packages/database/prisma/schema.prisma");
const worker = read("apps/worker/src/index.ts");
const helper = read("apps/worker/src/faq-monitoring.ts");
const workerPackage = read("apps/worker/package.json");
const workerTest = read("apps/worker/tests/faq-monitoring.test.ts");
const hasSchemaLine = (pattern) => new RegExp(pattern).test(schema);

const checks = [
  {
    name: "FAQ schema stores last visibility source and evidence",
    ok:
      hasSchemaLine(String.raw`\blastVisibilitySource\s+String\?`) &&
      hasSchemaLine(
        String.raw`\blastVisibilityEvidence\s+String\?\s+@db\.Text`,
      ),
  },
  {
    name: "FAQ monitor blocks when SERP provider is not configured",
    ok:
      worker.includes("SERP_API_KEY") &&
      worker.includes("SERP_API_URL") &&
      worker.includes("FAQ visibility monitor blocked"),
  },
  {
    name: "FAQ monitor persists deterministic provider evidence",
    ok:
      worker.includes(
        "fetchFaqVisibility(process.env.SERP_API_URL, process.env.SERP_API_KEY, faq.question, testedAt)",
      ) &&
      helper.includes("export function parseFaqVisibilityResponse") &&
      helper.includes("providerUrl") &&
      helper.includes("query") &&
      helper.includes("position") &&
      helper.includes("snippet") &&
      worker.includes("lastVisibilityEvidence: JSON.stringify(evidence)"),
  },
  {
    name: "FAQ monitor supports provider errors and DataForSEO-style responses",
    ok:
      helper.includes("SERP provider returned ${response.status}") &&
      helper.includes("data.tasks.flatMap") &&
      helper.includes("rank_group") &&
      helper.includes("providerStatus: response.status"),
  },
  {
    name: "FAQ monitor still updates pass/fail counters and cadence proof",
    ok:
      worker.includes(
        "passCount: isVisible ? faq.passCount + 1 : faq.passCount",
      ) &&
      worker.includes(
        "failCount: !isVisible ? faq.failCount + 1 : faq.failCount",
      ) &&
      worker.includes("FAQ visibility monitor tested ${testedCount} FAQ(s)."),
  },
  {
    name: "FAQ monitor behavior is covered by worker tests",
    ok:
      workerPackage.includes("apps/worker/tests/faq-monitoring.test.ts") &&
      workerTest.includes("parseFaqVisibilityResponse") &&
      workerTest.includes("SERP provider returned 429") &&
      workerTest.includes("Worker FAQ monitoring behavior verified."),
  },
];

const failed = checks.filter((check) => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAQ monitoring proof failed: ${failed.map((check) => check.name).join(", ")}`,
  );
  process.exit(1);
}

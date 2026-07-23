const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const worker = fs.readFileSync(
  path.join(root, "apps/worker/src/index.ts"),
  "utf8",
);
const schedulers = fs.readFileSync(
  path.join(root, "apps/worker/src/schedulers.ts"),
  "utf8",
);
const failures = [];

for (const fragment of [
  "recordCadenceTask",
  "taskId: options.taskId ?? 'REQ-M6-TASK-01'",
  "db.task.upsert",
  "db.taskLog.create",
  "status?: 'DONE' | 'BLOCKED'",
  "taskId?: string",
]) {
  if (!worker.includes(fragment)) {
    failures.push(
      `apps/worker/src/index.ts missing cadence helper fragment: ${fragment}`,
    );
  }
}

for (const jobName of [
  "WeeklyRankUpdate",
  "QuarterlyCategorySync",
  "MonthlyPostGenerator",
  "FaqVisibilityMonitor",
  "WeeklyGeoGridScan",
  "MonthlyCompetitorPolicyScan",
  "MonthlyBacklinkGapPull",
  "MonthlyConversionOptimizationLoop",
]) {
  if (!schedulers.includes(jobName)) {
    failures.push(
      `apps/worker/src/schedulers.ts missing repeat schedule: ${jobName}`,
    );
  }
  if (!worker.includes(`recordCadenceTask(\n      \`${jobName}:`)) {
    failures.push(
      `apps/worker/src/index.ts missing cadence Task proof for: ${jobName}`,
    );
  }
}

for (const fragment of [
  "Quarterly category sync blocked",
  "GBP_CATEGORY_SCHEMA_URL",
  "normalizeLiveGbpCategories",
  "attributesJson: JSON.stringify(category.attributes)",
  "lastSyncedAt: now",
  "Quarterly category sync imported ${categories.length} live GBP categor",
  "Review new GBP category attributes",
  "QuarterlyCategoryAttributeReview",
  "taskId: 'REQ-M1-17'",
  "Quarterly category/attribute sync review task created",
  "Monthly post generator blocked",
  "FAQ visibility monitor blocked",
  "saved ${savedScans} scan(s)",
  "generated ${violationsFound} suggest-edit task(s)",
  "saved ${opportunitiesSaved} opportunity row(s)",
  "generated ${tasksCreated} experiment task(s)",
]) {
  if (!worker.includes(fragment)) {
    failures.push(
      `apps/worker/src/index.ts missing cadence result fragment: ${fragment}`,
    );
  }
}

const schema = fs.readFileSync(
  path.join(root, "packages/database/prisma/schema.prisma"),
  "utf8",
);
for (const [name, pattern] of [
  ["attributesJson String?", /\battributesJson\s+String\?/],
  ["sourceLineage String?", /\bsourceLineage\s+String\?/],
  ["lastSyncedAt DateTime?", /\blastSyncedAt\s+DateTime\?/],
]) {
  if (!pattern.test(schema)) {
    failures.push(
      `packages/database/prisma/schema.prisma missing GBP category sync field: ${name}`,
    );
  }
}

const categoryRoute = fs.readFileSync(
  path.join(root, "apps/web/src/app/api/gbp/categories/route.ts"),
  "utf8",
);
for (const fragment of [
  'searchParams.get("includeMeta") === "1"',
  "parseAttributes(cat.attributesJson)",
  "attributes[cat.name]",
  "lastSyncedAt",
]) {
  if (!categoryRoute.includes(fragment)) {
    failures.push(`apps/web/src/app/api/gbp/categories/route.ts missing synced category metadata: ${fragment}`);
  }
}

const gbpIntakeForm = fs.readFileSync(
  path.join(root, "apps/web/src/components/gbp/gbp-intake-form.tsx"),
  "utf8",
);
for (const fragment of [
  "getGbpCategoryMetadata",
  "Synced category attributes",
  "categoryMetadata?.attributes[selectedCategoryName]",
]) {
  if (!gbpIntakeForm.includes(fragment)) {
    failures.push(`GBP category editor missing synced attribute review surface: ${fragment}`);
  }
}

if (failures.length) {
  console.error("Scheduler cadence proof gaps found:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Scheduler cadence proof verified.");

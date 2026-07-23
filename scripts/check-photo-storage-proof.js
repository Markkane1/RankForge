const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const photoRoute = read(
  "apps/web/src/app/api/clients/[id]/gbp/[gbpId]/photos/route.ts",
);
for (const fragment of [
  '".storage", "gbp-photos"',
  "name=${encodeURIComponent(storedName)}",
  "Photo category tag is required",
  "category: normalizedCategory",
]) {
  if (!photoRoute.includes(fragment))
    failures.push(`photo upload route missing ${fragment}`);
}
if (!/writeFile\(\s*path\.join\(uploadDir,\s*storedName\)/.test(photoRoute)) {
  failures.push(
    "photo upload route missing storage write to path.join(uploadDir, storedName)",
  );
}
if (
  photoRoute.includes('"public", "uploads"') ||
  photoRoute.includes("/uploads/gbp/")
) {
  failures.push("photo upload route still writes public upload URLs");
}
if (photoRoute.includes('category: category || "EXTERIOR"')) {
  failures.push(
    "photo upload route still silently defaults missing categories",
  );
}

const photoRouteTest = read("apps/web/tests/unit/photo-routes.test.ts");
if (
  !photoRouteTest.includes("blocks uploads without an explicit category tag")
) {
  failures.push("photo route test missing category-tag enforcement proof");
}

const photoManager = read("apps/web/src/components/gbp/gbp-photos-manager.tsx");
for (const fragment of [
  "getCompetitorPhotoTarget",
  "Competitor photo target",
  "highest stored competitor `photoCount`",
  "competitorBenchmarks?: CompetitorBenchmark[]",
]) {
  if (!photoManager.includes(fragment)) {
    failures.push(`photo manager missing competitor benchmark progress UI: ${fragment}`);
  }
}

const gbpIntakeForm = read("apps/web/src/components/gbp/gbp-intake-form.tsx");
if (!gbpIntakeForm.includes("competitorBenchmarks={competitorBenchmarks}")) {
  failures.push("GBP intake form does not pass competitor benchmarks to photo manager");
}

const photoTargetTest = read("apps/web/tests/unit/photo-target.test.ts");
if (!photoTargetTest.includes("uses the highest stored competitor photoCount as the upload target")) {
  failures.push("photo target calculation lacks unit coverage");
}

const photoDetailRoute = read(
  "apps/web/src/app/api/clients/[id]/gbp/[gbpId]/photos/[photoId]/route.ts",
);
for (const fragment of [
  "export async function GET",
  "requireClientRole",
  '"APPROVER"',
  '".storage", "gbp-photos"',
  'searchParams.get("name")',
  "readFile(filePath)",
  'Cache-Control": "private, max-age=300"',
  "unlink(filePath).catch",
]) {
  if (!photoDetailRoute.includes(fragment))
    failures.push(`photo detail route missing ${fragment}`);
}

if (failures.length) {
  console.error("Photo storage gaps found:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Photo storage proof verified.");

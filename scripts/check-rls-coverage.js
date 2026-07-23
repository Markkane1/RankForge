const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const schema = fs.readFileSync(
  path.join(root, "packages/database/prisma/schema.prisma"),
  "utf8",
);
const ci = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
const migrationsDir = path.join(root, "packages/database/prisma/migrations");
const migrations = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) =>
    fs.readFileSync(
      path.join(migrationsDir, entry.name, "migration.sql"),
      "utf8",
    ),
  )
  .join("\n");

const scopedModels = [];
const modelFields = new Map();
for (const match of schema.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g)) {
  const [, model, body] = match;
  modelFields.set(model, body);
  if (/\b(clientId|gbpProfileId|taskId|siteAuditId)\b/.test(body)) {
    scopedModels.push(model);
  }
}

const missing = scopedModels.filter((model) => {
  const explicit = migrations.includes(
    `ALTER TABLE "${model}" ENABLE ROW LEVEL SECURITY`,
  );
  const dynamic =
    migrations.includes(`'${model}'`) &&
    migrations.includes("ENABLE ROW LEVEL SECURITY");
  return !explicit && !dynamic;
});

if (missing.length) {
  console.error(`Missing RLS coverage for: ${missing.join(", ")}`);
  process.exit(1);
}

const requiredNeedles = [
  "app.current_client_id",
  "CREATE POLICY",
  "USING",
  "WITH CHECK",
];

const shapeFailures = [];
for (const needle of requiredNeedles) {
  if (!migrations.includes(needle)) {
    shapeFailures.push(`RLS migrations do not reference ${needle}`);
  }
}

const arrayValues = (name) => {
  const match = migrations.match(
    new RegExp(`${name}\\s+text\\[\\]\\s*:=\\s*ARRAY\\[([\\s\\S]*?)\\]`),
  );
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
};

const requiredDirectTables = new Set(arrayValues("direct_tables"));
const optionalDirectTables = new Set(arrayValues("optional_direct_tables"));
const requiredDirectPolicy = `"clientId" = current_setting(''app.current_client_id'', true)`;
const optionalDirectPolicy = `"clientId" IS NULL OR "clientId" = current_setting(''app.current_client_id'', true)`;

for (const [model, body] of modelFields) {
  if (!scopedModels.includes(model) || !/\bclientId\s+String\b/.test(body)) {
    continue;
  }

  const clientIdIsOptional = /\bclientId\s+String\?/.test(body);

  if (clientIdIsOptional) {
    if (!optionalDirectTables.has(model)) {
      shapeFailures.push(
        `${model}: optional clientId table is not in optional_direct_tables`,
      );
    }
    continue;
  }

  if (!requiredDirectTables.has(model)) {
    shapeFailures.push(
      `${model}: required clientId table is not in direct_tables`,
    );
  }

  if (!migrations.includes(requiredDirectPolicy)) {
    shapeFailures.push(
      `${model}: required clientId policy does not require exact tenant match`,
    );
  }

  if (
    optionalDirectTables.has(model) &&
    migrations.includes(optionalDirectPolicy)
  ) {
    shapeFailures.push(
      `${model}: required clientId table is incorrectly nullable in optional_direct_tables`,
    );
  }
}

if (shapeFailures.length) {
  console.error("RLS policy-shape gaps found:");
  for (const failure of shapeFailures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const ciNeedles = [
  /live-rls:/,
  /postgres:16/,
  /RUN_LIVE_RLS:\s*["']1["']/,
  /prisma migrate deploy --schema packages\/database\/prisma\/schema\.prisma/,
  /GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rankforge_app/,
  /npm test --workspace=@rankforge\/database/,
];
const missingCiNeedles = ciNeedles.filter((needle) => !needle.test(ci));
if (missingCiNeedles.length) {
  console.error("Live RLS CI wiring gaps found:");
  for (const needle of missingCiNeedles) {
    console.error(`- .github/workflows/ci.yml missing ${needle}`);
  }
  process.exit(1);
}

console.log(`RLS coverage verified for ${scopedModels.length} scoped models.`);

const fs = require("fs");
const path = require("path");

const apiRoot = path.join(process.cwd(), "apps", "web", "src", "app", "api");
const publicMutations = [
  path.join("auth", "magic-link", "route.ts"),
  path.join("events", "conversion", "route.ts"),
  path.join("events", "conversion", "browser", "route.ts"),
  path.join("webhooks", "google", "route.ts"),
  path.join("webhooks", "meta", "route.ts"),
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else if (entry.name === "route.ts") files.push(file);
  }
  return files;
}

const missing = [];
const unscopedClientRoutes = [];
for (const file of walk(apiRoot)) {
  const relative = path.relative(apiRoot, file);
  const source = fs.readFileSync(file, "utf8");
  const publicRoute = publicMutations.includes(relative);
  const isClientIdRoute = relative.split(path.sep)[0] === "[id]";

  if (isClientIdRoute && /require(Role|Owner)\s*\(/.test(source)) {
    unscopedClientRoutes.push(relative);
  }

  const matches = [
    ...source.matchAll(/export\s+async\s+function\s+([A-Z]+)\b/g),
  ];
  for (let i = 0; i < matches.length; i++) {
    const method = matches[i][1];
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method) || publicRoute)
      continue;

    const start = matches[i].index;
    const end = matches[i + 1]?.index ?? source.length;
    const body = source.slice(start, end);
    if (!/require(Session|Role|Owner|ClientRole)\s*\(/.test(body)) {
      missing.push(`${relative} (${method})`);
    }
  }
}

if (missing.length) {
  console.error("Mutating API routes missing shared auth guards:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

if (unscopedClientRoutes.length) {
  console.error(
    "Client-scoped API routes must use requireClientRole instead of plain role guards:",
  );
  for (const file of unscopedClientRoutes) console.error(`- ${file}`);
  process.exit(1);
}

console.log("Mutating API route guards verified.");

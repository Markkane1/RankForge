/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");

const config = JSON.parse(fs.readFileSync("lighthouserc.json", "utf8"));
const urls = config?.ci?.collect?.url ?? [];
const assertions = config?.ci?.assert?.assertions ?? {};

const failures = [];
for (const url of [
  "http://localhost:3000/portal",
  "http://localhost:3000/login",
]) {
  if (!urls.includes(url)) failures.push(`Missing Lighthouse URL: ${url}`);
}

const accessibility = assertions["categories:accessibility"];
if (
  !Array.isArray(accessibility) ||
  accessibility[0] !== "error" ||
  accessibility[1]?.minScore < 0.9
) {
  failures.push("Missing Lighthouse accessibility error threshold >= 0.9");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Lighthouse CI config verified.");

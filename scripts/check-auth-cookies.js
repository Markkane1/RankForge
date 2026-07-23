const fs = require("fs");

const auth = fs.readFileSync("apps/web/src/auth.ts", "utf8");
const portal = fs.readFileSync(
  "apps/web/src/app/api/auth/magic-link/callback/route.ts",
  "utf8",
);
const portalLogout = fs.readFileSync(
  "apps/web/src/app/api/auth/portal-logout/route.ts",
  "utf8",
);

for (const [file, source] of [
  ["apps/web/src/auth.ts", auth],
  ["apps/web/src/app/api/auth/magic-link/callback/route.ts", portal],
  ["apps/web/src/app/api/auth/portal-logout/route.ts", portalLogout],
]) {
  for (const expected of [
    "httpOnly: true",
    "sameSite: 'lax'",
    "secure: process.env.NODE_ENV ===",
  ]) {
    if (
      !source.includes(expected) &&
      !source.includes(expected.replaceAll("'", '"'))
    ) {
      console.error(`${file} is missing cookie hardening option: ${expected}`);
      process.exit(1);
    }
  }
}

if (!portalLogout.includes("maxAge: 0")) {
  console.error(
    "Portal logout must expire the hardened portal-session cookie with maxAge: 0",
  );
  process.exit(1);
}

console.log("Auth cookie hardening verified.");

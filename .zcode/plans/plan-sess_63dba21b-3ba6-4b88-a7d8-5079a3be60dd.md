# RankForge Security Hardening — Implementation Plan

## Decisions (locked from clarifying questions)
- **2FA**: TOTP authenticator app (RFC 6238) — adds `otplib` + `qrcode`
- **Idle expiry**: Short JWT TTL (15 min) + sliding refresh via `jwt` callback + server-side idle check
- **Webhooks**: Google `x-goog-signature` HMAC-SHA256 verification
- **API lockdown**: Build `requireSession()`/`requireRole()` helpers + apply to all ~25 open routes

---

## Part 1 — New dependencies & schema

**1.1 Install deps (apps/web)**: `otplib`, `qrcode`, `@types/qrcode`. Add `ioredis` as a direct dep (already transitively available via `@rankforge/queue`).

**1.2 Prisma schema — add 2FA fields to `StaffUser`** (`packages/database/prisma/schema.prisma`, model at L32):
```prisma
  twoFactorEnabled    Boolean   @default(false)
  twoFactorSecret     String?     // AES-256-GCM encrypted at rest
  twoFactorBackupHash String?     // bcrypt-hashed backup codes, newline-joined
```
Run `prisma migrate dev --name add_two_factor` + `prisma generate`. Seed left with 2FA off.

**1.3 Env validation — new `apps/web/src/lib/env.ts`**: Zod schema (zod already a dep) validating at boot: `NEXTAUTH_SECRET`, `DATABASE_URL`, `GOOGLE_WEBHOOK_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY` (32-byte), `NEXTAUTH_URL`. Typed `env` export; fail-fast in prod.

**1.4 New `apps/web/src/lib/crypto.ts`**:
- `encryptSecret`/`decryptSecret` — AES-256-GCM via `TWO_FACTOR_ENCRYPTION_KEY` (mirrors `apps/api` encryption.service).
- `verifyGoogleWebhookSignature(body, signature, secret)` — HMAC-SHA256, constant-time via `timingSafeEqual`.
- `getSignInIp(req)` — read `X-Forwarded-For`/`X-Real-IP` (Caddy sets these) for rate-limit keying.

---

## Part 2 — 2FA (TOTP) end-to-end

**2.1 NextAuth `authorize()`** (`app/api/auth/[...nextauth]/route.ts`): add `totp` to credentials schema; after bcrypt success also **check `isActive`** (closes that hole); if `twoFactorEnabled` and no `totp` → signal `2FA_REQUIRED`; if `totp` → verify via `otplib.authenticator.verify` against decrypted secret, or accept+burn a backup code (bcrypt compare + `$transaction`); on success update `lastLoginAt`.

**2.2 Type augmentation** (`types/next-auth.d.ts`): extend `JWT` + `Session.user` with `twoFactorEnabled`, `twoFactorVerified`, `idleExpires`.

**2.3 New TOTP management routes** (behind OWNER/own-user check + 2FA rate limit):
- `api/auth/2fa/setup/route.ts` — generate secret, return `otpauth://` URI + QR data URL, store pending secret encrypted in Redis (TTL 5 min).
- `api/auth/2fa/verify/route.ts` — confirm TOTP, persist `twoFactorSecret` + `twoFactorEnabled=true`, generate 10 single-use backup codes (shown once).
- `api/auth/2fa/disable/route.ts` — requires current password + valid TOTP; clears fields.

**2.4 Login page 2FA UX** (`login/page.tsx`): add `step:'credentials'|'totp'` + `totp` state; pass `totp` into `signIn`; on `result.error==='2FA_REQUIRED'` show existing shadcn `InputOTP`; **remove the demo-creds hint (L141–150)** that advertises `password123`.

**2.5 2FA enrollment UI** (`components/settings/settings-view.tsx`): new "My Account / Security" card between Organization and Platform Info cards — status, Enable (QR modal + confirm + backup-code reveal), Disable (password re-prompt). Uses `sonner` `toast`. Add `twoFactorEnabled` column to the staff table.

**2.6 Fix the Toaster mount (prerequisite)** — `app/layout.tsx` L4+L53: swap `Toaster` import from `@/components/ui/toaster` → `@/components/ui/sonner` (sonner Toaster never mounted; all feature code calls `sonner.toast`, so toasts are currently invisible — this one-line fix is required for any toast, including new 2FA states, to render).

---

## Part 3 — Rate limiting + lockout (Redis-backed)

**3.1 New `apps/web/src/lib/rate-limit.ts`** using `redisConnection` from `@rankforge/queue` (precedent: `tasks/[id]/status/route.ts` already imports it):
- `rateLimit({ key, limit, windowSec })` — Redis `INCR` + `EXPIRE` sliding counter → `{ success, remaining, retryAfter }`.
- **Login throttle**: `rl:login:<ip>:<email>`, 5 / 15 min → 429 + `Retry-After`.
- **Lockout**: after 5 failed logins per email, `lock:login:<email>` (TTL 15 min) rejects even with correct creds.
- Generic throttle for sensitive routes (2FA verify, settings, import/export).

**3.2 Wire login throttle** inside `authorize()` (record/clear via Redis); surface 429 via `CredentialsSignError`. Non-NextAuth sensitive routes wrap with `rateLimit` at entry.

---

## Part 4 — Session hardening + auth helpers

**4.1 Secure cookies + secret + idle expiry** in `authOptions`:
- `secret: env.NEXTAUTH_SECRET`; `useSecureCookies:true`; explicit `cookies` block (`httpOnly:true`, `sameSite:'strict'`, `secure:true`, `path:'/'`, session `maxAge`).
- `session: { strategy:'jwt', maxAge: 60*15 }` (15-min TTL → enables true sliding idle).
- **Sliding idle**: `jwt` callback sets `token.idleExpires = Date.now() + 12*60*60*1000` on each fresh token; strips role/userId when `Date.now() > idleExpires` → forces re-auth. Short `maxAge` makes NextAuth refresh the cookie each request, so active users stay in and idle>12h users are forced out.
- **Drop the `EmailProvider` magic-link-with-`console.log`** (insecure — logs links) since credentials+TOTP is the chosen path. *(Flag me if you'd rather keep it behind real SMTP.)*

**4.2 New `apps/web/src/lib/auth-guard.ts`** (modeled on the approve route L11–26), discriminated unions for early-return:
```ts
requireSession(): Promise<{ ok:true; user } | { ok:false; response:NextResponse }>
requireRole(...roles: StaffRole[]): Promise<... | 403 response>
```
Enforces the **idle-expiry check** server-side across every route.

**4.3 Client helper** (`lib/hooks.ts`): extend `useCurrentUser()` with `hasRole(...roles)`.

---

## Part 5 — Lock down all API routes

Apply `requireSession()` (+ `requireRole()` where appropriate) to every open handler under `app/api/`. Role matrix:
- **OWNER-only**: `settings/*`, `import/*`, `export/*`, staff mutations, `clients/[id]/state`, `clients` DELETE.
- **OWNER + COORDINATOR**: `clients` write, `tasks` write, `import/tasks`.
- **All authenticated**: `dashboard`, `notifications`, `leads`, `reports/monthly`, `build-status`, `clients` GET, `tasks` GET.
- Existing approve/reject routes → refactor onto the helper (dedup).

---

## Part 6 — Google webhook (new)

**6.1 New `app/api/webhooks/google/route.ts`**:
- `GET`: verification handshake (`hub.mode=subscribe`, `hub.challenge`, `hub.verify_token` vs `GOOGLE_WEBHOOK_VERIFY_TOKEN`).
- `POST`: raw body + `x-goog-signature` → `verifyGoogleWebhookSignature`; 403 on mismatch (constant-time); on success enqueue a job to `taskQueue` (reusing `@rankforge/queue`) and return 204. Public-but-signature-gated + IP rate-limited (`rl:wh:google:<ip>`, 100/60s).

**6.2 Docs**: `app/api/webhooks/README.md` — env vars, expected headers, rotation steps.

---

## Part 7 — Cleanup & verification

- **Duplicate `.js` siblings**: keep `.ts`/`.tsx` as source of truth; flag risk. Mass-deletion out of scope.
- **Verify**: `tsc --noEmit`, `prisma validate`, `prisma migrate dev`, `turbo build`.
- Provide root `.env.example` listing every new/required var (no secrets).

---

## Files touched (summary)
**New**: `lib/env.ts`, `lib/crypto.ts`, `lib/rate-limit.ts`, `lib/auth-guard.ts`, `api/auth/2fa/{setup,verify,disable}/route.ts`, `api/webhooks/google/route.ts`, `api/webhooks/README.md`, root `.env.example`.
**Modified**: `schema.prisma` (+migrate), `seed.ts`, NextAuth `route.ts`, `next-auth.d.ts`, `login/page.tsx`, `settings-view.tsx`, `hooks.ts`, `layout.tsx` (toaster fix), `middleware.ts`, ~25 `api/**/route.ts` (guards), `apps/web/package.json`.

## Risks I'll flag during execution
- NextAuth-v4 `authorize()` can't cleanly return a custom error code — the `2FA_REQUIRED` signal via `CredentialsSignError` + client branch on `result.error` is the standard workaround; I'll implement and document it.
- Short JWT `maxAge` causes a per-request cookie refresh — standard and fine at this scale.
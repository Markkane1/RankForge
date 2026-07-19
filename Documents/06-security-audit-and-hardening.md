# Post-Implementation Security Audit & Hardening
Version 1.0 | July 2026
**Hand this file to the coding agent only after Sprint 10 (full v1 build) is
complete.** Its job here is not to build new features — it is to prove, item
by item, that what was built is actually secure, and to fix anything that
isn't before real client data or credentials touch the system.

## 0. How to Use This Document

- Work through every section in order. Each checklist item needs one of three
  outcomes: **PASS** (with the evidence — a test name, a log excerpt, a
  command output), **FAIL** (with a fix applied and re-tested), or **N/A**
  (with a one-line reason).
- Nothing gets marked PASS on the agent's say-so alone for the items marked
  **[MANUAL VERIFY]** — those require a human (you) to actually look, per
  Section 12.
- Produce a single `SECURITY_AUDIT_RESULT.md` artifact at the end, structured
  exactly as this document's headings, with the PASS/FAIL/N/A + evidence for
  every line. This becomes the permanent audit record — re-run it after any
  significant change (new integration, new role, schema change touching auth
  or credentials).

---

## 1. Threat Model Summary (context for the checks below)

| Asset | Why it matters | Main threats |
|---|---|---|
| Client Google OAuth tokens (`ClientCredential`, type `GBP_OAUTH`/`GA4_OAUTH`/`GSC_OAUTH`) | A leaked token gives an attacker write access to a real client's live Google Business Profile — could get it suspended, defaced, or used to post fraudulent content | Token exfiltration via logs, XSS, SSRF, insufficient encryption at rest |
| Org tool API keys (`OrgCredential`: DataForSEO, Local Falcon, BrightLocal, Meta WhatsApp) | Leak = financial loss (attacker runs up API bills) or ability to send WhatsApp messages as your business | Same as above, plus committed-to-git exposure |
| Client business data (pricing, keyword strategy, lead log, reviews) | Confidential competitive information for each client business | Cross-client data leakage via missing/broken RLS, IDOR (insecure direct object reference) via guessable IDs |
| Customer PII (phone/email used for review-asks) | Regulated personal data (UAE PDPL and equivalent regimes for other markets) | Retention beyond consent, leakage, reuse across clients |
| Client portal login | The one surface a non-technical client actually uses | Session hijacking, IDOR, weak magic-link implementation |
| The one Owner account with `OrgCredential` access | Single point of failure — compromise here is a total breach | Credential stuffing, missing 2FA, phishing |
| Live client websites (Module 2 writes) | A bad automated write could break or deface a client's real, revenue-generating website | Missing restore-point, missing read-back verification, XSS injected via GBP/content fields onto rendered pages |

---

## 2. Authentication Audit

- [ ] **[AUTOMATED]** Password policy enforced (min length/complexity) on Auth.js credentials provider, if used; brute-force lockout/rate-limit after N failed attempts.
- [ ] **[AUTOMATED]** 2FA is *actually enforced*, not just available — attempt to log in as the Owner role with 2FA disabled in test config and confirm the session is rejected.
- [ ] **[AUTOMATED]** Client-portal magic links: expire within a short, defined window (e.g. 15 minutes), are single-use (a second click on a used link fails), and are transmitted only over HTTPS.
- [ ] **[AUTOMATED]** Session cookies: `HttpOnly`, `Secure`, `SameSite=Strict` flags all present — verify via browser dev tools or an automated header-inspection test, not by reading the code and assuming it matches.
- [ ] **[AUTOMATED]** Session expiry (12h idle per REQ-AUTH-01) actually terminates access — test that an API call with a stale session token is rejected, not just that the frontend redirects to login.
- [ ] **[AUTOMATED]** Logout actually invalidates the server-side session (not just clears the client cookie) — attempt to reuse a captured session token after logout.
- [ ] **[MANUAL VERIFY]** Any OAuth redirect URI allow-list (Google, Meta) contains only the exact production/staging domains — no wildcard, no `localhost` left in production config.

## 3. Authorization & Client-Isolation Audit

- [ ] **[AUTOMATED]** For every table with a `clientId` column, an RLS policy exists — run a script that diffs the Prisma schema's client-scoped models against `pg_policies` and fails if any table is missing.
- [ ] **[AUTOMATED]** **Live cross-client isolation test:** seed two real clients (A and B) with distinct data in every module (GBP profile, keywords, reviews, leads, reports). As client B's portal session, attempt to `GET` every one of client A's resource IDs directly (not through B's own list view) — every attempt must return 403/404, never 200 with A's data.
- [ ] **[AUTOMATED]** Repeat the above as a staff Coordinator session scoped (if such scoping exists) — confirm RBAC restrictions hold even though staff can technically act across clients.
- [ ] **[AUTOMATED]** IDOR check: enumerate sequential/guessable IDs (if any non-cuid IDs exist anywhere, e.g. numeric report periods) against another client's resources.
- [ ] **[AUTOMATED]** Every mutating endpoint has a `@RequireRole` decorator — CI script from `05` re-run and its output attached as evidence here, not just assumed still passing.
- [ ] **[AUTOMATED]** 4-eyes approval check (REQ-AUTH-05): attempt, via direct API call (bypassing the UI), to approve an `ApprovalRequest` as the same user who created it — must be rejected server-side.
- [ ] **[AUTOMATED]** Every blueprint-mandated human gate (name/address/category change, ≤2★ review response, verification, suspension/reinstatement, anything spending money, first-5 content pieces, developer-level code changes) is confirmed to require an `ApprovalRequest` by attempting the underlying mutation directly against the API with no approval on record — must be rejected, not just hidden in the UI.

## 4. Secrets & Credential Management Audit

- [ ] **[AUTOMATED]** Every `ClientCredential.encryptedBlob` and `OrgCredential.encryptedBlob` value, inspected directly in the database, is genuinely ciphertext (not plaintext, not base64-encoded plaintext, not a weak/reversible encoding).
- [ ] **[AUTOMATED]** The KMS master key is not stored anywhere in the application repo, environment file committed to git, or container image — confirm via a repo-wide secret scan (gitleaks/trufflehog) across full git history, not just the current HEAD.
- [ ] **[AUTOMATED]** Grep the full application log output (a day's worth from staging) for the literal strings `access_token`, `refresh_token`, `api_key`, `Authorization: Bearer` — zero matches with an actual secret value (log lines referencing "used credential `cred_xyz`" are fine; the raw secret value is not).
- [ ] **[AUTOMATED]** Grep the built frontend JS bundle for any `OrgCredential` provider name string plus adjacent key-like patterns — confirm no third-party API key is shipped to the browser (REQ-SEC-03).
- [ ] **[MANUAL VERIFY]** KMS key access policy restricts decrypt permission to the `SecretsModule`'s service identity only — not a broad IAM role shared by unrelated infra.
- [ ] **[MANUAL VERIFY]** A credential-rotation runbook exists and has been dry-run at least once for each credential type (rotate a DataForSEO key, rotate a client's OAuth token by forcing re-consent) without downtime or silent failure.

## 5. External API Integration Security

- [ ] **[AUTOMATED]** Every inbound webhook (Meta WhatsApp webhook, Google OAuth callback, any CMS webhook) verifies a signature or `state` parameter — attempt to POST a forged payload without the correct signature and confirm rejection.
- [ ] **[AUTOMATED]** GBP write operations only ever execute after the idempotency + read-back-verify pattern from `02` §6 — confirm by forcing a duplicate job re-run (same idempotency key) and asserting no duplicate post/review-response is created on the real (or sandbox) GBP profile.
- [ ] **[AUTOMATED]** A simulated GBP API error/timeout does not crash the worker process or leave a task stuck in `IN_PROGRESS` forever — confirm it reaches `FAILED` after the max-3-retries backoff and raises an alert.
- [ ] **[MANUAL VERIFY]** Confirm no code path attempts a GBP capability outside what Appendix D's automation-level map allows (e.g., no attempt to delete a review via API, no attempt to create a new listing via API) — re-read the `Module6OrchestrationModule` capability-routing code directly, since a bug here risks real client profile suspension, not just a software bug.
- [ ] **[AUTOMATED]** SSRF check: any endpoint accepting a user-supplied URL (booking link, website URL, CMS webhook target) validates against internal/private IP ranges before the server fetches it.

## 6. Input Validation & Injection Testing

- [ ] **[AUTOMATED]** All Prisma queries are parameterized (Prisma enforces this by default) — confirm no `$queryRawUnsafe` or raw string-concatenated SQL exists anywhere in the codebase (grep for it explicitly).
- [ ] **[AUTOMATED]** Every form input (description editor, service names, review responses, content pieces) is sanitized before being rendered back into any HTML context (client portal, report PDF/HTML) — confirm with a stored-XSS test: submit a GBP description containing a `<script>` payload and verify it renders as inert text everywhere it's displayed, including inside generated JSON-LD/schema output.
- [ ] **[AUTOMATED]** File upload (photos) validated server-side for actual file type (magic-byte check, not just file extension) and size limit; attempt to upload a renamed executable as a `.jpg` and confirm rejection.
- [ ] **[AUTOMATED]** Zod (or equivalent) schema validation exists on every API route's request body — confirm a malformed/oversized payload against each endpoint returns a clean 400, not a 500 or an unhandled exception.

## 7. Network & Infrastructure Hardening

- [ ] **[AUTOMATED]** HTTPS enforced everywhere (HTTP requests redirect, HSTS header present).
- [ ] **[AUTOMATED]** Security headers present on all responses: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options` (or CSP `frame-ancestors`), `Referrer-Policy`.
- [ ] **[AUTOMATED]** CORS configuration allows only the known frontend origin(s) — confirm a cross-origin request from an arbitrary domain is rejected.
- [ ] **[AUTOMATED]** Rate limiting confirmed functional (not just configured) on: login, magic-link request, OAuth callback, and any endpoint triggering a billed external API call — send a burst of requests in a test and confirm throttling kicks in.
- [ ] **[MANUAL VERIFY]** Database and Redis instances are not publicly reachable from the internet — only the API/worker's network can reach them (check hosting provider's network/firewall config directly, not application code).

## 8. Data Protection & Privacy

- [ ] **[AUTOMATED]** REQ-NFR-06 offboarding deletion job actually deletes customer PII (review-ask phone/email records) when a client transitions to `OFFBOARDED` — confirm by running the transition in a test and querying for the records afterward.
- [ ] **[AUTOMATED]** No customer PII (phone/email from the review-ask flow) from one client is ever queryable in the context of another client's playbook-memory aggregation (REQ-M6-05) — confirm the aggregation query only ever selects anonymized/aggregate fields.
- [ ] **[MANUAL VERIFY]** WhatsApp opt-outs are honored instantly and permanently — confirm by opting out a test contact and attempting to trigger a subsequent review-ask against that contact; it must not send.
- [ ] **[MANUAL VERIFY]** Data retention policy documented (what's kept, how long, on what legal basis) and matches actual system behavior — this is the one item here that is as much a policy check as a code check.

## 9. Dependency & Supply Chain

- [ ] **[AUTOMATED]** `npm audit` / Dependabot shows zero unresolved critical advisories at time of audit.
- [ ] **[AUTOMATED]** Lockfile committed and CI installs from lockfile only (`npm ci`, not `npm install`), preventing silent dependency drift.
- [ ] **[MANUAL VERIFY]** Any third-party npm package with filesystem/network access added since the last audit has been briefly reviewed for legitimacy (not just its test-passing behavior).

## 10. Logging, Monitoring & Incident Response

- [ ] **[AUTOMATED]** Sentry captures a deliberately-triggered test exception in both the API and worker processes.
- [ ] **[AUTOMATED]** The daily access-health check (REQ-M6-08) actually runs on schedule and produces a result per client per external system — confirm via `TaskLog` history, not just that the code exists.
- [ ] **[MANUAL VERIFY]** An incident-response runbook exists for: (a) a client's GBP profile getting suspended, (b) a suspected credential leak, (c) unexpected data appearing to cross client boundaries — each with a first-hour action list, not just a "we'll figure it out."

## 11. Backup & Disaster Recovery

- [ ] **[AUTOMATED]** Postgres automated backups enabled on the hosting provider (Neon/Supabase point-in-time recovery), confirmed by checking the provider dashboard, not assumed from a config file.
- [ ] **[MANUAL VERIFY]** At least one real restore-from-backup has been performed in a non-production environment and produced a working database — an untested backup is not a backup.
- [ ] **[AUTOMATED]** Module 2's "restore point before any live-site write batch" rule (REQ-M2-02) is confirmed functional — perform a real fix-batch on a test site and confirm a rollback actually restores the prior state.

## 12. Manual Verification Items (cannot be delegated to the coding agent alone)

The items marked **[MANUAL VERIFY]** above require you, personally, to look —
not because the agent is untrustworthy, but because a system cannot fully
audit its own blast radius (e.g., "is the KMS IAM policy actually scoped
narrowly" requires looking at cloud console configuration a code review
won't surface). Block go-live on real client data until every `[MANUAL
VERIFY]` item above has a dated sign-off line in `SECURITY_AUDIT_RESULT.md`.

## 13. Sign-Off Template

```
SECURITY AUDIT — SIGN-OFF
Date: __________
Auditor (human): __________
Scope: v1 build, Sprints 0-10, prior to first real client go-live

Section 2 (Auth):            PASS / FAIL — items open: ____
Section 3 (Authorization):    PASS / FAIL — items open: ____
Section 4 (Secrets):          PASS / FAIL — items open: ____
Section 5 (External APIs):    PASS / FAIL — items open: ____
Section 6 (Input validation): PASS / FAIL — items open: ____
Section 7 (Network/infra):    PASS / FAIL — items open: ____
Section 8 (Data protection):  PASS / FAIL — items open: ____
Section 9 (Dependencies):     PASS / FAIL — items open: ____
Section 10 (Logging/IR):      PASS / FAIL — items open: ____
Section 11 (Backup/DR):       PASS / FAIL — items open: ____

Overall: CLEARED FOR PRODUCTION / NOT CLEARED (list blockers)
```

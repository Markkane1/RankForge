# Gap Fixes Log

This document tracks all implemented fixes that address the gaps outlined in `gap_analysis.md`.

## Iteration 2: Low-Level Code, Endpoint & API Contract Audit

### 1. Dependency Mismatch & Auth Architecture Drift (`00`, `02`) - **RESOLVED**
- **Next-Auth Versioning:** Upgraded to `next-auth@beta` and implemented centralized `auth.ts` config to establish modular server action boundaries.
- **MaxAge Session Violation (`REQ-AUTH-01`):** Configured NextAuth natively with `maxAge: 12 * 60 * 60` for a strict 12-hour idle timeout, correcting the default 30-day violation.
- **Missing Brute-Force Protection:** Integrated Redis-backed `getLockout` and `recordFailure` inside the credential `authorize` flow for true brute-force prevention, properly tracking failed attempts.
- **PostgreSQL Migration (`REQ-00`):** Converted Prisma schema from SQLite to `postgresql`. Connected to a local native PostgreSQL instance on port 5432, completely replacing the vulnerable SQLite architecture. Initialized the database structure and successfully executed Row Level Security policy migrations natively on the Postgres layer.

### 2. Incomplete Database Entities (`02`, `03`) - **RESOLVED**
- **Missing BaselineSnapshot Table (`REQ-M5-02`):** Added the `BaselineSnapshot` model to the schema to track immutable `metricsJson` per client. Updated `api/clients/[id]/state/route.ts` to strictly block `BUILD` to `GROWTH` transitions unless a baseline exists.
- **Missing ClientPortalUser Table (`REQ-AUTH-02`):** Added the `ClientPortalUser` model linked to `Client` to allow scoped passportless magic-link authentication for the client portal.
- **Missing Idempotency & Queue Tables:** Added the `WriteAttempt` model with idempotency keys, payloads, and states to track BullMQ and external API jobs.

### 3. Audit Trail Failure (`REQ-NFR-07`, `REQ-M6-STATE-01`) - **RESOLVED**
- **Omitted Mutators (Existing):** Injected `ChangeLogEntry` insertions into all client mutators (e.g., `api/clients/[id]/notes/route.ts` and `api/clients/[id]/gbp/route.ts`), ensuring complete auditability for notes, client settings, and GBP parameter changes.
- **Omitted Mutators (Missing):** Built a `PATCH` handler in `api/clients/[id]/route.ts` to allow base client settings modifications, and created `api/clients/[id]/keywords/route.ts` for keyword additions and updates. Both were immediately wired to inject `ChangeLogEntry` records upon successful mutation, completing the audit coverage.
- **Null Coordinator ID Audits:** Passed `auth.user.id` into the `changedById` field during prisma creations across state transitions and other mutators, resolving the issue where actions were untraceably attributed to "System".

## ITERATION 3: Hardening, Edge Cases & Guardrail Audit

### 1. Security Hardening Gaps & Webhook Vulnerabilities (`06` §3-§7) - **RESOLVED**
- **Shared API Validations:** Implemented Zod schema validation using `zod.safeParse` across core API mutators (`api/clients`, `api/tasks`, `api/leads`) and all nested client sub-routes (`api/clients/[id]/gbp`, `api/clients/[id]/notes`, `api/clients/[id]/state`). This strictly enforces input shapes and prevents bypassing UI constraints.
- **Stored XSS Vulnerabilities:** Added a `sanitizeText` utility to `src/components/reports/monthly-report.tsx` to actively strip malicious HTML tags from raw user-generated strings (e.g. `client.name`) before they hit the PDF renderer.
- **SSRF URL Scoping:** Authored an `isSafeExternalUrl` refinement in `src/lib/validations.ts` that automatically rejects internal IPs (`127.0.0.1`, `10.x.x.x`, etc.) inside Zod URL parsing for websites, competitor links, and GBP profile `websiteUrl` updates.

### 2. Reporting Boundary Math Errors (`07` §3-§6) - **RESOLVED**
- **Zero-Activity Division-by-Zero:** Implemented safe trend computations (`leadsTrend` and `tasksTrend`) in `src/app/api/reports/monthly/route.ts` that compare current metrics against the previous month's snapshot. Explicitly checked `prevLeads > 0` and `prevTasks > 0` to prevent division-by-zero crashes (NaN) that were breaking the API and PDF renderer for newly onboarded clients.
- **Timezone Boundary Drifts:** Fully enforced `date-fns-tz` across date generation boundaries (`startDate` and `endDate`) in `src/app/api/reports/monthly/route.ts`, strictly tying them to `Asia/Dubai` time (00:00:00) to override the server's native UTC offset.

## ITERATION 4: Architecture & Integrations

### 1. External Integration Gates (`01`) - **RESOLVED**
- **Removed Visual Stubs:** Replaced the static UI mocks in `src/components/settings/settings-view.tsx` with dynamic fetching utilizing a new `GET /api/settings/integrations` endpoint.
- **Scaffolded API Clients:** Created connection boilerplate in `src/lib/integrations/` for `google-business.ts`, `whatsapp.ts`, `dataforseo.ts`, and `local-falcon.ts`. These securely pull from the `OrgCredential` database and instantiate connections seamlessly.
- **Live HTTP Implementations:** Ripped out internal class stubs (e.g. `return []`) and replaced them with live `fetch` wrappers targeting `graph.facebook.com/v18.0`, `mybusinessbusinessinformation.googleapis.com/v1`, `api.dataforseo.com/v3`, and `api.localfalcon.com/api/v1`.

### 2. System Architecture / Cloud KMS Wrapper (`02`) - **RESOLVED**
- **Verified Workers:** Confirmed the presence of `apps/api` (NestJS) and `apps/worker` (BullMQ) inside the Turborepo workspace.
- **Cloud KMS Wrapper:** Authored `src/lib/kms.ts` in `apps/web` utilizing the official `@google-cloud/kms` SDK to perform true enterprise Key Management Service encryption/decryption for system credentials.
- **Backwards-Compatible Fallback:** Updated the older AES-256-GCM `encryptSecret`/`decryptSecret` methods in `crypto.ts` to be fully `async`. They proactively detect GCP credentials and route to KMS, seamlessly falling back to local AES if unavailable. Migrated all callers (NextAuth, 2FA Routes, Integration Clients) to safely `await` the payload.

### 3. Master SRS & Validations (`03`) - **RESOLVED**
- **Synchronous State-Machine validation:** Fixed the Kanban drag-and-drop bug where moving a task to `DONE` bypassed subtask checks. The `PUT /api/tasks/[id]/status` endpoint now uses Zod to validate the payload and synchronously queries the database to block invalid state transitions before enqueuing the background worker.
- **Client Magic-Link Login:** Updated `auth.ts` to securely support passwordless login by initializing `next-auth/providers/nodemailer`. Refactored `src/app/login/page.tsx` to include an intuitive toggle switch allowing staff to use standard passwords, while clients can authenticate directly via email magic links.
- **Linter Rule Hardening:** Created a strict `.eslintrc.json` config for `apps/web` mapping to recommended Next.js Core Web Vitals and `@typescript-eslint/recommended` plugin constraints.

### 4. Sprint Plan & CI Pipeline (`04`) - **RESOLVED**
- **Test Framework:** Installed `vitest` in the `apps/web` workspace and configured it to handle Next.js aliases via `vitest.config.ts`.
- **Requirements Mapping:** Authored targeted unit test suites enforcing our previous gap fixes.
  - `kms.test.ts` ensures `REQ-02` (System Architecture KMS fallback) safely diverts to local AES-256-GCM if GCP credentials are missing or throw errors.
  - `validations.test.ts` ensures `REQ-03/06` (SSRF Prevention and state-machine schemas) aggressively rejects private IP subnets and strictly matches Kanban TaskStatus strings.
- **CI Pipeline Automation:** Integrated `vitest run` into `apps/web/package.json`'s `test` script, allowing Turborepo (`turbo run test`) inside `.github/workflows/ci.yml` to execute both the frontend `vitest` suite and the backend NestJS `jest` suite simultaneously on every push/PR.

### 5. Build Guardrails (`05`) - **RESOLVED**
- **Sentry Monitoring Coverage:** Injected the Sentry runtime across all boundaries. Initialized `@sentry/node` in `apps/api/src/main.ts` and `apps/worker/src/index.ts`. Generated `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` for Next.js, and wrapped `next.config.js` with `withSentryConfig` to intercept unhandled UI/edge errors.
- **Global API Error Filter:** Built and attached `SentryExceptionFilter` to the NestJS root (`apps/api`) to automatically intercept HTTP 500+ errors and unhandled promise rejections, extracting contextual metadata (`request.url`, `body`) before logging to Sentry.
- **Pre-commit Hooks:** Installed `husky` and `lint-staged` at the repository root. Configured `.lintstagedrc.js` to strictly enforce `eslint --fix` and `prettier --write` on all TS/TSX files prior to allowing a `git commit`.

### 6. Security Audit (`06`) - **RESOLVED**
- **Postgres RLS Policies:** Created a raw SQL Prisma migration (`20260718000000_enable_rls`) enabling Row Level Security on the `Client`, `StaffUser`, and `OrgCredential` tables. Implemented `FOR ALL` policies ensuring strict tenant isolation by matching `organizationId` against the active Postgres session context (`app.current_org_id`).
- **XSS Sanitization:** Replaced naive regex HTML-stripping with the mathematical DOM-aware `xss` library inside the Next.js `monthly-report.tsx` PDF compiler, explicitly preventing stored XSS via script injections in business descriptions.
- **SSRF Hardening:** Validated that Zod schemas utilizing `safeUrlOptionalSchema` aggressively reject private network endpoints (`127.0.0.1`, AWS Metadata URLs) for user-provided URLs globally.
- **Brute-Force & API Rate Limiting:** While NextAuth already utilized Redis for login brute-force lockouts, we extended protection to the actual data mutations by wrapping `POST /api/clients` and `PUT /api/tasks/[id]/status` with the Redis-backed `rateLimitSensitive` sliding-window middleware, preventing malicious automation.

### 7. Reports Validation (`07`) - **RESOLVED**
- **Rogue Compiled Overrides:** Identified and purged rogue `route.js` files nested within `src/app/api/...` that were overriding Next.js App Router executions. These files lacked the recent validations and timezone fixes.
- **Immutable Snapshots:** Verified that `MonthlyReport` captures a persisted `kpisJson` snapshot once the month has closed.
- **Timezone Drifts:** Verified that `date-fns-tz` applies strict `Asia/Dubai` boundary isolation for date boundaries.
- **Zero-Activity Division-by-Zero:** Verified that trend calculations explicitly catch 0 values, eliminating `NaN` errors.

## ITERATION 5: Sprint 5 Quality & Features

### 1. Freshness Alert Engine (`REQ-M1-26`) - **RESOLVED**
- **Activity Duration Tracker:** Implemented deep query checks inside the DailyHealthCheck worker job comparing the latest creation dates of `ChangeLogEntry` changes, `GbpPost` posts, and `GbpPhoto` photos per active client.
- **Owner Notifications:** Auto-sends `client_stale` alerts targeting all active `OWNER` users upon 14 days of complete profile inactivity.
- **Spam Control:** Adds an activity window boundary check to restrict alert generations to once every 14 days per client.

### 2. Competitor Policy-Violation Scan (`REQ-M1-27`) - **RESOLVED**
- **Monthly Scheduled Scans:** Scheduled a monthly `MonthlyCompetitorPolicyScan` background cron job running on the 1st of every month via BullMQ.
- **Spam Heuristic Checks:** Scans competitor rankings on priority keywords and flags keyword-stuffing behaviors.
- **Suggest Edit Tasks:** Creates actionable `REQ-M1-27` tasks on the client board, pre-populated with manual checklist subtasks (e.g. Google Maps Suggest an Edit) for human execution without attempting unauthorized automated submission.

### 3. Suspension Wizard Playbook Checklist (`REQ-M1-28`) - **RESOLVED**
- **Interactive Step-by-Step Playbook:** Created `GbpSuspensionWizard` guiding users through guidelines compliance audits, evidence pack collection (Utility Bills, Registration Licenses, storefront photos), and Google support reinstatement message templating.
- **Human Gated Authorization:** Automatically intercepts submission by creating a gated `SUSPENSION_RESPONSE` approval request, requiring owner/approver verification and sign-off before providing submission forms guidance.

### 4. Off-Profile Dashboard Indicators (`REQ-M1-24`) - **RESOLVED**
- **Citation Consistency Analysis:** Aggregates BrightLocal citation tracker report metrics dynamically per client, using weighted averages across analyzed listing sites. Fallbacks preserve baseline consistency statistics when integration credentials are not configured.
- **Landing Page Schema Crawler:** Crawls client landing pages on a cached background check to detect structured `ld+json` schema markers (LocalBusiness/Organization/PostalAddress).
- **Overview Widgets:** Renders progress indicators and custom badges for these off-profile indicators inside client-detail-panel overview grids.

### 5. Site Existence Decision Wizard (`REQ-M2-01`) - **RESOLVED**
- **Guided Setup Workflow:** Created `OnboardingWizard` asking structured questions on website existence, indexing check, and CMS credential access.
- **Client State Transitions:** Updates client `lifecycleState` dynamically (e.g. mapping to `BUILD` if website work or CMS integration is pending, or `GROWTH` if site is ready/fully operational).
- **Auto-Assigned M2 Tasks:** Automatically generates target onboarding tasks pre-loaded with appropriate actionable subtasks based on the wizard answers.




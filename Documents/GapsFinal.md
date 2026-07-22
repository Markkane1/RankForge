# RankForge Final Gap Verification

Date: 2026-07-19

Specs verified:
- `Documents/00-README-and-recommendations.md`
- `Documents/01-external-dependencies-gates-and-cost-model.md`
- `Documents/02-system-architecture-and-tech-stack.md`
- `Documents/03-software-requirements-specification.md`
- `Documents/04-sprint-plan.md`
- `Documents/05-agent-build-guardrails-and-definition-of-done.md`
- `Documents/06-security-audit-and-hardening.md`
- `Documents/07-reporting-and-analytics-validation.md`

Prior gap source checked:
- `Documents/gap_analysis copy.md`

Status key:
- Fixed: implemented in repo enough to close the prior gap.
- Partial: real implementation exists, but the spec is not fully met.
- Open: gap is still real.

## Current Verification Update

This file has been re-verified against the current implementation. The audit is not just copied from the Gemini gap file: gaps marked below were checked against the repository source and the eight specification files.

Fixed in the current implementation pass:
- Root test plumbing now works across all workspaces.
- CI now runs the consolidated `npm run check` gate instead of only `npm run test`.
- `npm run check` now includes Prisma schema validation, RLS coverage validation, and all workspace tests.
- `npm run check` now also includes mutating route auth-guard coverage and the full workspace build.
- Database and queue packages now have build/test scripts, and worker has a test script.
- A complete client-scoped RLS migration and static RLS coverage checker were added.
- Several production mock/random fallbacks were removed or changed to explicit not-configured/no-data behavior:
  - Geo-grid routes/workers no longer create random rank grids.
  - FAQ visibility worker no longer uses random pass/fail.
  - Competitor policy scan no longer creates fake competitors.
  - GBP post generation no longer returns stub content when OpenAI is missing.
  - GBP photo upload no longer stores `/mock-uploads/...` paths.
  - Google OAuth routes no longer use dummy client credentials.
  - Resend mailer no longer uses a dummy API key.
  - API, worker, and web Sentry configs no longer default to placeholder DSNs.
  - Integration settings no longer report BrightLocal/SendGrid as connected by default.
  - Client citation metrics no longer fabricate an 85.5 percent BrightLocal score.
  - CSV import task IDs are deterministic instead of random.
- GA4 diagnostic sync no longer writes synthetic lead logs.
- API content draft generation and monthly post worker no longer emit synthetic copy.
- Quarterly category sync no longer seeds a hardcoded Google taxonomy.
- Mutating web API requests now pass through a same-origin middleware check, with signed webhooks explicitly exempted.
- Meta webhook verification no longer uses a fallback signing secret.
- Worker Sentry no longer uses a placeholder DSN, web Sentry no longer uses placeholder DSNs in client/server/edge config, and worker secret decryption now supports `kms:` values via GCP KMS when configured.
- Client creation now requires OWNER/COORDINATOR, uses `gbpProfiles`, and creates a conflict approval instead of returning a hard 409.
- Approval creation now attributes requests to the current authenticated user.
- GBP OAuth state is now HMAC-signed and verified on callback.
- Nest API GBP OAuth state is now also HMAC-signed and verified before token storage.
- Mutating route guard CI now checks each exported mutating method, not just each route file.
- Client detail/update, lead create/list by client, and client-specific monthly report reads now use a shared tenant DB context helper.
- Mutating task routes and approval approve/reject routes now use shared auth/role guards.
- `BaselineSnapshot` is now protected by an append-only DB trigger.
- Approval expiry now uses explicit `EXPIRED` status and blocks linked `PENDING_APPROVAL` tasks.
- Client lifecycle state changes now route through exported `transitionClientTo()`, and the route no longer owns its own transition table.
- Client lifecycle now includes `OFFBOARDED`, and transition to it scrubs lead contact PII.
- Build Status seed data no longer marks known partial/open requirements as `DONE`, and seed upserts now refresh existing status rows.
- CI now includes an API route reachability gate with explicit reviewed exceptions for intentionally unwired routes.
- GBP validators now reject keyword-stuffed business names through a shared helper, competitor names in GBP descriptions, service descriptions over 300 characters, and products that do not map to an existing service category.
- GBP OAuth credentials now use canonical `GBP_OAUTH` service naming, with legacy `GBP` fallback reads and a migration for existing client credentials.
- CSRF middleware now has focused tests proving cross-origin mutating API requests are rejected and webhook POSTs remain exempt.
- CI now includes a dependency-audit gate that fails on new unreviewed high/critical advisories while reporting reviewed Sentry/Nodemailer exceptions.
- CI now includes a requirement-ID consistency gate that validates seed/source REQ references against the canonical spec IDs plus reviewed local exceptions.
- CI now includes a non-mutating ESLint gate through `npm run lint`.
- CI now fails if a `BuildRequirement` seed row is marked `DONE` without source/test evidence for that REQ ID.
- Client-scoped web routes under `/api/clients/[id]`, including nested GBP profile/resource routes, now use `withClientTenant()` for client-owned Prisma reads and writes.
- Worker client-owned writes now use `withWorkerClientTenant()`, and CI includes `check:worker-tenant`.
- Database, queue, and worker workspace tests now run lightweight real checks instead of placeholder "No tests yet" scripts.
- `npm run lint` now completes without warnings.
- Auth.js session cookies now have explicit production hardening and CI includes `check:auth-cookies`.
- Client-scoped web routes under `/api/clients/[id]` now use `requireClientRole()` to combine session, organization ownership, and allowed roles.
- API and worker now have central required-env validation without adding another runtime dependency.
- CI includes `check:env`, so removed placeholder secrets do not quietly regress into missing required config.
- RLS policy-shape checking now distinguishes required `clientId` tables from optional `clientId` tables.
- Required direct-client RLS policies no longer allow `NULL` client IDs as a bypass.
- Web auth-guard tests now prove cross-organization client access is denied by `requireClientRole()`.
- Worker KMS decryption now accepts the same component env vars used by web, with `GCP_KMS_KEY_NAME` kept as an override.
- Worker now declares `@google-cloud/kms` directly instead of relying on another workspace dependency.
- `/api/leads` now requires `clientId`, verifies that client through `requireClientRole()`, and creates leads only for OWNER/COORDINATOR roles.
- Approval creation now requires OWNER/COORDINATOR instead of any authenticated session.
- Phase 1 lifecycle orchestration now has a CI gate preventing route-level `lifecycleState` updates outside `transitionClientTo()`.
- Onboarding wizard state changes now route through `transitionClientTo()` inside the existing tenant transaction.
- `transitionClientTo()` can run on an existing transaction client, so callers do not need duplicate lifecycle changelog logic.
- Client lifecycle transitions now also have a Postgres trigger that rejects illegal raw SQL/unextended Prisma state changes.
- The lifecycle DB trigger enforces BUILD/GROWTH baseline gating, writes the changelog row, creates AT_RISK task/owner notifications, and scrubs lead PII on OFFBOARDED.
- OFFBOARDED now follows the spec sequence through PAUSED instead of allowing direct active-state offboarding.
- Entering PAUSED creates a deterministic offboarding handover checklist task, and OFFBOARDED is blocked until that task is DONE.
- A daily offboarding retention sweep now re-scrubs offboarded client lead-contact PII and leaves per-client `Task`/`TaskLog` proof.
- CI now verifies offboarding lifecycle, checklist, retention sweep, and UI filter proof.
- Phase 1 approval creation now routes through one `requireApproval()` helper.
- CI now fails if Next API routes call `approvalRequest.create()` directly instead of the shared approval helper.
- Client name/address changes now create `CLIENT_PROFILE_CHANGE` approval requests instead of updating directly.
- GBP verification POST actions and direct verification-status flips now create `GBP_VERIFICATION` approval requests before execution.
- CI now verifies client profile, GBP category, and GBP verification approval gates.
- Task dependencies are now represented by `Task.dependsOnTaskIds`.
- Task status changes now block `IN_PROGRESS`/`DONE` when dependency tasks are not `DONE`, in both the web route and worker queue path.
- Task list ordering now uses the shared numeric `taskPriorityScore()` classifier instead of enum/alphabetical ordering.
- CI now verifies task dependency representation, dependency status guards, and priority classifier wiring.
- Repeat worker jobs now create or update cadence proof `Task` rows and write `TaskLog` entries for completed or blocked runs.
- CI now verifies scheduler cadence proof for rank update, category sync, post generation, FAQ monitoring, geo-grid, competitor policy scan, and conversion optimization jobs.
- Daily health checks now create/update a per-client health-check `Task` and write `TaskLog` proof for client and org credentials.
- CI now verifies the worker keeps per-client health `TaskLog` proof wired.
- Client communication jobs now exist for welcome messages, weekly BUILD summaries, milestone notifications, and monthly report delivery.
- Communication jobs create per-client `Task`/`TaskLog` proof and send email only when client email plus `RESEND_API_KEY` are available.
- Weekly BUILD summaries now read recent tenant-scoped `TaskLog` content for each BUILD client instead of sending a canned status line.
- CI now verifies the TaskLog-backed weekly BUILD summary path.
- Dossier import now accepts a defined CSV/JSON shape and creates one deterministic remediation task per audit finding.
- CI now includes a focused `REQ-M1-01` dossier parser test through the web test suite.
- Client intake now stores structured questionnaire answers in `Client.intakeData`.
- Client creation now validates legal name, service list, GBP/login access status, past suspensions, photo availability, USPs, booking system, business hours, and SAB/address coverage.
- The New Client dialog now exposes the missing structured intake fields.
- CI now verifies `REQ-M1-02` intake validation through the web validation test suite.
- Web OAuth state tests now cover signed round-trip, malformed signatures, tampered payloads, and expired state.
- Nest GBP OAuth state helpers are now directly testable, and API tests cover signed round-trip, tampered payloads, and expired state.
- Direct GBP post generation now requires a location-specific `gbpId` and verifies that profile belongs to the client.
- CI now includes `check:multi-location-gbp` in the consolidated gate.
- `KeywordMapEntry` and `CompetitorBenchmark` now have `sourceLineage` fields for provider/request/response trace data.
- DataForSEO keyword and competitor research paths now persist source lineage on created rows.
- Keyword research now blocks with dependency-required status when DataForSEO is not connected instead of creating a null-volume row.
- CI now includes `check:external-research-lineage` in the consolidated gate.
- GBP photo uploads now write to app-private `.storage/gbp-photos` instead of public uploads.
- GBP photo reads now go through authenticated client/profile-scoped API routes with private cache headers, and deletes remove private files best-effort.
- CI now includes `check:photo-storage` in the consolidated gate.
- Quarterly category/attribute sync now creates a deterministic blocked `REQ-M1-17` review task when the live GBP schema source is not configured.
- The scheduler cadence proof now verifies the category/attribute review task path.
- Monthly post generation now uses the required OFFER/UPDATE/PROOF/SEASONAL rotation when OpenAI is configured.
- Worker and direct AI post generation now block generated post bodies that contain phone numbers.
- CI now includes `check:post-generation` in the consolidated gate.
- Review invites now create durable `ReviewAsk` records instead of sending immediately.
- Review asks now schedule a 2-hour WhatsApp ask and a 3-day reminder through BullMQ.
- Review asks now store and honor a permanent per-client customer opt-out flag.
- Worker handlers now process delayed review ask/reminder jobs and write tenant-scoped lead-log proof.
- Low-star imported Google reviews now have a `requiresHumanGate` schema field for approval-gated handling.
- CI now includes `check:review-generation` in the consolidated gate.
- FAQ visibility checks now persist the last provider/source URL and JSON evidence payload per FAQ row.
- CI now includes `check:faq-monitoring` in the consolidated gate.
- Booking URL reachability now returns a warning/override-required state instead of a plain hard failure, and successful overrides are audit logged.
- CI now includes `check:booking-url` in the consolidated gate.
- Geo-grid scan results now persist Local Falcon source lineage, including endpoint, request metadata, provider run ID, and raw response.
- CI now includes `check:geo-grid-lineage` in the consolidated gate.
- Freshness alerts now use the existing `Notification` delivery model with explicit alert metadata: source rule, recommended action, and dedupe key.
- CI now includes `check:freshness-alert` in the consolidated gate.
- Monthly competitor policy scan now pulls DataForSEO Maps results instead of iterating an empty mock competitor list.
- Competitor suggest-edit tasks now persist DataForSEO source lineage in task result metadata.
- CI now includes `check:competitor-policy-source` in the consolidated gate.
- Monthly report snapshots now include metric lineage for displayed KPIs plus competitor, WhatsApp, visibility, and next-month plan fields.
- Monthly report PDFs now render search visibility and a compact next-month plan section.
- CI now includes `check:monthly-report` in the consolidated gate.
- `LeadSource` now includes `BOOKING`, and conversion ingestion can persist phone, WhatsApp, form, booking, directions, and website events into `LeadLogEntry`.
- `/api/events/conversion` validates payloads with Zod, requires `CONVERSION_EVENT_SECRET` plus `x-rankforge-event-secret`, and is explicitly allowed through the origin middleware as a secret-gated external ingestion route.
- A small client helper can submit conversion events to the ingestion endpoint.
- CI now includes `check:measurement-ingestion` in the consolidated gate.
- Weekly anomaly scanning now raises notification-backed alerts for rank drops, unexplained GBP edits, low-star reviews, calls down week-over-week, and site health failures.
- CI now includes `check:anomaly-alerts` in the consolidated gate.
- Failed queued task status updates now use bounded retries, raise Sentry alerts, and record retry/error proof on the affected task.
- The task dashboard now has a visible `Failed Tasks` toggle backed by the existing `FAILED` status filter.
- CI now verifies failed-task retry, alert, task-log, and dashboard proof.

Verification commands run successfully:
- `npm run check`
- `npm run build --workspace=worker`
- `npm run build --workspace=web`
- `npm run build`
- `npm run check` after Nest API GBP OAuth state hardening
- `npm run check` after adding `OFFBOARDED` lifecycle state and PII scrub
- `npm run check` after correcting Build Status seed truthfulness
- `npm run check:route-reachability`
- `npm run check` after adding API route reachability to the consolidated gate
- `npm test --workspace=web -- --run tests/validations.test.ts`
- `npm run check` after tightening GBP profile/service/product validators
- `npm run check` after normalizing GBP OAuth credential service naming
- `npm test --workspace=web -- --run tests/middleware.test.ts`
- `npm run check` after adding CSRF middleware coverage
- `npm run check:audit`
- `npm run check` after adding the dependency-audit gate
- `npm run check:req-ids`
- `npm run check` after adding the requirement-ID consistency gate
- `npm run check` after removing web Sentry placeholder DSNs
- `npm run check` after wrapping client-scoped web routes in tenant DB context
- `npm run lint`
- `npm run check` after adding lint to the consolidated gate
- `npm run check:req-ids` after adding `DONE` requirement evidence enforcement
- `npm run check` after adding `DONE` requirement evidence enforcement
- `npm run check:worker-tenant`
- `npm run build --workspace=worker`
- `npm run lint` after cleaning lint warnings
- `npm test --workspace=@rankforge/database`
- `npm test --workspace=@rankforge/queue`
- `npm test --workspace=worker`
- `npm run check` after Phase 0 CI/test and worker tenant updates
- `npm run check:auth-cookies`
- `npm run build --workspace=web`
- `npm run check:routes` after adding `requireClientRole()`
- `npm run check:env`
- `npm run build --workspace=api`
- `npm run check` after Phase 0 auth-cookie, client-role, env-validation, and full gate updates
- `npm run check:rls` after strengthening RLS policy-shape validation
- `npm test --workspace=web -- --run tests/auth-guard.test.ts`
- `npm run check` after Phase 0 tenant-isolation proof updates
- `npm run build --workspace=worker` after KMS env-name normalization
- `npm run check:routes` after remaining route-role hardening
- `npm run check` after final Phase 0 hardening updates
- `npm run check:lifecycle`
- `npm run build --workspace=@rankforge/database`
- `npm run build --workspace=web`
- `npm run check` after Phase 1 lifecycle orchestration updates
- `npm run check:approvals`
- `npm run build --workspace=web` after approval helper consolidation
- `npm run check` after Phase 1 approval guard consolidation
- `npx prisma generate --schema packages/database/prisma/schema.prisma`
- `npm run check:tasks`
- `npm run db:validate`
- `npm run build --workspace=@rankforge/database`
- `npm run build --workspace=worker`
- `npm run build --workspace=web` after task dependency/priority updates
- `npm run check` after Phase 1 task orchestration updates
- `npm run check:health-proof`
- `npm run build --workspace=worker` after per-client health proof updates
- `npm run check:worker-tenant`
- `npm run check` after Phase 1 health-check proof updates
- `npm run check:req-ids` after replacing the communication task ID with canonical `REQ-M6-07`
- `npm run check:health-proof` after communication job wiring
- `npm run build --workspace=worker` after communication job wiring
- `npm run check` after Phase 1 communication job updates
- `npm run check:failed-tasks`
- `npm run build --workspace=worker` after failed-task proof updates
- `npm run build --workspace=api` after bounded queue retry updates
- `npm run build --workspace=web` after adding the failed-task dashboard toggle
- `npm run check` after Phase 1 failed-task retry/alert/dashboard updates
- `npm run check:lifecycle` after adding the lifecycle DB guard
- `npm run db:validate` after adding the lifecycle DB guard migration
- `npm run build --workspace=@rankforge/database` after moving lifecycle changelog proof into the DB trigger
- `npm run build --workspace=web` after moving lifecycle changelog proof into the DB trigger
- `npm run check` after Phase 1 lifecycle DB guard updates
- `npm run check:offboarding`
- `npm run build --workspace=worker` after adding the offboarding retention sweep
- `npm run build --workspace=web` after tightening offboarding transitions and filter visibility
- `npm run check` after Phase 1 offboarding workflow/retention updates
- `npm run check:scheduler-cadence`
- `npm run build --workspace=worker` after adding scheduler cadence task/log proof
- `npm run check` after Phase 1 scheduler cadence proof updates
- `npm run check:approvals` after adding client profile and GBP verification gates
- `npm run build --workspace=web` after adding client profile and GBP verification gates
- `npm run check` after Phase 1 approval gated-action updates
- `npm run check:health-proof` after weekly BUILD summary TaskLog updates
- `npm run build --workspace=worker` after weekly BUILD summary TaskLog updates
- `npm run check` after Phase 1 weekly BUILD summary updates
- `npm test --workspace=web -- --run tests/dossier-import.REQ-M1-01.test.ts`
- `npm run build --workspace=web` after dossier import parser updates
- `npm run check` after Phase 2 dossier import updates
- `npx prisma generate --schema packages/database/prisma/schema.prisma` after intake schema update
- `npm test --workspace=web -- --run tests/validations.test.ts` after intake validation update
- `npm run db:validate` after intake schema update
- `npm run build --workspace=@rankforge/database` after intake schema update
- `npm run build --workspace=web` after intake UI/API update
- `npm run check` after Phase 2 intake form updates
- `npm test --workspace=web -- --run tests/oauth-state.test.ts`
- `npm test --workspace=api -- gbp.service.REQ-M1-03.spec.ts`
- `npm run lint --workspace=api` after making Nest OAuth state helpers testable
- `npm run check` after Phase 2 OAuth callback-state coverage updates
- `npm run check:multi-location-gbp`
- `npm run build --workspace=web` after multi-location post generation update
- `npm run check` after Phase 2 multi-location GBP update
- `npx prisma generate --schema packages/database/prisma/schema.prisma` after external research lineage schema update
- `npm run check:external-research-lineage`
- `npm run build --workspace=@rankforge/database` after external research lineage schema update
- `npm run build --workspace=web` after external research lineage route update
- `npm run check` after Phase 3 external research lineage updates
- `npm run check:photo-storage`
- `npm run build --workspace=web` after private GBP photo storage update
- `npm run check` after Phase 3 photo storage update
- `npm run check:scheduler-cadence` after category/attribute review task update
- `npm run check:worker-tenant` after category/attribute review task update
- `npm run build --workspace=worker` after category/attribute review task update
- `npm run check` after Phase 3 category/attribute review task update
- `npm run check:post-generation`
- `npm run build --workspace=worker` after monthly post rotation/linter update
- `npm run build --workspace=web` after direct post linter update
- `npm run check` after Phase 4 post generation updates
- `npx prisma generate --schema packages/database/prisma/schema.prisma` after review ask schema update
- `npm run check:review-generation`
- `npm run db:validate` after review ask schema update
- `npm run build --workspace=web` after review invite scheduling update
- `npm run build --workspace=worker` after review ask worker handlers
- `npm run check:worker-tenant` after review ask worker handlers
- `npm run check` after Phase 4 review generation updates
- `npx prisma generate --schema packages/database/prisma/schema.prisma` after FAQ evidence schema update
- `npm run check:faq-monitoring`
- `npm run db:validate` after FAQ evidence schema update
- `npm run build --workspace=worker` after FAQ evidence persistence update
- `npm run check` after Phase 4 FAQ monitoring updates
- `npm run check:booking-url`
- `npm run build --workspace=web` after booking URL warning/override update
- `npm run check` after Phase 4 booking URL updates
- `npx prisma generate --schema packages/database/prisma/schema.prisma` after geo-grid lineage schema update
- `npm run check:geo-grid-lineage`
- `npm run db:validate` after geo-grid lineage schema update
- `npm run build --workspace=worker` after geo-grid lineage worker update
- `npm run build --workspace=web` after geo-grid lineage route/type update
- `npm run check` after Phase 5 geo-grid lineage updates
- `npx prisma generate --schema packages/database/prisma/schema.prisma` after notification alert metadata update
- `npm run check:freshness-alert`
- `npm run db:validate` after notification alert metadata update
- `npm run build --workspace=worker` after freshness alert metadata update
- `npm run build --workspace=web` after notifications API metadata update
- `npm run check` after Phase 5 freshness alert updates
- `npm run check:competitor-policy-source`
- `npm run build --workspace=worker` after competitor policy DataForSEO source update
- `npm run check` after Phase 5 competitor policy source update
- `npm run check:monthly-report`
- `npm run build --workspace=web` after monthly report lineage/section update
- `npm run check` after Phase 5 monthly report update
- `npx prisma generate --schema packages/database/prisma/schema.prisma` after measurement ingestion schema update
- `npm run check:measurement-ingestion`
- `npm run check:routes` after secret-gated conversion route review
- `npm test --workspace=web -- middleware.test.ts` after conversion middleware exemption update
- `npm run build --workspace=web` after conversion ingestion update
- `npm run build --workspace=worker` after strict worker type cleanup found by the consolidated gate
- `npm run check` after Phase 6 measurement ingestion update
- `npm run check:anomaly-alerts`
- `npm run build --workspace=worker` after Phase 6 anomaly scanner update

Remaining caution: the new RLS migration and checker improve schema/database coverage, and client-owned web/worker writes now use tenant context much more consistently. Route-level cross-organization access has focused tests, but live Postgres RLS read/write tests still need a database test harness before tenant isolation can be marked fully fixed.

## Summary

The implementation is no longer the empty/stub-only state described in parts of the Gemini gap file. Several major items are now present: PostgreSQL Prisma schema, separate web/api/worker workspaces, Auth.js staff login with 12h max age, 2FA tables and flows, `BuildRequirement`/Build Status UI, GBP OAuth token storage, approval 4-eyes checks, append-only trigger for `ChangeLogEntry`, some RLS migration work, BullMQ worker scaffolding, KMS-capable encryption, Module 2 crawl/page-matrix services, and requirement-tagged tests.

The remaining problem is that many fixes are shallow or route-local. The repo still does not meet the spec as a production v1 because worker tenant context and behavioral isolation tests are incomplete, several production paths still lack real external integrations, some route concerns still need centralized helpers, and Modules 3/4/5 are mostly reduced or missing without clean Phase 2 gating.

Verification note: the previous `npm test` failure has been fixed. Current test success proves the configured checks pass, but it does not prove the full spec because large parts of the spec still lack behavioral tests.

## Fixed Or Mostly Fixed From Prior Gap File

These prior gaps should not be carried forward as open in the same form:

| Area | Status | Evidence |
|---|---|---|
| Monorepo shape | Fixed | `apps/web`, `apps/api`, `apps/worker`, `packages/database`, `packages/queue` exist. |
| PostgreSQL/Prisma schema | Fixed | `packages/database/prisma/schema.prisma` uses `provider = "postgresql"` and contains 45+ models. |
| Staff auth session duration | Fixed | `apps/web/src/auth.ts` sets `session.maxAge = 12 * 60 * 60`. |
| Client portal data model | Partial | `ClientPortalUser` exists, but scoped portal routes/pages are incomplete. |
| 4-eyes approval DB guard | Fixed | `20260718074810_prevent_self_approval/migration.sql` adds `prevent_self_approval` check. |
| Append-only audit for `ChangeLogEntry` | Fixed for that table | `20260718074201_append_only_audit_trail/migration.sql` blocks UPDATE/DELETE on `ChangeLogEntry`. |
| Baseline snapshot table | Fixed schema | `BaselineSnapshot` model exists. |
| `BUILD -> GROWTH` baseline gate | Partial | Next route checks baseline in `apps/web/src/app/api/clients/[id]/state/route.ts`; shared state function/DB enforcement is missing. |
| Build Status screen | Partial | `BuildRequirement` and `build-status` API/UI exist; seed statuses are stale/inaccurate. |
| Credential encryption | Partial | `apps/web/src/lib/crypto.ts` supports KMS/AES; worker cannot decrypt `kms:` secrets. |
| GBP OAuth storage | Partial | OAuth routes/services store encrypted credentials; state/scope/client validation is incomplete. |
| GBP profile linters | Partial | Description, URL, secondary-category checks exist in some routes/services; legal-name/competitor-name checks are missing. |
| BullMQ worker | Partial | Worker and repeat schedulers exist; current checks pass, but coverage of required cadence/tasks is incomplete. |
| Module 2 site audit/page matrix | Partial | Crawl, restore-point gate, page matrix, schema checks exist; live write/rollback and real CWV/Rich Results validation are missing. |

## Phase 0 - Foundations, Security, CI

### Fixed: test, build, and basic CI gates now run

Evidence:
- `turbo.json` now defines a `test` task.
- All workspaces now have a test script.
- `.github/workflows/ci.yml` now runs `npm run check`.
- `npm run check` passed on 2026-07-19.
- `npm run check` includes Prisma validate, RLS coverage, mutating route guard coverage, tests, and full workspace build.
- `npm run check` includes dependency audit gating for high/critical advisories.
- `npm run check` includes requirement-ID consistency validation and fails unsupported `DONE` Build Status seed claims.
- `npm run check` includes worker tenant-context guarding.
- `npm run check` includes Auth.js cookie hardening validation.
- `npm run check` includes required-env validation for API and worker.
- Database, queue, and worker workspace tests now run lightweight checks instead of no-op echo scripts.
- `npm run lint` passes without warnings.
- `.codesight/coverage.md` reports 5 percent route/model coverage.

Fix:
- Resolve reviewed audit exceptions by upgrading/replacing Sentry/Auth.js/Nodemailer when compatible fixed versions are available.

### Partial: RLS coverage exists, but tenant context is not application-wide

Evidence:
- `20260719000100_complete_client_rls/migration.sql` adds client-scoped RLS policies for direct and relation-scoped client models.
- `scripts/check-rls-coverage.js` passed and verified 31 scoped models.
- `scripts/check-rls-coverage.js` now verifies the RLS policy shape, including the required `app.current_client_id` setting, `USING`, `WITH CHECK`, and required-vs-optional direct `clientId` ownership.
- `20260719000100_complete_client_rls/migration.sql` now keeps nullable-client policies only for `Task`, `ApprovalRequest`, and `WriteAttempt`; required client-owned tables require an exact tenant match.
- RLS uses `app.current_client_id`.
- `apps/web/src/lib/db.ts` now exposes `withClientTenant()`.
- Client detail/update, lead create/list by client, client-specific monthly reports, client notes/audit/keyword/onboarding/review invite/post generation, and nested GBP profile/resource routes now use tenant DB context for client-owned reads/writes.
- `apps/worker/src/index.ts` now exposes `withWorkerClientTenant()` and uses it for client-owned worker writes including task status/log updates, approval expiry task blocking, client credentials, inbound WhatsApp lead logs, FAQ visibility updates, geo-grid results, policy-scan tasks, conversion-loop lead reads, and conversion-loop task creation.
- `scripts/check-worker-tenant.js` fails CI if direct client-owned worker writes or `prisma.client.findFirst()` fallback usage return.
- `apps/web/tests/auth-guard.test.ts` proves `requireClientRole()` denies cross-organization client access and prevents role-failed requests from querying the client.
- Live Postgres RLS isolation tests are still missing.

Fix:
- Add live Postgres tests proving RLS blocks cross-client reads/writes through the actual database user.

### Partial: CSRF protection is implemented and tested, cookie hardening still needs deployment verification

Evidence:
- `apps/web/src/middleware.ts` now rejects mutating `/api/*` requests without a same-origin `Origin` or `Referer`.
- `/api/webhooks/*` are exempt because they use provider signatures/rate limiting.
- `apps/web/tests/middleware.test.ts` proves cross-origin mutating API requests return 403, same-origin requests pass, and webhook POSTs bypass the browser-origin check.
- Portal session cookie is `httpOnly`, `sameSite: "lax"`, and `secure` in production.
- Auth.js session cookie is now explicitly configured with `httpOnly`, `sameSite: "lax"`, `secure` in production, and a production `__Secure-` name.
- `scripts/check-auth-cookies.js` verifies the Auth.js cookie contract in CI.
- Production deployment verification is still needed after environment/domain setup.

Fix:
- Verify Auth.js SameSite/secure cookie behavior in deployed config after deployment.

### Partial: RBAC exists but is not consistently enforced

Evidence:
- Nest has `@RequireRole`, but most product routes live in Next route handlers.
- Mutating task routes and approval approve/reject routes now use shared guards.
- `scripts/check-route-guards.js` fails CI when a mutating Next route lacks `requireSession`, `requireRole`, or `requireOwner`, except explicit public routes.
- The route guard check is method-level, so a guarded GET cannot hide an unguarded POST/PATCH in the same file.
- `apps/web/src/lib/auth-guard.ts` now exposes `requireClientRole()`, which verifies the requested client belongs to the current session organization before allowing client-scoped access.
- Client-scoped routes under `/api/clients/[id]`, including nested GBP profile/resource routes, now use `requireClientRole()` rather than plain `requireSession()`.
- `/api/leads` now rejects unscoped list requests, uses `requireClientRole()` for client-scoped reads, and requires OWNER/COORDINATOR for lead creation.
- `/api/approvals` POST now requires OWNER/COORDINATOR.
- Some non-client-scoped guarded routes still use `requireSession` where stricter route roles may be required.

Fix:
- Tighten role levels for remaining non-client-scoped routes.
- Add behavioral authorization tests for representative roles and cross-organization client access.

### Partial: secrets handling is inconsistent

Evidence:
- Web encryption supports KMS.
- `apps/worker/src/index.ts` now decrypts `kms:` ciphertext through GCP KMS when `GCP_KMS_KEY_NAME` is configured.
- Worker KMS decryption also accepts `GOOGLE_CLOUD_PROJECT`, `GCP_KMS_LOCATION`, `GCP_KMS_KEYRING`, and `GCP_KMS_CRYPTOKEY`, matching the web KMS naming model.
- `apps/worker/package.json` declares `@google-cloud/kms` directly.
- API, worker, and web Sentry configs now use DSNs from env without placeholder fallbacks.
- `apps/worker/src/mailer.ts` now requires `RESEND_API_KEY` before sending.
- Google OAuth routes now return 503 when client ID/secret are missing.
- Auth email settings are now env-backed instead of placeholder-backed.
- Meta webhook signing now requires `META_WEBHOOK_SECRET`.
- `apps/api/src/env.ts` centrally validates API-required env vars and exposes `requireEnv()`.
- `apps/worker/src/env.ts` centrally validates worker-required env vars and exposes `requireEnv()`.
- API Google OAuth, frontend redirect, and encryption config now read required values through `requireEnv()`.
- Worker encryption now reads `TWO_FACTOR_ENCRYPTION_KEY` through `requireEnv()`.
- `scripts/check-env-validation.js` verifies that API/worker env validation remains wired into source and CI.

Fix:
- Verify KMS settings in deployed API/web/worker environments.

## Phase 1 - Module 6 Orchestration Core

### Fixed: state machine is centralized and guarded at the database layer

Evidence:
- `packages/database/src/state-machine.ts` defines legal transitions.
- `packages/database/src/index.ts` exports `transitionClientTo()` for lifecycle changes.
- `apps/web/src/app/api/clients/[id]/state/route.ts` now calls `transitionClientTo()` instead of keeping a route-local transition table.
- `apps/web/src/app/api/clients/[id]/onboarding-wizard/route.ts` now also calls `transitionClientTo()` inside its existing tenant transaction.
- `transitionClientTo()` accepts an existing transaction client so callers can keep related task/state changes atomic.
- `transitionClientTo()` sets `app.current_user_id` so the DB trigger can stamp `changedById` on lifecycle changelog rows.
- `20260719000700_client_lifecycle_db_guard/migration.sql` rejects illegal raw SQL/unextended Prisma lifecycle transitions.
- The same DB trigger blocks transition to `GROWTH` unless a `BaselineSnapshot` exists.
- The same DB trigger inserts the lifecycle `ChangeLogEntry`.
- The same DB trigger creates the AT_RISK corrective task and owner notifications.
- The same DB trigger scrubs `LeadLogEntry.contactInfo` when a client moves to `OFFBOARDED`.
- `scripts/check-lifecycle-orchestration.js` is wired into `npm run check` and fails if app routes update `lifecycleState` outside `transitionClientTo()`.
- The same checker verifies both the shared lifecycle path and the DB trigger fragments.

Fix:
- Add live database tests for direct raw SQL lifecycle update attempts once a Postgres test harness exists.

### Fixed for current route: AT_RISK creates corrective task and owner notification

Evidence:
- The lifecycle DB trigger creates a critical churn-prevention `Task` when entering `AT_RISK`.
- The same trigger notifies owners in the organization.
- The state route now uses the shared transition helper, so route-triggered transitions receive those side effects.
- The Prisma extension no longer duplicates those side effects; it keeps app-side transition validation while the DB trigger owns the write proof.

Fix:
- Add live DB tests for the trigger side effect once a Postgres test harness exists.

### Fixed: OFFBOARDED workflow and retention proof exist

Evidence:
- `ClientState` enum now includes `OFFBOARDED`.
- `packages/database/src/state-machine.ts` makes `OFFBOARDED` terminal.
- `packages/database/src/state-machine.ts` now requires clients to move through `PAUSED` before `OFFBOARDED`, matching the spec lifecycle.
- `20260719000400_client_offboarded_state/migration.sql` adds the database enum value.
- `20260719000700_client_lifecycle_db_guard/migration.sql` creates an `OffboardingChecklist:{clientId}` task when a client enters `PAUSED`.
- The same DB trigger blocks `OFFBOARDED` until the offboarding checklist task is `DONE`.
- The same DB trigger scrubs `LeadLogEntry.contactInfo` when a client moves to `OFFBOARDED`.
- `apps/worker/src/index.ts` now handles `OffboardingRetentionSweep`, re-scrubs offboarded client lead contact PII, and writes `REQ-NFR-06` `Task`/`TaskLog` proof.
- `apps/worker/src/schedulers.ts` schedules `OffboardingRetentionSweep` daily.
- The client UI transition map matches the PAUSED-before-OFFBOARDED flow, and client filtering includes `OFFBOARDED`.
- `scripts/check-offboarding-proof.js` is wired into `npm run check`.

Fix:
- Add live DB tests for checklist blocking and retention redaction once a Postgres test harness exists.

### Fixed for cadence proof: task scheduler leaves durable task/log evidence

Evidence:
- BullMQ worker exists and schedules health/rank/category/post/FAQ/geo-grid scans.
- `Task.dependsOnTaskIds` now exists with migration `20260719000600_task_dependencies`.
- Task creation accepts optional dependency IDs.
- Task status update route blocks `IN_PROGRESS` and `DONE` when dependency tasks are not `DONE`.
- Worker `UpdateTaskStatus` enforces the same dependency guard so queued updates cannot bypass the route.
- `packages/database/src/task-priority.ts` exports `taskPriorityScore()` as the shared numeric priority classifier.
- Task list ordering uses `taskPriorityScore()`.
- Queued task status updates now set `attempts: 3` with exponential backoff in both web and Nest dispatch paths.
- Worker failed-job handling captures the exception in Sentry, updates retry count, marks exhausted task-status jobs as `FAILED`, stores `errorMessage`, and writes an `ERROR` `TaskLog`.
- The task dashboard has a `Failed Tasks` toggle, and detail panels show `errorMessage` plus retry count/max retry information.
- `scripts/check-task-orchestration.js` is wired into `npm run check`.
- `scripts/check-failed-task-proof.js` is wired into `npm run check`.
- `apps/worker/src/index.ts` now has `recordCadenceTask()` for repeat-job `Task`/`TaskLog` proof.
- Weekly rank update, quarterly category sync, monthly post generation, FAQ visibility monitor, weekly geo-grid scan, monthly competitor policy scan, and monthly conversion optimization all call `recordCadenceTask()`.
- Blocked/skipped jobs such as missing taxonomy/content/SERP config leave `BLOCKED` task proof instead of only console output.
- `scripts/check-scheduler-cadence-proof.js` is wired into `npm run check`.

Fix:
- Add behavioral tests for dependency-blocked, cadence-proof, and max-retry-exhausted task transitions once route/worker test harnesses cover DB-backed task updates.

### Partial: approval creation and major GBP/client gates are consolidated, but full gated-action coverage is incomplete

Evidence:
- Approval routes and UI exist.
- `apps/web/src/lib/approval-guard.ts` now exposes `requireApproval()` for shared pending-approval creation.
- Generic approval POST, primary category change, and conflict-of-interest client creation now use `requireApproval()`.
- Client name/address changes now create `CLIENT_PROFILE_CHANGE` approval requests and return `202` before updating sensitive fields.
- GBP verification POST actions now create `GBP_VERIFICATION` approval requests and no longer call Google verification APIs directly.
- Direct GBP `isVerified` changes now create `GBP_VERIFICATION` approval requests before update.
- `scripts/check-approval-guards.js` is wired into `npm run check` and fails if a Next API route creates approval requests outside `requireApproval()` or if the verified gates disappear.
- Remaining gated actions still need executable coverage or route-level interception: low-star review responses, first five publishable content pieces, spending actions, and any missing suspension/reinstatement server-side execution path.

Fix:
- Add tests for every human-gated action listed in the spec.
- Add the remaining gated-action interceptions route by route as those executable mutation surfaces are completed.

### Fixed: approval expiry has explicit status and blocks linked tasks

Evidence:
- Prisma enum now includes `EXPIRED`.
- `20260719000300_approval_expired_status/migration.sql` adds the database enum value.
- Worker expires old pending approvals as `EXPIRED`.
- Linked `PENDING_APPROVAL` tasks move to `BLOCKED`.

Fix:
- Add focused worker test coverage for expiry behavior.

### Fixed for client creation: conflict-of-interest check creates an approval gate

Evidence:
- `apps/web/src/app/api/clients/route.ts` creates a `CONFLICT_OF_INTEREST` `ApprovalRequest` with overlap details when conflict is detected.
- The route returns 202 with `approvalId` instead of creating the client or silently proceeding.

Fix:
- Add approval-resolution workflow to resume onboarding after approval.

### Partial: health checks and communication jobs leave proof, live delivery depth is incomplete

Evidence:
- Worker marks expired tokens invalid and updates org credential `lastCheckedAt`.
- Daily health check now creates or updates a per-client `Task` keyed as `HealthCheck:{clientId}:{date}`.
- Daily health check writes `TaskLog` entries for each client credential and each valid org credential visible to that client organization.
- Expired client credentials are invalidated and logged as `WARN`.
- `scripts/check-health-proof.js` is wired into `npm run check`.
- The current proof is credential/configuration health; it does not perform live external API ping checks for every vendor.
- Worker now has scheduled jobs for welcome messages, weekly BUILD summaries, milestone notifications, and monthly report delivery.
- Each communication job creates or updates a per-client `Task` and writes a `TaskLog`.
- Weekly BUILD summaries now query recent tenant-scoped `TaskLog` rows for each BUILD client and include latest task log messages in the outbound communication proof.
- `scripts/check-health-proof.js` verifies the worker keeps the TaskLog-backed weekly BUILD summary path wired.
- Email delivery is attempted through the existing Resend mailer only when `RESEND_API_KEY` and client email are present; otherwise the skipped delivery is logged.
- Monthly report delivery only sends when a `MonthlyReport` exists.

Fix:
- Add live vendor ping checks where the provider exposes a cheap safe health endpoint.
- Add end-to-end delivery tests once worker job tests can run against a DB.

## Phase 2 - GBP Foundation, M1 Phases 0-2

### Fixed: dossier ingestion parses audit findings into tasks

Evidence:
- Client dossier import accepts CSV and JSON files.
- Supported dossier rows include client basics plus `audit_findings`/`auditFindings`.
- CSV audit findings can be semicolon-separated or JSON-encoded; JSON dossiers can be an array or `{ "clients": [...] }`.
- Import creates one deterministic `M1-AUDIT-*` task per normalized audit finding.
- Task priority maps from finding severity.
- `apps/web/tests/dossier-import.REQ-M1-01.test.ts` verifies CSV and JSON dossier parsing plus stable task IDs.

### Fixed: intake form captures required structured fields

Evidence:
- Client and GBP intake components exist.
- Server validation covers some basics: SAB service areas, URL, category, service-area max.
- `Client.intakeData` stores structured questionnaire answers as JSON.
- Client creation validates legal name, service list, WhatsApp/access metadata, existing GBP/login access status, past suspensions, photo availability, USPs, booking system, and business hours.
- Conditional SAB/address validation remains server-side.
- The New Client dialog includes fields for the required structured intake answers.
- `apps/web/tests/validations.test.ts` covers the `REQ-M1-02` required-field path and SAB coverage rule.

### Partial: GBP OAuth exists, with service naming normalized

Evidence:
- OAuth routes and Nest service request `business.manage` and store encrypted tokens.
- Routes no longer use dummy client secrets if env vars are missing.
- Web OAuth routes now sign state with HMAC and verify client/user on callback.
- Nest API GBP OAuth service now signs state with HMAC and verifies it before using the client ID.
- Web OAuth state tests cover tampered and expired state.
- Nest GBP OAuth state tests cover tampered and expired state.
- New OAuth token writes use `GBP_OAUTH`.
- Existing `GBP` client credentials are migrated to `GBP_OAUTH`, and read paths temporarily accept both names.

Fix:
- Add route-level OAuth callback tests covering tampered and expired state for both web and Nest flows.
- Remove legacy `GBP` fallback after production data has been migrated.

### Partial: multi-location support exists in schema, but routes still assume one profile in places

Evidence:
- `Client.gbpProfiles` is a list.
- `apps/web/src/app/api/clients/route.ts` now uses `gbpProfiles` include/create and returns the first profile as legacy `gbpProfile` for the UI.
- Location-specific GBP resource routes use `gbpId`.
- Direct GBP post generation now rejects requests without `gbpId` and loads the profile by `{ id: gbpId, clientId }`.
- `scripts/check-multi-location-gbp.js` is wired into `npm run check`.

Fix:
- Remove remaining legacy single-profile UI assumptions such as first-profile display aliases where they affect behavior.
- Add multi-location report/scan tests.

## Phase 3 - GBP Research and Core Optimization

### Partial: external research integrations exist but are not complete production flows

Evidence:
- Nest modules for DataForSEO, LocalFalcon, BrightLocal exist.
- Geo-grid worker/routes no longer fall back to random data.
- Competitor policy scan no longer creates fake competitor rows, but still lacks real DataForSEO competitor ingestion.
- Keyword research now requires DataForSEO, stores live search volume, and persists provider/request/response lineage.
- Competitor benchmark ingestion now stores DataForSEO source lineage on created rows.
- `scripts/check-external-research-lineage.js` is wired into `npm run check`.
- Competitor teardown and category scoring are not fully live and traceable.

Fix:
- Complete live competitor teardown and category scoring flows.
- Add behavioral tests with mocked provider responses for row lineage and blocked dependency states.

### Partial: category, description, service, product, and photo validations are stronger, but photo/storage controls remain incomplete

Evidence:
- Secondary category max and description length/URL/phone/all-caps checks exist.
- Client business-name updates now use a shared legal-name-aware keyword-stuffing linter.
- GBP descriptions now reject known competitor business names for the client.
- GBP services now enforce the 300-character description limit in shared schemas used by create/update routes.
- GBP products now require a category, and create/update routes verify that category matches an existing service on the same GBP profile.
- Product URLs are still checked for live http/https reachability.
- Photos validate file name/type/size and now store uploaded bytes under app-private `.storage/gbp-photos`.
- Photo read access now goes through authenticated, client/profile-scoped API routes with private cache headers.
- Photo deletes remove the private stored file best-effort.
- Cloud object storage, expiring signed URLs, virus scanning, and competitor benchmark targets are still missing.

Fix:
- Add an explicit `serviceId` foreign key for products if stricter relational linkage is required.
- Add website wording cross-check if the approved copy source is formalized.
- Add cloud object storage with expiring signed URLs and virus scanning.

### Partial: quarterly category/attribute sync is blocked, not mock-backed

Evidence:
- Worker `QuarterlyCategorySync` now skips instead of seeding a hardcoded taxonomy list.
- When blocked, the worker now creates a deterministic `REQ-M1-17` review task for configuring the live GBP category/attribute schema source.
- The scheduler cadence proof verifies the blocked review-task path.
- Attributes fetched live from GBP category schema are not implemented.

Fix:
- Replace hardcoded taxonomy with real GBP/approved source fetch.
- Add attribute diff storage and review task creation.

## Phase 4 - GBP Engagement Layer

### Partial: posts generator exists, but compliance and rotation are incomplete

Evidence:
- Worker creates 4 monthly draft posts.
- Worker post generation now skips instead of writing generic stub content.
- When `OPENAI_API_KEY` is configured, the worker creates exactly four drafts per active GBP profile using OFFER/UPDATE/PROOF/SEASONAL rotation.
- Worker-generated and direct AI-generated post bodies are rejected if they contain phone numbers.
- `scripts/check-post-generation-proof.js` is wired into `npm run check`.
- Direct post generation now blocks when no OpenAI API key is configured.
- API content draft generation now blocks instead of returning synthetic copy.

Fix:
- Add behavioral tests with mocked OpenAI responses for exact persisted rotation and linter failure cases.

### Partial: review generation ask/reminder flow is now durable, but QR/short-link and low-star approval UI remain incomplete

Evidence:
- Review invite route/components exist.
- `ReviewAsk` now stores scheduled review asks with `sendAfter`, `reminderAfter`, `optedOut`, and idempotency proof.
- The review invite route validates payloads with Zod, honors permanent opt-outs, creates scheduled asks, and queues `SendReviewAsk` after 2 hours plus `SendReviewAskReminder` after 3 days.
- Worker handlers process the delayed ask/reminder jobs, send through the configured WhatsApp credential, and write tenant-scoped `LeadLogEntry` proof.
- `GbpReview.requiresHumanGate` now represents the low-star human-gate marker in the schema.
- `scripts/check-review-generation-proof.js` is wired into `npm run check`.
- Remaining gaps: QR/short-link generation is not implemented, and low-star review reply approval workflow/UI is only schema-ready, not end-to-end.

Fix:
- Add QR/short-link generation and tracking.
- Add low-star review reply approval workflow/UI and behavioral tests around reply blocking.

### Partial: FAQ monitoring is no longer random, but provider integration is shallow

Evidence:
- `FaqVisibilityMonitor` now requires SERP provider configuration and skips when unavailable.
- Each successful FAQ visibility check now stores `lastVisibilitySource` and `lastVisibilityEvidence` on `GbpFaq`.
- The evidence payload includes provider URL, query, visible flag, optional position/snippet/result URL, and tested timestamp.
- `scripts/check-faq-monitoring-proof.js` is wired into `npm run check`.
- The provider contract is minimal and not yet proven against the required source/API.

Fix:
- Replace minimal scripted query provider with the approved live source/API contract.
- Add behavioral tests with mocked provider responses for visible/not-visible/error cases.

### Fixed for current profile route: booking URL validation now supports warning + override audit

Evidence:
- Route returns `BOOKING_URL_UNREACHABLE` with `requiresOverrideNote: true` when the URL cannot be reached and no override note is supplied.
- When a coordinator supplies an override note, the route saves the booking URL, returns a `warnings` array, and writes a `ChangeLogEntry` with `booking_url_reachability_override`.
- The intake form shows a warning toast for successful override saves.
- `scripts/check-booking-url-proof.js` is wired into `npm run check`.

Fix:
- Add behavioral route tests with mocked failed HEAD requests and successful override saves.

## Phase 5 - GBP Advanced Boosting and Reporting Foundations

### Fixed for current scan paths: geo-grid tracker stores provider lineage

Evidence:
- Manual route and worker now block/skip when Local Falcon scan data is unavailable.
- `GeoGridScanResult.sourceLineage` now stores Local Falcon provider, endpoint, request metadata, provider run ID, and raw response.
- Manual `/api/clients/[id]/geo-grid` and worker `WeeklyGeoGridScan` both persist the lineage payload when saving scan results.
- `scripts/check-geo-grid-lineage.js` is wired into `npm run check`.

Fix:
- Add behavioral tests with mocked Local Falcon responses for manual and worker scan creation.

### Fixed by alignment: freshness engine uses Notification as the alert record

Evidence:
- The app already uses `Notification` as the delivered alert/read-state record.
- `Notification` now stores `sourceRule`, `recommendedAction`, and `dedupeKey`.
- Daily health checks create `client_stale` notifications with the `REQ-M1-26` source rule, recommended action, and `freshness:{client.id}:14-day-inactivity` dedupe key.
- The Notifications API returns the alert metadata.
- `scripts/check-freshness-alert-proof.js` is wired into `npm run check`.

Fix:
- Add behavioral tests for stale/not-stale/deduped notification creation.

### Partial: spam and conversion loops use heuristics, not live source data

Evidence:
- Competitor policy scan no longer creates mock competitors or iterates an empty mock list.
- Worker `MonthlyCompetitorPolicyScan` now pulls DataForSEO Maps results when a valid `DATAFORSEO` credential exists.
- Suggest-edit tasks include DataForSEO provider/task/rank lineage in `Task.result`.
- Conversion loop compares stored `LeadLogEntry`, which is real, but does not prove GBP Performance ingestion is wired.

Fix:
- Wire GBP Performance source pulls into lead/performance tables.
- Add behavioral tests with mocked DataForSEO Maps results and conversion-source ingestion.

### Partial: monthly report has richer KPI sections and lineage, but archive/portal proof remains incomplete

Evidence:
- Monthly report PDF is generated from `Task`, `LeadLogEntry`, and review rows.
- Report snapshot `kpisJson` now includes metric lineage for tasks, leads, lead value, rating, lead-source counts, citation count, visibility, competitor position, and WhatsApp summary.
- Report rows now include visibility, latest competitor position, WhatsApp summary, and a next-month plan.
- PDF renders search visibility and a compact next-month plan section.
- Headline is computed from stored lead source counts, but only calls/directions/website clicks are covered.
- Remaining gaps: report archive immutability, portal report access-control tests, and full client portal HTML report proof.

Fix:
- Add report archive immutability, portal access control tests, and competitor/rank/report sections.

### Fixed: BaselineSnapshot is immutable at DB level

Evidence:
- `20260719000200_baseline_snapshot_append_only/migration.sql` blocks UPDATE and DELETE on `BaselineSnapshot`.

Fix:
- Add a migration-level or DB integration test if the project gets database test infrastructure.

## Phase 6 - Module 5 Analytics and Alerting

### Partial: measurement ingestion exists, GA4/GSC/GBP pulls and full tests remain incomplete

Evidence:
- `LeadLogEntry` exists.
- `LeadSource` includes `BOOKING`.
- `/api/events/conversion` accepts phone, WhatsApp, form, booking, directions, and website events.
- The endpoint validates requests with Zod, requires `CONVERSION_EVENT_SECRET`, checks `x-rankforge-event-secret`, verifies the target client inside `withClientTenant()`, and writes a `LeadLogEntry`.
- `apps/web/src/lib/conversion-events.ts` provides a small client helper for submitting conversion events.
- `scripts/check-measurement-ingestion.js` is wired into `npm run check`.
- Middleware explicitly allows the secret-gated conversion route through the origin guard so external/server-side event sources are not blocked before the shared-secret check.
- GA4/GSC/GBP Performance pull jobs are still incomplete.
- End-to-end tests for each source event are still incomplete.

Fix:
- Add GA4/GSC/GBP pull jobs.
- Add one integration test per required event.

### Partial: anomaly detection rules are scheduled, but simulated-data tests are incomplete

Evidence:
- The repo uses `Notification` as the persisted alert/read-state row, with `sourceRule`, `recommendedAction`, and `dedupeKey`.
- `WeeklyRankUpdate` now runs `runMetricAnomalyScanner()`.
- The scanner creates deduped notification-backed alerts for all five `REQ-M5-03` rule families:
  - `rank_drop_wow`: latest geo-grid average rank worsens by more than 5 positions versus the prior scan for the same keyword.
  - `unexplained_profile_edit`: `GbpProfile` changelog entries in the last 7 days with no `changedById`.
  - `low_star_review`: `GbpReview.rating <= 2` created in the last 7 days.
  - `calls_down_wow`: `GBP_CALL` leads down more than 30 percent versus the previous 7-day window.
  - `site_health_failure`: unresolved `BROKEN_LINK`, `HTTP_4XX`, `HTTP_5XX`, `SCHEMA_INVALID`, or `CWV_FAIL` site audit issues.
- Each alert writes a recommended action and explicit dedupe key.
- `scripts/check-anomaly-alert-proof.js` is wired into `npm run check`.

Fix:
- Add deterministic simulated-data behavioral tests for each anomaly rule and dedupe behavior.

### Open: self-correction diagnosis workflow is missing

Evidence:
- Seed tasks mention diagnosis, but no enforced ordered checklist workflow exists.

Fix:
- Generate diagnosis tasks after two flat/declining months.
- Enforce checklist order: profile intact, tracking intact, algorithm update, competitor surge, own-work attribution.

## Phase 7 - Module 3 Citations

### Open: citation domain schema and workflows are missing

Evidence:
- No `CitationRecord` model in Prisma schema.
- BrightLocal service exists, but no durable citation audit records/status workflow matching REQ-M3-01/02.

Fix:
- Add `CitationRecord`.
- Persist correct/wrong/duplicate/dead status and submission timestamps.
- Keep raw credentials out of records; store credential reference only.

### Open: backlink gap and secondary review tracking are missing/reduced

Evidence:
- No dedicated backlink opportunity model or monthly log.
- No secondary review platform tracking model/view was verified.

Fix:
- Add read-only secondary platform records.
- Add DataForSEO backlink gap pull with hard block against paid-link automation.

## Phase 8 - Module 2 Website Engine

### Partial: site audit/page matrix exists but production validation is incomplete

Evidence:
- `SiteAuditService` crawls sitemap and creates issues.
- Restore point gate exists before `executeFix`.
- Page matrix checks cannibalization, blocks missing required content blocks, validates JSON-LD shape, and checks NAP.
- CWV is simulated as `true`; Rich Results Test API validation is not actually called.

Fix:
- Replace simulated CWV with PageSpeed/CrUX or measured data.
- Add real Rich Results/schema validation or approved local equivalent.
- Implement actual rollback restore, not just an issue-resolution flag.

### Partial: conversion elements are not fully wired to Module 5

Evidence:
- `trackConversion` creates `LeadLogEntry`.
- Module 5 now has a secret-gated conversion ingestion endpoint plus client helper.
- No verified page-level click-to-call, WhatsApp, quote form, booking event wiring end-to-end.

Fix:
- Wire frontend conversion elements to the tracking helper.
- Add integration tests for each conversion event.

## Phase 9 - Module 4 Content Engine

### Open: content calendar and production pipeline are missing/reduced

Evidence:
- GBP post generation exists.
- No full Module 4 calendar from informational `KeywordMapEntry` clusters.
- No brief -> LLM draft -> fact/compliance check -> human gate workflow for first five pieces and 1-in-4 spot checks.

Fix:
- Add content piece/calendar models or explicitly mark Module 4 Phase 2 in Build Status/UI.
- Add compliance checks against verified `Client` fields.

### Open: GEO monitoring and quarterly maintenance are missing

Evidence:
- FAQ monitor exists for GBP FAQ, but not Module 4 AI-answer monitoring for content queries.
- No quarterly stale price/date content maintenance job was verified.

Fix:
- Add query scorecard storage.
- Add quarterly stale-reference scanner.

## Phase 10 - Hardening, UI, Reporting Validation

### Open: responsive, accessibility, bundle, and Lighthouse gates are not proven

Evidence:
- Playwright config exists.
- No viewport screenshot suite for every page route was verified.
- Bundle script exists but is not in CI.
- No Lighthouse CI gate for client portal report page.

Fix:
- Add Playwright viewport smoke tests at 375, 768, and 1440.
- Add axe/accessibility checks.
- Add bundle and Lighthouse jobs to CI.

### Partial: Build Status seed is corrected, and `DONE` seed evidence is now checked

Evidence:
- `packages/database/prisma/seed.ts` now downgrades known partial items such as Build Status proof, responsive verification, task priority ordering, approval gates, GBP research flows, freshness, baseline capture, and scope truthfulness from `DONE` to `IN_PROGRESS`.
- The seed now updates existing `BuildRequirement` rows instead of using `update: {}`.
- `scripts/check-requirement-ids.js` now validates that each seed row marked `DONE` has source/test evidence for its REQ ID.
- `REQ-META-01` UI reads database status, not verified implementation status.

Fix:
- Add evidence links in the Build Status UI if users need clickable proof for each row.
- Run the corrected seed in each existing environment so old overstated rows are updated.

### Partial: API route reachability CI gate exists, with reviewed unwired exceptions

Evidence:
- `scripts/check-route-reachability.js` scans Next API route files and fails when a non-public route has no source reference.
- Root `npm run check` now runs `npm run check:route-reachability`.
- The gate passed on 2026-07-19.
- Four spec-needed but currently unwired feature routes are explicitly allowlisted: competitor scan, GBP OAuth start, keyword research mutation, and post generation.

Fix:
- Wire or remove the four reviewed unwired feature routes.
- Extend the checker to page-route navigation reachability if route bloat returns.

### Partial: client portal is incomplete

Evidence:
- `ClientPortalUser` exists.
- Auth.js Nodemailer provider exists for magic links.
- Dedicated minimal client portal report/lead/approval surface and access-control tests were not verified.

Fix:
- Build scoped portal routes.
- Enforce client-only data access through tenant context.
- Add direct API tests attempting cross-client report access.

### Partial: production mocks/random data are reduced but not fully eliminated

Evidence:
- High-risk random/fake fallbacks for geo-grid, FAQ visibility, competitor policy scan, OAuth credentials, Resend, Sentry, photo uploads, citation metrics, GA4 sync, and post generation were removed or gated.
- Web Sentry placeholder DSNs were removed from client, server, and edge config files.
- Remaining non-production logic still exists in reduced modules, but hardcoded category taxonomy sync and generic worker-created post content are now blocked instead of written.
- UI placeholders and tests still contain mock terminology; most are harmless, but they should not be used as proof of production readiness.

Fix:
- Remove remaining production mock fallbacks.
- Gate unavailable integrations as `BLOCKED` or `DEFERRED` in Build Status and UI.

## Priority Fix Order

1. Finish Phase 0 tenant isolation proof with cross-client read/write tests and stronger RLS policy-shape checks.
2. Finish remaining Phase 0 hardening: deployed Auth.js cookie verification, remaining non-client route role tightening, KMS env-name normalization, and dependency upgrades when compatible fixed versions are available.
3. Move sequentially into Phase 1 Module 6 orchestration: centralize lifecycle transitions and approval gates, then prove DB bypasses cannot skip them.
4. Make Build Status truthful by updating all `BuildRequirement` records to Fixed/Partial/Open reality.
5. Continue Phase 1/Module 1 live data paths and Module 5 report lineage before pilot reporting.
6. Remove remaining production mock/reduced-module paths or hard-gate them as blocked in the appropriate later phase.
7. Explicitly mark Modules 3/4 and reduced Module 2/5 features as Phase 2 wherever not production-ready.

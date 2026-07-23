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
- CI now includes an API route reachability gate, and the previously reviewed unwired API route exceptions are now reachable from shared web API helpers.
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
- Monthly conversion optimization now creates `REQ-M5-05` self-correction diagnosis tasks after two consecutive flat/declining monthly KPI trend snapshots.
- Self-correction diagnosis tasks use the required checklist order: profile intact, tracking intact, algorithm update, competitor surge, own-work attribution.
- Task APIs now block completing later self-correction checklist steps before earlier steps and block reordering that checklist.
- Build Status seed mapping for `REQ-M5-04`/`REQ-M5-05` now matches the SRS meanings.
- CI now includes `check:self-correction` in the consolidated gate.
- Citation audit workflow now imports BrightLocal Citation Tracker listings into durable `CitationRecord` rows with classified NAP status.
- Tiered citation submission now updates `CitationRecord.status`, `submittedAt`, and `credentialsRef` without storing raw credentials.
- Citation workflow routes are client-role guarded, tenant-scoped, reachable from the shared API helper, and covered by `check:citation-workflow`.
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
- `npm run check:route-reachability` after removing reviewed unwired API route exceptions
- `npm run lint --workspace=web` after adding shared helpers for the previously unwired API routes
- `npm run build --workspace=web` after adding shared helpers for the previously unwired API routes
- `npm run check` after removing reviewed unwired API route exceptions
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
- `npm run check:self-correction`
- `npm test --workspace=web -- --run tests/unit/self-correction-routes.test.ts` after adding diagnosis checklist route behavior tests
- `npm run check:self-correction` after wiring self-correction behavioral route proof
- `npm run build --workspace=worker` after Phase 6 self-correction worker update
- `npm run build --workspace=web` after Phase 6 self-correction task-route guard update
- `npm run build --workspace=@rankforge/database` after REQ-M5 seed mapping update
- `npm run check:citation-workflow`
- `npm test --workspace=web -- --run tests/unit/citation-routes.test.ts` after adding mocked citation route behavior tests
- `npm run check:citation-workflow` after wiring citation behavioral-test proof
- `npm run check:routes` after citation workflow routes
- `npm run check:route-reachability` after citation workflow API helpers
- `npm run build --workspace=web` after citation workflow routes
- `npm run check:backlink-secondary`
- `npm test --workspace=web -- --run tests/unit/backlink-routes.test.ts` after adding mocked backlink route behavior tests
- `npm run check:backlink-secondary` after wiring backlink behavioral-test proof
- `npm run build --workspace=web` after backlink and secondary-review workflow routes
- `npm test --workspace=api -- page-matrix.validation.REQ-M2-04-07.spec.ts` after PageSpeed-backed CWV gate update
- `npm run build --workspace=api` after PageSpeed-backed CWV gate update
- `npm run check:site-engine`
- `npm run check:conversion-elements`
- `npm run check:routes` after browser conversion route public-mutation review
- `npm run check:route-reachability` after conversion element helper wiring
- `npm test --workspace=web -- middleware.test.ts` after browser conversion same-origin guard update
- `npm run build --workspace=web` after browser conversion route update
- `npm run check:content-pipeline`
- `npm test --workspace=api -- content-pipeline.service.REQ-M4-01-04.spec.ts` after Module 4 pipeline update
- `npm run lint --workspace=api` after Module 4 pipeline update
- `npm run build --workspace=api` after Module 4 pipeline update
- `npm run check:ui-validation`
- `npm run lint --workspace=web` after UI validation proof update
- `npm run build --workspace=web` after UI validation proof update
- `npm run check:ui-validation` after portal report access-control update
- `npm test --workspace=web -- --run tests/unit/portal.test.ts` after adding encrypted portal-cookie report access tests
- `npm run check:req-ids` after adding Build Status evidence-link proof
- `npm run build --workspace=@rankforge/database` after adding Build Status evidence-link proof
- `npm run check:req-ids` after regenerating stale `packages/database/prisma/seed.js` from `seed.ts`
- `npm run build --workspace=@rankforge/database` after regenerating stale `packages/database/prisma/seed.js`
- `npm run lint --workspace=web` after rendering Build Status note links
- `npm run lint --workspace=web` after portal report access-control update
- `npm run build --workspace=web` after portal report access-control update
- `npm run build --workspace=web` after rendering Build Status note links
- `npm run check:bundle-size` after wiring the bundle budget into the consolidated gate and correcting it to the gzipped initial-JS requirement
- `npm run check` after wiring the Phase 10 bundle budget into the consolidated gate
- `npm test --workspace=@rankforge/database` after adding the opt-in live Postgres RLS isolation test
- `npm test --workspace=web -- --run tests/unit/notifications-routes.test.ts` after tightening notification route RBAC/user scoping
- `npm run check:routes` after tightening notification route RBAC/user scoping
- `npm run check` after Phase 0 RLS test and notification RBAC updates
- `npm test --workspace=web -- --run tests/unit/task-status-routes.test.ts` after adding task dependency/subtask status route behavior tests
- `npm run check:tasks` after wiring task status route behavior proof into the task orchestration gate
- `npm run check` after Phase 1 task status behavior proof update
- `npm test --workspace=web -- --run tests/unit/client-profile-approval-route.test.ts` after adding client profile approval-gate route behavior proof
- `npm run check:approvals` after wiring client profile approval behavior proof into the approval gate
- `npm run check` after Phase 1 client profile approval behavior proof update
- `npm test --workspace=web -- --run tests/unit/gbp-approval-routes.test.ts` after adding GBP category/verification approval-gate route behavior proof
- `npm run check:approvals` after wiring GBP approval behavior proof into the approval gate
- `npm run check` after Phase 1 GBP approval behavior proof update
- `npm test --workspace=web -- --run tests/unit/oauth-callback-routes.test.ts` after adding web GBP OAuth callback route behavior proof
- `npm test --workspace=api -- gbp.controller.REQ-M1-03.spec.ts` after adding Nest GBP OAuth callback controller behavior proof
- `npm run check:oauth-callback` after wiring OAuth callback route proof into the consolidated gate
- `npm run check` after Phase 2 OAuth callback route proof update

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

### Fixed in repo: RLS coverage has policy-shape proof and live CI wiring

Evidence:
- `20260719000100_complete_client_rls/migration.sql` adds client-scoped RLS policies for direct and relation-scoped client models.
- `scripts/check-rls-coverage.js` passed and verified 33 scoped models.
- `scripts/check-rls-coverage.js` now verifies the RLS policy shape, including the required `app.current_client_id` setting, `USING`, `WITH CHECK`, and required-vs-optional direct `clientId` ownership.
- `20260719000100_complete_client_rls/migration.sql` now keeps nullable-client policies only for `Task`, `ApprovalRequest`, and `WriteAttempt`; required client-owned tables require an exact tenant match.
- RLS uses `app.current_client_id`.
- `apps/web/src/lib/db.ts` now exposes `withClientTenant()`.
- Client detail/update, lead create/list by client, client-specific monthly reports, client notes/audit/keyword/onboarding/review invite/post generation, and nested GBP profile/resource routes now use tenant DB context for client-owned reads/writes.
- `apps/worker/src/index.ts` now exposes `withWorkerClientTenant()` and uses it for client-owned worker writes including task status/log updates, approval expiry task blocking, client credentials, inbound WhatsApp lead logs, FAQ visibility updates, geo-grid results, policy-scan tasks, conversion-loop lead reads, and conversion-loop task creation.
- `scripts/check-worker-tenant.js` fails CI if direct client-owned worker writes or `prisma.client.findFirst()` fallback usage return.
- `apps/web/tests/auth-guard.test.ts` proves `requireClientRole()` denies cross-organization client access and prevents role-failed requests from querying the client.
- `packages/database/tests/integration/rls-isolation.test.ts` now includes an opt-in live Postgres test gated by `RUN_LIVE_RLS=1`.
- The live test creates two clients/tasks inside a rollback transaction, sets `app.current_client_id`, proves cross-client reads are hidden, proves cross-client updates affect zero rows, and proves wrong-tenant inserts fail `WITH CHECK`.
- The live test also fails fast if the configured database user owns the tested table, because table-owner execution bypasses RLS and would not prove tenant isolation.
- `npm test --workspace=@rankforge/database` passed after adding this test; the live section is skipped unless explicitly enabled.
- `.github/workflows/ci.yml` now has a `live-rls` job with a Postgres service, owner-run Prisma migration deploy, grants to a non-owner `rankforge_app` role, `RUN_LIVE_RLS=1`, and the database workspace RLS test.
- `scripts/check-rls-coverage.js` now also verifies that live RLS CI wiring remains present.

Fix:
- Remaining outside-repo validation: observe the first GitHub Actions `live-rls` run on push/PR.

### Fixed in repo: CSRF protection and hardened auth/portal cookie contracts are gated

Evidence:
- `apps/web/src/middleware.ts` now rejects mutating `/api/*` requests without a same-origin `Origin` or `Referer`.
- `/api/webhooks/*` are exempt because they use provider signatures/rate limiting.
- `apps/web/tests/middleware.test.ts` proves cross-origin mutating API requests return 403, same-origin requests pass, and webhook POSTs bypass the browser-origin check.
- Portal session cookie is `httpOnly`, `sameSite: "lax"`, and `secure` in production.
- Portal logout now expires `portal-session` with matching `httpOnly`, `sameSite`, `secure`, `path`, and `maxAge: 0` attributes instead of relying on a bare cookie delete.
- Auth.js session cookie is now explicitly configured with `httpOnly`, `sameSite: "lax"`, `secure` in production, and a production `__Secure-` name.
- `scripts/check-auth-cookies.js` verifies the Auth.js cookie contract, portal cookie contract, and portal logout expiry contract in CI.

Fix:
- Remaining outside-repo validation: observe SameSite/secure cookie behavior on the deployed production domain after environment/domain setup.

### Fixed in repo: RBAC guard coverage is enforced for current Next route inventory

Evidence:
- Nest has `@RequireRole`, but most product routes live in Next route handlers.
- Mutating task routes and approval approve/reject routes now use shared guards.
- `scripts/check-route-guards.js` fails CI when a mutating Next route lacks `requireSession`, `requireRole`, or `requireOwner`, except explicit public routes.
- The route guard check is method-level, so a guarded GET cannot hide an unguarded POST/PATCH in the same file.
- `scripts/check-route-guards.js` now also fails CI if any `/api/clients/[id]` route uses plain `requireRole()` or `requireOwner()` instead of client-scoped `requireClientRole()`.
- `apps/web/src/lib/auth-guard.ts` now exposes `requireClientRole()`, which verifies the requested client belongs to the current session organization before allowing client-scoped access.
- Client-scoped routes under `/api/clients/[id]`, including nested GBP profile/resource routes, now use `requireClientRole()` rather than plain `requireSession()`.
- `/api/leads` now rejects unscoped list requests, uses `requireClientRole()` for client-scoped reads, and requires OWNER/COORDINATOR for lead creation.
- `/api/approvals` POST now requires OWNER/COORDINATOR.
- `/api/notifications` no longer lets any authenticated user list, mark, or delete another user's notifications, and notification creation now requires OWNER/COORDINATOR plus same-organization target-user validation.
- `apps/web/tests/unit/notifications-routes.test.ts` covers notification cross-user denial, target-user org validation, current-user mark-read, and current-user delete scoping.
- Collection/admin routes without a route `clientId` still use role/session guards as appropriate to their scope.

Fix:
- Add more behavioral authorization tests only when new route families are added; current static guard coverage blocks the known route-level RBAC regressions.

### Fixed in repo: secret/KMS handling fails closed for configured production paths

Evidence:
- Web encryption supports KMS.
- Web KMS no longer fabricates placeholder `default-project` / `default-key` names; it requires either `GCP_KMS_KEY_NAME` or the full `GOOGLE_CLOUD_PROJECT` / `GCP_KMS_LOCATION` / `GCP_KMS_KEYRING` / `GCP_KMS_CRYPTOKEY` component set when KMS is enabled.
- Web encryption no longer silently falls back to local AES in production when configured KMS encryption fails.
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
- `apps/web/tests/unit/kms.test.ts` covers AES fallback when KMS is not configured, KMS routing when configured, explicit production failure on KMS errors, and missing KMS key-name/component rejection.
- `scripts/check-env-validation.js` verifies that API/worker env validation and web KMS fail-closed wiring remain present in source and CI.

Fix:
- Remaining outside-repo validation: verify KMS settings in deployed API/web/worker environments.

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
- `apps/web/tests/unit/task-status-routes.test.ts` now behavior-tests route-level dependency blocking, open-subtask blocking for `DONE`, and queued status updates with retry/backoff.
- `scripts/check-task-orchestration.js` now requires the task status route behavior test.
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
- Add worker/DB-backed tests for cadence-proof and max-retry-exhausted task transitions once worker job tests can run against a database.

### Partial: approval creation and current executable gates are consolidated; spending/suspension execution remains incomplete

Evidence:
- Approval routes and UI exist.
- `apps/web/src/lib/approval-guard.ts` now exposes `requireApproval()` for shared pending-approval creation.
- Generic approval POST, primary category change, and conflict-of-interest client creation now use `requireApproval()`.
- Client name/address changes now create `CLIENT_PROFILE_CHANGE` approval requests and return `202` before updating sensitive fields.
- `apps/web/tests/unit/client-profile-approval-route.test.ts` now proves business identity/address changes create a `CLIENT_PROFILE_CHANGE` approval and do not update the client directly, while non-sensitive contact changes still update normally.
- GBP verification POST actions now create `GBP_VERIFICATION` approval requests and no longer call Google verification APIs directly.
- Direct GBP `isVerified` changes now create `GBP_VERIFICATION` approval requests before update.
- `apps/web/tests/unit/gbp-approval-routes.test.ts` now proves direct GBP verification status changes, primary category changes, and verification wizard POST actions create approval requests instead of executing the mutation/API call directly.
- Low-star review replies route to `REVIEW_REPLY` approval and approval execution clears the review human-gate flag.
- First-five publishable content drafts now require `requestedById`, create `CONTENT_PUBLISH` approval requests, and remain blocked from publishing while `PENDING_APPROVAL`.
- `CONTENT_PUBLISH` approval execution marks the `ContentPiece` as `APPROVED`, writes `ContentPieceStatusHistory`, and logs `content_publish_approved`.
- `apps/api/src/modules/content-pipeline/content-pipeline.service.REQ-M4-01-04.spec.ts` covers requester-required content gating, approval request creation, pending-publish blocking, and approved publish/read-back.
- `apps/web/tests/unit/review-reply-approval-routes.test.ts` covers low-star reply approval and `CONTENT_PUBLISH` approval execution.
- `scripts/check-approval-guards.js` is wired into `npm run check` and fails if a Next API route creates approval requests outside `requireApproval()` or if the verified gates disappear.
- Remaining gated actions still need executable coverage or route-level interception: spending actions, and any missing suspension/reinstatement server-side execution path. The current suspension wizard creates a generic approval request from the UI, but no server-side Google reinstatement submission path exists to intercept.

Fix:
- Add spending-action approval gates when spending mutation routes exist.
- Add suspension/reinstatement server-side execution path and approval interception when provider submission is implemented.

### Fixed: approval expiry has explicit status and blocks linked tasks

Evidence:
- Prisma enum now includes `EXPIRED`.
- `20260719000300_approval_expired_status/migration.sql` adds the database enum value.
- Worker expires old pending approvals as `EXPIRED`.
- Linked `PENDING_APPROVAL` tasks move to `BLOCKED`.
- `apps/worker/src/approval-expiry.ts` extracts the expiry behavior so it is testable without starting the BullMQ worker.
- `apps/worker/tests/approval-expiry.test.ts` proves stale approvals expire, linked pending-approval tasks are blocked, a warning `TaskLog` is written, and client-known approvals execute inside worker tenant context.
- The worker workspace test script runs the approval-expiry behavior test.

Fix:
- Add DB-backed expiry tests later only if the worker test harness grows real database support; current behavior is covered with mocked worker dependencies.

### Fixed for client creation: conflict-of-interest approval resumes onboarding

Evidence:
- `apps/web/src/app/api/clients/route.ts` creates a `CONFLICT_OF_INTEREST` `ApprovalRequest` with overlap details when conflict is detected.
- The route returns 202 with `approvalId` instead of creating the client or silently proceeding.
- Conflict approval request data now preserves the validated incoming client intake payload instead of only a partial name/category/city subset.
- `apps/web/src/app/api/approvals/[id]/approve/route.ts` creates the approved client from that payload, including GBP profile and service-area data.
- Conflict approval execution creates a deterministic `REQ-M6-06` onboarding-resume task and writes `conflict_approval_onboarding_resumed` changelog proof.
- `apps/web/tests/unit/review-reply-approval-routes.test.ts` covers conflict approval execution and onboarding-resume task creation.
- `scripts/check-approval-guards.js` verifies the conflict approval resume fragments.

Fix:
- Add live workflow smoke coverage later if a browser/dev-server approval flow is added for the full create-client-to-approval-to-client path.

### Partial: health checks and communication jobs leave proof; some live provider/delivery validation remains external

Evidence:
- Worker marks expired tokens invalid and updates org credential `lastCheckedAt`.
- Daily health check now creates or updates a per-client `Task` keyed as `HealthCheck:{clientId}:{date}`.
- Daily health check writes `TaskLog` entries for each client credential and each valid org credential visible to that client organization.
- Expired client credentials are invalidated and logged as `WARN`.
- DataForSEO org credentials now receive a cheap live health ping through the documented free `GET /v3/appendix/user_data` endpoint.
- DataForSEO live ping failures are logged as `WARN` in the per-client health task proof.
- Providers without a confirmed cheap safe health endpoint are not probed with invented calls; they still receive configuration/credential proof only.
- `apps/worker/src/credential-health.ts` isolates the provider ping behavior.
- `apps/worker/tests/credential-health.test.ts` proves DataForSEO success/failure behavior and non-supported-provider skip behavior.
- `scripts/check-health-proof.js` is wired into `npm run check`.
- Worker now has scheduled jobs for welcome messages, weekly BUILD summaries, milestone notifications, and monthly report delivery.
- Each communication job creates or updates a per-client `Task` and writes a `TaskLog`.
- Weekly BUILD summaries now query recent tenant-scoped `TaskLog` rows for each BUILD client and include latest task log messages in the outbound communication proof.
- `scripts/check-health-proof.js` verifies the worker keeps the TaskLog-backed weekly BUILD summary path wired.
- Email delivery is attempted through the existing Resend mailer only when `RESEND_API_KEY` and client email are present; otherwise the skipped delivery is logged.
- Monthly report delivery only sends when a `MonthlyReport` exists.

Fix:
- Add additional live vendor pings only when a provider exposes a documented cheap safe endpoint.
- Add end-to-end delivery tests once worker job tests can run against a DB and mail delivery sandbox.

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

### Fixed: GBP OAuth exists, with service naming normalized and legacy fallback removed

Evidence:
- OAuth routes and Nest service request `business.manage` and store encrypted tokens.
- Routes no longer use dummy client secrets if env vars are missing.
- Web OAuth routes now sign state with HMAC and verify client/user on callback.
- Nest API GBP OAuth service now signs state with HMAC and verifies it before using the client ID.
- Web OAuth state tests cover tampered and expired state.
- Nest GBP OAuth state tests cover tampered and expired state.
- `apps/web/tests/unit/oauth-callback-routes.test.ts` now covers web callback route missing state, tampered state before token exchange, valid canonical credential storage, and expired/mismatched client-scoped state.
- `apps/api/src/modules/gbp/gbp.controller.REQ-M1-03.spec.ts` now covers Nest callback route missing code/state, provider errors, rejected tampered/expired state, and successful client redirect.
- `scripts/check-oauth-callback-proof.js` is wired into `npm run check`.
- New OAuth token writes use `GBP_OAUTH`.
- Existing `GBP` client credentials are migrated to `GBP_OAUTH`.
- Runtime credential read/write paths now use only `GBP_OAUTH`; the legacy `GBP` fallback was removed from shared credential service, web OAuth callbacks, GBP verification, worker performance ingestion, and the web integration status helper.
- `scripts/check-oauth-callback-proof.js` now fails if the legacy fallback returns to the audited OAuth paths.
- Verified with focused web OAuth callback tests, Nest OAuth callback tests, worker tests, affected workspace builds, and full repo check.

### Fixed: multi-location support exists in schema and behavior no longer falls back to first GBP profile

Evidence:
- `Client.gbpProfiles` is a list.
- `apps/web/src/app/api/clients/route.ts` uses `gbpProfiles` include/create and returns all profiles with per-profile review stats instead of a first-profile `gbpProfile` alias.
- Location-specific GBP resource routes use `gbpId`.
- Direct GBP post generation now rejects requests without `gbpId` and loads the profile by `{ id: gbpId, clientId }`.
- Manual geo-grid scan POST now requires `keyword` and `gbpId` via Zod, validates the selected GBP profile belongs to the client, and no longer falls back to the first profile with a location ID.
- Geo-grid scan history can be filtered by `gbpId` using stored source lineage, and the client detail geo-grid tab now sends the selected GBP profile when fetching/running scans.
- Monthly report rating aggregation already uses all `gbpProfiles` reviews instead of a single profile.
- `apps/web/tests/unit/geo-grid-routes.test.ts` covers missing `gbpId`, selected-profile Local Falcon requests, rejection of unavailable profiles, and scan-history filtering by profile lineage.
- Review ask scheduling now requires `gbpId`, loads only the selected profile, and no longer falls back to the first profile.
- GBP verification and primary-category approval execution now require the request `gbpId`; approval execution no longer applies changes to the first profile when profile lineage is missing.
- `scripts/check-multi-location-gbp.js` is wired into `npm run check` and now fails on first-profile API aliases, review-ask fallback, or approval execution fallback.
- Verified with focused review/GBP approval tests, multi-location proof script, web build, and full repo check.

## Phase 3 - GBP Research and Core Optimization

### Fixed: external research integrations exist and competitor-derived category candidates surface in the GBP editor

Evidence:
- Nest modules for DataForSEO, LocalFalcon, BrightLocal exist.
- Geo-grid worker/routes no longer fall back to random data.
- Competitor policy scan no longer creates fake competitor rows, but still lacks real DataForSEO competitor ingestion.
- Keyword research now requires DataForSEO, stores live search volume, and persists provider/request/response lineage.
- Competitor benchmark ingestion now stores DataForSEO source lineage on created rows.
- Competitor teardown now requires at least 5 keywords and 3 geo-points, calls DataForSEO Maps live advanced with the full request matrix, aggregates competitor average rating/reviews/photos, and stores keyword/geo-point/observation lineage.
- `apps/web/tests/unit/competitor-teardown-route.test.ts` covers minimum input enforcement, missing DataForSEO blocking, and persisted benchmark lineage.
- `apps/web/tests/unit/dataforseo-competitor.test.ts` covers mocked DataForSEO response aggregation across keywords and geo-points.
- `scripts/check-external-research-lineage.js` is wired into `npm run check`.
- Category scoring from live competitor categories is represented in competitor benchmark category aggregates.
- The GBP editor now ranks competitor-derived category candidates by competitor coverage, rating strength, and photo target, then surfaces the top candidates beside the approval-gated primary-category selector.
- Client detail passes stored `CompetitorBenchmark` rows into the GBP category editor.
- `apps/web/tests/unit/gbp-category-candidates.test.ts` covers candidate ranking.
- `scripts/check-external-research-lineage.js` now verifies the candidate UI wiring and unit coverage.
- Verified with focused competitor/category tests, external research proof script, web lint, web build, and full repo check.

### Partial: category, description, service, product, and photo validations are stronger; benchmark progress UI is fixed, external storage controls remain provider-blocked

Evidence:
- Secondary category max and description length/URL/phone/all-caps checks exist.
- Client business-name updates now use a shared legal-name-aware keyword-stuffing linter.
- GBP descriptions now reject known competitor business names for the client.
- GBP services now enforce the 300-character description limit in shared schemas used by create/update routes.
- GBP products now require a category, and create/update routes verify that category matches an existing service on the same GBP profile.
- Product URLs are still checked for live http/https reachability.
- Photos validate required category tag, file name/type/size, and now store uploaded bytes under app-private `.storage/gbp-photos`.
- Photo read access now goes through authenticated, client/profile-scoped API routes with private cache headers.
- Photo deletes remove the private stored file best-effort.
- `apps/web/tests/unit/photo-routes.test.ts` covers rejection of uploads without an explicit category tag.
- Photo manager now shows competitor benchmark progress using the highest stored `CompetitorBenchmark.photoCount` target.
- `apps/web/tests/unit/photo-target.test.ts` covers photo target calculation.
- `scripts/check-photo-storage-proof.js` now verifies private storage, category-tag enforcement, scoped photo reads/deletes, and competitor photo benchmark UI.
- Cloud object storage, expiring signed URLs, and virus scanning are still missing because no storage/scanning provider has been selected/configured.

Fix:
- Add an explicit `serviceId` foreign key for products if stricter relational linkage is required.
- Add website wording cross-check if the approved copy source is formalized.
- Add cloud object storage with expiring signed URLs and virus scanning after choosing the storage/scanning provider.

### Partial: quarterly category/attribute sync has an optional live-source path and UI attribute review surface; deployment source remains unconfigured

Evidence:
- Worker `QuarterlyCategorySync` still skips instead of seeding a hardcoded taxonomy list when no live source is configured.
- When blocked, the worker creates a deterministic `REQ-M1-17` review task for configuring the live GBP category/attribute schema source.
- When `GBP_CATEGORY_SCHEMA_URL` is configured, the worker fetches live category schema JSON, upserts `GbpCategory` rows, stores `attributesJson`, `sourceLineage`, and `lastSyncedAt`, and creates a `REQ-M1-17` review task when newly available attributes are detected.
- `GbpCategory` now has migration-backed fields for synced attributes and provider lineage.
- The scheduler cadence proof verifies both the blocked review-task path and the configured live-sync implementation fragments.
- The GBP categories API now supports `includeMeta=1` to return taxonomy, synced attributes, and latest sync timestamp.
- The GBP category editor now surfaces synced attributes for the selected primary category.
- The scheduler cadence proof now verifies the metadata API and UI review surface.
- No deployed GBP category schema source URL has been configured or live-tested.

Fix:
- Configure `GBP_CATEGORY_SCHEMA_URL` to an approved GBP/category schema source in deployment and run a live sync proof.

## Phase 4 - GBP Engagement Layer

### Fixed for current repo paths: posts generator has rotation and compliance proof

Evidence:
- Worker creates 4 monthly draft posts.
- Worker post generation now skips instead of writing generic stub content.
- When `OPENAI_API_KEY` is configured, the worker creates exactly four drafts per active GBP profile using OFFER/UPDATE/PROOF/SEASONAL rotation.
- Worker-generated and direct AI-generated post bodies are rejected if they contain phone numbers.
- Worker post rotation/compliance rules are extracted into `apps/worker/src/post-generation.ts`.
- `apps/worker/tests/post-generation.test.ts` verifies exact OFFER/UPDATE/PROOF/SEASONAL rotation and phone-number linter failure.
- `npm test --workspace=worker` now runs the worker post generation behavior test.
- `scripts/check-post-generation-proof.js` is wired into `npm run check`.
- Direct post generation now blocks when no OpenAI API key is configured.
- API content draft generation now blocks instead of returning synthetic copy.

### Fixed for current repo paths: review ask/reminder, QR short-links, and low-star reply approval

Evidence:
- Review invite route/components exist.
- `ReviewAsk` now stores scheduled review asks with `sendAfter`, `reminderAfter`, `optedOut`, and idempotency proof.
- `ReviewAsk` now stores tracked short-link/QR metadata: `targetReviewUrl`, `shortCode`, `qrCodeDataUrl`, `clickCount`, and `lastClickedAt`.
- The review invite route validates payloads with Zod, honors permanent opt-outs, creates scheduled asks, and queues `SendReviewAsk` after 2 hours plus `SendReviewAskReminder` after 3 days.
- Review invite creation now generates a tracked `/api/reviews/r/[code]` short link plus a QR data URL.
- `/api/reviews/r/[code]` increments click tracking before redirecting to the original GBP review URL.
- Worker handlers process the delayed ask/reminder jobs, send through the configured WhatsApp credential, and write tenant-scoped `LeadLogEntry` proof.
- `GbpReview.requiresHumanGate` now represents the low-star human-gate marker in the schema, and low-star review replies route to `REVIEW_REPLY` approval instead of updating directly.
- Approval execution now handles `REVIEW_REPLY`, writes `replyText`/`repliedAt`, clears `requiresHumanGate`, and records a change log.
- `apps/web/tests/unit/review-routes.test.ts` covers tracked short-link/QR creation and redirect click tracking.
- `apps/web/tests/unit/review-reply-approval-routes.test.ts` covers low-star reply gating, non-low-star direct reply, and approved side-effect execution.
- `scripts/check-review-generation-proof.js` is wired into `npm run check`.

### Partial: FAQ monitoring has provider parser/tests; live provider deployment remains unproven

Evidence:
- `FaqVisibilityMonitor` now requires SERP provider configuration and skips when unavailable.
- Each successful FAQ visibility check now stores `lastVisibilitySource` and `lastVisibilityEvidence` on `GbpFaq`.
- The evidence payload includes provider URL, query, visible flag, optional position/snippet/result URL, provider status/error, and tested timestamp.
- `apps/worker/src/faq-monitoring.ts` parses direct provider responses plus DataForSEO-style `tasks[].result[].items` payloads and returns deterministic error evidence for failed provider responses.
- `apps/worker/tests/faq-monitoring.test.ts` covers visible, DataForSEO-style visible, not-visible, and provider-error cases.
- `npm test --workspace=worker` now runs the FAQ monitoring behavior test.
- `scripts/check-faq-monitoring-proof.js` is wired into `npm run check`.
- The provider contract is still not live-tested against the approved production SERP source/API.

Fix:
- Configure `SERP_API_URL`/`SERP_API_KEY` to the approved production SERP source and run a live FAQ visibility proof.

### Fixed for current profile route: booking URL validation now supports warning + override audit

Evidence:
- Route returns `BOOKING_URL_UNREACHABLE` with `requiresOverrideNote: true` when the URL cannot be reached and no override note is supplied.
- When a coordinator supplies an override note, the route saves the booking URL, returns a `warnings` array, and writes a `ChangeLogEntry` with `booking_url_reachability_override`.
- The intake form shows a warning toast for successful override saves.
- `apps/web/tests/unit/gbp-approval-routes.test.ts` covers mocked failed HEAD requests, 422 warning response, successful override saves, and override audit log creation.
- `scripts/check-booking-url-proof.js` is wired into `npm run check` and verifies the behavioral coverage.

## Phase 5 - GBP Advanced Boosting and Reporting Foundations

### Fixed for current scan paths: geo-grid tracker stores provider lineage

Evidence:
- Manual route and worker now block/skip when Local Falcon scan data is unavailable.
- `GeoGridScanResult.sourceLineage` now stores Local Falcon provider, endpoint, request metadata, provider run ID, and raw response.
- Manual `/api/clients/[id]/geo-grid` and worker `WeeklyGeoGridScan` both persist the lineage payload when saving scan results.
- `apps/web/tests/unit/geo-grid-routes.test.ts` covers manual scan location selection, missing `gbpId`, and scan-history filtering.
- `apps/worker/src/geo-grid.ts` normalizes Local Falcon worker responses into persisted scan fields and lineage.
- `apps/worker/tests/geo-grid.test.ts` covers worker scan average/point/lineage normalization.
- `scripts/check-geo-grid-lineage.js` is wired into `npm run check`.

### Fixed by alignment: freshness engine uses Notification as the alert record

Evidence:
- The app already uses `Notification` as the delivered alert/read-state record.
- `Notification` now stores `sourceRule`, `recommendedAction`, and `dedupeKey`.
- Daily health checks create `client_stale` notifications with the `REQ-M1-26` source rule, recommended action, and `freshness:{client.id}:14-day-inactivity` dedupe key.
- The Notifications API returns the alert metadata.
- `apps/web/tests/integration/freshness.test.ts` covers stale, fresh, and deduped alert cases with source rule, recommended action, and dedupe-key assertions.
- `scripts/check-freshness-alert-proof.js` is wired into `npm run check`.

### Fixed in repo: spam checks and conversion loops now have live-source ingestion paths

Evidence:
- Competitor policy scan no longer creates mock competitors or iterates an empty mock list.
- Worker `MonthlyCompetitorPolicyScan` now pulls DataForSEO Maps results when a valid `DATAFORSEO` credential exists.
- Suggest-edit tasks include DataForSEO provider/task/rank lineage in `Task.result`.
- Competitor teardown and policy-source behavior have mocked DataForSEO Maps coverage.
- `LeadLogEntry` now stores optional `gbpProfileId`, `providerEventId`, and `sourceLineage` for provider-backed lead rows.
- `apps/worker/src/gbp-performance.ts` pulls GBP Performance daily time-series metrics (`CALL_CLICKS`, `BUSINESS_DIRECTION_REQUESTS`, `WEBSITE_CLICKS`) and maps them into idempotent `LeadLogEntry` rows.
- `MonthlyConversionOptimizationLoop` now attempts GBP Performance ingestion for active clients with valid GBP OAuth credentials before comparing current and previous lead windows.
- `apps/worker/tests/gbp-performance.test.ts` covers source parsing, request construction, lineage, and idempotent `createMany(... skipDuplicates: true)` behavior.
- `scripts/check-measurement-ingestion.js` is wired into `npm run check` and verifies the source-backed GBP Performance ingestion path.

Fix:
- Remaining outside-repo deployment work: configure valid GBP OAuth scopes/credentials in production and monitor provider quota/errors.

### Fixed in repo: monthly report snapshot lineage, archive immutability, and portal scoping are covered

Evidence:
- Monthly report PDF is generated from `Task`, `LeadLogEntry`, and review rows.
- Report snapshot `kpisJson` now includes metric lineage for tasks, leads, lead value, rating, lead-source counts, citation count, visibility, competitor position, and WhatsApp summary.
- Report rows now include visibility, latest competitor position, WhatsApp summary, and a next-month plan.
- PDF renders search visibility and a compact next-month plan section.
- Headline is computed from stored lead source counts for calls, directions, and website clicks.
- `20260723013000_monthly_report_append_only/migration.sql` blocks update/delete of finalized `MonthlyReport` rows.
- `apps/web/tests/unit/portal.test.ts` covers encrypted portal-session scoping for monthly report downloads.
- `scripts/check-monthly-report-proof.js` verifies metric lineage, richer report sections, archive immutability, and portal scoping.

Fix:
- Remaining outside-repo validation: live portal PDF download smoke test in a deployed environment.

### Fixed: BaselineSnapshot is immutable at DB level

Evidence:
- `20260719000200_baseline_snapshot_append_only/migration.sql` blocks UPDATE and DELETE on `BaselineSnapshot`.

Fix:
- Add a migration-level or DB integration test if the project gets database test infrastructure.

## Phase 6 - Module 5 Analytics and Alerting

### Fixed in repo: measurement ingestion exists for browser/server events, GBP Performance, GA4, and GSC

Evidence:
- `LeadLogEntry` exists.
- `LeadSource` includes `BOOKING`.
- `/api/events/conversion` accepts phone, WhatsApp, form, booking, directions, and website events.
- The endpoint validates requests with Zod, requires `CONVERSION_EVENT_SECRET`, checks `x-rankforge-event-secret`, verifies the target client inside `withClientTenant()`, and writes a `LeadLogEntry`.
- `apps/web/src/lib/conversion-events.ts` provides a small client helper for submitting conversion events.
- `LeadLogEntry` now stores `gbpProfileId`, `providerEventId`, and `sourceLineage` for source-backed ingestion.
- `apps/worker/src/gbp-performance.ts` ingests GBP Performance calls, directions, and website clicks into `LeadLogEntry`.
- `MonthlyConversionOptimizationLoop` runs GBP Performance ingestion before lead-window comparison.
- `apps/worker/tests/gbp-performance.test.ts` covers GBP Performance ingestion behavior.
- `scripts/check-measurement-ingestion.js` is wired into `npm run check`.
- Middleware explicitly allows the secret-gated conversion route through the origin guard so external/server-side event sources are not blocked before the shared-secret check.
- Worker GA4 ingestion calls the GA4 Data API for organic-search conversions and writes idempotent `ORGANIC_SEARCH` lead rows with provider lineage.
- Worker GSC ingestion calls the Search Console Search Analytics API for organic clicks and writes idempotent `ORGANIC_SEARCH` lead rows with provider lineage.
- `MonthlyConversionOptimizationLoop` loads verified `GA4`/`GSC` client assets plus matching valid credentials and runs both ingestion paths before conversion comparison.
- `apps/worker/tests/google-measurement.test.ts` covers mocked GA4/GSC provider parsing, source lineage, and idempotent writes.
- `apps/web/tests/unit/conversion-event-route.test.ts` covers all accepted conversion event sources through the real route handler.
- `scripts/check-measurement-ingestion.js` verifies GBP Performance, GA4/GSC ingestion, and per-source route coverage.

Fix:
- Remaining outside-repo validation: configure GA4/GSC OAuth scopes/assets in production and monitor quota/errors.

### Fixed in repo: anomaly detection rules are scheduled and behavior-tested with simulated data

Evidence:
- The repo uses `Notification` as the persisted alert/read-state row, with `sourceRule`, `recommendedAction`, and `dedupeKey`.
- `WeeklyRankUpdate` now runs `runMetricAnomalyScanner()`.
- `apps/worker/src/anomaly-alerts.ts` contains the injectable anomaly scanner used by the worker runtime.
- The scanner creates deduped notification-backed alerts for all five `REQ-M5-03` rule families:
  - `rank_drop_wow`: latest geo-grid average rank worsens by more than 5 positions versus the prior scan for the same keyword.
  - `unexplained_profile_edit`: `GbpProfile` changelog entries in the last 7 days with no `changedById`.
  - `low_star_review`: `GbpReview.rating <= 2` created in the last 7 days.
  - `calls_down_wow`: `GBP_CALL` leads down more than 30 percent versus the previous 7-day window.
  - `site_health_failure`: unresolved `BROKEN_LINK`, `HTTP_4XX`, `HTTP_5XX`, `SCHEMA_INVALID`, or `CWV_FAIL` site audit issues.
- Each alert writes a recommended action and explicit dedupe key.
- `apps/worker/tests/anomaly-alerts.test.ts` simulates all five anomaly families and verifies dedupe suppression.
- `scripts/check-anomaly-alert-proof.js` is wired into `npm run check`.

Fix:
- Remaining outside-repo validation: observe alert volume/noise thresholds after live data is connected.

### Fixed in repo: self-correction diagnosis workflow has route and worker simulation coverage

Evidence:
- `MonthlyConversionOptimizationLoop` now calls `createSelfCorrectionDiagnosisTasks()`.
- `apps/worker/src/self-correction.ts` contains the injectable diagnosis task creator used by the worker runtime.
- The worker reads the latest two `MonthlyReport.kpisJson` snapshots and creates a deterministic `REQ-M5-05` task when `leadsTrend` or `tasksTrend` is flat/declining in both reports.
- The generated task includes the required checklist order: `Profile intact?`, `Tracking intact?`, `Algorithm update?`, `Competitor surge?`, `Own-work attribution?`.
- The subtask toggle API blocks completing a later `REQ-M5-05` step when an earlier step is still open.
- The subtask reorder API blocks reordering `REQ-M5-05` diagnosis tasks.
- `apps/web/tests/unit/self-correction-routes.test.ts` now behavior-tests ordered checklist blocking, allowed next-step completion, reorder blocking, and auth short-circuiting through the real subtask route handlers.
- `apps/worker/tests/self-correction.test.ts` simulates declining reports, healthy reports, duplicate idempotency, and canonical checklist ordering.
- `scripts/check-self-correction-proof.js` is wired into `npm run check`.
- `scripts/check-self-correction-proof.js` now requires route behavior coverage and worker simulation coverage.

Fix:
- Remaining outside-repo validation: observe generated diagnosis task usefulness after live monthly reports accumulate.

## Phase 7 - Module 3 Citations

### Partial: citation workflow has API, UI, and mocked behavior proof; live submission proof remains external

Evidence:
- `CitationRecord` exists with `napStatus`, `tier`, `status`, `credentialsRef`, `submittedAt`, and `lastVerifiedAt`.
- `POST /api/clients/[id]/citations/audit` initializes BrightLocal, pulls Citation Tracker results, classifies NAP status as `CORRECT`, `WRONG`, `DUPLICATE`, or `DEAD`, and upserts one `CitationRecord` per listing.
- Correct citations are marked `VERIFIED`; non-correct citations are marked `NEEDS_REVIEW`.
- `POST /api/clients/[id]/citations/[citationId]/submit` updates the citation to `SUBMITTED`, records `submittedAt`, and stores only `credentialsRef`, not raw credentials.
- Both routes use `requireClientRole()` and `withClientTenant()`.
- Client detail payload now includes recent citation records.
- `apps/web/src/components/clients/client-detail-panel.tsx` includes a `CitationWorkflowPanel` for running citation audits and submitting Tier 1 citation records with a credentials reference.
- Shared API helpers reference the routes, and `scripts/check-citation-workflow-proof.js` is wired into `npm run check`.
- `apps/web/tests/unit/citation-routes.test.ts` calls the real audit/submit route handlers with mocked BrightLocal, auth, and tenant DB behavior, covering NAP classification, same-client submission, and auth short-circuiting.
- `scripts/check-citation-workflow-proof.js` now requires route behavior coverage, client payload wiring, UI audit/submit controls, and rejects fabricated citation score/count fallbacks.

Fix:
- Remaining outside-repo validation: add a live/provider-backed end-to-end citation submission proof before calling Module 3 production-complete.

### Partial: backlink gap now has API, UI, scheduled worker proof; secondary source/live provider proof remains incomplete

Evidence:
- `BacklinkOpportunity` exists with `url`, `domainRating`, `competitorUrl`, and `status`.
- `SecondaryReviewMetric` exists with read-only Facebook and Trustpilot count/rating fields.
- `DataForSeoClient.getBacklinkGap()` calls the DataForSEO Backlinks live endpoint and normalizes referring-page opportunities.
- `POST /api/clients/[id]/backlinks/gap` is Zod validated, client-role guarded, tenant-scoped, and writes `BacklinkOpportunity` records.
- The backlink gap route explicitly rejects paid-link placement flags and returns the no-paid-link policy in the response.
- `GET /api/clients/[id]/secondary-reviews` is client-role guarded, tenant-scoped, and exposes secondary review metrics without any POST/PATCH/PUT/DELETE automation.
- Client detail reads now include `backlinkOpportunities` and `secondaryReview`, and shared API helpers reference the new routes.
- `MonthlyBacklinkGapPull` is scheduled monthly and writes DataForSEO backlink opportunities from recent competitor URLs.
- `apps/worker/src/backlink-gap.ts` contains the worker DataForSEO backlink helper and `apps/worker/tests/backlink-gap.test.ts` covers mocked provider parsing and update/create behavior.
- `apps/web/src/components/clients/client-detail-panel.tsx` includes an `AuthoritySignalsPanel` for manual backlink gap pulls, backlink opportunity review, and Facebook/Trustpilot secondary review metrics.
- `apps/web/tests/unit/backlink-routes.test.ts` calls the real backlink route handlers with mocked DataForSEO, auth, and tenant DB behavior, covering import/update/create behavior, paid-link rejection before provider access, tenant-scoped reads, and auth short-circuiting.
- `scripts/check-backlink-secondary-proof.js` is wired into `npm run check`.
- `scripts/check-backlink-secondary-proof.js` now requires route behavior coverage, scheduled worker proof, worker helper coverage, and visible UI controls.

Fix:
- Remaining repo gap: add an approved read-only secondary-platform ingestion source once source/API access is selected.
- Remaining outside-repo validation: add live/provider-backed backlink and secondary-review ingestion proof before calling Module 3 production-complete.

## Phase 8 - Module 2 Website Engine

### Partial: site audit/page matrix blocks simulated CWV and has local Rich Results plus rollback proof; live-site proof remains external

Evidence:
- `SiteAuditService` crawls sitemap and creates issues.
- Restore point gate exists before `executeFix`.
- Page matrix checks cannibalization, blocks missing required content blocks, validates JSON-LD shape, and checks NAP.
- Page matrix publishing no longer simulates CWV as `true`.
- `getChecklistDetails()` now calls PageSpeed Insights (`pagespeedonline/v5/runPagespeed`) for mobile Core Web Vitals/performance and blocks publication if `PAGESPEED_API_KEY` is missing, the API fails, LCP/INP/CLS are not `FAST`, or the mobile performance score is below 0.90.
- API tests mock passing PageSpeed metrics and the missing-key block path.
- `PageMatrixService.evaluateRichResultsSchema()` now applies an approved local Rich Results equivalent for Google-supported LocalBusiness schema, PostalAddress, GeoCoordinates, and required URL/address fields.
- `apps/api/src/modules/page-matrix/page-matrix.validation.REQ-M2-04-07.spec.ts` covers the local Rich Results equivalent and unsupported schema rejection.
- `SiteAuditService.rollbackLatestRestorePoint()` restores stored `pageMatrixEntries` snapshots into `PageMatrixEntry` rows and marks the restore point `restoredAt`.
- `POST /api/clients/:id/site-audit/restore-point/rollback` exposes rollback.
- `apps/api/src/modules/site-audit/site-audit.service.REQ-M2-02.spec.ts` covers rollback restore and missing-restore-point blocking.
- `scripts/check-site-engine-proof.js` is wired into `npm run check`.

Fix:
- Remaining outside-repo validation: add a test-site write/read-back/rollback integration test before calling Module 2 production-ready.

### Fixed in repo: conversion elements mount on a hosted landing page and run in seeded browser CI

Evidence:
- `trackConversion` creates `LeadLogEntry`.
- Module 5 now has a secret-gated conversion ingestion endpoint plus client helper.
- The secret-gated `/api/events/conversion` route remains available for server/external ingestion without browser exposure.
- `/api/events/conversion/browser` now accepts same-origin browser page events for `PHONE_CALL`, `WHATSAPP`, `FORM_SUBMISSION`, `BOOKING`, and `GBP_WEBSITE`, validates them with Zod, and writes `LeadLogEntry` records with `landing-page-conversion-element` metadata.
- Middleware now exempts only the exact server conversion ingestion route from origin checks; `/api/events/conversion/browser` is rejected cross-origin and allowed same-origin.
- `apps/web/src/lib/conversion-elements.ts` provides click-to-call, WhatsApp, quote form, booking, and website click helpers using `navigator.sendBeacon`/`fetch(... keepalive)`.
- `/landing/[slug]` now renders a public hosted landing page from real `Client` and primary `GbpProfile` data, including phone, WhatsApp, booking, website, and quote-form conversion elements.
- `apps/web/src/components/landing/landing-conversion-elements.tsx` mounts the helper calls into actual DOM click/form handlers.
- `apps/web/tests/e2e/landing-conversion-elements.spec.ts` covers the hosted landing page browser flow with intercepted `/api/events/conversion/browser` requests for call, WhatsApp, booking, website, and quote-form interactions.
- `scripts/check-conversion-elements-proof.js` is wired into `npm run check`.
- CI now provisions Postgres, runs migrations and seed data, starts the web dev server through Playwright `webServer`, and executes `npm run test:e2e --workspace=web`, including `apps/web/tests/e2e/landing-conversion-elements.spec.ts`.
- Remaining outside-repo validation: live lead creation still depends on running the route against a deployed database.

Fix:
- Add deployed smoke proof that the hosted page interactions create `LeadLogEntry` rows.

## Phase 9 - Module 4 Content Engine

### Partial: dedicated ContentPiece workflow exists; live provider/publish validation remains incomplete

Evidence:
- GBP post generation exists.
- `ContentPiece` and `ContentPieceStatusHistory` now provide a dedicated Module 4 informational content workflow, separate from GBP post scheduling.
- `ContentPipelineService.populateCalendarFromInformationalKeywords()` now reads active informational `KeywordMapEntry` rows, orders by priority/search volume, and creates `PLANNED` `ContentPiece` briefs with status-history evidence.
- The content brief template includes direct-answer-first structure, a table, and FAQ schema marker.
- `POST /api/clients/:id/content-pipeline/calendar/populate` exposes the calendar population flow.
- `generateContentDraft()` now requires `OPENAI_API_KEY`, calls the LLM endpoint, checks output against verified client service prices/business name, blocks unverifiable price claims before human review, and persists the draft body into `ContentPiece`.
- The first five generated drafts and every fourth draft after that are marked `PENDING_APPROVAL`.
- `POST /api/clients/:id/content-pipeline/content-pieces/:contentPieceId/publish` now requires a configured `CONTENT_SIMILARITY_CHECK_URL`, blocks high-similarity/plagiarism results, records provider evidence, and publishes low-similarity pieces.
- `GET /api/clients/:id/content-pipeline/content-pieces/:contentPieceId/published` provides the read-back path for published rows.
- `scripts/check-content-pipeline-proof.js` is wired into `npm run check`, and the API Module 4 test covers calendar population, unverifiable price blocking, and human-gate status.
- The API Module 4 test now also covers high-similarity blocking and low-similarity publish/read-back behavior.
- Client detail payload now includes recent `ContentPiece` rows with status-history proof.
- `apps/web/src/components/clients/client-detail-panel.tsx` now includes a Content tab with Module 4 calendar rows, draft approval queue counts, draft previews, similarity evidence, status proof, and read-back links.
- `scripts/check-content-pipeline-proof.js` now requires the staff UI payload and panel evidence.
- Remaining gaps: no deployed `CONTENT_SIMILARITY_CHECK_URL` provider proof and no live published-page smoke/read-back test.

Fix:
- Configure the approved similarity/plagiarism provider in production and add a live publish/read-back smoke test.

### Partial: GEO monitoring now uses multi-surface runner; live provider/deployment depth remains incomplete

Evidence:
- FAQ monitor exists for GBP FAQ.
- `syncSearchVisibility()` no longer returns heuristic scores; it requires `AI_ANSWER_SURFACE_URLS`, calls every configured public-surface check URL, and stores a monthly `REQ-M4-03` Task scorecard row with query, surface list, mention result, citation/snippet fields, and raw evidence.
- `scanStaleContent()` now flags old content only when explicit stale reasons are present, instead of marking every old post stale.
- Stale reasons now include old date/quarter references, expired offer dates, and stale year/quarter price/rate references.
- The Module 4 proof script and focused API test verify multi-surface AI-answer scorecard creation, stale price/date scanning, and expired offer detection.
- Remaining gaps: the configured public-surface runner still depends on approved/live surface endpoints being supplied in deployment, and there is no live monthly run proof yet.

Fix:
- Configure the approved public AI-answer surface endpoints in deployment and add a live monthly-run scorecard proof.
- Add broader stale parsing if future content stores structured offer expiry metadata outside body text.

## Phase 10 - Hardening, UI, Reporting Validation

### Fixed in repo: responsive, bundle, axe, Lighthouse config, and portal-report proof are gated with seeded browser CI

Evidence:
- Playwright config exists and defines 375, 768, and 1440 viewport projects.
- The existing Playwright smoke spec now includes a no-horizontal-overflow assertion that runs under those viewport projects when e2e is executed.
- `apps/web/tests/e2e/accessibility.spec.ts` now wires `@axe-core/playwright` checks for login and portal entry pages, failing on critical WCAG 2A/2AA violations when Playwright is executed.
- `apps/web/lighthouserc.json` now defines Lighthouse CI collection/assertions for `/portal` and `/login`, including an accessibility error threshold.
- Bundle analyzer config exists through `@next/bundle-analyzer`, and `apps/web/scripts/check-bundle-size.js` now enforces `REQ-NFR-02` as a 250 KB gzipped initial-JS budget for built app page routes.
- Root `npm run check` now runs `npm run check:bundle-size`, so the bundle budget is an actual consolidated gate.
- `apps/web/src/app/page.tsx` dynamically loads the major authenticated dashboard views so inactive views and chart-heavy screens are not part of the initial JS bundle.
- The portal page derives `clientId` from the decrypted portal session and uses it for monthly report queries and download links.
- `scripts/check-ui-validation-proof.js` is wired into `npm run check` and verifies the viewport config, no-overflow smoke assertion, axe spec, Lighthouse config, bundle budget script/config, and portal report scoping.
- `apps/web/playwright.config.ts` now starts `npm run dev` through Playwright `webServer` and uses Chromium for mobile, tablet, and desktop viewport projects.
- `.github/workflows/ci.yml` now provisions Postgres, runs Prisma migrations and seed data, installs Chromium, runs `npm run test:e2e --workspace=web`, and verifies Lighthouse config with `npm run check:lhci --workspace=web`.
- `apps/web/src/app/login/page.tsx` now gives the password visibility toggle an accessible name, and the focused Chromium axe proof passes locally.
- Remaining outside-repo validation: deployed browser smoke/LHCI evidence is still needed for production readiness claims.

Fix:
- Add deployed browser smoke and LHCI artifacts once production/staging URLs are available.

### Fixed for current seed/UI: Build Status seed is corrected and evidence links render

Evidence:
- `packages/database/prisma/seed.ts` now downgrades known partial items such as Build Status proof, responsive verification, task priority ordering, approval gates, GBP research flows, freshness, baseline capture, and scope truthfulness from `DONE` to `IN_PROGRESS`.
- The seed now updates existing `BuildRequirement` rows instead of using `update: {}`.
- `scripts/check-requirement-ids.js` now validates that each seed row marked `DONE` has source/test evidence for its REQ ID.
- `REQ-META-01` UI reads database status, not verified implementation status.
- `REQ-META-01` is now marked `DONE` with evidence links in `packages/database/prisma/seed.ts`.
- `packages/database/prisma/seed.js` has been regenerated from `seed.ts`; compared requirement rows now have zero title/status/blocker/note drift.
- Build Status detail notes now render Markdown-style links as clickable evidence links.
- `scripts/check-requirement-ids.js` now fails if `REQ-META-01` is not `DONE` with linked evidence rendered in the UI, or if the tracked `seed.js` copy loses the evidence note/upsert.

Fix:
- Run the corrected seed in each existing environment so old rows receive the updated `REQ-META-01` status/note.

### Fixed for current API routes: reachability CI has no reviewed unwired exceptions

Evidence:
- `scripts/check-route-reachability.js` scans Next API route files and fails when a non-public route has no source reference.
- Root `npm run check` now runs `npm run check:route-reachability`.
- Shared web API helpers now reference the previously allowlisted competitor scan, GBP OAuth start, keyword mutation, and post generation routes.
- The reviewed unwired-route allowlist is now empty.
- `npm run check:route-reachability`, `npm run lint --workspace=web`, and `npm run build --workspace=web` passed after this update.

Fix:
- No remaining API-route reachability fix is required for the current route inventory.
- Extend the checker to page-route navigation reachability if route bloat returns.

### Fixed in repo: client portal has scoped read/report access, lead/approval surfaces, and seeded browser-download CI proof

Evidence:
- `ClientPortalUser` exists.
- Auth.js Nodemailer provider exists for magic links.
- `/portal` reads the decrypted `portal-session` cookie, scopes tasks, baseline, monthly reports, geo-grid scans, recent leads, and approvals to `sessionData.clientId`, and renders a read-only client surface.
- Monthly report download links are built from that same portal-session `clientId`.
- `/api/reports/monthly` now supports staff sessions or a valid portal session, and portal access is denied when the requested `clientId` differs from the decrypted portal cookie.
- `apps/web/tests/unit/portal.test.ts` now proves a real encrypted `portal-session` cookie can download only its own client report and is denied for a different `clientId`.
- `apps/web/tests/e2e/portal-report-download.spec.ts` adds a browser-level portal report download flow using a real encrypted portal cookie and seeded monthly report.
- `scripts/check-ui-validation-proof.js` verifies the portal report scoping, lead/approval portal surfaces, browser-download proof, and is wired into `npm run check`.
- The CI browser job now runs the Playwright e2e suite from the web workspace against a migrated and seeded database, so the portal browser-download spec is part of repo CI.
- Remaining outside-repo validation: live portal PDF download smoke test in a deployed environment.

Fix:
- Add deployed portal PDF download smoke evidence once production/staging URLs are available.

### Fixed in production source: production mock/random fallbacks are guarded

Evidence:
- High-risk random/fake fallbacks for geo-grid, FAQ visibility, competitor policy scan, OAuth credentials, Resend, Sentry, photo uploads, citation metrics, GA4 sync, and post generation were removed or gated.
- Web Sentry placeholder DSNs were removed from client, server, and edge config files.
- Remaining non-production logic still exists in reduced modules, but hardcoded category taxonomy sync and generic worker-created post content are now blocked instead of written.
- `apps/api/src/modules/localfalcon/localfalcon.service.ts` now calls the provider directly and returns a gateway failure on provider errors instead of describing mock/simulated fallback behavior.
- `apps/api/src/modules/localfalcon/localfalcon.controller.ts` now validates scan input with Zod, including valid zero coordinates and coordinate bounds.
- `apps/web/src/components/ui/sidebar.tsx` no longer uses `Math.random()` for production skeleton widths.
- `scripts/check-production-mock-fallbacks.js` is wired into `npm run check` and guards production source against `Math.random()` UI/data fallbacks plus Local Falcon mock/simulated fallback regression.
- UI placeholders and test files still contain mock terminology; these are acceptable test/UI affordances and are not used as production-readiness proof.

Fix:
- Keep unavailable external integrations represented as `BLOCKED` or `DEFERRED` in Build Status until live credentials/provider proof exists.
- Keep test mock terminology out of production-readiness evidence.

## Priority Fix Order

1. Finish Phase 0 tenant isolation proof with cross-client read/write tests and stronger RLS policy-shape checks.
2. Finish remaining Phase 0 hardening: deployed Auth.js cookie verification, remaining non-client route role tightening, KMS env-name normalization, and dependency upgrades when compatible fixed versions are available.
3. Move sequentially into Phase 1 Module 6 orchestration: centralize lifecycle transitions and approval gates, then prove DB bypasses cannot skip them.
4. Make Build Status truthful by updating all `BuildRequirement` records to Fixed/Partial/Open reality.
5. Continue Phase 1/Module 1 live data paths and Module 5 report lineage before pilot reporting.
6. Remove remaining production mock/reduced-module paths or hard-gate them as blocked in the appropriate later phase.
7. Explicitly mark Modules 3/4 and reduced Module 2/5 features as Phase 2 wherever not production-ready.

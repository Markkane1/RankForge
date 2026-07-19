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

## Summary

The implementation is no longer the empty/stub-only state described in parts of the Gemini gap file. Several major items are now present: PostgreSQL Prisma schema, separate web/api/worker workspaces, Auth.js staff login with 12h max age, 2FA tables and flows, `BuildRequirement`/Build Status UI, GBP OAuth token storage, approval 4-eyes checks, append-only trigger for `ChangeLogEntry`, some RLS migration work, BullMQ worker scaffolding, KMS-capable encryption, Module 2 crawl/page-matrix services, and requirement-tagged tests.

The remaining problem is that many fixes are shallow or route-local. The repo still does not meet the spec as a production v1 because tenant isolation is incomplete, CI/tests are broken, several production paths still generate mock/random data, many routes bypass auth/RBAC/CSRF, and Modules 3/4/5 are mostly reduced or missing without clean Phase 2 gating.

Verification note: `npm test` currently fails before running tests because Turbo cannot find a `test` task in every workspace. That means current CI/test status cannot be used as implementation proof.

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
| BullMQ worker | Partial | Worker and repeat schedulers exist; coverage of required cadence/tasks is incomplete and test/CI proof is absent. |
| Module 2 site audit/page matrix | Partial | Crawl, restore-point gate, page matrix, schema checks exist; live write/rollback and real CWV/Rich Results validation are missing. |

## Phase 0 - Foundations, Security, CI

### Open: test and CI gate are broken

Evidence:
- `npm test` fails with `Could not find task test in project`.
- `.github/workflows/ci.yml` runs `npm run test`, so CI will fail or be unreliable.
- `.codesight/coverage.md` reports 5 percent route/model coverage.

Fix:
- Add no-op or real `test` scripts to every workspace, or configure Turbo to run tests only where present.
- Add `npm run build`, lint, Prisma validate, route reachability, RLS policy check, dependency audit, and requirement-ID test checks to CI.

### Partial: RLS exists but does not satisfy REQ-AUTH-03/07 and REQ-SEC-01

Evidence:
- RLS migration only enables `Client`, `StaffUser`, and `OrgCredential`.
- Spec requires RLS on every table with `clientId`.
- Migration policies use `app.current_org_id`.
- Nest middleware sets `app.current_client_id`, not `app.current_org_id`.
- Next.js route handlers query Prisma directly and do not set either Postgres setting.

Fix:
- Add RLS policies for every client-scoped table: `GbpProfile`, `Task`, `ApprovalRequest`, `ChangeLogEntry`, `LeadLogEntry`, `MonthlyReport`, `ClientCredential`, `Gbp*`, `ServiceArea`, `CompetitorBenchmark`, `KeywordMapEntry`, etc.
- Use one consistent session variable name.
- Ensure all DB access, including Next route handlers and workers, runs inside a tenant context helper.
- Add CI that fails when a new `clientId` table lacks a policy.

### Open: CSRF and cookie hardening are not verified

Evidence:
- State-changing Next route handlers accept JSON/form POST/PATCH/PUT without CSRF token checks.
- No repo-wide CSRF middleware was found.

Fix:
- Add one shared state-changing request guard and apply it consistently.
- Verify SameSite/secure cookie behavior in Auth.js deployment config.

### Partial: RBAC exists but is not consistently enforced

Evidence:
- Nest has `@RequireRole`, but most product routes live in Next route handlers.
- Some Next mutating routes use `requireRole`, some use only `requireSession`, and some public import/export/task routes do not require a role.
- No CI lint checks missing role guards on mutating endpoints.

Fix:
- Create one Next route helper for auth + role + client scope.
- Require it on all mutating routes.
- Add a static route check in CI.

### Partial: secrets handling is inconsistent

Evidence:
- Web encryption supports KMS.
- `apps/worker/src/index.ts` throws on `kms:` ciphertext.
- Sentry configs use placeholder DSNs by default.
- `apps/worker/src/mailer.ts` falls back to `re_dummy_key_123`.
- Google OAuth routes fall back to `dummy_client_id`/`dummy_client_secret`.

Fix:
- Fail fast in production for external credentials.
- Teach worker to decrypt KMS ciphertext or keep all worker-needed secrets in a decryptable format.
- Remove production placeholder defaults.

## Phase 1 - Module 6 Orchestration Core

### Partial: state machine is duplicated and bypassable

Evidence:
- `packages/database/src/state-machine.ts` has legal transition helpers only.
- `apps/web/src/app/api/clients/[id]/state/route.ts` has a different hardcoded transition table and directly updates `db.client.update`.
- Other code can update `Client.lifecycleState` without the transition function.

Fix:
- Implement one shared `transitionClientTo(clientId, targetState, reason, actorId)` function.
- Route all state changes through it.
- Keep baseline, changelog, AT_RISK task, notification, and offboarding cleanup in that function.

### Partial: AT_RISK side effects are incomplete

Evidence:
- The state route creates notifications.
- It does not create the required high-priority corrective-plan `Task`.

Fix:
- Add the corrective task creation in the shared transition function.

### Open: no OFFBOARDED state or PII deletion flow

Evidence:
- `ClientState` enum has `ONBOARDING`, `BUILD`, `GROWTH`, `AT_RISK`, `PAUSED`; no `OFFBOARDED`.
- No scheduled offboarding scrub for review-ask phone/email PII.

Fix:
- Add an offboarding state/path or explicit offboarding action.
- Scrub `LeadLogEntry.contactInfo` and any review-ask PII on transition.

### Partial: task scheduler exists, but not the required scheduler

Evidence:
- BullMQ worker exists and schedules health/rank/category/post/FAQ/geo-grid scans.
- `Task` has no `dependsOnTaskIds`.
- Scheduler does not instantiate the full cadence table as concrete `Task` rows.
- Priority is enum-based, not the required numeric priority from a shared classifier.

Fix:
- Add task dependency representation and status guard.
- Add shared priority classifier.
- Make repeat jobs create/audit concrete task rows with `TaskLog` proof.

### Partial: approval queue exists, but approval guards are not consolidated

Evidence:
- Approval routes and UI exist.
- Primary category change creates an approval in one route.
- Other gated actions still execute directly or are not covered: name/address changes, verification steps, low-star review responses, first five content pieces, spending actions, suspension/reinstatement.

Fix:
- Add one `requireApproval()` server helper.
- Replace route-local approval logic with that helper.
- Add tests for every human-gated action listed in the spec.

### Partial: approval expiry status differs from spec

Evidence:
- Prisma enum has `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.
- Worker auto-cancels old approvals; spec names `EXPIRED` and says it blocks the task.

Fix:
- Add `EXPIRED` or map cancellation explicitly as expiry.
- Ensure linked task moves to `BLOCKED`, never continues.

### Partial: conflict-of-interest check blocks instead of gates

Evidence:
- `apps/web/src/app/api/clients/route.ts` returns HTTP 409 on detected conflict.
- Spec requires a created `ApprovalRequest`, never silent proceed.

Fix:
- Create conflict approval with exact overlap details.
- Keep client in onboarding/blocked until approved.

### Partial: client communications and health checks are shallow

Evidence:
- Worker marks expired tokens invalid and updates org credential `lastCheckedAt`.
- It does not verify each external system and log pass/fail per client per system.
- Weekly BUILD summaries and monthly report delivery are not implemented end-to-end.

Fix:
- Add `TaskLog`/health records per client/service.
- Add welcome, weekly BUILD, milestone, and report delivery jobs.

## Phase 2 - GBP Foundation, M1 Phases 0-2

### Partial: dossier ingestion does not parse audit findings into tasks

Evidence:
- CSV import creates clients.
- `taskId` uses random IDs for audit tasks in import code.
- No parser maps uploaded audit findings to one task per finding.

Fix:
- Define the dossier CSV/JSON shape.
- Create deterministic tasks for each finding.

### Partial: intake form exists but is incomplete

Evidence:
- Client and GBP intake components exist.
- Server validation covers some basics: SAB service areas, URL, category, service-area max.
- Required fields like legal name, past suspensions, photo availability, USPs, booking system, existing GBP/login details are incomplete or unstructured.

Fix:
- Extend schema/model for all required intake fields.
- Keep conditional SAB/address validation server-side.

### Partial: GBP OAuth exists but needs hardening

Evidence:
- OAuth routes and Nest service request `business.manage` and store encrypted tokens.
- Routes use dummy client secrets if env vars are missing.
- State is only `clientId`; no signed/nonce state verification was found.

Fix:
- Remove dummy production fallbacks.
- Sign and verify OAuth state.
- Store service as the required `GBP_OAUTH` or document mapping from current `GBP`.

### Partial: multi-location support exists in schema, but routes still assume one profile in places

Evidence:
- `Client.gbpProfiles` is a list.
- Some routes use `findUnique({ where: { clientId } })`, which only works if Prisma has a unique clientId relation and contradicts multi-location.
- `apps/web/src/app/api/clients/route.ts` uses `gbpProfile` include/create even though schema relation is `gbpProfiles`.

Fix:
- Normalize all code to `gbpProfiles`.
- Require location-specific `gbpId` for GBP operations.
- Add multi-location report/scan tests.

## Phase 3 - GBP Research and Core Optimization

### Partial: external research integrations exist but are not complete production flows

Evidence:
- Nest modules for DataForSEO, LocalFalcon, BrightLocal exist.
- Worker and routes still fall back to mock/random competitor and geo-grid data.
- Keyword research, competitor teardown, and category scoring are not fully live and traceable.

Fix:
- Remove random production fallback or mark feature blocked/Phase 2 when credentials are absent.
- Store external response lineage on created rows.

### Partial: category, description, service, product, and photo validations are incomplete

Evidence:
- Secondary category max and description length/URL/phone/all-caps checks exist.
- Missing legal-name based business-name linter.
- Missing competitor-name linter in description.
- Services do not enforce 300-char description or website wording cross-check.
- Products do not require linked service row and live URL 200.
- Photos validate file name/type/size but store `/mock-uploads/...`, do not upload privately, do not virus-scan, and do not compute competitor benchmark target.

Fix:
- Fill the missing validators in shared schemas.
- Add storage-backed photo upload with private object URLs/signed reads.
- Add product-service linkage and URL check.

### Partial: quarterly category/attribute sync is mock-backed

Evidence:
- Worker `QuarterlyCategorySync` uses a hardcoded taxonomy list.
- Attributes fetched live from GBP category schema are not implemented.

Fix:
- Replace hardcoded taxonomy with real GBP/approved source fetch.
- Add attribute diff storage and review task creation.

## Phase 4 - GBP Engagement Layer

### Partial: posts generator exists, but compliance and rotation are incomplete

Evidence:
- Worker creates 4 monthly draft posts.
- It uses generic stub content.
- It does not enforce offer/update/proof/seasonal rotation or no-phone compliance linter.
- Direct post generation falls back to stub content when no API key.

Fix:
- Implement exact four-post rotation.
- Add post-body compliance linter.
- Block or mark Phase 2 when AI key is absent instead of generating fake production content.

### Partial: review generation flow is incomplete

Evidence:
- Review invite route/components exist.
- Required 2-4 hour delay, 3-day reminder, permanent opt-out, QR/short-link, and low-star human gate are not fully represented in schema/worker.

Fix:
- Add review-ask records, opt-out flag, delayed queue jobs, and low-star approval workflow.

### Partial: FAQ monitoring is random

Evidence:
- `FaqVisibilityMonitor` uses `Math.random()` to mark FAQ pass/fail.

Fix:
- Replace with real scripted query provider or mark the monitor blocked.
- Store deterministic evidence for each scorecard row.

### Partial: booking URL validation is stricter/different than spec

Evidence:
- Route blocks unreachable booking URL unless override note exists.
- Spec says warning with coordinator override note, not silent failure.

Fix:
- Keep the override note path and make UI/API return a warning state, with audit log.

## Phase 5 - GBP Advanced Boosting and Reporting Foundations

### Partial: geo-grid tracker can save random data

Evidence:
- Manual route and worker create simulated rank grids with `Math.random()` when Local Falcon data is unavailable.

Fix:
- In production, block scan when provider credentials/subscription are absent.
- Save provider run IDs/raw response metadata for lineage.

### Partial: freshness engine creates notifications, not Alert rows

Evidence:
- No `Alert` model exists.
- Worker creates `Notification` for 14-day inactivity.

Fix:
- Add `Alert` model or explicitly align spec to `Notification`.
- Include recommended action, source rule, and dedupe key.

### Partial: spam and conversion loops use heuristics, not live source data

Evidence:
- Competitor policy scan creates mock competitors.
- Conversion loop compares stored `LeadLogEntry`, which is real, but does not prove GBP Performance ingestion is wired.

Fix:
- Use live SERP/DataForSEO data for spam scan.
- Wire GBP Performance source pulls into lead/performance tables.

### Partial: monthly report exists but does not satisfy REQ-M1-30 / REQ-M5-04

Evidence:
- Monthly report PDF is generated from `Task`, `LeadLogEntry`, and review rows.
- It lacks visibility metrics, competitor position, next-month plan, WhatsApp summary, client portal HTML report, and full data lineage map.
- Headline is computed from stored lead source counts, but only calls/directions/website clicks are covered.

Fix:
- Add metric lineage map for every displayed number.
- Add report archive immutability, portal access control tests, and competitor/rank/report sections.

### Partial: BaselineSnapshot is not immutable

Evidence:
- `BaselineSnapshot` has `updatedAt`.
- No migration trigger blocks update/delete for this table.

Fix:
- Add DB trigger/permission rule to make baseline insert-only.

## Phase 6 - Module 5 Analytics and Alerting

### Open: measurement infrastructure is incomplete

Evidence:
- `LeadLogEntry` exists.
- GA4/GSC/GBP Performance pull and full event wiring for phone, WhatsApp, form, booking, and directions are incomplete.
- No end-to-end tests for each event type.

Fix:
- Add event ingestion endpoints/client hooks.
- Add GA4/GSC/GBP pull jobs.
- Add one integration test per required event.

### Open: anomaly detection is incomplete

Evidence:
- No `Alert` model.
- Worker checks basic rank/current activity only.
- Required rules are not all implemented: rank drop >5 WoW, unexplained profile edit, review <=2 stars, calls down >30 percent WoW, site 4xx/5xx/schema/CWV fail.

Fix:
- Add alert schema and rule engine.
- Add deterministic tests for each required rule.

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
- No verified page-level click-to-call, WhatsApp, quote form, booking event wiring end-to-end.

Fix:
- Wire frontend conversion elements to tracking endpoint.
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

### Partial: Build Status exists but is inaccurate

Evidence:
- Seed marks many requirements DONE that are only partial or open.
- `REQ-META-01` UI reads database status, not verified implementation status.

Fix:
- Re-seed/update `BuildRequirement` statuses from this file.
- Add evidence links or automated checks per requirement.

### Open: no orphaned-route/dead-code CI gate

Evidence:
- Spec requires CI failure for unreferenced route files.
- No route reachability script was found in CI.

Fix:
- Add route inventory script comparing app routes to navigation/allowed public routes.

### Partial: client portal is incomplete

Evidence:
- `ClientPortalUser` exists.
- Auth.js Nodemailer provider exists for magic links.
- Dedicated minimal client portal report/lead/approval surface and access-control tests were not verified.

Fix:
- Build scoped portal routes.
- Enforce client-only data access through tenant context.
- Add direct API tests attempting cross-client report access.

### Open: production mocks/random data remain

Evidence:
- `Math.random()` in worker FAQ monitor and geo-grid simulation.
- Mock competitors in worker policy scan.
- Mock photo upload path `/mock-uploads/...`.
- Stub post content fallback when no AI key.
- Dummy/placeholder external credentials.

Fix:
- Remove production mock fallbacks.
- Gate unavailable integrations as `BLOCKED` or `DEFERRED` in Build Status and UI.

## Priority Fix Order

1. Fix CI/test command and add build/lint/Prisma validation gates.
2. Fix tenant isolation: RLS policies, context helper, Next route scope enforcement.
3. Remove production mock/random data paths or hard-gate them as blocked.
4. Centralize auth/RBAC/CSRF/client-scope helpers for all route handlers.
5. Centralize lifecycle transitions and approval gates.
6. Make Build Status truthful by updating all `BuildRequirement` records to Fixed/Partial/Open reality.
7. Finish Module 1 live data paths and Module 5 report lineage before pilot reporting.
8. Explicitly mark Modules 3/4 and reduced Module 2/5 features as Phase 2 wherever not production-ready.


# Sprint Plan
Version 1.0 | July 2026 | 2-week sprints, v1 = Sprints 1-10 (~20 weeks)

Each sprint below lists: goal, requirements delivered (REQ IDs from `03`),
external dependencies that must already be acquired (from `01`), and an
explicit Definition of Done. **A sprint is not complete until every item in its
Definition of Done is checked — partial completion carries into the next
sprint as an explicit carry-over line, never silently dropped.**

Hand the coding agent one sprint at a time: `03` (relevant REQ sections) +
this sprint's block + `05` (guardrails). Do not hand over future sprints early.

---

## Sprint 0 — Foundations (no client-facing feature yet)
**Goal:** repo, CI/CD, auth skeleton, tenant model, empty module shells that compile.

- Requirements: `CoreModule` schema (Organization/StaffUser/Client/ClientPortalUser
  — a single fixed `Organization` row seeded once, not a signup flow),
  REQ-AUTH-01–07, REQ-NFR-04/09, REQ-SEC-01–08 scaffolding (RLS policies exist
  even though few tables do yet).
- External deps needed: none paid yet — Postgres (Neon free tier), Redis
  (Upstash free tier), GitHub repo, Vercel/Railway projects created.
- Definition of Done:
  - [ ] Monorepo scaffolded (Next.js app + NestJS API + shared `packages/types`)
  - [ ] Prisma schema for `Organization/StaffUser/Client/ClientPortalUser` migrated, RLS policies applied on client-scoped tables and tested (a raw SQL query as client-portal-user A cannot see client B's row)
  - [ ] Auth.js login works for a seeded Owner staff user; 2FA enforced
  - [ ] CI pipeline: typecheck, lint, unit tests, RLS-policy-presence check all green on an empty PR
  - [ ] Sentry wired in both API and worker process, verified by a manually-triggered test error appearing in Sentry
  - [ ] `/health` and `/health/deep` endpoints return 200
  - [ ] "Build Status" screen (REQ-META-01) exists, shows 0/total requirements done

## Sprint 1 — Module 6 Orchestration Core
**Goal:** the scheduler/state-machine/approval engine that every other module plugs into.

- Requirements: REQ-M6-01–08, REQ-M6-STATE-01–04, REQ-M6-TASK-01–03,
  REQ-M6-APPR-01–02, REQ-AUTH-04/05.
- External deps needed: none paid.
- Definition of Done:
  - [ ] Client lifecycle state machine implemented exactly as §5.1 in `03`, illegal transitions throw, all pass unit tests
  - [ ] Task model + BullMQ scheduler running, priority ordering test passes (5 tasks of mixed priority process in the specified order)
  - [ ] Idempotent writer + retry-with-backoff + read-back-verify shared services exist and have their own test suite (mocked external API) — this is infrastructure every later module reuses, must be solid before Sprint 2
  - [ ] Approval queue UI functional end-to-end: create → list → approve/reject → 4-eyes check enforced by a failing test when violated
  - [ ] One permanent internal sandbox client seeded, dry-run mode functional
  - [ ] Credential vault: encrypt/decrypt round-trip test passes against a real (dev) KMS key

## Sprint 2 — GBP Foundation (Phases 0-2)
**Goal:** onboard a real pilot client through to a verified, correctly-configured GBP profile.

- Requirements: REQ-M1-01–12.
- External deps needed: **Google Cloud project created, GBP API access request
  submitted (start this at the beginning of Sprint 0, not Sprint 2 — the 7-10
  business day approval window must overlap earlier sprints; see `01` §2.1
  sequencing note).** DataForSEO account + $50 wallet top-up.
- Definition of Done:
  - [ ] Intake questionnaire form live, validated, produces a `Client` + `GbpProfile` draft
  - [ ] GBP OAuth connect flow works against a real (or sandbox) Google account
  - [ ] Claim/create/verify wizard covers all 4 decision-tree branches with correct routing
  - [ ] Service-area vs. address setup enforced by SAB toggle
  - [ ] Multi-location support tested with 2 locations on one client, no data bleed between them

## Sprint 3 — GBP Research + Core Optimization (Phases 1, 3)
**Goal:** keyword/competitor research pipeline, category/description/services editors.

- Requirements: REQ-M1-04–07, REQ-M1-13–19.
- External deps needed: DataForSEO (already acquired Sprint 2); Local Falcon
  account created (used starting Sprint 5, but set up billing now if budget
  allows to avoid a mid-sprint gate later).
- Definition of Done:
  - [ ] Service taxonomy builder functional, parent/child persist correctly
  - [ ] Keyword research pulls real DataForSEO data (not mocked) into `KeywordMapEntry`, verified against a real API response in a recorded test fixture
  - [ ] Competitor teardown produces a real `CompetitorBenchmark` from ≥3 geo-points, ≥5 keywords
  - [ ] Primary category change on an existing profile creates an `ApprovalRequest`; on a brand-new profile it does not (both paths tested)
  - [ ] Description editor's banned-content linter blocks phone numbers/URLs/ALL-CAPS/competitor names — each case has a failing-then-passing test
  - [ ] Photo pipeline: upload, categorize, benchmark progress bar reflects real competitor average × 1.25

## Sprint 4 — GBP Engagement Layer (Phase 4)
**Goal:** posts, reviews, FAQ readiness, booking integration.

- Requirements: REQ-M1-20–23.
- External deps needed: Meta Business verification started (can take time —
  start early), WhatsApp Cloud API number registered, at least one message
  template submitted for approval before this sprint's review-ask feature can
  go live in production (staging can use Meta's test number in the meantime).
- Definition of Done:
  - [ ] Monthly post calendar generator produces the correct 4-week rotation, compliance linter blocks phone numbers in post body
  - [ ] Review-ask flow triggers correctly on a simulated job-completion event, respects the 2-4h delay and 3-day single reminder, opt-out is instant and permanent (tested)
  - [ ] Reviews ≤2★ are blocked from any auto-response path — verified by a test that asserts no outbound call happens without an approved `ApprovalRequest`
  - [ ] FAQ content list manageable; monthly AI-surface test job runs against at least one real public AI answer surface and logs a result (even if just 1 query in this sprint — real, not mocked)
  - [ ] Booking URL reachability check works, override-with-note path tested

## Sprint 5 — GBP Advanced Boosting + Reporting Foundations (Phases 5-7)
**Goal:** geo-grid tracking, freshness engine, spam-fighting scaffolding, KPI/report generator v1.

- Requirements: REQ-M1-24–30, REQ-M5-01–02.
- External deps needed: Local Falcon (or DataForSEO SERP fallback) API live.
- Definition of Done:
  - [ ] Weekly geo-grid scan job runs against real Local Falcon (or DataForSEO) data, heatmap renders in the dashboard
  - [ ] Freshness engine correctly raises an alert at the 14-day-inactive threshold in a time-simulated test
  - [ ] Monthly spam-sweep job produces a findings list without attempting any unauthorized automated submission
  - [ ] Suspension-response wizard exists, is fully human-gated end to end
  - [ ] `BaselineSnapshot` capture is genuinely immutable at the DB permission level (tested by attempting a raw UPDATE and observing a permission error, not just an app-layer 403)
  - [ ] KPI stack aggregates real stored data; monthly report v1 renders with the plain-language headline computed from real numbers

## Sprint 6 — Module 5 Analytics & Alerting
**Goal:** full measurement stack, anomaly detection, self-correction loop.

- Requirements: REQ-M5-01 (complete), REQ-M5-03–05.
- External deps needed: GA4 + Search Console OAuth per client (free), Twilio
  number for call tracking if in scope for pilot client.
- Definition of Done:
  - [ ] All 5 GA4 event types wired and produce `LeadLogEntry` rows in an end-to-end test
  - [ ] Each of the 5 anomaly-detection rules independently triggers the correct `Alert` type in a simulated-data test
  - [ ] Self-correction diagnosis order is enforced sequentially in the UI/workflow — cannot skip to "own tactics" without completing the earlier steps
  - [ ] Monthly report v2 includes competitor benchmark comparison table

## Sprint 7 — Module 3 Citations (v1 scope)
**Goal:** citation audit + tiered building workflow.

- Requirements: REQ-M3-01–04.
- External deps needed: BrightLocal Grow-tier subscription, Citation Builder
  pay-as-you-go wallet.
- Definition of Done:
  - [ ] Citation audit runs against real BrightLocal data for the pilot client, produces classified `CitationRecord` rows
  - [ ] At least one Tier 1 citation successfully submitted and logged end-to-end
  - [ ] Backlink gap mining pulls real DataForSEO Backlinks API data, monthly log populated
  - [ ] Secondary review platform read-only display works; confirmed no write/response UI exists for those platforms

## Sprint 8 — Module 2 Website Engine (v1 scope)
**Goal:** technical audit + page matrix + one working page template end-to-end.

- Requirements: REQ-M2-01–07.
- External deps needed: PageSpeed API key (free), Rich Results Test API
  access (free), client's own domain + CMS/hosting access secured.
- Definition of Done:
  - [ ] Website-existence decision wizard routes correctly for all 4 branches
  - [ ] Technical crawl produces a real prioritized fix list against the pilot client's actual site (or the newly-built one)
  - [ ] Page matrix cannibalization check blocks a duplicate-keyword page in a test
  - [ ] At least one real service page and one real location page pass the full pre-launch checklist gate and are actually published live
  - [ ] Schema validates against the real Rich Results Test API, not a local approximation

## Sprint 9 — Module 4 Content Engine (v1 scope)
**Goal:** content calendar + production pipeline for informational content.

- Requirements: REQ-M4-01–04.
- External deps needed: Copyscape-class API key, the already-arranged LLM
  wired into the drafting step.
- Definition of Done:
  - [ ] Content calendar auto-populates from real `KeywordMapEntry` informational rows
  - [ ] At least one real content piece goes brief → draft → compliance check → human-gate approval → publish, end to end, with no shortcuts
  - [ ] Compliance check correctly flags an intentionally-inserted unverifiable claim in a test fixture
  - [ ] AI-visibility monitoring job runs and logs a real result against a real public AI surface

## Sprint 10 — Hardening, Multi-Tenant Load Test, Pilot Go-Live
**Goal:** everything from Sprints 1-9 working together for the real pilot
client(s), tenant isolation proven under load, security review passed.

- Requirements: full regression across all REQ IDs; REQ-NFR-01–09 verified
  formally (not just "should be fine").
- Definition of Done:
  - [ ] Full regression test suite green
  - [ ] RLS tenant isolation verified with a second seeded client under
    concurrent load (a scripted test that hammers both tenants simultaneously
    and asserts zero cross-tenant reads)
  - [ ] Lighthouse scores meet REQ-NFR-02 on the real client-portal report page
  - [ ] Security checklist in `05` §5 fully passed
  - [ ] "Build Status" screen shows 100% of v1-scoped requirements DONE, and
    explicitly lists every v2-deferred requirement (from Module 2/3/4 full
    scope) as `Deferred-to-v2`, not hidden
  - [ ] Real pilot client fully onboarded through GROWTH state with a real
    first monthly report generated from real data

---

## v2 Backlog (Sprints 11+, not detailed here — scope this after v1 pilot
learnings)
- Full Module 2 (all page types, bilingual/Arabic support, full internal
  linking automation)
- Full Module 3 (all citation tiers, local PR/link outreach automation)
- Full Module 4 (full 90-day rolling calendar automation, full GEO monitoring
  across all AI surfaces)
- Multi-client scale hardening (10+ clients), cost re-optimization per `01` §4.4
- Evaluate BrightLocal alternative / in-house citation-audit build if
  per-location cost becomes prohibitive at scale

# Software Requirements Specification (SRS)
# Agent 1 — Local SEO Delivery Agent Platform
Version 1.0 | July 2026 | Primary build document for the coding agent

## 0.1 Scope Correction (supersedes any "multi-tenant SaaS" language below)

This is an **internal system for one agency (yours)** — not a product sold to
other agencies. There is exactly one fixed `Organization`, no agency signup
flow, no per-agency billing. What is preserved in full is **client-level
isolation**: each `Client` (a business you serve, e.g. SparkleClean) has a
hard data boundary from every other client, enforced by Postgres RLS on
`client_id`, because clients get their own read-only portal login. Wherever
this document's data model previously modeled `Agency`/`AgencyUser`/
`AgencyRole`/`AgencyCredential` as multi-tenant concepts, they are replaced
below by a single `Organization` row and a flat `StaffUser` table — read
"Agency Owner" in role names simply as the role label for the person who owns
the agency, not as a multi-tenant concept.

## 0. How to Use This SRS (read this first, coding agent)

- Every requirement has an ID of the form `REQ-<MODULE>-<NUMBER>` and cites the
  source blueprint task ID (e.g. `M1-3.1`) where applicable.
- A requirement is **not done** until its listed Acceptance Criteria all pass
  AND it satisfies every rule in `05-agent-build-guardrails-and-definition-of-done.md`.
- **Never mark a requirement done with a stub, mock, TODO, or "coming soon"
  placeholder in production code paths.** If a requirement cannot be completed
  in the current sprint, it stays in `NOT_STARTED` state in the tracker and is
  visibly listed as such in the admin dashboard's "Build Status" screen (this
  screen is itself required — `REQ-META-01`).
- Build in the sprint order given in `04-sprint-plan.md`. Do not jump ahead to
  a later module's requirements before its dependencies (listed per-requirement
  below) are done and tested.

---

## 1. Scope, Actors, and Traceability Convention

### 1.1 Actors

| Actor | Description |
|---|---|
| Agency Owner | Full control; approves human-gated actions; manages billing/tool credentials |
| Coordinator | Day-to-day operator; drafts content, reviews task queue, cannot self-approve gated actions |
| Approver | Reviews and approves/rejects human-gated actions raised by Coordinators or the system |
| Client (portal user) | Read-only viewer of their own reports, leads, and approval requests requiring their input (e.g., video verification coaching, name/category change approval) |
| System (scheduler/worker) | Non-human actor executing recurring and triggered tasks |

### 1.2 Traceability

Every requirement below references its blueprint source task (e.g. `[M1-2.1]`).
Every requirement must have at least one corresponding automated test
(unit and/or integration) whose test name embeds the REQ ID
(e.g. `REQ-M1-021.spec.ts`). This is checked by CI (`05` §3).

---

## 2. Non-Functional Requirements (NFRs)

| ID | Requirement |
|---|---|
| REQ-NFR-01 | **Mobile responsiveness:** every screen in the agency dashboard and client portal must render correctly at 375px, 768px, and 1440px widths with no horizontal scroll and no overlapping elements. Verified via automated viewport screenshot tests in CI for every page route. |
| REQ-NFR-02 | **Lightweight:** initial JS bundle for any authenticated route ≤ 250KB gzipped; Lighthouse Performance score ≥ 90 on the client-portal report page (this is the page real clients will actually open, per the blueprint's "3-line WhatsApp summary for owners who don't read reports" — the full report page must still be fast). |
| REQ-NFR-03 | **Accessibility:** WCAG 2.1 AA minimum on all agency-facing and client-facing screens (color contrast, keyboard navigation, form labels, alt text on all rendered images including GBP photos surfaced in the UI). |
| REQ-NFR-04 | **Security baseline:** OWASP ASVS Level 2 controls applied — input validation on every endpoint (Zod schemas shared between frontend/backend), parameterized queries only (Prisma enforces this), CSRF protection on all state-changing routes, secure cookie flags, rate limiting on all public/auth endpoints. |
| REQ-NFR-05 | **Availability:** worker process failures must not take down the web dashboard; API failures must not silently drop scheduled jobs (see Module 6 idempotency/retry rules in `02` §6). |
| REQ-NFR-06 | **Data retention & deletion:** per blueprint Appendix C #11 (Modules 2-6), customer PII (phone/email used for review-asks) is deleted on client offboarding; a scheduled job enforces this, not a manual step. |
| REQ-NFR-07 | **Auditability:** every write to a client's `ChangeLogEntry`, `Task`, or `ApprovalRequest` table is itself immutable (append-only; updates create a new row referencing the prior one, never an in-place UPDATE of historical fact). |
| REQ-NFR-08 | **Internationalization readiness (not full i18n in v1):** all client-facing copy lives in a single translation-resource layer even though only English ships in v1, so Arabic (per blueprint Task 2.3.4) can be added without a rewrite. |
| REQ-NFR-09 | **No dead code / no orphaned routes:** every route defined in the router must be reachable from the navigation and have a corresponding page; CI fails the build if an unreferenced route file is detected (defends against "half-implemented modules" left visible but broken). |

---

## 3. Authentication, Authorization & Tenant Isolation Requirements

| ID | Requirement | Source |
|---|---|---|
| REQ-AUTH-01 | Staff log in via Auth.js (email/password + optional Google OAuth). Sessions expire after 12h idle. There is one `Organization`; staff accounts are not scoped to anything beyond their `StaffRole`. | — |
| REQ-AUTH-02 | Client portal users log in via a separate, scoped login (magic-link email, no password) that only ever grants access to that one `client_id`'s data. | — |
| REQ-AUTH-03 | Every API route handler that touches client-scoped data must resolve the acting `client_id` (from the route param, validated against the session's allowed scope) and pass it into a Postgres session variable (`SET app.current_client_id`) before any query — enforced by a NestJS interceptor applied globally, not per-controller. A staff session may act on any `client_id`, subject to RBAC; a client-portal session is hard-restricted to its own `client_id` only. | REQ-SEC-01 |
| REQ-AUTH-04 | RBAC checks (Owner/Coordinator/Approver/Viewer) are enforced by a decorator (`@RequireRole(...)`) on every mutating endpoint; missing the decorator on a mutating endpoint is a CI lint failure. | Module 6 Phase 6.3 |
| REQ-AUTH-05 | A Coordinator cannot approve an `ApprovalRequest` they authored themselves (4-eyes check at the DB constraint level, not just UI hiding the button). | Module 6 Phase 6.3 |
| REQ-AUTH-06 | The per-client Google OAuth grant for GBP API access (`business.manage` scope) is a fully separate credential object (`ClientCredential` type `GBP_OAUTH`) from the client portal login; revoking one never revokes the other. | `[M1-0.3]` |
| REQ-AUTH-07 | Postgres Row-Level Security policies exist on every client-scoped table (every table with a `clientId` column); a migration that adds such a table without an accompanying RLS policy fails a CI check (`05` §3). There is no equivalent org-level policy needed, since there is only one `Organization`. | REQ-NFR-04 |

---

## 4. Data Model (Prisma schema — authoritative)

The coding agent implements `schema.prisma` matching this structure exactly
(field types/names may be refined for Prisma syntax correctness, but no entity
or required field may be dropped without flagging it explicitly in the sprint
PR description).

```prisma
// ── Core (single fixed organization — no multi-agency tenancy) ──
model Organization {
  id        String   @id @default(cuid())
  name      String   // your agency's name — one row, ever
  createdAt DateTime @default(now())
  staff     StaffUser[]
  clients   Client[]
  credentials OrgCredential[] // DataForSEO/Local Falcon/BrightLocal/Meta keys, etc.
}

model StaffUser {
  id        String   @id @default(cuid())
  orgId     String
  org       Organization @relation(fields: [orgId], references: [id])
  email     String   @unique
  role      StaffRole // OWNER | COORDINATOR | APPROVER | VIEWER
  createdAt DateTime @default(now())
}

enum StaffRole { OWNER COORDINATOR APPROVER VIEWER }

model Client {
  id          String   @id @default(cuid())
  orgId       String
  org         Organization @relation(fields: [orgId], references: [id])
  businessName String
  niche       String
  city        String
  state       ClientLifecycleState @default(ONBOARDING)
  createdAt   DateTime @default(now())
  // relations declared below as the SRS proceeds
}

enum ClientLifecycleState { ONBOARDING BUILD GROWTH AT_RISK PAUSED OFFBOARDED }

model ClientPortalUser {
  id        String   @id @default(cuid())
  clientId  String
  client    Client   @relation(fields: [clientId], references: [id])
  email     String   @unique
}

// ── Credentials (encrypted) ─────────────────────────────
// Per-client Google OAuth grants — isolated per client, this is the boundary
// that actually needs to be airtight (client_id RLS applies to this table).
model ClientCredential {
  id            String   @id @default(cuid())
  clientId      String
  client        Client   @relation(fields: [clientId], references: [id])
  type          CredentialType // GBP_OAUTH | GA4_OAUTH | GSC_OAUTH | WHATSAPP_NUMBER | CMS_ACCESS | DOMAIN_REGISTRAR
  encryptedBlob Bytes    // AES-256-GCM ciphertext, envelope-encrypted via KMS
  lastVerifiedAt DateTime?
  createdAt     DateTime @default(now())
}

enum CredentialType { GBP_OAUTH GA4_OAUTH GSC_OAUTH WHATSAPP_NUMBER CMS_ACCESS DOMAIN_REGISTRAR }

// Your agency's own tool API keys (DataForSEO, Local Falcon, BrightLocal,
// Meta WhatsApp) — one set, shared across all clients, not tenant-scoped.
model OrgCredential {
  id            String   @id @default(cuid())
  orgId         String
  org           Organization @relation(fields: [orgId], references: [id])
  provider      String   // "dataforseo" | "local_falcon" | "brightlocal" | "meta_whatsapp" | ...
  encryptedBlob Bytes
  createdAt     DateTime @default(now())
}

// ── Module 1: GBP ────────────────────────────────────────
model GbpProfile {
  id              String   @id @default(cuid())
  clientId        String   @unique
  client          Client   @relation(fields: [clientId], references: [id])
  gbpLocationId   String?  // Google's location resource name, once claimed
  verificationStatus VerificationStatus @default(UNVERIFIED)
  isServiceAreaBusiness Boolean @default(true)
  primaryCategory String?
  secondaryCategories String[] // max 9 enforced at app layer
  description     String?
  phonePrimary    String?
  phoneAdditional String?
  websiteUrl      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum VerificationStatus { UNVERIFIED PENDING VERIFIED SUSPENDED }

model GbpServiceItem {
  id          String   @id @default(cuid())
  gbpProfileId String
  category    String
  name        String
  description String?
  priceFromAed Decimal?
  createdAt   DateTime @default(now())
}

model GbpPost {
  id           String   @id @default(cuid())
  gbpProfileId String
  type         PostType // OFFER | UPDATE | EVENT
  bodyText     String
  photoUrl     String?
  ctaUrl       String?
  scheduledFor DateTime
  publishedAt  DateTime?
  status       PostStatus @default(DRAFT)
}
enum PostType { OFFER UPDATE EVENT }
enum PostStatus { DRAFT SCHEDULED PUBLISHED FAILED }

model GbpReview {
  id           String   @id @default(cuid())
  gbpProfileId String
  googleReviewId String @unique
  rating       Int
  text         String?
  reviewerName String?
  respondedAt  DateTime?
  responseText String?
  requiresHumanGate Boolean @default(false) // true when rating <= 2
  createdAt    DateTime @default(now())
}

model GbpPhoto {
  id           String   @id @default(cuid())
  gbpProfileId String
  storageUrl   String
  category     String   // logo|cover|team|service|before_after|van
  uploadedAt   DateTime @default(now())
}

model GeoGridScanResult {
  id           String   @id @default(cuid())
  clientId     String
  keyword      String
  gridSize     Int      // e.g. 7 for 7x7
  scanDate     DateTime
  averageRank  Float
  pointResults Json     // array of {lat,lng,rank}
}

// ── Change log / audit (append-only) ─────────────────────
model ChangeLogEntry {
  id         String   @id @default(cuid())
  clientId   String
  module     String   // "M1" | "M2" | ...
  field      String
  oldValue   String?
  newValue   String?
  reason     String
  taskId     String   // e.g. "M1-3.1"
  actorType  ActorType // HUMAN | SYSTEM
  actorId    String?
  createdAt  DateTime @default(now())
}
enum ActorType { HUMAN SYSTEM }

// ── Module 6: Orchestration ──────────────────────────────
model Task {
  id            String   @id @default(cuid())
  clientId      String
  taskRef       String   // "M1-4.2" etc, matches blueprint ID convention
  type          String
  dueAt         DateTime?
  recurrence    String?  // cron expression, null = one-time
  priority      Int
  dependsOnTaskIds String[]
  status        TaskStatus @default(PENDING)
  humanGate     Boolean  @default(false)
  idempotencyKey String  @unique
  evidenceRef   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
enum TaskStatus { PENDING IN_PROGRESS NEEDS_VERIFICATION DONE FAILED BLOCKED AWAITING_APPROVAL }

model TaskLog {
  id        String   @id @default(cuid())
  taskId    String
  message   String
  level     String   // info|warn|error
  createdAt DateTime @default(now())
}

model ApprovalRequest {
  id           String   @id @default(cuid())
  clientId     String
  taskId       String?
  summary      String
  proposedAction Json
  requestedBy  String   // StaffUser id or "SYSTEM"
  status       ApprovalStatus @default(PENDING)
  decidedBy    String?
  decidedAt    DateTime?
  createdAt    DateTime @default(now())
  remindAt     DateTime? // 48h reminder
  escalateAt   DateTime? // 96h escalation
}
enum ApprovalStatus { PENDING APPROVED REJECTED EXPIRED }

// ── Modules 2-5 (abbreviated — full field lists in sprint tickets) ──
model PageMatrixEntry { id String @id @default(cuid()) clientId String slug String pageType String primaryKeyword String targetArea String? priority Int status String }
model CitationRecord { id String @id @default(cuid()) clientId String platform String url String? napStatus String tier Int lastVerifiedAt DateTime? }
model ContentPiece { id String @id @default(cuid()) clientId String title String targetKeyword String status String publishedUrl String? publishedAt DateTime? }
model LeadLogEntry { id String @id @default(cuid()) clientId String source String serviceAsked String? area String? outcome String? createdAt DateTime @default(now()) }
model BaselineSnapshot { id String @id @default(cuid()) clientId String @unique capturedAt DateTime data Json } // immutable once written
model MonthlyReport { id String @id @default(cuid()) clientId String periodStart DateTime periodEnd DateTime data Json generatedAt DateTime @default(now()) }
```

**Row-Level Security note:** every model above with a `clientId` field gets a
Postgres RLS policy `USING (client_id = current_setting('app.current_client_id')::text)`.
This is the only isolation boundary that matters here — there is one
`Organization`, so `StaffUser`/`OrgCredential` need no RLS (any authenticated
staff session may read them, subject to RBAC checks in application code, not
row-level policy). This is `REQ-AUTH-07` and is mandatory before any module's
client-scoped endpoints ship.

---
*(Continued in this same file — Functional Requirements by Module, State
Machines, and API Contracts follow below.)*
## 5. State Machines

### 5.1 Client Lifecycle State Machine `[Module 6 Phase 6.1]`

```
ONBOARDING ──(access✓ + intake✓ + research✓ + baseline captured)──▶ BUILD
BUILD ──(build checklist 100%)──▶ GROWTH
GROWTH ──(2 consecutive months flat KPIs OR unhappy-client signal OR unpaid invoice)──▶ AT_RISK
AT_RISK ──(corrective plan resolves issue)──▶ GROWTH
AT_RISK ──(offboarding decided)──▶ PAUSED
GROWTH ──(offboarding decided)──▶ PAUSED
PAUSED ──(handover checklist complete)──▶ OFFBOARDED
```

| ID | Requirement |
|---|---|
| REQ-M6-STATE-01 | Each transition above is implemented as an explicit function (`transitionClientTo(clientId, targetState, reason)`), never a raw field UPDATE. Every transition writes a `ChangeLogEntry`. |
| REQ-M6-STATE-02 | Illegal transitions (e.g. `ONBOARDING → GROWTH` directly) throw and are logged as an error, not silently coerced. |
| REQ-M6-STATE-03 | Entry into `AT_RISK` automatically creates a high-priority `Task` for a corrective plan and notifies the Agency Owner (email + dashboard badge). |
| REQ-M6-STATE-04 | `BUILD → GROWTH` transition is blocked until a `BaselineSnapshot` row exists for the client (enforces blueprint Task 5.1.2 "no baseline = no provable results"). |

### 5.2 Task State Machine `[Module 6 Phase 6.2]`

```
PENDING ──(dependencies satisfied, scheduler picks up)──▶ IN_PROGRESS
IN_PROGRESS ──(human_gate=true)──▶ AWAITING_APPROVAL
AWAITING_APPROVAL ──(approved)──▶ IN_PROGRESS
AWAITING_APPROVAL ──(rejected)──▶ BLOCKED
IN_PROGRESS ──(external write attempted)──▶ NEEDS_VERIFICATION
NEEDS_VERIFICATION ──(read-back matches)──▶ DONE
NEEDS_VERIFICATION ──(read-back mismatch, retries exhausted)──▶ FAILED
IN_PROGRESS ──(dependency newly blocked)──▶ BLOCKED
```

| ID | Requirement |
|---|---|
| REQ-M6-TASK-01 | The scheduler polls `PENDING` tasks ordered by the blueprint's fixed priority list: (1) profile-threat events, (2) lead-flow breakages, (3) client-promised deliverables due, (4) recurring freshness tasks, (5) opportunistic improvements — implemented as a numeric `priority` field populated by a shared classifier, not ad-hoc per queue. |
| REQ-M6-TASK-02 | A task with unmet `dependsOnTaskIds` never leaves `PENDING`/`BLOCKED` regardless of due date. |
| REQ-M6-TASK-03 | `FAILED` tasks raise a Sentry alert and appear in a dedicated "Failed Tasks" dashboard view; they are never silently retried indefinitely (max 3 attempts, per `02` §6). |

### 5.3 Approval (Human Gate) State Machine `[Module 6 Phase 6.3]`

```
PENDING ──(approved by eligible Approver)──▶ APPROVED → triggers task resume
PENDING ──(rejected)──▶ REJECTED → task moves to BLOCKED, Coordinator notified
PENDING ──(48h no action)──▶ auto-reminder sent (email + dashboard)
PENDING ──(96h no action)──▶ escalated (marked urgent, additional notification channel)
PENDING ──(configurable timeout, default 30 days)──▶ EXPIRED
```

| ID | Requirement |
|---|---|
| REQ-M6-APPR-01 | Every action in the blueprint's consolidated human-gate list (name/address/category change, verification steps, ≤2★ review responses, developer-level code changes, first-5 content pieces, suspension/reinstatement, anything spending money) must create an `ApprovalRequest` row before execution — never executed directly. Enforced by requiring every such mutation to go through a shared `requireApproval()` guard, checked in code review (see `05`). |
| REQ-M6-APPR-02 | The system never auto-approves on timeout — `EXPIRED` blocks the task, it does not approve it. |

---

## 6. Functional Requirements by Module

Each table row = one requirement. `Src` = blueprint task ID. `AC` = Acceptance Criteria (abbreviated; full Gherkin-style scenarios live in the sprint tickets referenced in `04`).

### 6.1 Module 6 — Orchestration (build first; everything else depends on it)

| ID | Src | Requirement | AC |
|---|---|---|---|
| REQ-M6-01 | 6.1 | Client CRUD + lifecycle state machine (§5.1) | Can create client, see state badge, cannot skip states |
| REQ-M6-02 | 6.2 | Task scheduler: BullMQ repeatable jobs instantiate the cadence table (daily/weekly/monthly/quarterly/yearly) as concrete `Task` rows | A weekly review-ask job actually enqueues once per client per week, verifiable in `TaskLog` |
| REQ-M6-CAP-01 | Appendix D | Capability map: each GBP-related capability (core info, reviews, photos, performance, posts, services/products, verification) is tagged `automation_level: api\|partner\|human` in a config table; the scheduler routes tasks accordingly, and a `human` task always creates a checklist + instructions for a person, never a silent no-op | Attempting to auto-create a new GBP listing routes to a `human` task with exact instructions, does not attempt an API call that Google disallows |
| REQ-M6-03 | 6.3 | Approval queue UI: list, filter by client/urgency, approve/reject with 4-eyes enforcement (§3, REQ-AUTH-05) | Coordinator cannot see an "Approve" button on their own submitted request |
| REQ-M6-04 | 6.4 | Per-client memory: `ChangeLogEntry`, "do/don't" preference notes (free-text, tagged `client_id`), report archive | Preference note "never mention competitor X" is visible to Coordinators drafting content for that client |
| REQ-M6-05 | 6.4 | Global playbook memory: aggregated, anonymized tactic performance (e.g. best-performing post template) — **must not** expose any other client's raw keywords/pricing/lead data across tenant boundary | A query for "best post templates" returns template text + aggregate CTR, never a client name or client-specific numbers |
| REQ-M6-06 | 6.4 | Conflict-of-interest check: onboarding a new client checks existing clients for same niche + overlapping service area; a match creates an `ApprovalRequest`, never silently proceeds | Onboarding a second Dubai cleaning company while one exists raises a gate before BUILD starts |
| REQ-M6-07 | 6.5 | Client communication engine: welcome message, weekly one-liner during BUILD, monthly report delivery, milestone notifications | A BUILD-state client automatically receives a weekly summary email generated from that week's `TaskLog` entries |
| REQ-M6-08 | 6.6 | Credential vault (encrypted `ClientCredential`/`OrgCredential`), 2FA enforced on the Owner login, daily access-health check job | Health check job logs a pass/fail per client per external system daily; failure creates an `Alert` |
| REQ-META-01 | — | "Build Status" screen listing every REQ ID from this SRS with its live status (Not Started / In Progress / Done / Deferred-to-v2), auto-generated from the `Task`/requirement tracker, visible to Agency Owner | Owner can open one screen and see exactly what is and isn't built — no requirement can be silently invisible |

### 6.2 Module 1 — GBP (Phases 0-7, source doc: Module 1 blueprint)

| ID | Src | Requirement | AC |
|---|---|---|---|
| REQ-M1-01 | 0.1 | Client dossier ingestion form → creates `Client` + seeds gap-list `Task` rows | Uploading a dossier creates one Task per audit finding |
| REQ-M1-02 | 0.2 | Client intake questionnaire (structured form, not free text) covering: legal name, SAB y/n, service list, service areas, hours/phone/WhatsApp, existing GBP + login, past suspensions, photo availability, USPs, booking system | Form validation blocks submission with required fields missing; SAB answer conditionally shows/hides address fields |
| REQ-M1-03 | 0.3 | GBP OAuth connect flow: client grants `business.manage` scope; app never requests or stores the client's Google password | OAuth flow completes and stores only the refresh token, encrypted |
| REQ-M1-04 | 1.1 | Service taxonomy builder: parent→child services, tag revenue_priority/seasonality/regulated | Owner can add a child service under a parent, tags persist |
| REQ-M1-05 | 1.2 | Keyword research: pulls from DataForSEO Labs/Keywords API per service, classifies intent, builds `KeywordMapEntry` rows tagged to target asset | Running research for one service returns ≥1 keyword with volume + intent + target asset |
| REQ-M1-06 | 1.3 | Competitor teardown: pulls local pack results from DataForSEO Business Data/SERP API from ≥3 geo-points for ≥5 priority keywords, computes benchmark averages | `CompetitorBenchmark` row shows computed average reviews/rating/photos/velocity |
| REQ-M1-07 | 1.4 | Service-area mapping: ranked list of up to 20 granular areas, feeding both GBP setup and geo-grid tracker | List enforces the 20-area cap with a validation error, not silent truncation |
| REQ-M1-08 | 2.1 | Profile claim/create/verify decision tree implemented as a guided wizard; video-verification step is a **human-gate checklist with the exact shooting script**, never an automated action | Wizard routes correctly for all 4 decision-tree branches; verification step always requires human confirmation before marking done |
| REQ-M1-09 | 2.2 | Business name field: validated against a "no keyword stuffing" rule (basic heuristic: name must exactly match a stored `legalName` + optional confirmed exception) with human-gate on any change to an established profile | Attempting to save a name differing from `legalName` without an approved exception is blocked |
| REQ-M1-10 | 2.3 | Address vs. Service-Area Business setup, decision-tree driven from intake answer, populates up to 20 `ServiceArea` entries when SAB | Toggling SAB hides the address field and requires ≥1 service area |
| REQ-M1-11 | 2.4 | Core fields form (phone, website+UTM, hours incl. Ramadan/holiday overrides, booking link) | Saving auto-appends the specified UTM parameters to the website URL if missing |
| REQ-M1-12 | 2.5 | Multi-location support: one `GbpProfile` per staffed location, each running its own Phase 2-6 pipeline | Creating a second location for one client does not merge or share GBP-specific data with the first |
| REQ-M1-13 | 3.1 | Primary category selector: candidate list generated from `services[]`, scored against competitor primary categories pulled live; **changing an existing primary category always creates an `ApprovalRequest`** | Selecting a category on a first-time (unverified/new) profile does not require approval; changing it later on a live profile does |
| REQ-M1-14 | 3.2 | Secondary categories (max 9), cross-checked against competitor data, quarterly review reminder task auto-created | Adding a 10th category is blocked with a clear error |
| REQ-M1-15 | 3.3 | Description editor: 750-char counter, first-250-char preview highlighted, banned-content linter (no phone numbers, no URLs, no ALL CAPS runs, no competitor names) blocking save until resolved | Pasting a phone number into the description shows a blocking validation error before save |
| REQ-M1-16 | 3.4 | Services section editor: per-category service list with ≤300-char descriptions, optional "from AED X" pricing (owner-confirmed flag required to show price), cross-check flag if wording diverges from the matching website service page text | Toggling a service's price field requires a linked `ownerConfirmed=true` boolean before it renders |
| REQ-M1-17 | 3.5 | Attributes: fetched live from GBP API category schema, diffed quarterly against previously-applied set, new attributes flagged for review | A newly available attribute shows a "new" badge until reviewed |
| REQ-M1-18 | 3.6 | Products section: package builder linked 1:1 to a `services[]` row and a live landing-page URL; seasonal products carry start/end review dates | A product cannot be saved without a linked service row and a URL that returns HTTP 200 at save time |
| REQ-M1-19 | 3.7 | Photo pipeline: upload with descriptive-filename enforcement, category tagging, weekly reminder task to the owner ("send 3 photos"), benchmark target = competitor average × 1.25 shown as a progress bar | Uploading a photo without a category tag is blocked; progress bar recalculates against the stored `CompetitorBenchmark` |
| REQ-M1-20 | 4.1 | Posts engine: monthly calendar auto-generator implementing the 4-week rotation (offer/update/proof/seasonal), compliance linter (no phone numbers in body) before queueing publish | Generating a month's calendar creates exactly 4 draft posts following the rotation |
| REQ-M1-21 | 4.2 | Review generation system: short-link + QR generation, WhatsApp/email ask-flow triggered 2-4h after a job-completion event, one reminder at 3 days, opt-out honored permanently and instantly, **negative (≤2★) reviews always route to human-gate response drafting** | Marking a review ≤2★ auto-sets `requiresHumanGate=true` and blocks auto-send of any response |
| REQ-M1-22 | 4.3 | FAQ/Ask-Maps readiness: FAQ content list management + a monthly scheduled job that scripts test queries against public AI answer surfaces and logs pass/fail per FAQ | Monthly job produces a scorecard row per FAQ item |
| REQ-M1-23 | 4.4 | Booking/action integration: appointment URL field validated as a live, reachable URL; WhatsApp click-to-chat link generator | Saving an unreachable booking URL is blocked with a warning (not a hard error, since booking systems can have soft-launch delays — Coordinator can override with a note) |
| REQ-M1-24 | 5.1/5.2 | Off-profile signal summary dashboard pulling from Module 2/3 (read-only aggregation in Module 1's view) | Shows landing-page schema status and citation consistency % without duplicating that data's source of truth |
| REQ-M1-25 | 6.1 | Geo-grid tracker: weekly scheduled Local Falcon (or DataForSEO SERP-based) scan per priority keyword, stored as `GeoGridScanResult`, heatmap rendered in dashboard | A completed weekly scan produces a visual grid the Coordinator can view |
| REQ-M1-26 | 6.2 | Freshness engine: hard rule enforcement — a client with no new `ChangeLogEntry`/post/photo in 14 days auto-raises an `Alert` (not 30, per the blueprint's stricter internal standard) | Simulating 14 days of inactivity in a test client raises the alert |
| REQ-M1-27 | 6.3 | Spam-fighting: monthly scheduled job scans for competitor policy violations on priority keywords, logs findings, generates a "Suggest an Edit" action list for human execution | Job produces a findings list, does not attempt any automated "suggest edit" submission without human confirmation |
| REQ-M1-28 | 6.4 | Suspension response playbook: a dedicated wizard (evidence pack checklist, reinstatement form guidance) — always human-gated throughout, never automated | Wizard cannot be completed/marked-done without human sign-off at every step |
| REQ-M1-29 | 6.5 | Conversion optimization loop: monthly job compares GBP performance metrics to prior month, flags weakest conversion step, creates a suggested-experiment `Task` | Monthly job creates exactly one experiment suggestion per client per month |
| REQ-M1-30 | 7.1/7.2 | KPI stack + monthly report generator (visibility/engagement/reputation/business results), plain-language summary line auto-generated from the numbers | Report includes the exact plain-language headline pattern ("You got N calls...") computed from real stored data, never a placeholder |

### 6.3 Module 2 — Website & Landing Page Engine (v1 reduced scope — see `00` §4)

| ID | Src | Requirement | AC |
|---|---|---|---|
| REQ-M2-01 | 2.0 | Website-existence decision tree wizard (has site+access / has site no access / no site / closed builder) | Each branch produces a distinct, correct next-task set |
| REQ-M2-02 | 2.1.1/2.1.2 | Technical crawl integration (screaming-frog-class crawler or a lightweight custom crawler using `sitemap.xml` + link-following) producing a prioritized fix list; **every batch of live-site changes requires a restore-point record before execution** | A fix list is generated with severity tags; attempting to execute a fix without a stored restore-point reference is blocked |
| REQ-M2-03 | 2.2.1 | Page matrix builder (`PageMatrixEntry`) with the cannibalization check (no two pages targeting the same primary keyword) | Adding a second page with an identical `primaryKeyword` to an existing page raises a blocking validation |
| REQ-M2-04 | 2.3.2/2.3.3 | Service-page and location-page template renderers requiring all mandated content blocks (location pages: intro, services, real jobs, review excerpts, logistics, FAQs) before a page can be marked "ready to publish" | A location page missing the "real jobs" block cannot transition to `status: ready` |
| REQ-M2-05 | 2.4.1 | Schema (JSON-LD) generator + validator call (Rich Results Test API) before publish | Publish action blocked if schema validation fails |
| REQ-M2-06 | 2.5.1 | Conversion elements (click-to-call, WhatsApp, quote form) wired to tracked events consumed by Module 5 | Submitting a test lead through the quote form produces a `LeadLogEntry` row |
| REQ-M2-07 | 2.6 | Pre-launch checklist gate (title/meta/H1 unique, schema valid, NAP exact, mobile OK, CWV pass, tracking fires) — publish button disabled until all checklist items pass | Checklist items are computed programmatically, not manually checked off by a human clicking checkboxes with no verification behind them |

### 6.4 Module 3 — Citations & Local Authority (v1 reduced scope)

| ID | Src | Requirement | AC |
|---|---|---|---|
| REQ-M3-01 | 3.1.1 | Citation audit: scans for existing mentions (BrightLocal Citation Tracker integration), classifies correct/wrong/duplicate/dead against canonical NAP string | Audit run produces a `CitationRecord` per found listing with a status |
| REQ-M3-02 | 3.1.2 | Tiered citation-building workflow (Tier 1/2/3), each submission logged with credentials reference (not raw credentials) | Submitting a Tier 1 citation updates its `CitationRecord` status and timestamp |
| REQ-M3-03 | 3.2.1 | Link opportunity mining: competitor backlink gap pull (DataForSEO Backlinks API), monthly log; **hard block on any paid-link-scheme integration — no such integration is ever built** | No code path exists that purchases or automates paid link placement |
| REQ-M3-04 | 3.1.3 | Secondary review platform tracking (read-only display of Trustpilot/Facebook review counts, no write automation in v1) | Dashboard shows secondary platform counts; no "respond" button exists for those platforms in v1 |

### 6.5 Module 4 — Content & AI-Visibility Engine (v1 reduced scope)

| ID | Src | Requirement | AC |
|---|---|---|---|
| REQ-M4-01 | 4.1.1 | Content calendar builder from `KeywordMapEntry` informational-intent rows, prioritized by volume × conversion proximity × competition gap × seasonality | Calendar shows ≥1 planned piece per active informational keyword cluster |
| REQ-M4-02 | 4.2.1 | Content production pipeline: brief → LLM draft (using the already-arranged model) → automated fact/compliance check (claims matched against `Client` verified data fields) → human gate for first 5 pieces per client, then 1-in-4 spot check | A draft containing an unverifiable price claim is flagged by the compliance check before it can be queued for human review |
| REQ-M4-03 | 4.3.1/4.3.2 | GEO formatting rules baked into the draft template (direct-answer-first H2s, FAQ schema, tables) + monthly AI-answer monitoring job scripted against public AI surfaces | Monthly job stores a scorecard row per tracked query |
| REQ-M4-04 | 4.4 | Quarterly content maintenance job flags stale price/date references for refresh | Job produces a list of content pieces referencing dates/prices older than the current quarter |

### 6.6 Module 5 — Analytics, Tracking & Reporting

| ID | Src | Requirement | AC |
|---|---|---|---|
| REQ-M5-01 | 5.1.1 | Measurement infrastructure: GA4 event wiring spec (phone_click, whatsapp_click, form_submit, booking_click/complete, direction_click), Search Console pull, GBP Performance pull, unified `LeadLogEntry` | Each event type has at least one integration test firing it end-to-end into `LeadLogEntry` |
| REQ-M5-02 | 5.1.2 | `BaselineSnapshot` capture — write-once, enforced immutable at the DB layer (no UPDATE permission on this table after insert, only INSERT) | Attempting to UPDATE an existing `BaselineSnapshot` row fails at the database permission level, not just the app layer |
| REQ-M5-03 | 5.2.1 | Anomaly detection rules run on a schedule: rank drop >5 positions WoW, unexplained profile edit, review ≤2★, calls down >30% WoW, site 4xx/5xx/schema invalid/CWV fail — each produces an `Alert` with a recommended action | Simulated data triggering each rule produces exactly the corresponding alert type |
| REQ-M5-04 | 5.3.1 | Monthly client report generator (visibility/reputation/work-done/competitor-position/next-month plan) + plain-language headline + PDF/HTML export + optional 3-line WhatsApp summary | Generated report's numbers are traceable back to source rows (no hardcoded/mock figures ever appear) |
| REQ-M5-05 | 5.3.2 | Self-correction loop: 2 consecutive flat/declining months on any KPI auto-generates a diagnosis task following the mandatory diagnosis order (profile intact? → tracking intact? → algorithm update? → competitor surge? → own-work attribution) | Diagnosis task's checklist steps must be completed in the specified order before a "own tactics" corrective action can be proposed |

---

## 7. API Contract Summary (representative — full OpenAPI spec generated from NestJS decorators during Sprint 1)

| Method | Route | Module | Auth |
|---|---|---|---|
| POST | `/api/clients` | Tenant/M6 | Owner, Coordinator |
| GET | `/api/clients/:id/state` | M6 | any agency role |
| POST | `/api/clients/:id/transition` | M6 | Owner, Approver |
| GET | `/api/clients/:id/tasks` | M6 | any agency role |
| POST | `/api/approvals/:id/decide` | M6 | Approver only, not self |
| POST | `/api/clients/:id/gbp/oauth/callback` | M1 | System (OAuth redirect) |
| PUT | `/api/clients/:id/gbp/category` | M1 | Coordinator (creates ApprovalRequest if changing existing) |
| POST | `/api/clients/:id/gbp/posts` | M1 | Coordinator |
| POST | `/api/clients/:id/gbp/reviews/:reviewId/respond` | M1 | Coordinator (blocked if `requiresHumanGate`, then Approver) |
| GET | `/api/clients/:id/geo-grid/latest` | M1 | any agency role, Client portal (own client only) |
| POST | `/api/clients/:id/pages` | M2 | Coordinator |
| POST | `/api/clients/:id/citations/audit` | M3 | Coordinator |
| POST | `/api/clients/:id/content` | M4 | Coordinator |
| GET | `/api/clients/:id/reports/:period` | M5 | any agency role, Client portal (own client only) |
| GET | `/api/build-status` | Meta | Owner only |

---

## 8. UI/UX Requirements

| ID | Requirement |
|---|---|
| REQ-UI-01 | Navigation is a single left sidebar (desktop) / bottom tab bar (mobile) with exactly these top-level sections: Clients, Tasks & Approvals, Reports, Settings. No deeper nesting than 3 levels from any entry point. |
| REQ-UI-02 | Every list view (clients, tasks, citations, content pieces) supports filter + search client-side for <500 rows, server-side pagination beyond that — never an unbounded unpaginated query. |
| REQ-UI-03 | Every human-gated action surfaces the **exact drafted content/values and the reason it needs approval** inline in the approval card — an Approver must never need to click through 3 screens to see what they're approving. |
| REQ-UI-04 | Design tokens: a single Tailwind config (colors, spacing, type scale) shared across agency dashboard and client portal — no second, divergent design system. |
| REQ-UI-05 | Client portal is deliberately minimal: report view, lead log view, any pending approval that requires the client's own input (e.g., verification video coaching) — nothing else. This is the "clean, simple, lightweight" surface non-technical business owners will actually open. |
| REQ-UI-06 | Empty/loading/error states are designed for every data view — no blank white screens, no unhandled promise rejections visible to the user. |

---

## 9. Security Requirements (consolidated)

| ID | Requirement |
|---|---|
| REQ-SEC-01 | Postgres RLS on every tenant-scoped table (§3, §4). |
| REQ-SEC-02 | All secrets encrypted at rest via envelope encryption (KMS-wrapped AES-256-GCM), never logged. |
| REQ-SEC-03 | All external API calls made server-side only; no third-party API key ever ships to the browser bundle. |
| REQ-SEC-04 | CSRF tokens on all state-changing requests; SameSite=Strict session cookies. |
| REQ-SEC-05 | Rate limiting on all public and auth endpoints (login, magic-link request, OAuth callback). |
| REQ-SEC-06 | Dependency scanning (`npm audit` / Dependabot) required in CI; no merge with a known-critical vulnerability unresolved. |
| REQ-SEC-07 | All file uploads (photos) virus/type-validated server-side before storage; storage bucket is private, served via signed URLs only. |
| REQ-SEC-08 | 2FA mandatory for the Owner role and any staff role with `OrgCredential` access (Module 6 Phase 6.6). |

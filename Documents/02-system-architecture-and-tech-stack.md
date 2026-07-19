# System Architecture & Tech Stack
Version 1.0 | July 2026

This document is the authoritative architecture reference. The coding agent must
not deviate from the module boundaries, data model, or security model below
without an explicit instruction to do so in a sprint prompt.

**Scope correction (applies throughout this document):** this is a single
internal system for one agency (yours), not a multi-tenant SaaS sold to other
agencies. There is one fixed `Organization` — no signup flow, no per-agency
billing, no cross-agency isolation to build. What still matters, and is kept
in full below, is **client-level isolation**: each of your clients (Client
entity) gets a hard data boundary from every other client, because clients log
into their own read-only portal and must never see another client's data.
Anywhere below that previously said "tenant" in the multi-agency sense, read
it as "client" — the isolation boundary is `client_id`, not `agency_id`.

## 1. High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Vercel (Next.js App)                        │
│  - Agency dashboard (internal users: coordinators, approvers)       │
│  - Client-facing report portal (read-only, per-client login)        │
│  - Auth.js session layer                                            │
└───────────────┬───────────────────────────────────────────┬─────────┘
                │ REST/JSON over HTTPS (internal API)        │
                ▼                                             ▼
┌─────────────────────────────────┐          ┌──────────────────────────┐
│   NestJS API (Railway/Fly.io)   │◄────────►│  Postgres (Neon/Supabase)│
│  - Module1GbpModule             │  Prisma  │  - Row-Level Security     │
│  - Module2WebsiteModule         │          │  - per-tenant isolation   │
│  - Module3CitationsModule       │          └──────────────────────────┘
│  - Module4ContentModule         │
│  - Module5AnalyticsModule       │          ┌──────────────────────────┐
│  - Module6OrchestrationModule   │◄────────►│  Redis (Upstash)          │
│  - AuthModule / TenantModule    │  BullMQ  │  - Job queues             │
│  - SecretsModule (KMS-backed)   │          │  - Rate-limit counters    │
└───────────────┬──────────────────┘          └──────────────────────────┘
                │ enqueues jobs
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Worker Process (same repo, separate entrypoint)         │
│  BullMQ consumers, one queue per external API + one per module:      │
│  gbp-write-queue, review-ask-queue, post-publish-queue,               │
│  citation-scan-queue, content-publish-queue, report-gen-queue, ...    │
│  Every consumer: idempotency check → external call → read-back verify │
│  → log to change_log → mark done | retry (backoff, max 3) | FAILED    │
└───────────────┬──────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    External Integrations Layer                       │
│  Google Business Profile API (OAuth2, per-client token)               │
│  Google Search Console API / GA4 API (OAuth2, per-client token)       │
│  DataForSEO API (agency-level API key)                                │
│  Local Falcon API (agency-level API key)                              │
│  BrightLocal API (agency-level API key)                               │
│  Meta WhatsApp Cloud API (agency-level, per-client phone number)      │
│  Resend/SendGrid, Twilio SMS, Cloudflare R2, Copyscape-class API      │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Module Boundaries (mirrors the blueprint 1:1)

Each NestJS module below owns its own Prisma schema slice, its own queue
consumers, and its own set of REST endpoints. Cross-module calls happen only
through exported service interfaces — never through direct DB access across
module boundaries. This is enforced by NestJS's module encapsulation and is a
**lint-checked rule** (see `05`).

| Module | Owns | Depends on |
|---|---|---|
| `CoreModule` | Organization (single fixed row), Client, StaffUser, ClientPortalUser, Role | none (foundational) |
| `Module6OrchestrationModule` | Client state machine, Task scheduler, Approval queue, Playbook memory, Credential vault | `CoreModule` |
| `Module1GbpModule` | GBP profile record, categories, services, posts, reviews, photos, geo-grid results, change-log entries | `Module6Orchestration`, `CoreModule` |
| `Module2WebsiteModule` | Page matrix, technical audit findings, schema deployment records | `Module6Orchestration` |
| `Module3CitationsModule` | Citation tracker, link opportunity log | `Module6Orchestration` |
| `Module4ContentModule` | Content calendar, content pieces, AI-visibility scorecard | `Module6Orchestration` |
| `Module5AnalyticsModule` | Lead log, KPI snapshots, baseline snapshot, alerts | `Module1Gbp`, `Module2Website`, all others (read-only aggregation) |
| `SecretsModule` | Encryption/decryption of stored third-party credentials via KMS | none (used by all) |

Note: there is no `AgencyCredential` vs `ClientCredential` split anymore — all
your agency-level tool API keys (DataForSEO, Local Falcon, BrightLocal, Meta
WhatsApp) live in one `OrgCredential` table under the single `Organization`
row; only per-client Google OAuth grants (GBP/GA4/GSC) are `ClientCredential`,
scoped and isolated per client.

## 3. Data Model Overview (entities, not full DDL — full DDL lives in `03` §7)

Core entities and their relationships:

```
Organization (single row) 1───* StaffUser (role: Owner | Coordinator | Approver | Viewer)
Organization 1───* Client
Client 1───* ClientAsset (google_account_ref, domain_ref, ga4_ref, gsc_ref, gbp_location_ref)
Client 1───1 ClientState (state machine: ONBOARDING|BUILD|GROWTH|AT_RISK|PAUSED)
Client 1───* ServiceTaxonomyEntry        (Task 1.1)
Client 1───* KeywordMapEntry             (Task 1.2)
Client 1───* CompetitorBenchmark         (Task 1.3)
Client 1───* ServiceArea                 (Task 1.4)
Client 1───1 GbpProfile
GbpProfile 1───* GbpCategoryAssignment
GbpProfile 1───* GbpServiceItem
GbpProfile 1───* GbpPost
GbpProfile 1───* GbpReview
GbpProfile 1───* GbpPhoto
GbpProfile 1───* GeoGridScanResult
Client 1───* ChangeLogEntry               (every field change, every module)
Client 1───* Task                         (scheduler unit, task_id = "M1-3.1" etc.)
Task 1───* TaskLog
Client 1───* ApprovalRequest              (human-gate queue)
Client 1───* CitationRecord               (Module 3)
Client 1───* ContentPiece                 (Module 4)
Client 1───* LeadLogEntry                 (Module 5)
Client 1───1 BaselineSnapshot             (Module 5, immutable)
Client 1───* MonthlyReport                (Module 5)
Client 1───* ClientCredential             (encrypted, references SecretsModule)
```

## 4. Authentication & Authorization Architecture

### 4.1 Two entirely separate auth systems (do not conflate)

1. **App auth** — Auth.js sessions for your staff (internal team members) and,
   in the client-portal, one read-only login per client. Standard
   email/password or Google OAuth login to *the platform itself*. There is
   only ever one internal team; staff accounts are not scoped to anything
   beyond their role.
2. **GBP delegated auth** — a per-client Google OAuth2 grant (`business.manage`
   scope) that lets the platform call the GBP API *as the client's Google
   account*, per the blueprint's ownership rule ("client is always Primary
   Owner; agency is Manager only"). This token is stored encrypted
   (`ClientCredential`), refreshed automatically, and is never the same
   credential as the app login.

### 4.2 Role-based access control (RBAC)

| Role | Can do |
|---|---|
| Owner | Everything, including approving human-gated actions, managing tool credentials |
| Coordinator | Runs day-to-day tasks, drafts content/posts, cannot approve human-gated actions on their own work |
| Approver | Approves human-gated actions (4-eyes principle: a Coordinator cannot self-approve their own draft) |
| Staff Viewer | Read-only dashboards, no writes |
| Client Portal user | Read-only access to their own `MonthlyReport`, `LeadLogEntry`, `BaselineSnapshot` — scoped by client, cannot see other clients' data even if a URL is guessed (enforced by Postgres RLS, not just app-layer checks) |

### 4.3 Client-level isolation (the isolation boundary that actually matters here)

Every table with client-owned data carries a `client_id` column. Postgres
**Row-Level Security (RLS)** policies enforce
`client_id = current_setting('app.current_client_id')` at the database layer,
so a bug in application code cannot leak one client's data to another — this
is a hard security requirement (`REQ-SEC-01` in `03`). This exists **not**
because the system is multi-tenant SaaS (it isn't — see the correction at the
top of this document), but because your staff will genuinely be working
across many clients' confidential data (pricing, keyword strategy, leads) at
once, and each client's own portal login must be airtight against ever
seeing another client's information.

## 5. Secrets & Credential Handling

- All third-party credentials (client Google OAuth tokens, WhatsApp phone
  registrations, DataForSEO/Local Falcon/BrightLocal agency API keys) are
  encrypted with AES-256-GCM before insertion into Postgres. The data key is
  itself wrapped by a KMS master key (envelope encryption) — the master key
  never leaves the KMS.
- No credential ever appears in application logs, error messages, or the
  `TaskLog`/`ChangeLogEntry` tables — these log **references** ("used
  credential `cred_a1b2`") never raw values.
- `SecretsModule` is the only module permitted to call the KMS decrypt
  operation; every decrypt call is itself logged (who/what task/when) to the
  audit trail table, satisfying blueprint Task 6.6.

## 6. Idempotency, Retries, and Read-Back Verification (Module 6 engineering rules)

These three engineering rules from the blueprint are implemented as **shared
infrastructure**, not per-task boilerplate the coding agent re-derives each time:

1. **Idempotency:** every BullMQ job carries an `idempotency_key` (deterministic
   hash of `client_id + task_id + target_field + target_value`). Before any
   external write, the worker checks a `WriteAttempt` table for a prior
   successful attempt with the same key; if found, it skips the write and
   marks the job done. This is a single shared `IdempotentWriter` service used
   by every module's queue consumer.
2. **Retries:** a shared `withRetry()` wrapper — exponential backoff, max 3
   attempts, then the job moves to a `FAILED` state and raises a Sentry alert
   plus an `Alert` row visible in the dashboard. No queue consumer is allowed
   to implement its own retry loop.
3. **Read-back verification:** after any external write (`updateGbpCategory`,
   `publishPost`, `updateCitation`, etc.), the shared `IdempotentWriter` also
   performs a read of the just-written field and compares it to the intended
   value; mismatch → task stays `NEEDS_VERIFICATION`, not `DONE`. This directly
   implements Appendix D guardrail #12 from the Module 1 blueprint.

## 7. Deployment & Environments

| Environment | Purpose | Notes |
|---|---|---|
| `local` | Developer/agent machine | Docker Compose: Postgres + Redis, seeded with the one permanent internal sandbox client (blueprint Task 6.2 "Dry-run mode ... one permanent internal sandbox client") |
| `staging` | Pre-production, connected to **sandbox/test** credentials for every external API where a sandbox exists (DataForSEO has a Sandbox; Meta has a WhatsApp test number) | Every sprint's code must pass here before `production` |
| `production` | Real client data | Deploys only via CI/CD after the full gate in `05` passes |

## 8. Observability

- **Sentry**: uncaught exceptions, both API and worker processes.
- **Structured logs** (JSON, one log line per significant action) shipped to
  the hosting provider's log viewer — no proprietary log service needed at
  this scale.
- **Health check endpoints**: `/health` (API liveness), `/health/deep` (checks
  DB, Redis, and one read-only call per critical external API — this backs the
  blueprint's Task 6.6 "daily lightweight access-health check per client").

## 9. Explicit Non-Goals for v1 (see `00` §4 and `04` sprint plan)

- No native mobile app (mobile-responsive web only).
- No custom-built vault service (KMS + Postgres encryption instead — documented
  upgrade path noted, not built now).
- No multi-region deployment.
- No support for non-Google review platforms' write APIs beyond logging/display
  (Trustpilot/Facebook reviews are tracked read-only in v1, per Task 3.1.3).


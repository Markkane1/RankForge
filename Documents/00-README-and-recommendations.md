# Agent 1 — Local SEO Delivery Agent
## Build Package: README & Top-Level Recommendations
Version 1.0 | July 2026

This package turns the "Agent 1 — GBP Optimization + Modules 2-6" blueprint into a
buildable software system. It is written for two audiences at once: **you**, making
budget and scope decisions, and **the coding agent** (Gemini 3.5 or equivalent)
that will write the code. Every downstream document assumes the decisions below
are final.

## Document Map

| File | Purpose |
|---|---|
| `00-README-and-recommendations.md` | This file — decisions, tech stack rationale, how to use the package |
| `01-external-dependencies-gates-and-cost-model.md` | Every external tool/API: what gates it, signup lead time, initial cost, monthly recurring cost, at 2 clients and 10 clients scale |
| `02-system-architecture-and-tech-stack.md` | Full technical architecture, data flow, security model |
| `03-software-requirements-specification.md` | The master SRS — functional + non-functional requirements, data model, API contracts, state machines. This is the primary document the coding agent builds from. |
| `04-sprint-plan.md` | Sprint-by-sprint (2-week sprints) build plan mapped to the SRS, with explicit Definition of Done per sprint |
| `05-agent-build-guardrails-and-definition-of-done.md` | Hard rules for the coding agent to prevent partial/broken/insecure builds |

**Build order:** README → Architecture → SRS → Sprint Plan → Guardrails, then hand
`03`, `04`, and `05` to the coding agent together, one sprint at a time. Never hand
over the whole SRS as "build all of this" in one prompt — see `05` for why.

---

## 1. Locked-In Decisions (from your answers)

1. **Deployment model — CORRECTED:** This is an **internal tool for one agency
   (yours)**, not a SaaS product sold to other agencies. There is exactly one
   organization using this system. It manages many **clients** (businesses like
   SparkleClean), and that client-level isolation still matters a great deal —
   each client gets its own portal login and must never see another client's
   data — but there is no concept of onboarding a second, unrelated agency onto
   the platform, no agency-level billing/signup, and no cross-agency tenancy to
   engineer for. This removes an entire layer of complexity from the original
   plan (agency-level Row-Level Security, agency signup flows, per-agency
   credential scoping) while keeping everything that protects your clients from
   each other. See `02` §1/§4 and `03` §3/§4 for what changed.
2. **Tool budget posture:** "Full" — every premium tool named in the blueprint
   (DataForSEO, Local Falcon, BrightLocal, WhatsApp Business API, Ahrefs/Semrush
   backlink data, Screaming Frog-class crawling, Copyscape-class plagiarism
   checking) is in scope and costed. Where a cheaper technical substitute exists
   with no quality loss (e.g., PageSpeed API is free and official — no reason to
   pay for a CWV tool), the substitute is used and the premium tool is marked
   optional in the cost model.
3. **Tech stack:** No preference stated — recommendation below, chosen
   specifically to suit an AI coding agent building this solo, and to match the
   orchestration-heavy, multi-integration nature of the blueprint.

## 2. Recommended Tech Stack (with rationale)

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript**, end-to-end | One language for frontend, backend, and worker processes. Reduces context-switching bugs for a coding agent, and TypeScript's compiler catches missing fields/half-wired integrations before runtime — directly defends against "half-implemented module" risk. |
| Frontend | **Next.js 14+ (App Router)** + **Tailwind CSS** + **shadcn/ui** | Mobile-responsive by default with Tailwind's responsive utilities; shadcn/ui gives clean, accessible, unopinionated components (not a heavy design system) — matches "clean simple UI, lightweight" requirement. Huge amount of Next.js training data means a coding agent makes fewer structural mistakes. |
| Backend / API | **NestJS** (Node.js, TypeScript) | Enforces module boundaries out of the box (`Module1GbpModule`, `Module2WebsiteModule`, etc. — mirrors the blueprint's own M1-M6 structure 1:1). Dependency injection makes it straightforward to mock external APIs in tests, which matters when 15+ third-party APIs are involved. |
| Database | **PostgreSQL** (hosted: Neon or Supabase) | Relational integrity is non-negotiable here — client state machines, task dependencies, approval gates, and financial/audit data must not be eventually-consistent. Postgres row-level security is used for **client-level isolation** — every client of your single agency gets a hard data boundary, in particular for the client-portal logins (Section 4 in `02`). |
| ORM | **Prisma** | Schema-as-code with generated types; a coding agent editing `schema.prisma` gets compile-time errors immediately if a field is missed — again defends against silent partial builds. |
| Job Queue / Scheduler | **BullMQ** on **Redis** (hosted: Upstash) | Implements Module 6's task scheduler (recurring loops, retries with backoff, idempotency keys, priority queues) natively. BullMQ has first-class support for exactly the patterns the blueprint specifies (repeatable jobs, rate-limited queues per external API, dead-letter handling). |
| Background workers | Separate **Node worker process** (same codebase, different entrypoint) | Keeps the scheduler/orchestration engine from Module 6 decoupled from the request/response web tier — required so a stuck GBP API call never blocks the dashboard. |
| Auth (app users) | **Auth.js (NextAuth v5)** with credentials + Google OAuth | Free, self-hosted, no per-seat cost, integrates with Next.js directly. |
| Auth (client Google accounts → GBP API) | **Separate Google OAuth2 flow**, `googleapis` npm package, scope `https://www.googleapis.com/auth/business.manage` | This is functionally distinct from app login — see `03` §4.2. Must never be conflated with Auth.js login. |
| Secrets at rest | **AES-256-GCM field-level encryption** in Postgres, key held in a cloud KMS (AWS KMS or GCP Cloud KMS, whichever matches hosting) | Satisfies the blueprint's hard rule "never store credentials in plaintext" without adding a separate vault service to operate — appropriate for a 1-2 client starting scale; documented upgrade path to HashiCorp Vault / Infisical at scale in `02`. |
| File/photo storage | **Cloudflare R2** (S3-compatible) | Cheapest at this scale, no egress fees, works with any S3 SDK. |
| Hosting — web | **Vercel** | Zero-ops Next.js hosting, generous free tier for 1-2 clients' traffic. |
| Hosting — API + worker | **Railway** or **Fly.io** | Cheap always-on container hosting for the NestJS API and the BullMQ worker (Vercel serverless functions are wrong for long-running queue workers). |
| Error tracking | **Sentry** (free tier) | Non-negotiable for "never see broken modules" — every unhandled error must be visible. |
| Email | **Resend** or **SendGrid** | Transactional email (approval requests, reports). |
| CI/CD | **GitHub Actions** | Free, standard, runs the mandatory test/lint/typecheck gate before any merge (see `05`). |

**Why not Python/Django or a no-code stack:** the blueprint is dominated by
orchestration logic (state machines, schedulers, idempotent external writes,
human-approval gates) rather than data science or ML workloads, so Python's
typical advantages don't apply here; a single TypeScript codebase minimizes the
number of places a coding agent can introduce an integration mismatch between
frontend and backend contracts.

## 3. What "Extremely Aligned With Spec, Nothing Implicit" Means Operationally

The uploaded blueprint already uses explicit task IDs (`M1-3.1`, `M2-2.3.3`, etc.).
The SRS in `03` preserves this ID scheme exactly and adds one requirement (`REQ-`)
per task, so every blueprint task maps to exactly one traceable requirement, which
maps to exactly one sprint deliverable, which maps to exactly one test. This
traceability chain is the mechanism that prevents "half-implemented modules" —
a task cannot be silently dropped without breaking the visible chain.

## 4. Scope Boundary for v1 (Explicit)

Building literally everything in Modules 1-6 in one pass is not realistic for a
solo build. The sprint plan (`04`) sequences delivery so that:
- **v1 (Sprints 1-10, ~20 weeks):** Full Module 6 (orchestration skeleton) + full
  Module 1 (GBP) for one client end-to-end, with hard human gates, using the API
  capability map in blueprint Appendix D (Modules 2-6 doc) so nothing is silently
  faked. Modules 2 (website), 3 (citations), 4 (content), 5 (analytics/reporting)
  are built in reduced-but-real form: no feature is stubbed or mocked in
  production — a feature either exists and works, or its task is explicitly
  marked "Phase 2 backlog" in the UI (visible to the user, never hidden).
- **v2 (Sprints 11+):** Full website engine, full content/GEO engine, full
  citation automation, multi-client scale-testing.

This boundary itself is a requirement (`REQ-SCOPE-01` in `03`) — the coding agent
is instructed to never silently expand or silently shrink scope.

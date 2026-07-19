# Clean Architecture & Monorepo Plan (Reflecting 00-02 Constraints)

// ponytail: We have a major architectural violation. The current repo is a flat Next.js app with `src/app/api`. But Document `02` dictates a hard split: Next.js (Frontend), NestJS (Backend API), and Node (Worker). We must extract and restructure immediately.

## 1. Directory Structure (Turborepo)
To comply with the `02` architecture and ensure clean isolation, we must migrate to a Turborepo monorepo:

```text
/
├── apps/
│   ├── web/                 # Existing Next.js frontend (UI only)
│   ├── api/                 # NEW: NestJS Backend API (Module1GbpModule, etc.)
│   └── worker/              # NEW: Node.js worker process (BullMQ consumers)
├── packages/
│   ├── database/            # Prisma schema (migrated to PostgreSQL) + generated client
│   ├── types/               # Shared TS interfaces and Zod schemas
│   └── config/              # Shared ESLint, TSConfig, Tailwind presets
├── package.json             # Root workspace config
└── turbo.json               # Build pipeline caching
```

## 2. Enforcing "02-System-Architecture" Boundaries

### The Frontend (`apps/web`)
- **Action:** Move all `src/components`, `src/app` (excluding `api/`), and UI logic here.
- **Rule:** The Next.js app **never** talks to Prisma directly. It only calls the NestJS REST API.
- **Current Violation:** `approvals-view.tsx` calls `api/approvals/route.ts` which calls `db.approvalRequest`. This will be ripped out.

### The Backend API (`apps/api` - NestJS)
- **Action:** Create a new NestJS application.
- **Rule:** Implements `CoreModule`, `Module6OrchestrationModule`, `Module1GbpModule`, and `SecretsModule` (KMS encryption).
- **Rule:** Enforces Postgres Row-Level Security (RLS) on every request by setting `app.current_client_id` in a global middleware.
- **Current Violation:** The current Next.js API routes are raw CRUD without RLS or module boundaries.

### The Orchestrator (`apps/worker` - Node + BullMQ)
- **Action:** Create a standalone Node process.
- **Rule:** Implements the `IdempotentWriter` and `withRetry()` wrapper.
- **Rule:** Listens to Redis queues (`gbp-write-queue`, etc.) and performs the actual external API calls (Google, DataForSEO, Local Falcon).
- **Current Violation:** Missing entirely. The current UI Kanban pretends to change states without a real worker.

## 3. Phased Execution Plan

### Phase 1: Infrastructure & DB Migration (Sprint 0)
1. Initialize Turborepo and move the existing Next.js app into `apps/web`.
2. Extract Prisma into `packages/database`, change provider to `postgresql`, and write the raw SQL migrations to enable RLS policies on the `client_id` column.
3. Rip out all `src/app/api/...` routes from the Next.js app.

### Phase 2: The Real Backend (Sprint 0-1)
1. Scaffold `apps/api` (NestJS) and `apps/worker` (BullMQ).
2. Implement the `SecretsModule` (KMS encryption for credentials).
3. Re-implement the Tasks and Approvals REST endpoints in NestJS, this time enforcing the strict State Machine and human-gate validations (resolving the Kanban facade).

### Phase 3: The Integrations (Sprint 2)
1. Implement the Google OAuth2 `business.manage` flow.
2. Build the first BullMQ consumer in `apps/worker` to read from the queue and write to the real Google Business Profile API.

---
## User Review Required

> [!IMPORTANT]
> This plan acknowledges the massive architectural drift (missing NestJS, missing BullMQ, missing Postgres RLS) and proposes a complete Turborepo restructuring to fix it. 
> 
> If you approve this plan, I will immediately begin **Phase 1**: Initializing Turborepo, migrating the Next.js app, and migrating Prisma to PostgreSQL.

# RankForge — Local SEO & GBP Delivery Platform

**Version 1.0** | Single-Agency Multi-Tenant Operating System for Local SEO & Google Business Profile Management

---

## 🌟 Overview

**RankForge** is a purpose-built, single-agency operating platform designed to automate, manage, and scale Local SEO and Google Business Profile (GBP) optimization across multiple client locations. 

Unlike generic multi-agency SaaS products, RankForge is engineered specifically as an internal system for **one agency**, managing dozens to hundreds of clients with strict client-level data isolation (**PostgreSQL Row-Level Security**) and an immutable audit trail.

---

## 🏗️ Monorepo Architecture

RankForge is structured as an end-to-end TypeScript monorepo using **npm workspaces** and **Turborepo**:

```
RankForge/
├── apps/
│   ├── web/               # Next.js 16 (App Router) + Tailwind CSS + Auth.js (Staff & Client Portal)
│   ├── api/               # NestJS REST API (8 Domain Modules, RBAC guards, OpenAPI spec)
│   └── worker/            # Standalone Node.js BullMQ Queue Consumer (Schedulers, PII sweeps)
├── packages/
│   ├── database/          # Prisma ORM (45+ models), PostgreSQL RLS migrations, Client State Machine
│   └── queue/             # Shared BullMQ queue contracts & definitions
├── scripts/               # 28 Automated CI Quality Gate scripts (enforced by `npm run check`)
├── Documents/             # Specification blueprints (00–07), worklogs, and compliance validation reports
└── Caddyfile              # Local/Staging reverse proxy configuration
```

---

## 🌐 What is the `Caddyfile`?

The `Caddyfile` located in the root directory is the configuration for the **Caddy Web Server**, serving as a reverse proxy for local development and staging container environments.

- **Port Routing**: Listens on `:81` and reverse-proxies standard HTTP requests to `localhost:3000` (the Next.js web application).
- **Dynamic Port Transformation**: Supports the `@transform_port_query` matcher (`?XTransformPort=<port>`) to dynamically proxy traffic to microservice dev ports without changing domain configuration.
- **Header Propagation**: Preserves `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Real-IP` headers across proxied requests.

---

## 🔒 Core Security & Guardrails

1. **Client-Level Data Isolation (Postgres RLS)**: Every client-owned table enforces `client_id = current_setting('app.current_client_id')` at the database engine level via migration `20260719000100_complete_client_rls`.
2. **4-Eyes Human Approval Guard**: Sensitive actions (name/category changes, verifications, ≤2★ review responses) create `ApprovalRequest` rows. The database constraint `prevent_self_approval` strictly prevents coordinators from self-approving their own submissions.
3. **Secrets Envelope Encryption**: Third-party credentials (GBP OAuth tokens, Meta WhatsApp keys, DataForSEO keys) are encrypted with **AES-256-GCM** wrapped by **GCP KMS master keys**. Raw credentials are never written to logs.
4. **Zero-Mock Posture**: If an external provider key is unconfigured, system endpoints return explicit `424 Failed Dependency` or `BLOCKED` status codes instead of fabricating fake/synthetic metrics.
5. **Automated PII Deletion**: When a client transitions to `OFFBOARDED`, database triggers and daily worker sweeps scrub lead contact PII (`LeadLogEntry.contactInfo`).

---

## 🧪 Testing & Test Suite Structure

Test suites are categorized into standardized **unit** and **integration** directories:

- **`apps/web/tests/unit/`**: Pure functions, Zod schemas, token encryption, CSRF middleware, OAuth HMAC state signatures, and linters.
- **`apps/web/tests/integration/`**: Multi-step onboarding workflows, client state machine transitions, 14-day freshness alerts, and monthly report PDF rendering.
- **`packages/database/tests/integration/`**: Multi-tenant PostgreSQL Row-Level Security (`rls-isolation.test.ts`).
- **`apps/api/src/modules/`**: NestJS module-level unit and integration specs.

---

## 🛠️ CLI Commands & Workflow

### Development
```bash
# Install all dependencies across workspaces
npm install

# Start all workspaces in parallel (web on :3000, api on :3001, worker)
npm run dev

# Generate Prisma client and push schema changes
npm run db:generate
npm run db:push
```

### Quality Gate Pipeline (CI)
```bash
# Run all 28 automated quality gate scripts, linters, unit tests, and TypeScript builds
npm run check
```

`npm run check` executes 28 distinct verification checks including:
- `check:rls` — Verifies PostgreSQL RLS policy coverage across 31+ tables
- `check:routes` — Enforces `@RequireRole` auth guards on mutating routes
- `check:route-reachability` — Prevents orphaned/unlinked API routes
- `check:worker-tenant` — Ensures worker writes are wrapped in tenant context
- `check:lifecycle` — Enforces client state machine rules
- `check:req-ids` — Verifies source & test evidence for SRS requirement IDs

---

## 📄 Documentation Index

All architectural blueprints and compliance validation reports live in `Documents/`:

- [00-README-and-recommendations.md](file:///d:/web%20temps/Mobeen/RankForge/Documents/00-README-and-recommendations.md) — Architectural principles & locked-in decisions
- [01-external-dependencies-gates-and-cost-model.md](file:///d:/web%20temps/Mobeen/RankForge/Documents/01-external-dependencies-gates-and-cost-model.md) — Tool budgets & dependency hard/soft gates
- [02-system-architecture-and-tech-stack.md](file:///d:/web%20temps/Mobeen/RankForge/Documents/02-system-architecture-and-tech-stack.md) — System boundaries & data model overview
- [03-software-requirements-specification.md](file:///d:/web%20temps/Mobeen/RankForge/Documents/03-software-requirements-specification.md) — Master SRS requirement specifications
- [04-sprint-plan.md](file:///d:/web%20temps/Mobeen/RankForge/Documents/04-sprint-plan.md) — Sprints 0–10 Definitions of Done
- [05-agent-build-guardrails-and-definition-of-done.md](file:///d:/web%20temps/Mobeen/RankForge/Documents/05-agent-build-guardrails-and-definition-of-done.md) — Engineering rules & CI gate mandates
- [06-security-audit-and-hardening.md](file:///d:/web%20temps/Mobeen/RankForge/Documents/06-security-audit-and-hardening.md) — Post-build security audit checklist
- [07-reporting-and-analytics-validation.md](file:///d:/web%20temps/Mobeen/RankForge/Documents/07-reporting-and-analytics-validation.md) — Data lineage & report accuracy validation
- [compliance validation/](file:///d:/web%20temps/Mobeen/RankForge/Documents/compliance%20validation/) — Individual 100% compliance audit reports for each blueprint file

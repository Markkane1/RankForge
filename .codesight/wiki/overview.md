# rankforge — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**rankforge** is a typescript project built with nestjs, next-app, using prisma for data persistence, organized as a monorepo.

**Workspaces:** `api` (`apps\api`), `web` (`apps\web`), `worker` (`apps\worker`), `@rankforge/database` (`packages\database`), `@rankforge/queue` (`packages\queue`)

## Scale

81 API routes · 45 database models · 23 UI components · 82 library files · 13 middleware layers · 31 environment variables

## Subsystems

- **[Auth](./auth.md)** — 12 routes — touches: auth, db, cache, queue, payment
- **[Payments](./payments.md)** — 2 routes — touches: auth, db, payment
- **[Brightlocal.controller](./brightlocal.controller.md)** — 1 routes
- **[Dataforseo.controller](./dataforseo.controller.md)** — 1 routes
- **[Localfalcon.controller](./localfalcon.controller.md)** — 1 routes
- **[Route](./route.md)** — 56 routes — touches: auth, db, upload, queue, ai
- **[Tasks.controller](./tasks.controller.md)** — 1 routes
- **[Use-realtime-events](./use-realtime-events.md)** — 6 routes
- **[Infra](./infra.md)** — 1 routes

**Database:** prisma, 45 models — see [database.md](./database.md)

**UI:** 23 components (react) — see [ui.md](./ui.md)

**Libraries:** 82 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `apps\api\src\modules\security\security.module.ts` — imported by **10** files
- `apps\api\src\modules\security\credentials.service.ts` — imported by **8** files
- `apps\api\src\app.service.ts` — imported by **5** files
- `apps\api\src\modules\gbp\gbp.service.ts` — imported by **5** files
- `apps\api\src\app.controller.ts` — imported by **4** files
- `apps\api\src\app.module.ts` — imported by **4** files

## Required Environment Variables

- `ANALYZE` — `apps\web\next.config.js`
- `CI` — `apps\web\playwright.config.js`
- `EMAIL_FROM` — `apps\web\src\auth.js`
- `EMAIL_SERVER` — `apps\web\src\auth.js`
- `ENCRYPTION_KEY` — `apps\api\src\modules\security\encryption.service.js`
- `FRONTEND_URL` — `apps\api\src\modules\gbp\gbp.controller.js`
- `GCP_KMS_CRYPTOKEY` — `apps\web\src\lib\kms.js`
- `GCP_KMS_KEYRING` — `apps\web\src\lib\kms.js`
- `GCP_KMS_LOCATION` — `apps\web\src\lib\kms.js`
- `GOOGLE_APPLICATION_CREDENTIALS` — `apps\web\src\lib\crypto.js`
- `GOOGLE_CLIENT_ID` — `apps\api\src\modules\gbp\gbp.service.js`
- `GOOGLE_CLIENT_SECRET` — `apps\api\src\modules\gbp\gbp.service.js`
- _...10 more_

---
_Back to [index.md](./index.md) · Generated 2026-07-18_
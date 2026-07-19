# Auth

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Auth subsystem handles **12 routes** and touches: auth, db, cache, queue, payment.

## Routes

- `GET` `/api/gbp/oauth/init` [auth]
  `apps\api\src\modules\gbp\gbp.controller.ts`
- `GET` `/api/gbp/oauth/callback` [auth]
  `apps\api\src\modules\gbp\gbp.controller.ts`
- `PUT` `/api/gbp/oauth/profile/:clientId` params(clientId) [auth]
  `apps\api\src\modules\gbp\gbp.controller.ts`
- `POST` `/api/auth/2fa/disable` → out: { error } [auth, db]
  `apps/web/src/app/api/auth/2fa/disable/route.js`
- `POST` `/api/auth/2fa/setup` → out: { error } [auth, cache, queue]
  `apps/web/src/app/api/auth/2fa/setup/route.js`
- `POST` `/api/auth/2fa/verify` → out: { error } [auth, db, cache, queue]
  `apps/web/src/app/api/auth/2fa/verify/route.js`
- `GET` `/api/auth/google-business/callback` → out: { error } [auth, db]
  `apps/web/src/app/api/auth/google-business/callback/route.js`
- `GET` `/api/auth/google-business` → out: { error } [auth]
  `apps/web/src/app/api/auth/google-business/route.js`
- `GET` `/api/clients/[id]/gbp/oauth/callback` params(id) [auth, db]
  `apps/web/src/app/api/clients/[id]/gbp/oauth/callback/route.js`
- `GET` `/api/clients/[id]/gbp/oauth/start` params(id) [auth]
  `apps/web/src/app/api/clients/[id]/gbp/oauth/start/route.js`
- `GET` `/api/webhooks/google` → out: { error } [auth, queue, payment]
  `apps/web/src/app/api/webhooks/google/route.js`
- `POST` `/api/webhooks/google` → out: { error } [auth, queue, payment]
  `apps/web/src/app/api/webhooks/google/route.js`

## Middleware

- **tenant.middleware** (auth) — `apps\api\src\common\middleware\tenant.middleware.ts`
- **auth** (auth) — `apps\web\src\auth.js`
- **auth** (auth) — `apps\web\src\auth.ts`
- **auth-guard** (auth) — `apps\web\src\lib\auth-guard.js`
- **auth-guard** (auth) — `apps\web\src\lib\auth-guard.ts`
- **middleware** (auth) — `apps\web\src\middleware.js`
- **middleware** (auth) — `apps\web\src\middleware.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `apps\api\src\modules\gbp\gbp.controller.ts`
- `apps/web/src/app/api/auth/2fa/disable/route.js`
- `apps/web/src/app/api/auth/2fa/setup/route.js`
- `apps/web/src/app/api/auth/2fa/verify/route.js`
- `apps/web/src/app/api/auth/google-business/callback/route.js`
- `apps/web/src/app/api/auth/google-business/route.js`
- `apps/web/src/app/api/clients/[id]/gbp/oauth/callback/route.js`
- `apps/web/src/app/api/clients/[id]/gbp/oauth/start/route.js`
- `apps/web/src/app/api/webhooks/google/route.js`

---
_Back to [overview.md](./overview.md)_
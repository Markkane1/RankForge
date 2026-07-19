# Payments

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Payments subsystem handles **2 routes** and touches: auth, db, payment.

## Routes

- `GET` `/api/webhooks/meta` → out: { error } [auth, db, payment]
  `apps/web/src/app/api/webhooks/meta/route.js`
- `POST` `/api/webhooks/meta` → out: { error } [auth, db, payment]
  `apps/web/src/app/api/webhooks/meta/route.js`

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/web/src/app/api/webhooks/meta/route.js`

---
_Back to [overview.md](./overview.md)_
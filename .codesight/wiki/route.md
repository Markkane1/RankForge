# Route

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Route subsystem handles **56 routes** and touches: auth, db, queue, ai, email.

## Routes

- `GET` `/api/approvals` → out: { error } [auth, db]
  `apps/web/src/app/api/approvals/route.js`
- `POST` `/api/approvals` → out: { error } [auth, db]
  `apps/web/src/app/api/approvals/route.js`
- `POST` `/api/approvals/[id]/approve` params(id) → out: { error } [auth, db]
  `apps/web/src/app/api/approvals/[id]/approve/route.js`
- `POST` `/api/approvals/[id]/reject` params(id) → out: { error } [auth, db]
  `apps/web/src/app/api/approvals/[id]/reject/route.js`
- `GET` `/api/build-status` → out: { counts, sprints } [auth, db]
  `apps/web/src/app/api/build-status/route.js`
- `PUT` `/api/build-status/[reqId]` params(reqId) → out: { error, ") } [auth, db]
  `apps/web/src/app/api/build-status/[reqId]/route.js`
- `GET` `/api/clients` → out: { error } [auth, db]
  `apps/web/src/app/api/clients/route.js`
- `POST` `/api/clients` → out: { error } [auth, db]
  `apps/web/src/app/api/clients/route.js`
- `GET` `/api/clients/[id]/audit-trail` params(id) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/audit-trail/route.js`
- `POST` `/api/clients/[id]/competitors` params(id) → out: { error } [auth]
  `apps/web/src/app/api/clients/[id]/competitors/route.js`
- `POST` `/api/clients/[id]/gbp` params(id) → out: { error } [auth]
  `apps/web/src/app/api/clients/[id]/gbp/route.js`
- `GET` `/api/clients/[id]/gbp/[gbpId]/faqs` params(id, gbpId) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/faqs/route.ts`
- `POST` `/api/clients/[id]/gbp/[gbpId]/faqs` params(id, gbpId) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/faqs/route.ts`
- `GET` `/api/clients/[id]/gbp/[gbpId]/photos` params(id, gbpId) → out: { error } [auth, db, upload]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/photos/route.js`
- `POST` `/api/clients/[id]/gbp/[gbpId]/photos` params(id, gbpId) → out: { error } [auth, db, upload]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/photos/route.js`
- `GET` `/api/clients/[id]/gbp/[gbpId]/posts` params(id, gbpId) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/posts/route.js`
- `GET` `/api/clients/[id]/gbp/[gbpId]/products` params(id, gbpId) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/products/route.js`
- `POST` `/api/clients/[id]/gbp/[gbpId]/products` params(id, gbpId) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/products/route.js`
- `GET` `/api/clients/[id]/gbp/[gbpId]` params(id, gbpId) → out: { error } [auth, db, queue]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/route.js`
- `PATCH` `/api/clients/[id]/gbp/[gbpId]` params(id, gbpId) → out: { error } [auth, db, queue]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/route.js`
- `GET` `/api/clients/[id]/gbp/[gbpId]/services` params(id, gbpId) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/services/route.js`
- `POST` `/api/clients/[id]/gbp/[gbpId]/services` params(id, gbpId) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/services/route.js`
- `GET` `/api/clients/[id]/gbp/[gbpId]/verification` params(id, gbpId) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/verification/route.js`
- `POST` `/api/clients/[id]/gbp/[gbpId]/verification` params(id, gbpId) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/verification/route.js`
- `POST` `/api/clients/[id]/keywords` params(id) → out: { error, details } [auth, db]
  `apps/web/src/app/api/clients/[id]/keywords/route.js`
- `PATCH` `/api/clients/[id]/keywords` params(id) → out: { error, details } [auth, db]
  `apps/web/src/app/api/clients/[id]/keywords/route.js`
- `PUT` `/api/clients/[id]/notes` params(id) → out: { error, details } [auth, db]
  `apps/web/src/app/api/clients/[id]/notes/route.js`
- `POST` `/api/clients/[id]/posts/generate` params(id) → out: { error } [auth, ai]
  `apps/web/src/app/api/clients/[id]/posts/generate/route.js`
- `POST` `/api/clients/[id]/reviews/invite` params(id) → out: { error } [auth]
  `apps/web/src/app/api/clients/[id]/reviews/invite/route.ts`
- `GET` `/api/clients/[id]` params(id) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/route.js`
- `PATCH` `/api/clients/[id]` params(id) → out: { error } [auth, db]
  `apps/web/src/app/api/clients/[id]/route.js`
- `PUT` `/api/clients/[id]/state` params(id) → out: { error, details } [auth, db]
  `apps/web/src/app/api/clients/[id]/state/route.js`
- `GET` `/api/dashboard` → out: { error } [auth, db]
  `apps/web/src/app/api/dashboard/route.js`
- `GET` `/api/export/clients` [auth, db]
  `apps/web/src/app/api/export/clients/route.js`
- `GET` `/api/export/tasks` [auth, db]
  `apps/web/src/app/api/export/tasks/route.js`
- `GET` `/api/gbp/categories` → out: { error } [auth, db]
  `apps/web/src/app/api/gbp/categories/route.js`
- `POST` `/api/import/clients` → out: { error } [auth, db, upload]
  `apps/web/src/app/api/import/clients/route.js`
- `POST` `/api/import/tasks` → out: { error } [auth, db, upload]
  `apps/web/src/app/api/import/tasks/route.js`
- `GET` `/api/leads` → out: { error } [auth, db]
  `apps/web/src/app/api/leads/route.js`
- `POST` `/api/leads` → out: { error } [auth, db]
  `apps/web/src/app/api/leads/route.js`
- `GET` `/api/notifications` → out: { error } [auth, db]
  `apps/web/src/app/api/notifications/route.js`
- `POST` `/api/notifications` → out: { error } [auth, db]
  `apps/web/src/app/api/notifications/route.js`
- `PATCH` `/api/notifications` → out: { error } [auth, db]
  `apps/web/src/app/api/notifications/route.js`
- `DELETE` `/api/notifications/[id]` params(id) → out: { error } [auth, db]
  `apps/web/src/app/api/notifications/[id]/route.js`
- `GET` `/api/reports/monthly` → out: { error } [auth, db]
  `apps/web/src/app/api/reports/monthly/route.js`
- `GET` `/api` → out: { message, world!" }
  `apps/web/src/app/api/route.js`
- `GET` `/api/settings/integrations` → out: { error } [auth, email]
  `apps/web/src/app/api/settings/integrations/route.js`
- `GET` `/api/settings` → out: { error } [auth, db]
  `apps/web/src/app/api/settings/route.js`
- `GET` `/api/tasks` → out: { error } [db]
  `apps/web/src/app/api/tasks/route.js`
- `POST` `/api/tasks` → out: { error } [db]
  `apps/web/src/app/api/tasks/route.js`
- `GET` `/api/tasks/[id]` params(id) → out: { error }
  `apps/web/src/app/api/tasks/[id]/route.js`
- `PUT` `/api/tasks/[id]/status` params(id) → out: { error } [queue]
  `apps/web/src/app/api/tasks/[id]/status/route.js`
- `PATCH` `/api/tasks/[id]/subtasks/reorder` params(id) → out: { error } [db]
  `apps/web/src/app/api/tasks/[id]/subtasks/reorder/route.js`
- `POST` `/api/tasks/[id]/subtasks` params(id) → out: { error } [db]
  `apps/web/src/app/api/tasks/[id]/subtasks/route.js`
- `PATCH` `/api/tasks/[id]/subtasks/[subtaskId]` params(id, subtaskId) → out: { error } [db]
  `apps/web/src/app/api/tasks/[id]/subtasks/[subtaskId]/route.js`
- `DELETE` `/api/tasks/[id]/subtasks/[subtaskId]` params(id, subtaskId) → out: { error } [db]
  `apps/web/src/app/api/tasks/[id]/subtasks/[subtaskId]/route.js`

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/web/src/app/api/approvals/route.js`
- `apps/web/src/app/api/approvals/[id]/approve/route.js`
- `apps/web/src/app/api/approvals/[id]/reject/route.js`
- `apps/web/src/app/api/build-status/route.js`
- `apps/web/src/app/api/build-status/[reqId]/route.js`
- `apps/web/src/app/api/clients/route.js`
- `apps/web/src/app/api/clients/[id]/audit-trail/route.js`
- `apps/web/src/app/api/clients/[id]/competitors/route.js`
- `apps/web/src/app/api/clients/[id]/gbp/route.js`
- `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/faqs/route.ts`
- `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/photos/route.js`
- `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/posts/route.js`
- `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/products/route.js`
- `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/route.js`
- `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/services/route.js`
- `apps/web/src/app/api/clients/[id]/gbp/[gbpId]/verification/route.js`
- `apps/web/src/app/api/clients/[id]/keywords/route.js`
- `apps/web/src/app/api/clients/[id]/notes/route.js`
- `apps/web/src/app/api/clients/[id]/posts/generate/route.js`
- `apps/web/src/app/api/clients/[id]/reviews/invite/route.ts`
- `apps/web/src/app/api/clients/[id]/route.js`
- `apps/web/src/app/api/clients/[id]/state/route.js`
- `apps/web/src/app/api/dashboard/route.js`
- `apps/web/src/app/api/export/clients/route.js`
- `apps/web/src/app/api/export/tasks/route.js`
- `apps/web/src/app/api/gbp/categories/route.js`
- `apps/web/src/app/api/import/clients/route.js`
- `apps/web/src/app/api/import/tasks/route.js`
- `apps/web/src/app/api/leads/route.js`
- `apps/web/src/app/api/notifications/route.js`
- `apps/web/src/app/api/notifications/[id]/route.js`
- `apps/web/src/app/api/reports/monthly/route.js`
- `apps/web/src/app/api/route.js`
- `apps/web/src/app/api/settings/integrations/route.js`
- `apps/web/src/app/api/settings/route.js`
- `apps/web/src/app/api/tasks/route.js`
- `apps/web/src/app/api/tasks/[id]/route.js`
- `apps/web/src/app/api/tasks/[id]/status/route.js`
- `apps/web/src/app/api/tasks/[id]/subtasks/reorder/route.js`
- `apps/web/src/app/api/tasks/[id]/subtasks/route.js`
- `apps/web/src/app/api/tasks/[id]/subtasks/[subtaskId]/route.js`

---
_Back to [overview.md](./overview.md)_
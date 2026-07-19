# Routes

## CRUD Resources

- **`/api/notifications`** GET | POST | PATCH/:id → Notification

## Other Routes

### nestjs

- `GET` `/` params() ✓
- `GET` `/api/brightlocal/citations` params()
- `GET` `/api/dataforseo/keywords` params()
- `GET` `/api/gbp/oauth/init` params() [auth]
- `GET` `/api/gbp/oauth/callback` params() [auth]
- `PUT` `/api/gbp/oauth/profile/:clientId` params(clientId) [auth]
- `POST` `/api/localfalcon/scan` params()
- `POST` `/api/tasks/dispatch` params()

### next-app

- `GET` `/api/approvals` → out: { error } [auth, db]
- `POST` `/api/approvals` → out: { error } [auth, db]
- `POST` `/api/approvals/[id]/approve` params(id) → out: { error } [auth, db]
- `POST` `/api/approvals/[id]/reject` params(id) → out: { error } [auth, db]
- `POST` `/api/auth/2fa/disable` → out: { error } [auth, db]
- `POST` `/api/auth/2fa/setup` → out: { error } [auth, cache, queue]
- `POST` `/api/auth/2fa/verify` → out: { error } [auth, db, cache, queue]
- `GET` `/api/auth/google-business/callback` → out: { error } [auth, db]
- `GET` `/api/auth/google-business` → out: { error } [auth]
- `GET` `/api/build-status` → out: { counts, sprints } [auth, db]
- `PUT` `/api/build-status/[reqId]` params(reqId) → out: { error, ") } [auth, db]
- `GET` `/api/clients` → out: { error } [auth, db]
- `POST` `/api/clients` → out: { error } [auth, db]
- `GET` `/api/clients/[id]/audit-trail` params(id) → out: { error } [auth, db]
- `POST` `/api/clients/[id]/competitors` params(id) → out: { error } [auth]
- `GET` `/api/clients/[id]/gbp/oauth/callback` params(id) [auth, db]
- `GET` `/api/clients/[id]/gbp/oauth/start` params(id) [auth]
- `POST` `/api/clients/[id]/gbp` params(id) → out: { error } [auth]
- `GET` `/api/clients/[id]/gbp/[gbpId]/faqs` params(id, gbpId) → out: { error } [auth, db]
- `POST` `/api/clients/[id]/gbp/[gbpId]/faqs` params(id, gbpId) → out: { error } [auth, db]
- `GET` `/api/clients/[id]/gbp/[gbpId]/photos` params(id, gbpId) → out: { error } [auth, db, upload]
- `POST` `/api/clients/[id]/gbp/[gbpId]/photos` params(id, gbpId) → out: { error } [auth, db, upload]
- `GET` `/api/clients/[id]/gbp/[gbpId]/posts` params(id, gbpId) → out: { error } [auth, db]
- `GET` `/api/clients/[id]/gbp/[gbpId]/products` params(id, gbpId) → out: { error } [auth, db]
- `POST` `/api/clients/[id]/gbp/[gbpId]/products` params(id, gbpId) → out: { error } [auth, db]
- `GET` `/api/clients/[id]/gbp/[gbpId]` params(id, gbpId) → out: { error } [auth, db, queue]
- `PATCH` `/api/clients/[id]/gbp/[gbpId]` params(id, gbpId) → out: { error } [auth, db, queue]
- `GET` `/api/clients/[id]/gbp/[gbpId]/services` params(id, gbpId) → out: { error } [auth, db]
- `POST` `/api/clients/[id]/gbp/[gbpId]/services` params(id, gbpId) → out: { error } [auth, db]
- `GET` `/api/clients/[id]/gbp/[gbpId]/verification` params(id, gbpId) → out: { error } [auth, db]
- `POST` `/api/clients/[id]/gbp/[gbpId]/verification` params(id, gbpId) → out: { error } [auth, db]
- `POST` `/api/clients/[id]/keywords` params(id) → out: { error, details } [auth, db]
- `PATCH` `/api/clients/[id]/keywords` params(id) → out: { error, details } [auth, db]
- `PUT` `/api/clients/[id]/notes` params(id) → out: { error, details } [auth, db]
- `POST` `/api/clients/[id]/posts/generate` params(id) → out: { error } [auth, ai]
- `POST` `/api/clients/[id]/reviews/invite` params(id) → out: { error } [auth]
- `GET` `/api/clients/[id]` params(id) → out: { error } [auth, db]
- `PATCH` `/api/clients/[id]` params(id) → out: { error } [auth, db]
- `PUT` `/api/clients/[id]/state` params(id) → out: { error, details } [auth, db]
- `GET` `/api/dashboard` → out: { error } [auth, db]
- `GET` `/api/export/clients` [auth, db]
- `GET` `/api/export/tasks` [auth, db]
- `GET` `/api/gbp/categories` → out: { error } [auth, db]
- `POST` `/api/import/clients` → out: { error } [auth, db, upload]
- `POST` `/api/import/tasks` → out: { error } [auth, db, upload]
- `GET` `/api/leads` → out: { error } [auth, db]
- `POST` `/api/leads` → out: { error } [auth, db]
- `DELETE` `/api/notifications/[id]` params(id) → out: { error } [auth, db]
- `GET` `/api/reports/monthly` → out: { error } [auth, db]
- `GET` `/api` → out: { message, world!" }
- `GET` `/api/settings/integrations` → out: { error } [auth, email]
- `GET` `/api/settings` → out: { error } [auth, db]
- `GET` `/api/tasks` → out: { error } [db]
- `POST` `/api/tasks` → out: { error } [db]
- `GET` `/api/tasks/[id]` params(id) → out: { error }
- `PUT` `/api/tasks/[id]/status` params(id) → out: { error } [queue]
- `PATCH` `/api/tasks/[id]/subtasks/reorder` params(id) → out: { error } [db]
- `POST` `/api/tasks/[id]/subtasks` params(id) → out: { error } [db]
- `PATCH` `/api/tasks/[id]/subtasks/[subtaskId]` params(id, subtaskId) → out: { error } [db]
- `DELETE` `/api/tasks/[id]/subtasks/[subtaskId]` params(id, subtaskId) → out: { error } [db]
- `GET` `/api/webhooks/google` → out: { error } [auth, queue, payment]
- `POST` `/api/webhooks/google` → out: { error } [auth, queue, payment]
- `GET` `/api/webhooks/meta` → out: { error } [auth, db, payment]
- `POST` `/api/webhooks/meta` → out: { error } [auth, db, payment]

## WebSocket Events

- `WS` `task-updated` — `apps/web/src/lib/use-realtime-events.js`
- `WS` `approval-updated` — `apps/web/src/lib/use-realtime-events.js`
- `WS` `notification` — `apps/web/src/lib/use-realtime-events.js`
- `WS` `task-updated` — `apps/web/src/lib/use-realtime-events.ts`
- `WS` `approval-updated` — `apps/web/src/lib/use-realtime-events.ts`
- `WS` `notification` — `apps/web/src/lib/use-realtime-events.ts`

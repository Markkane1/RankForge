# Events & Queues

## bullmq

- `UpdateTaskStatus` [queue] — `apps/web/src/app/api/tasks/[id]/status/route.js`
- `GoogleWebhookEvent` [queue] — `apps/web/src/app/api/webhooks/google/route.js`
- `MetaWebhookEvent` [queue] — `apps/web/src/app/api/webhooks/meta/route.ts`
- `DailyHealthCheck` [queue] — `apps/worker/src/schedulers.js`
- `WeeklyRankUpdate` [queue] — `apps/worker/src/schedulers.js`
- `QuarterlyCategorySync` [queue] — `apps/worker/src/schedulers.js`
- `MonthlyPostGenerator` [queue] — `apps/worker/src/schedulers.js`
- `FaqVisibilityMonitor` [queue] — `apps/worker/src/schedulers.ts`

## eventemitter

- `join-room` [event] — `apps/web/src/lib/realtime.js`
- `leave-room` [event] — `apps/web/src/lib/realtime.js`
- `task-updated` [event] — `apps/web/src/lib/realtime.js`
- `approval-updated` [event] — `apps/web/src/lib/realtime.js`

# rankforge — AI Context Map

> **Stack:** nestjs, next-app | prisma | react | typescript
> **Monorepo:** api, web, worker, @rankforge/database, @rankforge/queue

> 75 routes (6 inferred) + 6 ws | 45 models | 23 components | 82 lib files | 31 env vars | 13 middleware | 12 events | 5% test coverage
> **Token savings:** this file is ~10,700 tokens. Without it, AI exploration would cost ~101,500 tokens. **Saves ~90,700 tokens per conversation.**
> **Last scanned:** 2026-07-18 10:37 — re-run after significant changes

---

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

---

# Schema

### Organization
- id: String (pk, default)
- name: String
- slug: String (unique)
- domain: String (nullable)
- _relations_: staffUsers: StaffUser[], clients: Client[], credentials: OrgCredential[]

### StaffUser
- id: String (pk, default)
- email: String (unique)
- name: String
- passwordHash: String (default)
- role: StaffRole (default)
- avatarUrl: String (nullable)
- isActive: Boolean (default)
- lastLoginAt: DateTime (nullable)
- twoFactorEnabled: Boolean (default)
- twoFactorSecret: String (nullable)
- twoFactorBackupHash: String (nullable)
- organizationId: String (fk)
- _relations_: organization: Organization, assignedTasks: Task[], requestedTasks: Task[], requestedApprovals: ApprovalRequest[], approvedApprovals: ApprovalRequest[], notifications: Notification[], accounts: Account[], sessions: Session[]

### Client
- id: String (pk, default)
- name: String
- slug: String (unique)
- businessName: String (nullable)
- phone: String (nullable)
- email: String (nullable)
- website: String (nullable)
- address: String (nullable)
- city: String (nullable)
- state: String (nullable)
- country: String (default)
- postalCode: String (nullable)
- type: ClientType (default)
- lifecycleState: ClientState (default)
- notes: String (nullable)
- isActive: Boolean (default)
- organizationId: String (fk)
- baseline: BaselineSnapshot (nullable)
- _relations_: organization: Organization, gbpProfiles: GbpProfile[], assets: ClientAsset[], tasks: Task[], approvals: ApprovalRequest[], changeLog: ChangeLogEntry[], leads: LeadLogEntry[], reports: MonthlyReport[], keywords: KeywordMapEntry[], competitors: CompetitorBenchmark[], serviceAreas: ServiceArea[], credentials: ClientCredential[], portalUsers: ClientPortalUser[], writeAttempts: WriteAttempt[], preferences: ClientPreference[]

### GbpProfile
- id: String (pk, default)
- clientId: String (fk)
- gbpAccountId: String (nullable, fk)
- gbpLocationId: String (nullable, fk)
- gbpLocationName: String (nullable)
- primaryCategory: String (nullable)
- secondaryCategories: String (nullable)
- description: String (nullable)
- websiteUrl: String (nullable)
- bookingUrl: String (nullable)
- bookingUrlOverrideNote: String (nullable)
- phone: String (nullable)
- address: String (nullable)
- isVerified: Boolean (default)
- isSuspended: Boolean (default)
- lastSyncedAt: DateTime (nullable)
- _relations_: client: Client, posts: GbpPost[], reviews: GbpReview[], photos: GbpPhoto[], services: GbpService[], products: GbpProduct[], faqs: GbpFaq[]

### GbpFaq
- id: String (pk, default)
- gbpProfileId: String (fk)
- question: String
- answer: String
- lastTestedAt: DateTime (nullable)
- passCount: Int (default)
- failCount: Int (default)
- _relations_: gbpProfile: GbpProfile

### GbpCategory
- id: String (pk, default)
- name: String (unique)
- group: String (nullable)

### GbpProduct
- id: String (pk, default)
- gbpProfileId: String (fk)
- name: String
- description: String (nullable)
- price: Float (nullable)
- category: String (nullable)
- url: String (nullable)
- isUrlValid: Boolean (default)
- _relations_: gbpProfile: GbpProfile

### GbpPost
- id: String (pk, default)
- gbpProfileId: String (fk)
- title: String
- content: String
- ctaButton: String (nullable)
- ctaUrl: String (nullable)
- eventType: String (nullable)
- startDate: DateTime (nullable)
- endDate: DateTime (nullable)
- status: String (default)
- publishedAt: DateTime (nullable)
- _relations_: gbpProfile: GbpProfile

### GbpReview
- id: String (pk, default)
- gbpProfileId: String (fk)
- reviewerName: String (nullable)
- rating: Int
- content: String (nullable)
- reviewDate: DateTime (nullable)
- replyText: String (nullable)
- repliedAt: DateTime (nullable)
- source: String (default)
- _relations_: gbpProfile: GbpProfile

### GbpPhoto
- id: String (pk, default)
- gbpProfileId: String (fk)
- url: String
- category: String (nullable)
- description: String (nullable)
- uploadedAt: DateTime (nullable)
- _relations_: gbpProfile: GbpProfile

### GbpService
- id: String (pk, default)
- gbpProfileId: String (fk)
- name: String
- description: String (nullable)
- price: Float (nullable)
- isPriceConfirmed: Boolean (default)
- _relations_: gbpProfile: GbpProfile

### ClientAsset
- id: String (pk, default)
- clientId: String (fk)
- assetType: String
- externalId: String (nullable, fk)
- label: String (nullable)
- metadata: String (nullable)
- isVerified: Boolean (default)
- connectedAt: DateTime (nullable)
- _relations_: client: Client

### KeywordMapEntry
- id: String (pk, default)
- clientId: String (fk)
- keyword: String
- searchVolume: Int (nullable)
- difficulty: Float (nullable)
- intent: String (nullable)
- mapPack: Boolean (default)
- currentRank: Int (nullable)
- targetRank: Int (nullable)
- priority: Int (default)
- status: String (default)
- _relations_: client: Client

### CompetitorBenchmark
- id: String (pk, default)
- clientId: String (fk)
- competitorName: String
- competitorGbpId: String (nullable, fk)
- competitorUrl: String (nullable)
- categories: String (nullable)
- avgRating: Float (nullable)
- reviewCount: Int (nullable)
- photoCount: Int (nullable)
- postFrequency: String (nullable)
- strengths: String (nullable)
- weaknesses: String (nullable)
- analyzedAt: DateTime (default)
- _relations_: client: Client

### ServiceArea
- id: String (pk, default)
- clientId: String (fk)
- name: String
- city: String (nullable)
- radiusMiles: Float (nullable)
- isPrimary: Boolean (default)
- _relations_: client: Client

### Task
- id: String (pk, default)
- taskId: String (fk)
- clientId: String (nullable, fk)
- title: String
- description: String (nullable)
- module: String
- sprint: Int (nullable)
- priority: TaskPriority (default)
- status: TaskStatus (default)
- assignedToId: String (nullable, fk)
- requestedById: String (nullable, fk)
- scheduledFor: DateTime (nullable)
- startedAt: DateTime (nullable)
- completedAt: DateTime (nullable)
- dueDate: DateTime (nullable)
- result: String (nullable)
- errorMessage: String (nullable)
- retryCount: Int (default)
- maxRetries: Int (default)
- idempotencyKey: String (unique, nullable)
- isDryRun: Boolean (default)
- _relations_: client: Client?, assignedTo: StaffUser?, requestedBy: StaffUser?, subtasks: Subtask[], logs: TaskLog[], approvals: ApprovalRequest[]

### Subtask
- id: String (pk, default)
- taskId: String (fk)
- title: String
- isCompleted: Boolean (default)
- sortOrder: Int (default)
- _relations_: task: Task

### TaskLog
- id: String (pk, default)
- taskId: String (fk)
- level: String (default)
- message: String
- metadata: String (nullable)
- _relations_: task: Task

### ApprovalRequest
- id: String (pk, default)
- clientId: String (nullable, fk)
- taskId: String (nullable, fk)
- title: String
- description: String
- requestType: String
- requestData: String (nullable)
- status: ApprovalStatus (default)
- requestedById: String (fk)
- approvedById: String (nullable, fk)
- rejectedReason: String (nullable)
- reviewedAt: DateTime (nullable)
- expiresAt: DateTime (nullable)
- _relations_: client: Client?, task: Task?, requestedBy: StaffUser, approvedBy: StaffUser?

### ChangeLogEntry
- id: String (pk, default)
- clientId: String (fk)
- module: String
- entityType: String
- entityId: String (nullable, fk)
- field: String (nullable)
- oldValue: String (nullable)
- newValue: String (nullable)
- changedById: String (nullable, fk)
- taskId: String (nullable, fk)
- _relations_: client: Client

### BuildRequirement
- id: String (pk, default)
- reqId: String (unique, fk)
- title: String
- description: String (nullable)
- module: String
- sprint: Int (nullable)
- status: ReqStatus (default)
- blockedBy: String (nullable)
- note: String (nullable)

### LeadLogEntry
- id: String (pk, default)
- clientId: String (fk)
- source: LeadSource
- value: Float (nullable)
- contactInfo: String (nullable)
- notes: String (nullable)
- convertedAt: DateTime (nullable)
- _relations_: client: Client

### MonthlyReport
- id: String (pk, default)
- clientId: String (fk)
- month: Int
- year: Int
- headline: String (nullable)
- kpisJson: String (nullable)
- generatedAt: DateTime (default)
- _relations_: client: Client

### OrgCredential
- id: String (pk, default)
- organizationId: String (fk)
- service: String
- label: String (nullable)
- encryptedKey: String
- keyId: String (nullable, fk)
- isValid: Boolean (default)
- lastCheckedAt: DateTime (nullable)
- _relations_: organization: Organization

### Account
- id: String (pk, default)
- userId: String (fk)
- type: String
- provider: String
- providerAccountId: String (fk)
- refresh_token: String (nullable)
- access_token: String (nullable)
- expires_at: Int (nullable)
- token_type: String (nullable)
- scope: String (nullable)
- id_token: String (nullable)
- session_state: String (nullable)
- _relations_: user: StaffUser

### Session
- id: String (pk, default)
- sessionToken: String (unique)
- userId: String (fk)
- expires: DateTime
- _relations_: user: StaffUser

### ClientCredential
- id: String (pk, default)
- clientId: String (fk)
- service: String
- encryptedToken: String
- refreshToken: String (nullable)
- tokenExpiryAt: DateTime (nullable)
- scope: String (nullable)
- isValid: Boolean (default)
- _relations_: client: Client

### Notification
- id: String (pk, default)
- userId: String (fk)
- type: String
- title: String
- message: String
- isRead: Boolean (default)
- relatedEntityId: String (nullable, fk)
- relatedEntityType: String (nullable)
- _relations_: user: StaffUser

### VerificationToken
- identifier: String
- token: String (unique)
- expires: DateTime

### BaselineSnapshot
- id: String (pk, default)
- clientId: String (unique, fk)
- metricsJson: String
- capturedAt: DateTime (default)
- _relations_: client: Client

### ClientPortalUser
- id: String (pk, default)
- email: String (unique)
- name: String (nullable)
- clientId: String (fk)
- isActive: Boolean (default)
- lastLoginAt: DateTime (nullable)
- _relations_: client: Client

### WriteAttempt
- id: String (pk, default)
- idempotencyKey: String (unique)
- jobId: String (nullable, fk)
- action: String
- status: AttemptStatus (default)
- payload: String (nullable)
- result: String (nullable)
- clientId: String (nullable, fk)
- _relations_: client: Client?

### CapabilityMapping
- id: String (pk, default)
- capability: String (unique)
- primaryRoute: ExecutionRoute (default)
- fallbackRoute: ExecutionRoute (nullable)
- requiresApproval: Boolean (default)
- description: String (nullable)

### ClientPreference
- id: String (pk, default)
- clientId: String (fk)
- tag: String (nullable)
- content: String
- isActive: Boolean (default)
- _relations_: client: Client

### PlaybookTelemetry
- id: String (pk, default)
- tacticName: String
- industryNiche: String (nullable)
- successScore: Float (nullable)
- anonymizedData: String (nullable)

### enum StaffRole: OWNER | COORDINATOR | APPROVER | VIEWER

### enum ClientState: ONBOARDING | BUILD | GROWTH | AT_RISK | PAUSED

### enum ClientType: SERVICE_AREA_BUSINESS | STOREFRONT_BUSINESS

### enum TaskStatus: NOT_STARTED | IN_PROGRESS | PENDING_APPROVAL | DONE | FAILED | BLOCKED | DEFERRED

### enum TaskPriority: CRITICAL | HIGH | MEDIUM | LOW

### enum ApprovalStatus: PENDING | APPROVED | REJECTED | CANCELLED

### enum ReqStatus: NOT_STARTED | IN_PROGRESS | DONE | BLOCKED | DEFERRED

### enum LeadSource: GBP_CALL | GBP_DIRECTIONS | GBP_WEBSITE | FORM_SUBMISSION | PHONE_CALL | WHATSAPP | EMAIL | ORGANIC_SEARCH | REFERRAL | OTHER

### enum AttemptStatus: PENDING | SUCCESS | FAILED

### enum ExecutionRoute: API | PARTNER | HUMAN

---

# Components

- **TwoFactorSetupPage** [client] — `apps\web\src\app\2fa-setup\page.tsx`
- **RootLayout** — `apps\web\src\app\layout.tsx`
- **LoginPage** [client] — `apps\web\src\app\login\page.tsx`
- **Home** [client] — `apps\web\src\app\page.tsx`
- **ApprovalsView** [client] — `apps\web\src\components\approvals\approvals-view.tsx`
- **BuildStatusView** [client] — `apps\web\src\components\build-status\build-status-view.tsx`
- **ClientDetailPanel** [client] — props: clientId, onClose — `apps\web\src\components\clients\client-detail-panel.tsx`
- **ClientsView** [client] — `apps\web\src\components\clients\clients-view.tsx`
- **CommandPalette** [client] — `apps\web\src\components\command-palette\command-palette.tsx`
- **DashboardView** [client] — `apps\web\src\components\dashboard\dashboard-view.tsx`
- **GbpFaqManager** [client] — props: clientId, gbpId — `apps\web\src\components\gbp\gbp-faq-manager.tsx`
- **GbpIntakeForm** [client] — props: clientId, gbpId, initialData — `apps\web\src\components\gbp\gbp-intake-form.tsx`
- **GbpPhotosManager** [client] — props: clientId, gbpId — `apps\web\src\components\gbp\gbp-photos-manager.tsx`
- **GbpPostsManager** [client] — props: clientId, gbpId — `apps\web\src\components\gbp\gbp-posts-manager.tsx`
- **GbpProductsManager** [client] — props: clientId, gbpId — `apps\web\src\components\gbp\gbp-products-manager.tsx`
- **GbpServicesManager** [client] — props: clientId, gbpId — `apps\web\src\components\gbp\gbp-services-manager.tsx`
- **GbpVerificationWizard** — props: clientId, gbpId — `apps\web\src\components\gbp\gbp-verification-wizard.tsx`
- **Header** [client] — `apps\web\src\components\layout\header.tsx`
- **SessionProvider** [client] — `apps\web\src\components\providers\session-provider.tsx`
- **MonthlyReportDocument** — props: month, year, totalClients, totalTasksCompleted, totalLeads, leadValue, clients, leadSources — `apps\web\src\components\reports\monthly-report.tsx`
- **SettingsView** [client] — `apps\web\src\components\settings\settings-view.tsx`
- **TaskKanbanView** [client] — props: tasks, isLoading, error — `apps\web\src\components\tasks\task-kanban-view.tsx`
- **TasksView** [client] — `apps\web\src\components\tasks\tasks-view.tsx`

---

# Libraries

- `apps\api\src\app.controller.ts` — class AppController
- `apps\api\src\app.module.ts` — class AppModule
- `apps\api\src\app.service.ts` — class AppService
- `apps\api\src\common\decorators\roles.decorator.js` — function RequireRole, const ROLES_KEY
- `apps\api\src\common\decorators\roles.decorator.ts` — function RequireRole, const ROLES_KEY
- `apps\api\src\common\filters\sentry-exception.filter.ts` — class SentryExceptionFilter
- `apps\api\src\common\guards\roles.guard.ts` — class RolesGuard
- `apps\api\src\common\middleware\tenant.middleware.ts` — class TenantMiddleware
- `apps\api\src\modules\brightlocal\brightlocal.controller.ts` — class BrightlocalController
- `apps\api\src\modules\brightlocal\brightlocal.module.ts` — class BrightlocalModule
- `apps\api\src\modules\brightlocal\brightlocal.service.ts` — class BrightlocalService
- `apps\api\src\modules\dataforseo\dataforseo.controller.ts` — class DataforseoController
- `apps\api\src\modules\dataforseo\dataforseo.module.ts` — class DataforseoModule
- `apps\api\src\modules\dataforseo\dataforseo.service.ts` — class DataforseoService
- `apps\api\src\modules\gbp\gbp.controller.ts` — class GbpController
- `apps\api\src\modules\gbp\gbp.dto.js` — class UpdateGbpProfileDto
- `apps\api\src\modules\gbp\gbp.dto.ts` — class UpdateGbpProfileDto
- `apps\api\src\modules\gbp\gbp.module.ts` — class GbpModule
- `apps\api\src\modules\gbp\gbp.service.ts` — class GbpService
- `apps\api\src\modules\localfalcon\localfalcon.controller.ts` — class LocalfalconController
- `apps\api\src\modules\localfalcon\localfalcon.module.ts` — class LocalfalconModule
- `apps\api\src\modules\localfalcon\localfalcon.service.ts` — class LocalfalconService
- `apps\api\src\modules\security\credentials.service.ts` — class CredentialsService
- `apps\api\src\modules\security\encryption.service.ts` — class EncryptionService
- `apps\api\src\modules\security\security.module.ts` — class SecurityModule
- `apps\api\src\modules\tasks\tasks.controller.ts` — class TasksController
- `apps\api\src\modules\tasks\tasks.module.ts` — class TasksModule
- `apps\api\src\modules\tasks\tasks.service.ts` — class TasksService
- `apps\web\src\hooks\use-mobile.js` — function useIsMobile: () => void
- `apps\web\src\hooks\use-mobile.ts` — function useIsMobile: () => void
- `apps\web\src\hooks\use-toast.js` — function reducer
- `apps\web\src\hooks\use-toast.ts` — function reducer
- `apps\web\src\lib\api.js`
  - function getDashboard
  - function getClients
  - function getClientDetail
  - function updateClientState
  - function updateClientNotes
  - function getTasks
  - _...39 more_
- `apps\web\src\lib\api.ts`
  - function getDashboard
  - function getClients
  - function getClientDetail
  - function updateClientState
  - function updateClientNotes
  - function getTasks
  - _...39 more_
- `apps\web\src\lib\auth-guard.js`
  - function requireSession: () => void
  - function requireRole: (...roles) => void
  - function requireOwner: () => void
  - function hasMinimumRole: (actual, minimum) => void
  - const ROLE_HIERARCHY
- `apps\web\src\lib\auth-guard.ts`
  - function requireSession: () => Promise<AuthResult>
  - function requireRole: (...roles) => Promise<AuthResult>
  - function requireOwner: () => Promise<AuthResult>
  - function hasMinimumRole: (actual, minimum) => boolean
  - interface SessionUser
  - type AuthResult
  - _...1 more_
- `apps\web\src\lib\crypto.js`
  - function encryptSecret: (plaintext, keyId) => void
  - function decryptSecret: (ciphertext, keyId) => void
  - function verifyGoogleWebhookSignature: (rawBody, signature, secret) => void
  - function getSignInIp: (request) => void
- `apps\web\src\lib\crypto.ts`
  - function encryptSecret: (plaintext, keyId?) => Promise<string>
  - function decryptSecret: (ciphertext, keyId?) => Promise<string>
  - function verifyGoogleWebhookSignature: (rawBody, signature, secret) => boolean
  - function getSignInIp: (request) => string
- `apps\web\src\lib\hooks.js`
  - function useCurrentUser: () => void
  - function hasRole: (user, ...roles) => void
  - function hasMinimumRole: (user, minimum) => void
- `apps\web\src\lib\hooks.ts`
  - function useCurrentUser: () => void
  - function hasRole: (user, ...roles) => boolean
  - function hasMinimumRole: (user, minimum) => boolean
- `apps\web\src\lib\integrations\brightlocal.js` — class BrightLocalClient
- `apps\web\src\lib\integrations\brightlocal.ts` — class BrightLocalClient
- `apps\web\src\lib\integrations\dataforseo.js` — class DataForSeoClient
- `apps\web\src\lib\integrations\dataforseo.ts` — class DataForSeoClient
- `apps\web\src\lib\integrations\ga4.js` — class Ga4Client
- `apps\web\src\lib\integrations\ga4.ts` — class Ga4Client
- `apps\web\src\lib\integrations\google-business.js` — class GbpClient
- `apps\web\src\lib\integrations\google-business.ts` — class GbpClient
- `apps\web\src\lib\integrations\local-falcon.js` — class LocalFalconClient
- `apps\web\src\lib\integrations\local-falcon.ts` — class LocalFalconClient
- `apps\web\src\lib\integrations\sitemap-crawler.js` — class SitemapCrawler
- `apps\web\src\lib\integrations\sitemap-crawler.ts` — class SitemapCrawler
- `apps\web\src\lib\integrations\whatsapp.js` — class WhatsAppClient
- `apps\web\src\lib\integrations\whatsapp.ts` — class WhatsAppClient
- `apps\web\src\lib\kms.js`
  - function getKmsKeyName: (keyId) => void
  - function encryptWithKms: (plaintext, keyId) => void
  - function decryptWithKms: (ciphertextB64, keyId) => void
- `apps\web\src\lib\kms.ts`
  - function getKmsKeyName: (keyId?) => string
  - function encryptWithKms: (plaintext, keyId?) => Promise<string>
  - function decryptWithKms: (ciphertextB64, keyId?) => Promise<string>
- `apps\web\src\lib\rate-limit.js`
  - function rateLimit: (key, limit, windowSec) => void
  - function getLockout: (key) => void
  - function recordFailure: (key, maxAttempts, lockoutSec) => void
  - function clearFailures: (key) => void
  - function rateLimitLogin: (ip, email) => void
  - function rateLimit2fa: (userId) => void
  - _...2 more_
- `apps\web\src\lib\rate-limit.ts`
  - function rateLimit: (key, limit, windowSec) => Promise<RateLimitResult>
  - function getLockout: (key) => Promise<number | null>
  - function recordFailure: (key, maxAttempts, lockoutSec) => Promise<
  - function clearFailures: (key) => Promise<void>
  - function rateLimitLogin: (ip, email) => Promise<RateLimitResult>
  - function rateLimit2fa: (userId) => Promise<RateLimitResult>
  - _...3 more_
- `apps\web\src\lib\realtime-server.js` — function emitRealtimeEvent: (event, data, room) => void
- `apps\web\src\lib\realtime-server.ts` — function emitRealtimeEvent: (event, data, room?) => void
- `apps\web\src\lib\realtime.js`
  - function getSocket: () => void
  - function joinRoom: (roomId) => void
  - function leaveRoom: (roomId) => void
  - function emitTaskUpdate: (data) => void
  - function emitApprovalUpdate: (data) => void
- `apps\web\src\lib\realtime.ts`
  - function getSocket: () => Socket
  - function joinRoom: (roomId) => void
  - function leaveRoom: (roomId) => void
  - function emitTaskUpdate: (data) => void
  - function emitApprovalUpdate: (data) => void
- `apps\web\src\lib\use-realtime-events.js` — function useRealtimeEvents: () => void
- `apps\web\src\lib\use-realtime-events.ts` — function useRealtimeEvents: () => void
- `apps\web\src\lib\utils.js` — function cn: (...inputs) => void, function appendUtmTags: (url) => void
- `apps\web\src\lib\utils.ts` — function cn: (...inputs) => void, function appendUtmTags: (url) => string | null
- `apps\web\src\lib\validate-schema.js` — function validateSchema: (request, schema) => void
- `apps\web\src\lib\validate-schema.ts` — function validateSchema: (request, schema) => Promise<
- `apps\web\src\lib\validations.js`
  - function isSafeExternalUrl: (urlStr) => void
  - const safeUrlSchema
  - const safeUrlOptionalSchema
  - const createClientSchema
  - const updateClientSettingsSchema
  - const createKeywordSchema
  - _...8 more_
- `apps\web\src\lib\validations.ts`
  - function isSafeExternalUrl: (urlStr) => boolean
  - const safeUrlSchema
  - const safeUrlOptionalSchema
  - const createClientSchema
  - const updateClientSettingsSchema
  - const createKeywordSchema
  - _...8 more_
- `apps\worker\src\mailer.js` — function sendStatusAlert: (toEmail, clientName, statusMessage) => void
- `apps\worker\src\mailer.ts` — function sendStatusAlert: (toEmail, clientName, statusMessage) => void
- `apps\worker\src\schedulers.js` — function initSchedulers: () => void
- `apps\worker\src\schedulers.ts` — function initSchedulers: () => void
- `packages\database\src\conflict-check.js` — class ConflictOfInterestError
- `packages\database\src\conflict-check.ts` — class ConflictOfInterestError
- `packages\database\src\playbook.js` — function logPlaybookTactic: (prisma, params) => void, function analyzeNichePlaybook: (prisma, industryNiche) => void
- `packages\database\src\playbook.ts` — function logPlaybookTactic: (prisma, params) => void, function analyzeNichePlaybook: (prisma, industryNiche) => void
- `packages\database\src\state-machine.js`
  - function validateTransition: (from, to) => void
  - class IllegalStateTransitionError
  - const LEGAL_TRANSITIONS
- `packages\database\src\state-machine.ts`
  - function validateTransition: (from, to) => boolean
  - class IllegalStateTransitionError
  - const LEGAL_TRANSITIONS: Record<ClientState, ClientState[]>
- `packages\queue\src\idempotency.js` — function withRetry: (operation, maxRetries, baseDelayMs) => void, class IdempotentWriter
- `packages\queue\src\idempotency.ts` — function withRetry: (operation) => void, class IdempotentWriter

---

# Config

## Environment Variables

- `ANALYZE` **required** — apps\web\next.config.js
- `CI` **required** — apps\web\playwright.config.js
- `DATABASE_URL` (has default) — packages\database\.env
- `DIRECT_URL` (has default) — packages\database\.env
- `EMAIL_FROM` **required** — apps\web\src\auth.js
- `EMAIL_SERVER` **required** — apps\web\src\auth.js
- `ENCRYPTION_KEY` **required** — apps\api\src\modules\security\encryption.service.js
- `FRONTEND_URL` **required** — apps\api\src\modules\gbp\gbp.controller.js
- `GCP_KMS_CRYPTOKEY` **required** — apps\web\src\lib\kms.js
- `GCP_KMS_KEYRING` **required** — apps\web\src\lib\kms.js
- `GCP_KMS_LOCATION` **required** — apps\web\src\lib\kms.js
- `GOOGLE_APPLICATION_CREDENTIALS` **required** — apps\web\src\lib\crypto.js
- `GOOGLE_CLIENT_ID` **required** — apps\api\src\modules\gbp\gbp.service.js
- `GOOGLE_CLIENT_SECRET` **required** — apps\api\src\modules\gbp\gbp.service.js
- `GOOGLE_CLOUD_PROJECT` **required** — apps\web\src\lib\kms.js
- `GOOGLE_REDIRECT_URI` **required** — apps\api\src\modules\gbp\gbp.service.js
- `GOOGLE_WEBHOOK_SECRET` (has default) — packages\database\.env
- `GOOGLE_WEBHOOK_VERIFY_TOKEN` (has default) — packages\database\.env
- `META_WEBHOOK_SECRET` **required** — apps\web\src\app\api\webhooks\meta\route.js
- `NEXT_PUBLIC_API_URL` (has default) — packages\database\.env
- `NEXT_PUBLIC_APP_URL` **required** — apps\web\src\app\api\auth\google-business\callback\route.js
- `NEXT_PUBLIC_SENTRY_DSN` **required** — apps\web\sentry.client.config.js
- `NEXTAUTH_SECRET` (has default) — packages\database\.env
- `NEXTAUTH_URL` (has default) — packages\database\.env
- `NODE_ENV` **required** — apps\web\src\lib\env.js
- `OPENAI_API_KEY` **required** — apps\web\src\app\api\clients\[id]\posts\generate\route.js
- `PORT` **required** — apps\api\src\main.js
- `REDIS_URL` (has default) — packages\database\.env
- `RESEND_API_KEY` **required** — apps\worker\src\mailer.js
- `SENTRY_DSN` **required** — apps\api\src\main.js
- `TWO_FACTOR_ENCRYPTION_KEY` (has default) — packages\database\.env

## Config Files

- `.env.example`
- `apps\web\next.config.js`
- `apps\web\next.config.ts`
- `apps\web\tailwind.config.js`
- `apps\web\tailwind.config.ts`
- `docker-compose.yml`
- `tsconfig.json`

---

# Middleware

## custom
- roles.guard — `apps\api\src\common\guards\roles.guard.js`
- roles.guard — `apps\api\src\common\guards\roles.guard.ts`
- tenant.middleware — `apps\api\src\common\middleware\tenant.middleware.js`
- 05-agent-build-guardrails-and-definition-of-done — `Documents\05-agent-build-guardrails-and-definition-of-done.md`

## auth
- tenant.middleware — `apps\api\src\common\middleware\tenant.middleware.ts`
- auth — `apps\web\src\auth.js`
- auth — `apps\web\src\auth.ts`
- auth-guard — `apps\web\src\lib\auth-guard.js`
- auth-guard — `apps\web\src\lib\auth-guard.ts`
- middleware — `apps\web\src\middleware.js`
- middleware — `apps\web\src\middleware.ts`

## rate-limit
- rate-limit — `apps\web\src\lib\rate-limit.js`
- rate-limit — `apps\web\src\lib\rate-limit.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `apps\api\src\modules\security\security.module.ts` — imported by **10** files
- `apps\api\src\modules\security\credentials.service.ts` — imported by **8** files
- `apps\api\src\app.service.ts` — imported by **5** files
- `apps\api\src\modules\gbp\gbp.service.ts` — imported by **5** files
- `apps\api\src\app.controller.ts` — imported by **4** files
- `apps\api\src\app.module.ts` — imported by **4** files
- `apps\web\src\lib\kms.ts` — imported by **4** files
- `apps\api\src\modules\brightlocal\brightlocal.service.ts` — imported by **3** files
- `apps\api\src\modules\dataforseo\dataforseo.service.ts` — imported by **3** files
- `apps\api\src\modules\localfalcon\localfalcon.service.ts` — imported by **3** files
- `apps\api\src\modules\security\encryption.service.ts` — imported by **3** files
- `apps\api\src\modules\tasks\tasks.service.ts` — imported by **3** files
- `apps\web\src\lib\env.ts` — imported by **3** files
- `apps\api\src\modules\gbp\gbp.module.ts` — imported by **2** files
- `apps\api\src\modules\dataforseo\dataforseo.module.ts` — imported by **2** files
- `apps\api\src\modules\localfalcon\localfalcon.module.ts` — imported by **2** files
- `apps\api\src\modules\brightlocal\brightlocal.module.ts` — imported by **2** files
- `apps\api\src\modules\tasks\tasks.module.ts` — imported by **2** files
- `apps\api\src\common\middleware\tenant.middleware.ts` — imported by **2** files
- `apps\api\src\common\decorators\roles.decorator.ts` — imported by **2** files

## Import Map (who imports what)

- `apps\api\src\modules\security\security.module.ts` ← `apps\api\src\app.module.js`, `apps\api\src\app.module.ts`, `apps\api\src\modules\brightlocal\brightlocal.module.js`, `apps\api\src\modules\brightlocal\brightlocal.module.ts`, `apps\api\src\modules\dataforseo\dataforseo.module.js` +5 more
- `apps\api\src\modules\security\credentials.service.ts` ← `apps\api\src\modules\brightlocal\brightlocal.service.ts`, `apps\api\src\modules\dataforseo\dataforseo.service.ts`, `apps\api\src\modules\gbp\gbp.service.REQ-M1-15.spec.js`, `apps\api\src\modules\gbp\gbp.service.REQ-M1-15.spec.ts`, `apps\api\src\modules\gbp\gbp.service.ts` +3 more
- `apps\api\src\app.service.ts` ← `apps\api\src\app.controller.spec.js`, `apps\api\src\app.controller.spec.ts`, `apps\api\src\app.controller.ts`, `apps\api\src\app.module.js`, `apps\api\src\app.module.ts`
- `apps\api\src\modules\gbp\gbp.service.ts` ← `apps\api\src\modules\gbp\gbp.controller.ts`, `apps\api\src\modules\gbp\gbp.module.js`, `apps\api\src\modules\gbp\gbp.module.ts`, `apps\api\src\modules\gbp\gbp.service.REQ-M1-15.spec.js`, `apps\api\src\modules\gbp\gbp.service.REQ-M1-15.spec.ts`
- `apps\api\src\app.controller.ts` ← `apps\api\src\app.controller.spec.js`, `apps\api\src\app.controller.spec.ts`, `apps\api\src\app.module.js`, `apps\api\src\app.module.ts`
- `apps\api\src\app.module.ts` ← `apps\api\src\main.js`, `apps\api\src\main.ts`, `apps\api\test\app.e2e-spec.js`, `apps\api\test\app.e2e-spec.ts`
- `apps\web\src\lib\kms.ts` ← `apps\web\src\lib\crypto.js`, `apps\web\src\lib\crypto.ts`, `apps\web\tests\kms.test.js`, `apps\web\tests\kms.test.ts`
- `apps\api\src\modules\brightlocal\brightlocal.service.ts` ← `apps\api\src\modules\brightlocal\brightlocal.controller.ts`, `apps\api\src\modules\brightlocal\brightlocal.module.js`, `apps\api\src\modules\brightlocal\brightlocal.module.ts`
- `apps\api\src\modules\dataforseo\dataforseo.service.ts` ← `apps\api\src\modules\dataforseo\dataforseo.controller.ts`, `apps\api\src\modules\dataforseo\dataforseo.module.js`, `apps\api\src\modules\dataforseo\dataforseo.module.ts`
- `apps\api\src\modules\localfalcon\localfalcon.service.ts` ← `apps\api\src\modules\localfalcon\localfalcon.controller.ts`, `apps\api\src\modules\localfalcon\localfalcon.module.js`, `apps\api\src\modules\localfalcon\localfalcon.module.ts`

---

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

---

# Test Coverage

> **5%** of routes and models are covered by tests
> 8 test files found

## Covered Routes

- GET:/

## Covered Models

- Client
- GbpService
- ServiceArea
- Task

---

# CI/CD Pipelines

## GitHub Actions (1 workflow)

| Workflow | Triggers | Jobs | Deploy | Environments |
|---|---|---|---|---|
| CI | push, pull_request | 1 | — | — |

---
_Source: .github/workflows/ci.yml_
_Generated by codesight-cicd-plugin_

---

# Git Hooks

> **Note for agents:** These hooks fire automatically on git operations and will block the operation if they fail.

## `pre-commit` — husky

- **npm**: `npm test`

_Source: .husky/pre-commit_

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_
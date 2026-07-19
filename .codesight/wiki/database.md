# Database

> **Navigation aid.** Schema shapes and field types extracted via AST. Read the actual schema source files before writing migrations or query logic.

**prisma** — 45 models

### Organization

pk: `id` (String)

- `id`: String _(pk, default)_
- `name`: String
- `slug`: String _(unique)_
- `domain`: String _(nullable)_
- _relations_: staffUsers: StaffUser[], clients: Client[], credentials: OrgCredential[]

### StaffUser

pk: `id` (String) · fk: organizationId

- `id`: String _(pk, default)_
- `email`: String _(unique)_
- `name`: String
- `passwordHash`: String _(default)_
- `role`: StaffRole _(default)_
- `avatarUrl`: String _(nullable)_
- `isActive`: Boolean _(default)_
- `lastLoginAt`: DateTime _(nullable)_
- `twoFactorEnabled`: Boolean _(default)_
- `twoFactorSecret`: String _(nullable)_
- `twoFactorBackupHash`: String _(nullable)_
- `organizationId`: String _(fk)_
- _relations_: organization: Organization, assignedTasks: Task[], requestedTasks: Task[], requestedApprovals: ApprovalRequest[], approvedApprovals: ApprovalRequest[], notifications: Notification[], accounts: Account[], sessions: Session[]

### Client

pk: `id` (String) · fk: organizationId

- `id`: String _(pk, default)_
- `name`: String
- `slug`: String _(unique)_
- `businessName`: String _(nullable)_
- `phone`: String _(nullable)_
- `email`: String _(nullable)_
- `website`: String _(nullable)_
- `address`: String _(nullable)_
- `city`: String _(nullable)_
- `state`: String _(nullable)_
- `country`: String _(default)_
- `postalCode`: String _(nullable)_
- `type`: ClientType _(default)_
- `lifecycleState`: ClientState _(default)_
- `notes`: String _(nullable)_
- `isActive`: Boolean _(default)_
- `organizationId`: String _(fk)_
- `baseline`: BaselineSnapshot _(nullable)_
- _relations_: organization: Organization, gbpProfiles: GbpProfile[], assets: ClientAsset[], tasks: Task[], approvals: ApprovalRequest[], changeLog: ChangeLogEntry[], leads: LeadLogEntry[], reports: MonthlyReport[], keywords: KeywordMapEntry[], competitors: CompetitorBenchmark[], serviceAreas: ServiceArea[], credentials: ClientCredential[], portalUsers: ClientPortalUser[], writeAttempts: WriteAttempt[], preferences: ClientPreference[]

### GbpProfile

pk: `id` (String) · fk: clientId, gbpAccountId, gbpLocationId

- `id`: String _(pk, default)_
- `clientId`: String _(fk)_
- `gbpAccountId`: String _(nullable, fk)_
- `gbpLocationId`: String _(nullable, fk)_
- `gbpLocationName`: String _(nullable)_
- `primaryCategory`: String _(nullable)_
- `secondaryCategories`: String _(nullable)_
- `description`: String _(nullable)_
- `websiteUrl`: String _(nullable)_
- `bookingUrl`: String _(nullable)_
- `bookingUrlOverrideNote`: String _(nullable)_
- `phone`: String _(nullable)_
- `address`: String _(nullable)_
- `isVerified`: Boolean _(default)_
- `isSuspended`: Boolean _(default)_
- `lastSyncedAt`: DateTime _(nullable)_
- _relations_: client: Client, posts: GbpPost[], reviews: GbpReview[], photos: GbpPhoto[], services: GbpService[], products: GbpProduct[], faqs: GbpFaq[]

### GbpFaq

pk: `id` (String) · fk: gbpProfileId

- `id`: String _(pk, default)_
- `gbpProfileId`: String _(fk)_
- `question`: String
- `answer`: String
- `lastTestedAt`: DateTime _(nullable)_
- `passCount`: Int _(default)_
- `failCount`: Int _(default)_
- _relations_: gbpProfile: GbpProfile

### GbpCategory

pk: `id` (String)

- `id`: String _(pk, default)_
- `name`: String _(unique)_
- `group`: String _(nullable)_

### GbpProduct

pk: `id` (String) · fk: gbpProfileId

- `id`: String _(pk, default)_
- `gbpProfileId`: String _(fk)_
- `name`: String
- `description`: String _(nullable)_
- `price`: Float _(nullable)_
- `category`: String _(nullable)_
- `url`: String _(nullable)_
- `isUrlValid`: Boolean _(default)_
- _relations_: gbpProfile: GbpProfile

### GbpPost

pk: `id` (String) · fk: gbpProfileId

- `id`: String _(pk, default)_
- `gbpProfileId`: String _(fk)_
- `title`: String
- `content`: String
- `ctaButton`: String _(nullable)_
- `ctaUrl`: String _(nullable)_
- `eventType`: String _(nullable)_
- `startDate`: DateTime _(nullable)_
- `endDate`: DateTime _(nullable)_
- `status`: String _(default)_
- `publishedAt`: DateTime _(nullable)_
- _relations_: gbpProfile: GbpProfile

### GbpReview

pk: `id` (String) · fk: gbpProfileId

- `id`: String _(pk, default)_
- `gbpProfileId`: String _(fk)_
- `reviewerName`: String _(nullable)_
- `rating`: Int
- `content`: String _(nullable)_
- `reviewDate`: DateTime _(nullable)_
- `replyText`: String _(nullable)_
- `repliedAt`: DateTime _(nullable)_
- `source`: String _(default)_
- _relations_: gbpProfile: GbpProfile

### GbpPhoto

pk: `id` (String) · fk: gbpProfileId

- `id`: String _(pk, default)_
- `gbpProfileId`: String _(fk)_
- `url`: String
- `category`: String _(nullable)_
- `description`: String _(nullable)_
- `uploadedAt`: DateTime _(nullable)_
- _relations_: gbpProfile: GbpProfile

### GbpService

pk: `id` (String) · fk: gbpProfileId

- `id`: String _(pk, default)_
- `gbpProfileId`: String _(fk)_
- `name`: String
- `description`: String _(nullable)_
- `price`: Float _(nullable)_
- `isPriceConfirmed`: Boolean _(default)_
- _relations_: gbpProfile: GbpProfile

### ClientAsset

pk: `id` (String) · fk: clientId, externalId

- `id`: String _(pk, default)_
- `clientId`: String _(fk)_
- `assetType`: String
- `externalId`: String _(nullable, fk)_
- `label`: String _(nullable)_
- `metadata`: String _(nullable)_
- `isVerified`: Boolean _(default)_
- `connectedAt`: DateTime _(nullable)_
- _relations_: client: Client

### KeywordMapEntry

pk: `id` (String) · fk: clientId

- `id`: String _(pk, default)_
- `clientId`: String _(fk)_
- `keyword`: String
- `searchVolume`: Int _(nullable)_
- `difficulty`: Float _(nullable)_
- `intent`: String _(nullable)_
- `mapPack`: Boolean _(default)_
- `currentRank`: Int _(nullable)_
- `targetRank`: Int _(nullable)_
- `priority`: Int _(default)_
- `status`: String _(default)_
- _relations_: client: Client

### CompetitorBenchmark

pk: `id` (String) · fk: clientId, competitorGbpId

- `id`: String _(pk, default)_
- `clientId`: String _(fk)_
- `competitorName`: String
- `competitorGbpId`: String _(nullable, fk)_
- `competitorUrl`: String _(nullable)_
- `categories`: String _(nullable)_
- `avgRating`: Float _(nullable)_
- `reviewCount`: Int _(nullable)_
- `photoCount`: Int _(nullable)_
- `postFrequency`: String _(nullable)_
- `strengths`: String _(nullable)_
- `weaknesses`: String _(nullable)_
- `analyzedAt`: DateTime _(default)_
- _relations_: client: Client

### ServiceArea

pk: `id` (String) · fk: clientId

- `id`: String _(pk, default)_
- `clientId`: String _(fk)_
- `name`: String
- `city`: String _(nullable)_
- `radiusMiles`: Float _(nullable)_
- `isPrimary`: Boolean _(default)_
- _relations_: client: Client

### Task

pk: `id` (String) · fk: taskId, clientId, assignedToId, requestedById

- `id`: String _(pk, default)_
- `taskId`: String _(fk)_
- `clientId`: String _(nullable, fk)_
- `title`: String
- `description`: String _(nullable)_
- `module`: String
- `sprint`: Int _(nullable)_
- `priority`: TaskPriority _(default)_
- `status`: TaskStatus _(default)_
- `assignedToId`: String _(nullable, fk)_
- `requestedById`: String _(nullable, fk)_
- `scheduledFor`: DateTime _(nullable)_
- `startedAt`: DateTime _(nullable)_
- `completedAt`: DateTime _(nullable)_
- `dueDate`: DateTime _(nullable)_
- `result`: String _(nullable)_
- `errorMessage`: String _(nullable)_
- `retryCount`: Int _(default)_
- `maxRetries`: Int _(default)_
- `idempotencyKey`: String _(unique, nullable)_
- `isDryRun`: Boolean _(default)_
- _relations_: client: Client?, assignedTo: StaffUser?, requestedBy: StaffUser?, subtasks: Subtask[], logs: TaskLog[], approvals: ApprovalRequest[]

### Subtask

pk: `id` (String) · fk: taskId

- `id`: String _(pk, default)_
- `taskId`: String _(fk)_
- `title`: String
- `isCompleted`: Boolean _(default)_
- `sortOrder`: Int _(default)_
- _relations_: task: Task

### TaskLog

pk: `id` (String) · fk: taskId

- `id`: String _(pk, default)_
- `taskId`: String _(fk)_
- `level`: String _(default)_
- `message`: String
- `metadata`: String _(nullable)_
- _relations_: task: Task

### ApprovalRequest

pk: `id` (String) · fk: clientId, taskId, requestedById, approvedById

- `id`: String _(pk, default)_
- `clientId`: String _(nullable, fk)_
- `taskId`: String _(nullable, fk)_
- `title`: String
- `description`: String
- `requestType`: String
- `requestData`: String _(nullable)_
- `status`: ApprovalStatus _(default)_
- `requestedById`: String _(fk)_
- `approvedById`: String _(nullable, fk)_
- `rejectedReason`: String _(nullable)_
- `reviewedAt`: DateTime _(nullable)_
- `expiresAt`: DateTime _(nullable)_
- _relations_: client: Client?, task: Task?, requestedBy: StaffUser, approvedBy: StaffUser?

### ChangeLogEntry

pk: `id` (String) · fk: clientId, entityId, changedById, taskId

- `id`: String _(pk, default)_
- `clientId`: String _(fk)_
- `module`: String
- `entityType`: String
- `entityId`: String _(nullable, fk)_
- `field`: String _(nullable)_
- `oldValue`: String _(nullable)_
- `newValue`: String _(nullable)_
- `changedById`: String _(nullable, fk)_
- `taskId`: String _(nullable, fk)_
- _relations_: client: Client

### BuildRequirement

pk: `id` (String) · fk: reqId

- `id`: String _(pk, default)_
- `reqId`: String _(unique, fk)_
- `title`: String
- `description`: String _(nullable)_
- `module`: String
- `sprint`: Int _(nullable)_
- `status`: ReqStatus _(default)_
- `blockedBy`: String _(nullable)_
- `note`: String _(nullable)_

### LeadLogEntry

pk: `id` (String) · fk: clientId

- `id`: String _(pk, default)_
- `clientId`: String _(fk)_
- `source`: LeadSource
- `value`: Float _(nullable)_
- `contactInfo`: String _(nullable)_
- `notes`: String _(nullable)_
- `convertedAt`: DateTime _(nullable)_
- _relations_: client: Client

### MonthlyReport

pk: `id` (String) · fk: clientId

- `id`: String _(pk, default)_
- `clientId`: String _(fk)_
- `month`: Int
- `year`: Int
- `headline`: String _(nullable)_
- `kpisJson`: String _(nullable)_
- `generatedAt`: DateTime _(default)_
- _relations_: client: Client

### OrgCredential

pk: `id` (String) · fk: organizationId, keyId

- `id`: String _(pk, default)_
- `organizationId`: String _(fk)_
- `service`: String
- `label`: String _(nullable)_
- `encryptedKey`: String
- `keyId`: String _(nullable, fk)_
- `isValid`: Boolean _(default)_
- `lastCheckedAt`: DateTime _(nullable)_
- _relations_: organization: Organization

### Account

pk: `id` (String) · fk: userId, providerAccountId

- `id`: String _(pk, default)_
- `userId`: String _(fk)_
- `type`: String
- `provider`: String
- `providerAccountId`: String _(fk)_
- `refresh_token`: String _(nullable)_
- `access_token`: String _(nullable)_
- `expires_at`: Int _(nullable)_
- `token_type`: String _(nullable)_
- `scope`: String _(nullable)_
- `id_token`: String _(nullable)_
- `session_state`: String _(nullable)_
- _relations_: user: StaffUser

### Session

pk: `id` (String) · fk: userId

- `id`: String _(pk, default)_
- `sessionToken`: String _(unique)_
- `userId`: String _(fk)_
- `expires`: DateTime
- _relations_: user: StaffUser

### ClientCredential

pk: `id` (String) · fk: clientId

- `id`: String _(pk, default)_
- `clientId`: String _(fk)_
- `service`: String
- `encryptedToken`: String
- `refreshToken`: String _(nullable)_
- `tokenExpiryAt`: DateTime _(nullable)_
- `scope`: String _(nullable)_
- `isValid`: Boolean _(default)_
- _relations_: client: Client

### Notification

pk: `id` (String) · fk: userId, relatedEntityId

- `id`: String _(pk, default)_
- `userId`: String _(fk)_
- `type`: String
- `title`: String
- `message`: String
- `isRead`: Boolean _(default)_
- `relatedEntityId`: String _(nullable, fk)_
- `relatedEntityType`: String _(nullable)_
- _relations_: user: StaffUser

### VerificationToken

- `identifier`: String
- `token`: String _(unique)_
- `expires`: DateTime

### BaselineSnapshot

pk: `id` (String) · fk: clientId

- `id`: String _(pk, default)_
- `clientId`: String _(unique, fk)_
- `metricsJson`: String
- `capturedAt`: DateTime _(default)_
- _relations_: client: Client

### ClientPortalUser

pk: `id` (String) · fk: clientId

- `id`: String _(pk, default)_
- `email`: String _(unique)_
- `name`: String _(nullable)_
- `clientId`: String _(fk)_
- `isActive`: Boolean _(default)_
- `lastLoginAt`: DateTime _(nullable)_
- _relations_: client: Client

### WriteAttempt

pk: `id` (String) · fk: jobId, clientId

- `id`: String _(pk, default)_
- `idempotencyKey`: String _(unique)_
- `jobId`: String _(nullable, fk)_
- `action`: String
- `status`: AttemptStatus _(default)_
- `payload`: String _(nullable)_
- `result`: String _(nullable)_
- `clientId`: String _(nullable, fk)_
- _relations_: client: Client?

### CapabilityMapping

pk: `id` (String)

- `id`: String _(pk, default)_
- `capability`: String _(unique)_
- `primaryRoute`: ExecutionRoute _(default)_
- `fallbackRoute`: ExecutionRoute _(nullable)_
- `requiresApproval`: Boolean _(default)_
- `description`: String _(nullable)_

### ClientPreference

pk: `id` (String) · fk: clientId

- `id`: String _(pk, default)_
- `clientId`: String _(fk)_
- `tag`: String _(nullable)_
- `content`: String
- `isActive`: Boolean _(default)_
- _relations_: client: Client

### PlaybookTelemetry

pk: `id` (String)

- `id`: String _(pk, default)_
- `tacticName`: String
- `industryNiche`: String _(nullable)_
- `successScore`: Float _(nullable)_
- `anonymizedData`: String _(nullable)_

### enum StaffRole

OWNER | COORDINATOR | APPROVER | VIEWER

### enum ClientState

ONBOARDING | BUILD | GROWTH | AT_RISK | PAUSED

### enum ClientType

SERVICE_AREA_BUSINESS | STOREFRONT_BUSINESS

### enum TaskStatus

NOT_STARTED | IN_PROGRESS | PENDING_APPROVAL | DONE | FAILED | BLOCKED | DEFERRED

### enum TaskPriority

CRITICAL | HIGH | MEDIUM | LOW

### enum ApprovalStatus

PENDING | APPROVED | REJECTED | CANCELLED

### enum ReqStatus

NOT_STARTED | IN_PROGRESS | DONE | BLOCKED | DEFERRED

### enum LeadSource

GBP_CALL | GBP_DIRECTIONS | GBP_WEBSITE | FORM_SUBMISSION | PHONE_CALL | WHATSAPP | EMAIL | ORGANIC_SEARCH | REFERRAL | OTHER

### enum AttemptStatus

PENDING | SUCCESS | FAILED

### enum ExecutionRoute

API | PARTNER | HUMAN

## Schema Source Files

Search for ORM schema declarations:
- Drizzle: `pgTable` / `mysqlTable` / `sqliteTable`
- Prisma: `prisma/schema.prisma`
- TypeORM: `@Entity()` decorator
- SQLAlchemy: class inheriting `Base`

---
_Back to [overview.md](./overview.md)_
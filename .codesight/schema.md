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

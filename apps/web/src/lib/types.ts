// ─── Enums (mirrors Prisma) ───

export type ClientState = 'ONBOARDING' | 'BUILD' | 'GROWTH' | 'AT_RISK' | 'PAUSED' | 'OFFBOARDED';
export type ClientType = 'SERVICE_AREA_BUSINESS' | 'STOREFRONT_BUSINESS';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'DONE' | 'FAILED' | 'BLOCKED' | 'DEFERRED';
export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type ReqStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'DEFERRED';
export type StaffRole = 'OWNER' | 'COORDINATOR' | 'APPROVER' | 'VIEWER';

// ─── View types ───

export type ViewType = 'dashboard' | 'clients' | 'tasks' | 'approvals' | 'build-status' | 'settings';

// ─── API Response types ───

export interface GbpService {
  id: string;
  gbpProfileId: string;
  name: string;
  description: string | null;
  price: number | null;
  isPriceConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GbpProduct {
  id: string;
  gbpProfileId: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  url: string | null;
  isUrlValid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GbpPhoto {
  id: string;
  gbpProfileId: string;
  url: string;
  category: string | null;
  description: string | null;
  uploadedAt: string | null;
  createdAt: string;
}

export interface GbpPost {
  id: string;
  gbpProfileId: string;
  title: string;
  content: string;
  status: string;
  eventType: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface GbpProfileData {
  id: string;
  clientId: string;
  gbpAccountId: string | null;
  gbpLocationId: string | null;
  gbpLocationName: string | null;
  primaryCategory: string | null;
  secondaryCategories: string | null;
  description: string | null;
  websiteUrl: string | null;
  phone: string | null;
  address: string | null;
  bookingUrl?: string | null;
  bookingUrlOverrideNote?: string | null;
  isVerified: boolean;
  isSuspended: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  posts: unknown[];
  reviews: { rating: number }[];
  services?: GbpService[];
  products?: GbpProduct[];
  photos?: GbpPhoto[];
  avgRating?: number | null;
  reviewCount?: number;
}

export interface ClientListItem {
  id: string;
  name: string;
  slug: string;
  businessName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  type: ClientType;
  lifecycleState: ClientState;
  notes?: string;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  gbpProfiles: GbpProfileData[];
  taskCounts: Record<string, number>;
}

export interface ServiceArea {
  id: string;
  clientId: string;
  name: string;
  city?: string;
  radiusMiles?: number;
  isPrimary: boolean;
}

export interface CompetitorBenchmark {
  id: string;
  clientId: string;
  competitorName: string;
  competitorGbpId?: string;
  competitorUrl?: string;
  categories?: string;
  avgRating?: number;
  reviewCount?: number;
  photoCount?: number;
  postFrequency?: string;
  strengths?: string;
  weaknesses?: string;
  analyzedAt: string;
}

export interface KeywordMapEntry {
  id: string;
  clientId: string;
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  intent?: string;
  mapPack: boolean;
  currentRank?: number;
  targetRank?: number;
  priority: number;
  status: string;
}

export interface GeoGridScanResult {
  id: string;
  clientId: string;
  keyword: string;
  gridSize: number;
  scanDate: string;
  averageRank: number;
  pointResults: { lat: number; lng: number; rank: number }[];
  sourceLineage?: unknown;
  createdAt: string;
}

export interface BacklinkOpportunity {
  id: string;
  clientId: string;
  url: string;
  domainRating?: number | null;
  competitorUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecondaryReviewMetric {
  clientId: string;
  facebookCount: number;
  facebookRating: number;
  trustpilotCount: number;
  trustpilotRating: number;
  lastSyncedAt: string | null;
}

export interface CitationRecord {
  id: string;
  clientId: string;
  platform: string;
  url: string | null;
  napStatus: string;
  tier: number;
  status: string;
  credentialsRef: string | null;
  submittedAt: string | null;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPieceStatusHistory {
  id: string;
  contentPieceId: string;
  oldStatus: string | null;
  newStatus: string;
  reason: string;
  metadata: string | null;
  createdAt: string;
}

export interface ContentPiece {
  id: string;
  clientId: string;
  sourceKeywordId: string | null;
  topic: string;
  primaryKeyword: string;
  title: string;
  brief: string;
  draftBody: string | null;
  contentType: string;
  status: string;
  plagiarismProvider: string | null;
  similarityScore: number | null;
  similarityEvidence: string | null;
  publishedUrl: string | null;
  publishedAt: string | null;
  statusHistory?: ContentPieceStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientDetail extends Omit<ClientListItem, 'taskCounts'> {
  keywords: KeywordMapEntry[];
  competitors: CompetitorBenchmark[];
  serviceAreas: ServiceArea[];
  changeLog: ChangeLogEntry[];
  tasks: TaskItem[];
  leads: LeadLogEntry[];
  geoGridScans?: GeoGridScanResult[];
  backlinkOpportunities?: BacklinkOpportunity[];
  secondaryReview?: SecondaryReviewMetric | null;
  citations?: CitationRecord[];
  contentPieces?: ContentPiece[];
  citationMetrics?: {
    totalCitations: number;
    averageScore: number | null;
  };
  landingPageSchemaStatus?: string;
}

export interface TaskLog {
  id: string;
  taskId: string;
  level: string;
  message: string;
  metadata?: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  type: 'approval_assigned' | 'task_completed' | 'lead_converted' | 'client_at_risk' | string;
  title: string;
  message: string;
  sourceRule?: string | null;
  recommendedAction?: string | null;
  dedupeKey?: string | null;
  read: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  taskId: string;
  clientId?: string;
  client?: { name: string };
  title: string;
  description?: string;
  module: string;
  sprint?: number;
  priority: TaskPriority;
  status: TaskStatus;
  assignedToId?: string;
  assignedTo?: { name: string } | { name: string; role: string };
  requestedById?: string;
  requestedBy?: { name: string; role: string };
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  result?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  subtasks?: Subtask[];
  logs?: TaskLog[];
  approvals?: ApprovalRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  clientId?: string;
  client?: { name: string };
  taskId?: string;
  title: string;
  description: string;
  requestType: string;
  requestData?: string;
  status: ApprovalStatus;
  requestedById: string;
  requestedBy: { name: string; role: string };
  approvedById?: string;
  approvedBy?: { name: string };
  rejectedReason?: string;
  reviewedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeLogEntry {
  id: string;
  clientId: string;
  client?: { name: string };
  module: string;
  entityType: string;
  entityId?: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  changedById?: string;
  taskId?: string;
  createdAt: string;
}

export interface LeadLogEntry {
  id: string;
  clientId: string;
  client?: { name: string };
  source: string;
  value?: number;
  contactInfo?: string;
  notes?: string;
  convertedAt?: string;
  createdAt: string;
}

export interface BuildRequirement {
  id: string;
  reqId: string;
  title: string;
  description?: string;
  module: string;
  sprint: number;
  status: ReqStatus;
  blockedBy?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SprintGroup {
  sprint: number;
  requirements: BuildRequirement[];
  counts: {
    total: number;
    done: number;
    in_progress: number;
    not_started: number;
    blocked: number;
    deferred: number;
  };
}

export interface DashboardData {
  totalClients: number;
  clientsByState: Record<string, number>;
  tasksByStatus: Record<string, number>;
  pendingApprovals: number;
  leadsThisMonth: number;
  leadValueThisMonth: number;
  leadsBySource: Record<string, number>;
  recentChangeLog: ChangeLogEntry[];
  recentTasks: TaskItem[];
  comparison?: {
    leadsChange: number;
    tasksCompletedChange: number;
    clientsActiveChange: number;
    leadValueChange: number;
  };
  leadsTrend?: { date: string; count: number; value: number }[];
  topClients?: { id: string; name: string; leads: number; value: number; trend: number }[];
  citationMetrics?: { totalCitations: number; averageScore: number };
}

export interface BuildStatusData {
  counts: {
    total: number;
    done: number;
    in_progress: number;
    not_started: number;
    blocked: number;
    deferred: number;
  };
  sprints: SprintGroup[];
}

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
  twoFactorEnabled?: boolean;
  organizationId: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
}

export interface SettingsData {
  organization: Organization & { createdAt: string; updatedAt: string };
  staff: StaffUser[];
  summary: {
    clients: number;
    tasks: number;
    approvals: number;
  };
}

export interface CreateClientData {
  name: string;
  businessName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  type?: ClientType;
  notes?: string;
  legalName?: string;
  serviceList?: string;
  whatsapp?: string;
  existingGbpLoginDetails?: string;
  pastSuspensions?: "YES" | "NO" | "UNKNOWN";
  photoAvailability?: string;
  usps?: string;
  bookingSystem?: string;
  primaryCategory?: string;
  secondaryCategories?: string;
  gbpDescription?: string;
  businessHours?: string;
  serviceAreas?: { name: string; city?: string; radiusMiles?: number; isPrimary: boolean }[];
}

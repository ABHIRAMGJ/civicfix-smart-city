export interface UserProfile {
  id?: number;
  uid: string;
  email: string;
  name: string;
  role: 'citizen' | 'officer' | 'admin';
  departmentId: number | null;
  phone?: string;
  emailVerified?: boolean;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description: string;
  slaMultiplier: number;
  contactEmail: string;
  headOfficerName: string;
  serviceZoneGeojson?: string;
}

export interface IssueCategory {
  id: number;
  name: string;
  slug: string;
  departmentId: number;
  defaultPriority: string;
  slaHours: number;
  description: string;
  subcategoriesJson: string;
  iconName: string;
}

export interface FieldWorker {
  id: number;
  departmentId: number;
  name: string;
  roleTitle: string;
  specialty?: string;
  phone: string;
  email: string;
  status: 'available' | 'busy' | 'off_duty';
  activeTasksCount: number;
  overdueTasksCount: number;
  completedTasksCount: number;
  currentLat: number;
  currentLng: number;
}

export interface SlaRule {
  id: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  resolutionHours: number;
  responseHours: number;
  escalationRole: string;
  autoEscalate: boolean;
  categoryName?: string;
}

export interface IssueImage {
  id: number;
  issueId: number;
  fileUrl: string;
  url?: string;
  mediaType: string;
  type?: string;
  caption: string | null;
  uploadedByUid: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface IssueComment {
  id: number;
  issueId: number;
  authorUid: string;
  authorName: string;
  authorRole: string;
  content: string;
  body?: string;
  isInternal: boolean;
  createdAt: string;
}

export interface IssueStatusHistoryItem {
  id: number;
  issueId: number;
  previousStatus: string | null;
  newStatus: string;
  status?: string;
  changedByUid: string;
  changedByName: string;
  changedByRole: string;
  note: string | null;
  createdAt: string;
}

export interface CivicIssue {
  id: number;
  complaintId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status:
    | 'Pending Admin Review'
    | 'Reported'
    | 'AI Analysis'
    | 'Verified'
    | 'Assigned'
    | 'In Progress'
    | 'Resolved'
    | 'Citizen Confirmation'
    | 'Closed'
    | 'Rejected';
  departmentId: number | null;
  departmentName?: string;
  secondaryDepartmentId?: number | null;
  secondaryDepartmentName?: string | null;
  reporterUid: string;
  reporterName: string;
  reporterEmail: string;
  isAnonymous?: boolean;
  assignedOfficerUid: string | null;
  assignedOfficerName: string | null;
  assignedWorkerId: number | null;
  assignedWorkerName: string | null;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
  address: string;
  wardZone: string;
  insideServiceArea: boolean;
  aiCategorySuggestion: string | null;
  aiPrioritySuggestion: string | null;
  aiConfidence: number | null;
  aiReasoning: string | null;
  aiSummary: string | null;
  aiDuplicateProbability: number | null;
  duplicateOfComplaintId: string | null;
  slaHours: number;
  slaDeadline: string;
  isOverdue: boolean;
  isEscalated: boolean;
  escalationLevel: number;
  resolutionNotes: string | null;
  resolutionEvidenceUrl: string | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  citizenConfirmed: boolean;
  citizenFeedbackRating: number | null;
  citizenFeedbackComment: string | null;
  upvotesCount: number;
  estimatedCostInr?: number | null;
  budgetApproved?: boolean;
  materialsUsed?: string | null;
  photoVerificationStatus?: string | null;
  showCauseIssued?: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  images?: IssueImage[];
  comments?: IssueComment[];
  statusHistory?: IssueStatusHistoryItem[];
  timeline?: IssueStatusHistoryItem[];
  department?: Department | null;
  worker?: FieldWorker | null;
}

export interface NotificationItem {
  id: number;
  recipientUid: string;
  recipientRole: string;
  issueId: number | null;
  complaintId: string | null;
  title: string;
  message: string;
  type: string;
  channel: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: number;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: string | null;
  newValue: string | null;
  ipAddress: string;
  details?: string;
  createdAt: string;
}

export interface PredictiveAlert {
  id: number;
  wardZone: string;
  category: string;
  severity: string;
  incidentCount: number;
  recommendation: string;
}

export interface WardLeaderboardItem {
  wardZone: string;
  landmark: string;
  score: number;
  resolvedCount: number;
  totalComplaints: number;
  slaComplianceRate: number;
}

export interface AnalyticsSummary {
  kpis: {
    totalComplaints: number;
    pendingAdminCount?: number;
    allSubmittedCount?: number;
    historicalCityTotal: number;
    historicalCityResolved: number;
    activeDepartmentsCount: number;
    resolvedCount: number;
    inProgressCount: number;
    pendingCount: number;
    criticalCount: number;
    overdueCount: number;
    resolutionRate: number;
    slaComplianceRate: number;
    avgResolutionHours: number;
    duplicatePreventionRate: number;
    totalBudgetEstimatedInr?: number;
    totalBudgetApprovedInr?: number;
    totalEstimatedBudgetInr?: number;
    warRoomActive?: boolean;
  };
  warRoomMode?: {
    active: boolean;
    title?: string;
  };
  predictiveAlerts?: PredictiveAlert[];
  wardLeaderboard?: WardLeaderboardItem[];
  byCategory: Array<{ name: string; count: number; resolved: number }>;
  departmentPerformance: Array<{
    id: number;
    code: string;
    name: string;
    headOfficer: string;
    total: number;
    resolved: number;
    overdue: number;
    complianceRate: number;
    avgResolutionHours: number;
  }>;
  trendData: Array<{
    day: string;
    reported: number;
    resolved: number;
    slaRate: number;
  }>;
  workersSummary: {
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
  };
}

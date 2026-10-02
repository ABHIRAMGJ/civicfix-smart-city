import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  slaMultiplier: doublePrecision('sla_multiplier').notNull().default(1.0),
  contactEmail: text('contact_email').notNull(),
  headOfficerName: text('head_officer_name').notNull(),
  serviceZoneGeojson: text('service_zone_geojson'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default('Citizen User'),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('citizen'), // 'citizen' | 'officer' | 'admin'
  departmentId: integer('department_id').references(() => departments.id),
  phone: text('phone'),
  emailVerified: boolean('email_verified').notNull().default(true),
  otpCode: text('otp_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workers = pgTable('workers', {
  id: serial('id').primaryKey(),
  departmentId: integer('department_id')
    .references(() => departments.id)
    .notNull(),
  name: text('name').notNull(),
  roleTitle: text('role_title').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  status: text('status').notNull().default('available'), // 'available' | 'busy' | 'off_duty'
  activeTasksCount: integer('active_tasks_count').notNull().default(0),
  overdueTasksCount: integer('overdue_tasks_count').notNull().default(0),
  completedTasksCount: integer('completed_tasks_count').notNull().default(0),
  currentLat: doublePrecision('current_lat').notNull().default(14.9091),
  currentLng: doublePrecision('current_lng').notNull().default(78.0092),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const issueCategories = pgTable('issue_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  departmentId: integer('department_id')
    .references(() => departments.id)
    .notNull(),
  defaultPriority: text('default_priority').notNull().default('Medium'),
  slaHours: integer('sla_hours').notNull().default(48),
  description: text('description').notNull(),
  subcategoriesJson: text('subcategories_json').notNull(),
  iconName: text('icon_name').notNull().default('AlertTriangle'),
});

export const slaRules = pgTable('sla_rules', {
  id: serial('id').primaryKey(),
  priority: text('priority').notNull().unique(), // 'Critical' | 'High' | 'Medium' | 'Low'
  resolutionHours: integer('resolution_hours').notNull(),
  responseHours: integer('response_hours').notNull(),
  escalationRole: text('escalation_role').notNull(),
  autoEscalate: boolean('auto_escalate').notNull().default(true),
});

export const issues = pgTable('issues', {
  id: serial('id').primaryKey(),
  complaintId: text('complaint_id').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  priority: text('priority').notNull().default('Medium'), // 'Low' | 'Medium' | 'High' | 'Critical'
  status: text('status').notNull().default('Reported'), // 'Reported' | 'AI Analysis' | 'Verified' | 'Assigned' | 'In Progress' | 'Resolved' | 'Citizen Confirmation' | 'Closed' | 'Rejected'
  departmentId: integer('department_id').references(() => departments.id),
  reporterUid: text('reporter_uid').notNull(),
  reporterName: text('reporter_name').notNull(),
  reporterEmail: text('reporter_email').notNull(),
  assignedOfficerUid: text('assigned_officer_uid'),
  assignedOfficerName: text('assigned_officer_name'),
  assignedWorkerId: integer('assigned_worker_id').references(() => workers.id),
  assignedWorkerName: text('assigned_worker_name'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  address: text('address').notNull(),
  wardZone: text('ward_zone').notNull().default('Central Metro District'),
  insideServiceArea: boolean('inside_service_area').notNull().default(true),
  aiCategorySuggestion: text('ai_category_suggestion'),
  aiPrioritySuggestion: text('ai_priority_suggestion'),
  aiConfidence: doublePrecision('ai_confidence'),
  aiReasoning: text('ai_reasoning'),
  aiSummary: text('ai_summary'),
  aiDuplicateProbability: doublePrecision('ai_duplicate_probability').default(0),
  duplicateOfComplaintId: text('duplicate_of_complaint_id'),
  slaHours: integer('sla_hours').notNull().default(48),
  slaDeadline: timestamp('sla_deadline').notNull(),
  isOverdue: boolean('is_overdue').notNull().default(false),
  isEscalated: boolean('is_escalated').notNull().default(false),
  escalationLevel: integer('escalation_level').notNull().default(0),
  resolutionNotes: text('resolution_notes'),
  resolutionEvidenceUrl: text('resolution_evidence_url'),
  beforeImageUrl: text('before_image_url'),
  afterImageUrl: text('after_image_url'),
  citizenConfirmed: boolean('citizen_confirmed').notNull().default(false),
  citizenFeedbackRating: integer('citizen_feedback_rating'),
  citizenFeedbackComment: text('citizen_feedback_comment'),
  upvotesCount: integer('upvotes_count').notNull().default(1),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  secondaryDepartmentId: integer('secondary_department_id'),
  estimatedCostInr: integer('estimated_cost_inr').default(0),
  budgetApproved: boolean('budget_approved').notNull().default(false),
  materialsUsed: text('materials_used'),
  photoVerificationStatus: text('photo_verification_status').default('Verified Genuine'),
  showCauseIssued: boolean('show_cause_issued').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  closedAt: timestamp('closed_at'),
});

export const issueImages = pgTable('issue_images', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id')
    .references(() => issues.id)
    .notNull(),
  fileUrl: text('file_url').notNull(),
  mediaType: text('media_type').notNull().default('image'), // 'image' | 'video' | 'resolution'
  caption: text('caption'),
  uploadedByUid: text('uploaded_by_uid').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull().default(245000),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const issueComments = pgTable('issue_comments', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id')
    .references(() => issues.id)
    .notNull(),
  authorUid: text('author_uid').notNull(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role').notNull(),
  content: text('content').notNull(),
  isInternal: boolean('is_internal').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const issueStatusHistory = pgTable('issue_status_history', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id')
    .references(() => issues.id)
    .notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  changedByUid: text('changed_by_uid').notNull(),
  changedByName: text('changed_by_name').notNull(),
  changedByRole: text('changed_by_role').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  recipientUid: text('recipient_uid').notNull(),
  recipientRole: text('recipient_role').notNull().default('citizen'),
  issueId: integer('issue_id').references(() => issues.id),
  complaintId: text('complaint_id'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('status_change'),
  channel: text('channel').notNull().default('in_app'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  ipAddress: text('ip_address').notNull().default('10.24.18.104'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiPredictions = pgTable('ai_predictions', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').references(() => issues.id),
  complaintId: text('complaint_id'),
  predictedCategory: text('predicted_category').notNull(),
  predictedPriority: text('predicted_priority').notNull(),
  confidence: doublePrecision('confidence').notNull(),
  reasoning: text('reasoning').notNull(),
  summary: text('summary').notNull(),
  duplicateProbability: doublePrecision('duplicate_probability').notNull().default(0),
  matchedComplaintId: text('matched_complaint_id'),
  modelUsed: text('model_used').notNull().default('gemini-3.8-flash'),
  overriddenByHuman: boolean('overridden_by_human').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id')
    .references(() => issues.id)
    .notNull(),
  complaintId: text('complaint_id').notNull(),
  citizenUid: text('citizen_uid').notNull(),
  citizenName: text('citizen_name').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  resolutionSpeedScore: integer('resolution_speed_score').notNull().default(5),
  qualityScore: integer('quality_score').notNull().default(5),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  workers: many(workers),
  issues: many(issues),
  categories: many(issueCategories),
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
  department: one(departments, {
    fields: [issues.departmentId],
    references: [departments.id],
  }),
  worker: one(workers, {
    fields: [issues.assignedWorkerId],
    references: [workers.id],
  }),
  images: many(issueImages),
  comments: many(issueComments),
  statusHistory: many(issueStatusHistory),
}));

import { db } from './index.ts';
import {
  issues,
  issueImages,
  issueComments,
  issueStatusHistory,
  departments,
  issueCategories,
  workers,
  slaRules,
  notifications,
  auditLogs,
  aiPredictions,
  feedback,
} from './schema.ts';
import { eq, desc, asc } from 'drizzle-orm';

export async function getAllDepartments() {
  try {
    return await db.select().from(departments).orderBy(asc(departments.id));
  } catch (error) {
    console.error('Database getAllDepartments failed:', error);
    throw new Error('Failed to fetch municipal departments.', { cause: error });
  }
}

export async function getAllCategories() {
  try {
    return await db.select().from(issueCategories).orderBy(asc(issueCategories.id));
  } catch (error) {
    console.error('Database getAllCategories failed:', error);
    throw new Error('Failed to fetch issue categories.', { cause: error });
  }
}

export async function getAllWorkers() {
  try {
    return await db.select().from(workers).orderBy(asc(workers.id));
  } catch (error) {
    console.error('Database getAllWorkers failed:', error);
    throw new Error('Failed to fetch field workers.', { cause: error });
  }
}

export async function getAllSlaRules() {
  try {
    return await db.select().from(slaRules).orderBy(asc(slaRules.id));
  } catch (error) {
    console.error('Database getAllSlaRules failed:', error);
    throw new Error('Failed to fetch SLA rules.', { cause: error });
  }
}

export async function updateSlaRuleById(
  id: number,
  resolutionHours: number,
  responseHours: number,
  autoEscalate: boolean
) {
  try {
    const result = await db
      .update(slaRules)
      .set({ resolutionHours, responseHours, autoEscalate })
      .where(eq(slaRules.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database updateSlaRuleById failed:', error);
    throw new Error('Failed to update SLA configuration.', { cause: error });
  }
}

export async function getAllIssues() {
  try {
    return await db.select().from(issues).orderBy(desc(issues.createdAt));
  } catch (error) {
    console.error('Database getAllIssues failed:', error);
    throw new Error('Failed to load civic complaints.', { cause: error });
  }
}

export async function getIssueByIdOrComplaintId(idOrCode: string) {
  try {
    const numericId = Number(idOrCode);
    const issueRows = !Number.isNaN(numericId)
      ? await db.select().from(issues).where(eq(issues.id, numericId))
      : await db
          .select()
          .from(issues)
          .where(eq(issues.complaintId, idOrCode.toUpperCase()));

    const issue = issueRows[0];
    if (!issue) return null;

    const [images, comments, history, deptRows, secDeptRows, workerRows, predictions] =
      await Promise.all([
        db
          .select()
          .from(issueImages)
          .where(eq(issueImages.issueId, issue.id))
          .orderBy(asc(issueImages.createdAt)),
        db
          .select()
          .from(issueComments)
          .where(eq(issueComments.issueId, issue.id))
          .orderBy(asc(issueComments.createdAt)),
        db
          .select()
          .from(issueStatusHistory)
          .where(eq(issueStatusHistory.issueId, issue.id))
          .orderBy(asc(issueStatusHistory.createdAt)),
        issue.departmentId
          ? db
              .select()
              .from(departments)
              .where(eq(departments.id, issue.departmentId))
          : Promise.resolve([]),
        issue.secondaryDepartmentId
          ? db
              .select()
              .from(departments)
              .where(eq(departments.id, issue.secondaryDepartmentId))
          : Promise.resolve([]),
        issue.assignedWorkerId
          ? db
              .select()
              .from(workers)
              .where(eq(workers.id, issue.assignedWorkerId))
          : Promise.resolve([]),
        db
          .select()
          .from(aiPredictions)
          .where(eq(aiPredictions.issueId, issue.id))
          .orderBy(desc(aiPredictions.createdAt)),
      ]);

    return {
      ...issue,
      images,
      comments,
      statusHistory: history,
      department: deptRows[0] || null,
      secondaryDepartmentName: secDeptRows[0]?.name || null,
      worker: workerRows[0] || null,
      aiPrediction: predictions[0] || null,
    };
  } catch (error) {
    console.error('Database getIssueByIdOrComplaintId failed:', error);
    throw new Error('Failed to load complaint details.', { cause: error });
  }
}

// Citizen submits report -> Goes to Admin first ('Pending Admin Review')
export async function createNewIssue(payload: {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  priority: string;
  departmentId: number | null;
  secondaryDepartmentId?: number | null;
  reporterUid: string;
  reporterName: string;
  reporterEmail: string;
  isAnonymous?: boolean;
  latitude: number;
  longitude: number;
  address: string;
  wardZone: string;
  insideServiceArea: boolean;
  aiCategorySuggestion?: string;
  aiPrioritySuggestion?: string;
  aiConfidence?: number;
  aiReasoning?: string;
  aiSummary?: string;
  aiDuplicateProbability?: number;
  duplicateOfComplaintId?: string | null;
  slaHours: number;
  estimatedCostInr?: number;
  photoVerificationStatus?: string;
  imageUrls?: string[];
  overriddenByHuman?: boolean;
}) {
  try {
    const existingAll = await db.select().from(issues);
    const nextNumber = 1 + existingAll.length;
    const complaintId = `CIV-TDP-2026-${String(nextNumber).padStart(4, '0')}`;
    const slaDeadline = new Date(Date.now() + payload.slaHours * 3600 * 1000);
    const primaryImage =
      payload.imageUrls && payload.imageUrls.length > 0
        ? payload.imageUrls[0]
        : null;

    const inserted = await db
      .insert(issues)
      .values({
        complaintId,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        subcategory: payload.subcategory || null,
        priority: payload.priority,
        status: 'Pending Admin Review',
        departmentId: payload.departmentId,
        secondaryDepartmentId: payload.secondaryDepartmentId || null,
        reporterUid: payload.reporterUid,
        reporterName: payload.isAnonymous
          ? 'Anonymous Whistleblower (Identity Protected)'
          : payload.reporterName,
        reporterEmail: payload.isAnonymous
          ? 'whistleblower@protected.tadipatri.gov.in'
          : payload.reporterEmail,
        isAnonymous: Boolean(payload.isAnonymous),
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address,
        wardZone: payload.wardZone,
        insideServiceArea: payload.insideServiceArea,
        aiCategorySuggestion: payload.aiCategorySuggestion || payload.category,
        aiPrioritySuggestion: payload.aiPrioritySuggestion || payload.priority,
        aiConfidence: payload.aiConfidence ?? 0.94,
        aiReasoning:
          payload.aiReasoning ||
          'Classified and prioritized via CivicFix Multimodal Triage Engine.',
        aiSummary: payload.aiSummary || payload.title,
        aiDuplicateProbability: payload.aiDuplicateProbability ?? 0.04,
        duplicateOfComplaintId: payload.duplicateOfComplaintId ?? null,
        slaHours: payload.slaHours,
        slaDeadline,
        beforeImageUrl: primaryImage,
        estimatedCostInr: payload.estimatedCostInr ?? 12500,
        photoVerificationStatus:
          payload.photoVerificationStatus || 'Verified Genuine',
      })
      .returning();

    const createdIssue = inserted[0];

    if (payload.imageUrls && payload.imageUrls.length > 0) {
      for (const url of payload.imageUrls) {
        await db.insert(issueImages).values({
          issueId: createdIssue.id,
          fileUrl: url,
          mediaType: url.includes('video') ? 'video' : 'image',
          caption: `Evidence uploaded for ${complaintId}`,
          uploadedByUid: payload.reporterUid,
          fileSizeBytes: 312000,
        });
      }
    }

    await db.insert(issueStatusHistory).values({
      issueId: createdIssue.id,
      previousStatus: null,
      newStatus: 'Pending Admin Review',
      changedByUid: payload.reporterUid,
      changedByName: payload.isAnonymous
        ? 'Anonymous Whistleblower'
        : payload.reporterName,
      changedByRole: 'citizen',
      note: `Citizen submitted report in Tadipatri (${payload.wardZone}). Sent to Municipal Admin for verification and department-wise split.`,
    });

    await db.insert(aiPredictions).values({
      issueId: createdIssue.id,
      complaintId,
      predictedCategory: payload.aiCategorySuggestion || payload.category,
      predictedPriority: payload.aiPrioritySuggestion || payload.priority,
      confidence: payload.aiConfidence ?? 0.94,
      reasoning:
        payload.aiReasoning ||
        'Multimodal civic triage analyzed hazard severity and proximity in Tadipatri.',
      summary: payload.aiSummary || payload.title,
      duplicateProbability: payload.aiDuplicateProbability ?? 0.04,
      matchedComplaintId: payload.duplicateOfComplaintId ?? null,
      modelUsed: 'gemini-3.8-flash',
      overriddenByHuman: Boolean(payload.overriddenByHuman),
    });

    // Notify Admin that a new citizen report awaits acceptance & department split
    await db.insert(notifications).values({
      recipientUid: 'admin-commissioner-tdp',
      recipientRole: 'admin',
      issueId: createdIssue.id,
      complaintId,
      title: `New Citizen Report: ${complaintId}`,
      message: `${payload.isAnonymous ? 'Anonymous Whistleblower' : payload.reporterName} reported "${payload.title}" in ${payload.wardZone}. Please accept and split department-wise.`,
      type: 'status_change',
      channel: 'in_app',
    });

    // Notify Citizen that report was sent to Admin
    await db.insert(notifications).values({
      recipientUid: payload.reporterUid,
      recipientRole: 'citizen',
      issueId: createdIssue.id,
      complaintId,
      title: `Report Sent to Admin (${complaintId})`,
      message: `Your report "${payload.title}" has been sent to the Tadipatri Municipal Commissioner (Admin) for acceptance and department routing.`,
      type: 'status_change',
      channel: 'in_app',
    });

    await db.insert(auditLogs).values({
      actorUid: payload.reporterUid,
      actorName: payload.isAnonymous
        ? 'Anonymous Whistleblower'
        : payload.reporterName,
      actorRole: 'citizen',
      action: 'CITIZEN_REPORT_SUBMITTED_TO_ADMIN',
      entityType: 'issue',
      entityId: complaintId,
      previousValue: null,
      newValue: `Pending Admin Review | Recommended Dept #${payload.departmentId || 1}`,
    });

    return createdIssue;
  } catch (error) {
    console.error('Database createNewIssue failed:', error);
    throw new Error('Failed to create civic complaint.', { cause: error });
  }
}

// Admin Accepts & Splits Complaint Department-Wise (with optional Joint Secondary Department & Budget Approval)
export async function adminAcceptAndRouteIssue(params: {
  issueId: number;
  departmentId: number;
  secondaryDepartmentId?: number | null;
  priority: string;
  slaHours: number;
  estimatedCostInr?: number;
  budgetApproved?: boolean;
  adminUid: string;
  adminName: string;
  adminNote?: string;
  decision: 'accept' | 'reject';
}) {
  try {
    const [issueRows, deptRows, secDeptRows] = await Promise.all([
      db.select().from(issues).where(eq(issues.id, params.issueId)),
      db.select().from(departments).where(eq(departments.id, params.departmentId)),
      params.secondaryDepartmentId
        ? db
            .select()
            .from(departments)
            .where(eq(departments.id, params.secondaryDepartmentId))
        : Promise.resolve([]),
    ]);

    const current = issueRows[0];
    if (!current) throw new Error('Complaint not found.');
    const targetDept = deptRows[0];
    const secDept = secDeptRows[0];
    const deptName = targetDept
      ? targetDept.name
      : `Department #${params.departmentId}`;
    const jointLabel = secDept ? ` + Joint Task Force: ${secDept.name}` : '';

    const newStatus = params.decision === 'accept' ? 'Verified' : 'Rejected';
    const slaDeadline = new Date(Date.now() + params.slaHours * 3600 * 1000);

    const updatedRows = await db
      .update(issues)
      .set({
        status: newStatus,
        departmentId: params.departmentId,
        secondaryDepartmentId: params.secondaryDepartmentId || null,
        priority: params.priority,
        slaHours: params.slaHours,
        slaDeadline,
        estimatedCostInr:
          params.estimatedCostInr ?? current.estimatedCostInr ?? 12500,
        budgetApproved:
          params.budgetApproved !== undefined
            ? params.budgetApproved
            : params.decision === 'accept',
        assignedOfficerName: targetDept?.headOfficerName || 'Department Officer',
        updatedAt: new Date(),
      })
      .where(eq(issues.id, params.issueId))
      .returning();

    await db.insert(issueStatusHistory).values({
      issueId: current.id,
      previousStatus: current.status,
      newStatus,
      changedByUid: params.adminUid,
      changedByName: params.adminName,
      changedByRole: 'admin',
      note:
        params.decision === 'accept'
          ? `Admin accepted complaint and split/routed to ${deptName}${jointLabel} (${targetDept?.headOfficerName || 'Officer'}). ${params.adminNote || ''}`
          : `Admin rejected complaint: ${params.adminNote || 'Does not meet municipal verification criteria.'}`,
    });

    // Notify Citizen
    await db.insert(notifications).values({
      recipientUid: current.reporterUid,
      recipientRole: 'citizen',
      issueId: current.id,
      complaintId: current.complaintId,
      title:
        params.decision === 'accept'
          ? `Admin Accepted & Routed ${current.complaintId}`
          : `Complaint ${current.complaintId} Rejected`,
      message:
        params.decision === 'accept'
          ? `Municipal Admin accepted your report and routed it to ${deptName}${jointLabel} for field resolution.`
          : `Municipal Admin reviewed your report: ${params.adminNote || 'Rejected'}`,
      type: 'status_change',
      channel: 'in_app',
    });

    // Notify Primary & Secondary Department Officers
    if (params.decision === 'accept') {
      await db.insert(notifications).values({
        recipientUid: `dept-${params.departmentId}`,
        recipientRole: 'officer',
        issueId: current.id,
        complaintId: current.complaintId,
        title: `New Admin-Routed Issue: ${current.complaintId}`,
        message: `Admin split "${current.title}" (${params.priority}) to ${deptName}${jointLabel}. Please assign a field supervisor.`,
        type: 'assignment',
        channel: 'in_app',
      });
    }

    await db.insert(auditLogs).values({
      actorUid: params.adminUid,
      actorName: params.adminName,
      actorRole: 'admin',
      action:
        params.decision === 'accept'
          ? 'ADMIN_ACCEPTED_AND_SPLIT_TO_DEPT'
          : 'ADMIN_REJECTED_ISSUE',
      entityType: 'issue',
      entityId: current.complaintId,
      previousValue: current.status,
      newValue:
        params.decision === 'accept'
          ? `Verified -> Split to ${deptName}${jointLabel} (${params.priority})`
          : 'Rejected',
    });

    return updatedRows[0];
  } catch (error) {
    console.error('Database adminAcceptAndRouteIssue failed:', error);
    throw new Error('Failed to process Admin acceptance and department split.', {
      cause: error,
    });
  }
}

export async function issueShowCauseNotice(params: {
  issueId: number;
  adminUid: string;
  adminName: string;
  noticeText: string;
}) {
  try {
    const rows = await db
      .select()
      .from(issues)
      .where(eq(issues.id, params.issueId));
    const current = rows[0];
    if (!current) throw new Error('Complaint not found.');

    const updated = await db
      .update(issues)
      .set({
        showCauseIssued: true,
        isEscalated: true,
        escalationLevel: (current.escalationLevel || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, params.issueId))
      .returning();

    await db.insert(issueStatusHistory).values({
      issueId: current.id,
      previousStatus: current.status,
      newStatus: current.status,
      changedByUid: params.adminUid,
      changedByName: params.adminName,
      changedByRole: 'admin',
      note: `COMMISSIONER SHOW-CAUSE NOTICE ISSUED: ${params.noticeText}`,
    });

    await db.insert(notifications).values({
      recipientUid: `dept-${current.departmentId || 1}`,
      recipientRole: 'officer',
      issueId: current.id,
      complaintId: current.complaintId,
      title: `SHOW-CAUSE NOTICE: ${current.complaintId}`,
      message: params.noticeText,
      type: 'escalation',
      channel: 'in_app',
    });

    await db.insert(auditLogs).values({
      actorUid: params.adminUid,
      actorName: params.adminName,
      actorRole: 'admin',
      action: 'COMMISSIONER_SHOW_CAUSE_NOTICE_ISSUED',
      entityType: 'issue',
      entityId: current.complaintId,
      previousValue: current.status,
      newValue: params.noticeText,
    });

    return updated[0];
  } catch (error) {
    console.error('Database issueShowCauseNotice failed:', error);
    throw new Error('Failed to issue show-cause notice.', { cause: error });
  }
}

export async function updateIssueStatus(params: {
  issueId: number;
  newStatus: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  note?: string;
  resolutionNotes?: string;
  resolutionEvidenceUrl?: string;
  priorityOverride?: string;
  materialsUsed?: string;
  estimatedCostInr?: number;
  budgetApproved?: boolean;
}) {
  try {
    const rows = await db
      .select()
      .from(issues)
      .where(eq(issues.id, params.issueId));
    const current = rows[0];
    if (!current) {
      throw new Error('Complaint not found.');
    }

    const updateFields: Record<string, any> = {
      status: params.newStatus,
      updatedAt: new Date(),
    };

    if (params.priorityOverride) {
      updateFields.priority = params.priorityOverride;
    }
    if (params.materialsUsed !== undefined) {
      updateFields.materialsUsed = params.materialsUsed;
    }
    if (params.estimatedCostInr !== undefined) {
      updateFields.estimatedCostInr = Number(params.estimatedCostInr);
    }
    if (params.budgetApproved !== undefined) {
      updateFields.budgetApproved = Boolean(params.budgetApproved);
    }
    if (params.resolutionNotes) {
      updateFields.resolutionNotes = params.resolutionNotes;
    }
    if (params.resolutionEvidenceUrl) {
      updateFields.resolutionEvidenceUrl = params.resolutionEvidenceUrl;
      updateFields.afterImageUrl = params.resolutionEvidenceUrl;
      await db.insert(issueImages).values({
        issueId: current.id,
        fileUrl: params.resolutionEvidenceUrl,
        mediaType: 'resolution',
        caption: params.resolutionNotes || 'Official resolution evidence',
        uploadedByUid: params.actorUid,
      });
    }
    if (params.newStatus === 'Resolved') {
      updateFields.resolvedAt = new Date();
      updateFields.isOverdue = false;
    }
    if (params.newStatus === 'Closed') {
      updateFields.closedAt = new Date();
      updateFields.isOverdue = false;
    }

    const updatedRows = await db
      .update(issues)
      .set(updateFields)
      .where(eq(issues.id, params.issueId))
      .returning();

    await db.insert(issueStatusHistory).values({
      issueId: current.id,
      previousStatus: current.status,
      newStatus: params.newStatus,
      changedByUid: params.actorUid,
      changedByName: params.actorName,
      changedByRole: params.actorRole,
      note:
        params.note ||
        params.resolutionNotes ||
        `Status updated from ${current.status} to ${params.newStatus}${params.materialsUsed ? ` | Materials Logged: ${params.materialsUsed}` : ''}`,
    });

    await db.insert(notifications).values({
      recipientUid: current.reporterUid,
      recipientRole: 'citizen',
      issueId: current.id,
      complaintId: current.complaintId,
      title: `Status Updated: ${params.newStatus}`,
      message: `Your complaint ${current.complaintId} is now ${params.newStatus}.${params.note ? ` Note: ${params.note}` : ''}`,
      type: params.newStatus === 'Resolved' ? 'resolution' : 'status_change',
      channel: 'in_app',
    });

    await db.insert(auditLogs).values({
      actorUid: params.actorUid,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: 'STATUS_CHANGE',
      entityType: 'issue',
      entityId: current.complaintId,
      previousValue: current.status,
      newValue: params.newStatus,
    });

    return updatedRows[0];
  } catch (error) {
    console.error('Database updateIssueStatus failed:', error);
    throw new Error('Failed to update complaint status.', { cause: error });
  }
}

export async function assignWorkerToIssue(params: {
  issueId: number;
  workerId: number;
  actorUid: string;
  actorName: string;
  actorRole: string;
  note?: string;
}) {
  try {
    const [issueRows, workerRows] = await Promise.all([
      db.select().from(issues).where(eq(issues.id, params.issueId)),
      db.select().from(workers).where(eq(workers.id, params.workerId)),
    ]);

    const currentIssue = issueRows[0];
    const worker = workerRows[0];
    if (!currentIssue || !worker) {
      throw new Error('Issue or field worker not found.');
    }

    const nextStatus =
      currentIssue.status === 'Pending Admin Review' ||
      currentIssue.status === 'Reported' ||
      currentIssue.status === 'AI Analysis' ||
      currentIssue.status === 'Verified'
        ? 'Assigned'
        : currentIssue.status;

    const updatedIssueRows = await db
      .update(issues)
      .set({
        assignedWorkerId: worker.id,
        assignedWorkerName: worker.name,
        assignedOfficerUid: params.actorUid,
        assignedOfficerName: params.actorName,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, params.issueId))
      .returning();

    await db
      .update(workers)
      .set({
        activeTasksCount: worker.activeTasksCount + 1,
        status: worker.activeTasksCount + 1 >= 4 ? 'busy' : 'available',
      })
      .where(eq(workers.id, worker.id));

    await db.insert(issueStatusHistory).values({
      issueId: currentIssue.id,
      previousStatus: currentIssue.status,
      newStatus: nextStatus,
      changedByUid: params.actorUid,
      changedByName: params.actorName,
      changedByRole: params.actorRole,
      note:
        params.note ||
        `Assigned Tadipatri field supervisor ${worker.name} (${worker.roleTitle}).`,
    });

    await db.insert(notifications).values({
      recipientUid: currentIssue.reporterUid,
      recipientRole: 'citizen',
      issueId: currentIssue.id,
      complaintId: currentIssue.complaintId,
      title: 'Field Supervisor Assigned',
      message: `Your complaint ${currentIssue.complaintId} has been assigned to ${worker.name} (${worker.roleTitle}).`,
      type: 'assignment',
      channel: 'in_app',
    });

    await db.insert(auditLogs).values({
      actorUid: params.actorUid,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: 'WORKER_ASSIGNMENT',
      entityType: 'issue',
      entityId: currentIssue.complaintId,
      previousValue: currentIssue.assignedWorkerName || 'Unassigned',
      newValue: `${worker.name} (#${worker.id})`,
    });

    return updatedIssueRows[0];
  } catch (error) {
    console.error('Database assignWorkerToIssue failed:', error);
    throw new Error('Failed to assign worker to complaint.', { cause: error });
  }
}

export async function addIssueComment(params: {
  issueId: number;
  authorUid: string;
  authorName: string;
  authorRole: string;
  content: string;
  isInternal: boolean;
}) {
  try {
    const issueRows = await db
      .select()
      .from(issues)
      .where(eq(issues.id, params.issueId));
    const current = issueRows[0];
    if (!current) throw new Error('Complaint not found.');

    const inserted = await db
      .insert(issueComments)
      .values({
        issueId: params.issueId,
        authorUid: params.authorUid,
        authorName: params.authorName,
        authorRole: params.authorRole,
        content: params.content,
        isInternal: params.isInternal,
      })
      .returning();

    if (!params.isInternal && params.authorUid !== current.reporterUid) {
      await db.insert(notifications).values({
        recipientUid: current.reporterUid,
        recipientRole: 'citizen',
        issueId: current.id,
        complaintId: current.complaintId,
        title: `New Update on ${current.complaintId}`,
        message: `${params.authorName}: "${params.content.slice(0, 90)}"`,
        type: 'comment',
        channel: 'in_app',
      });
    }

    return inserted[0];
  } catch (error) {
    console.error('Database addIssueComment failed:', error);
    throw new Error('Failed to post comment.', { cause: error });
  }
}

export async function confirmIssueResolution(params: {
  issueId: number;
  citizenUid: string;
  citizenName: string;
  confirmed: boolean;
  rating: number;
  comment: string;
}) {
  try {
    const issueRows = await db
      .select()
      .from(issues)
      .where(eq(issues.id, params.issueId));
    const current = issueRows[0];
    if (!current) throw new Error('Complaint not found.');

    const nextStatus = params.confirmed ? 'Closed' : 'In Progress';
    const updatedRows = await db
      .update(issues)
      .set({
        status: nextStatus,
        citizenConfirmed: params.confirmed,
        citizenFeedbackRating: params.rating,
        citizenFeedbackComment: params.comment,
        closedAt: params.confirmed ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, params.issueId))
      .returning();

    await db.insert(feedback).values({
      issueId: current.id,
      complaintId: current.complaintId,
      citizenUid: params.citizenUid,
      citizenName: params.citizenName,
      rating: params.rating,
      comment: params.comment,
      resolutionSpeedScore: params.rating,
      qualityScore: params.rating,
    });

    await db.insert(issueStatusHistory).values({
      issueId: current.id,
      previousStatus: current.status,
      newStatus: nextStatus,
      changedByUid: params.citizenUid,
      changedByName: params.citizenName,
      changedByRole: 'citizen',
      note: params.confirmed
        ? `Citizen verified resolution (${params.rating}/5 stars): "${params.comment}"`
        : `Citizen requested reopen (${params.rating}/5 stars): "${params.comment}"`,
    });

    await db.insert(auditLogs).values({
      actorUid: params.citizenUid,
      actorName: params.citizenName,
      actorRole: 'citizen',
      action: params.confirmed ? 'CITIZEN_CONFIRMED_CLOSURE' : 'CITIZEN_REOPENED',
      entityType: 'issue',
      entityId: current.complaintId,
      previousValue: current.status,
      newValue: `${nextStatus} (${params.rating} stars)`,
    });

    return updatedRows[0];
  } catch (error) {
    console.error('Database confirmIssueResolution failed:', error);
    throw new Error('Failed to submit citizen resolution confirmation.', {
      cause: error,
    });
  }
}

export async function escalateIssueSla(params: {
  issueId: number;
  actorUid: string;
  actorName: string;
  actorRole: string;
  reason: string;
}) {
  try {
    const rows = await db
      .select()
      .from(issues)
      .where(eq(issues.id, params.issueId));
    const current = rows[0];
    if (!current) throw new Error('Complaint not found.');

    const nextLevel = (current.escalationLevel || 0) + 1;
    const updated = await db
      .update(issues)
      .set({
        isEscalated: true,
        isOverdue: true,
        escalationLevel: nextLevel,
        priority:
          current.priority === 'Low'
            ? 'Medium'
            : current.priority === 'Medium'
              ? 'High'
              : 'Critical',
        updatedAt: new Date(),
      })
      .where(eq(issues.id, params.issueId))
      .returning();

    await db.insert(issueStatusHistory).values({
      issueId: current.id,
      previousStatus: current.status,
      newStatus: current.status,
      changedByUid: params.actorUid,
      changedByName: params.actorName,
      changedByRole: params.actorRole,
      note: `SLA Escalation Level ${nextLevel} triggered: ${params.reason}`,
    });

    await db.insert(notifications).values({
      recipientUid: current.reporterUid,
      recipientRole: 'citizen',
      issueId: current.id,
      complaintId: current.complaintId,
      title: `SLA Escalation Alert (${current.complaintId})`,
      message: `Your complaint has been escalated to Level ${nextLevel} Tadipatri Municipal Commissioner Desk for expedited resolution.`,
      type: 'escalation',
      channel: 'in_app',
    });

    await db.insert(auditLogs).values({
      actorUid: params.actorUid,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: 'SLA_ESCALATION',
      entityType: 'issue',
      entityId: current.complaintId,
      previousValue: `Escalation Level ${current.escalationLevel}`,
      newValue: `Escalation Level ${nextLevel}: ${params.reason}`,
    });

    return updated[0];
  } catch (error) {
    console.error('Database escalateIssueSla failed:', error);
    throw new Error('Failed to escalate complaint.', { cause: error });
  }
}

export async function upvoteIssueById(issueId: number) {
  try {
    const rows = await db.select().from(issues).where(eq(issues.id, issueId));
    const current = rows[0];
    if (!current) throw new Error('Complaint not found.');

    const updated = await db
      .update(issues)
      .set({ upvotesCount: current.upvotesCount + 1 })
      .where(eq(issues.id, issueId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database upvoteIssueById failed:', error);
    throw new Error('Failed to upvote complaint.', { cause: error });
  }
}

export async function getNotificationsForUser(uid?: string, role?: string) {
  try {
    const all = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt));
    if (!uid) return all.slice(0, 25);
    return all.filter(
      (n) =>
        n.recipientUid === uid ||
        n.recipientRole === role ||
        role === 'admin'
    );
  } catch (error) {
    console.error('Database getNotificationsForUser failed:', error);
    throw new Error('Failed to fetch notifications.', { cause: error });
  }
}

export async function markNotificationRead(id: number) {
  try {
    const updated = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database markNotificationRead failed:', error);
    throw new Error('Failed to mark notification read.', { cause: error });
  }
}

export async function getAuditLogsList() {
  try {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt));
  } catch (error) {
    console.error('Database getAuditLogsList failed:', error);
    throw new Error('Failed to fetch system audit logs.', { cause: error });
  }
}

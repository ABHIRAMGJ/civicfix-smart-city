import express from 'express';
import { createServer } from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import {
  requireAuth,
  optionalAuth,
  requireRole,
  signAppToken,
  AuthRequest,
} from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  getUserByEmail,
  getUserByUid,
  createRegisteredUser,
  listAllUsers,
  updateUserRoleAndDept,
} from './src/db/users.ts';
import {
  getAllDepartments,
  getAllCategories,
  getAllWorkers,
  getAllSlaRules,
  updateSlaRuleById,
  getAllIssues,
  getIssueByIdOrComplaintId,
  createNewIssue,
  adminAcceptAndRouteIssue,
  issueShowCauseNotice,
  updateIssueStatus,
  assignWorkerToIssue,
  addIssueComment,
  confirmIssueResolution,
  escalateIssueSla,
  upvoteIssueById,
  getNotificationsForUser,
  markNotificationRead,
  getAuditLogsList,
} from './src/db/repository.ts';
import { analyzeComplaintWithAI } from './src/services/aiService.ts';
import {
  appCache,
  apiRateLimiter,
  initRealtimeServer,
  broadcastRealtimeEvent,
} from './src/services/cacheAndRealtime.ts';

dotenv.config();

let warRoomActiveState = false;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  initRealtimeServer(httpServer);

  app.use(express.json({ limit: '12mb' }));
  app.use('/api', apiRateLimiter(180, 60000));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // --- AUTHENTICATION ROUTES ---

  app.post('/api/auth/firebase-sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const userRecord = await getOrCreateUser(
        req.user.uid,
        req.user.email,
        req.user.name,
        req.user.role,
        req.user.departmentId
      );
      const token = signAppToken({
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.name,
        role: (userRecord.role as 'citizen' | 'officer' | 'admin') || 'citizen',
        departmentId: userRecord.departmentId,
      });
      res.json({ user: userRecord, token });
    } catch (error: any) {
      console.error('Firebase sync failed:', error);
      res.status(500).json({ error: error.message || 'Authentication sync failed' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, role, departmentId, phone } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }
      const existing = await getUserByEmail(email.toLowerCase().trim());
      if (existing && existing.passwordHash) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const uid = existing?.uid || `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const validRole = ['citizen', 'officer', 'admin'].includes(role) ? role : 'citizen';

      const created = await createRegisteredUser({
        uid,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        passwordHash,
        role: validRole,
        departmentId: departmentId ? Number(departmentId) : validRole === 'officer' ? 1 : null,
        phone,
        otpCode: '482910',
      });

      const token = signAppToken({
        uid: created.uid,
        email: created.email,
        name: created.name,
        role: (created.role as 'citizen' | 'officer' | 'admin') || 'citizen',
        departmentId: created.departmentId,
      });

      res.status(201).json({
        user: {
          id: created.id,
          uid: created.uid,
          email: created.email,
          name: created.name,
          role: created.role,
          departmentId: created.departmentId,
          emailVerified: created.emailVerified,
        },
        token,
        otpDemoCode: '482910',
      });
    } catch (error: any) {
      console.error('Registration failed:', error);
      res.status(500).json({ error: error.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
      }
      const userRecord = await getUserByEmail(email.toLowerCase().trim());
      if (!userRecord) {
        return res.status(401).json({ error: 'Invalid credentials or account not found.' });
      }

      if (userRecord.passwordHash && password) {
        const valid = await bcrypt.compare(password, userRecord.passwordHash);
        if (!valid) {
          return res.status(401).json({ error: 'Invalid email or password.' });
        }
      }

      const token = signAppToken({
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.name,
        role: (userRecord.role as 'citizen' | 'officer' | 'admin') || 'citizen',
        departmentId: userRecord.departmentId,
      });

      res.json({
        user: {
          id: userRecord.id,
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.name,
          role: userRecord.role,
          departmentId: userRecord.departmentId,
          emailVerified: userRecord.emailVerified,
        },
        token,
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      res.status(500).json({ error: error.message || 'Login failed' });
    }
  });

  // Role & Department Persona Switcher (Supports 1. Citizen, 2. Specific Department Officer, 3. Admin)
  app.post('/api/auth/switch-role', async (req, res) => {
    try {
      const { targetRole, departmentId } = req.body;
      const deptOfficerMap: Record<number, { uid: string; email: string; name: string }> = {
        1: {
          uid: 'officer-rb-ramana',
          email: 'rb.tadipatri@cdma.ap.gov.in',
          name: 'Er. K. Venkata Ramana (R&B Dept)',
        },
        2: {
          uid: 'officer-elec-narayana',
          email: 'apspdcl.tadipatri@ap.gov.in',
          name: 'Er. S. Narayana Reddy (Electrical Dept)',
        },
        3: {
          uid: 'officer-sanit-lakshmi',
          email: 'sanitation.tadipatri@cdma.ap.gov.in',
          name: 'Dr. M. Lakshmi Devi (Sanitation Dept)',
        },
        4: {
          uid: 'officer-water-srinivas',
          email: 'watersupply.tadipatri@cdma.ap.gov.in',
          name: 'Er. P. Srinivasulu (Water Supply Dept)',
        },
        5: {
          uid: 'officer-traffic-raja',
          email: 'traffic.tadipatri@appolice.gov.in',
          name: 'Inspector B. Rajasekhar (Traffic Dept)',
        },
        6: {
          uid: 'officer-env-obul',
          email: 'environment.tadipatri@cdma.ap.gov.in',
          name: 'G. Obul Reddy (Environment Dept)',
        },
        7: {
          uid: 'officer-ugd-malli',
          email: 'ugd.tadipatri@cdma.ap.gov.in',
          name: 'Er. C. Mallikarjuna (Drainage Dept)',
        },
        8: {
          uid: 'officer-infra-surya',
          email: 'tpo.tadipatri@cdma.ap.gov.in',
          name: 'V. Suryanarayana (Infrastructure Dept)',
        },
      };

      let targetUid = 'citizen-ravi-kumar';
      let defaultEmail = 'ravi.kumar@tadipatri.org';
      let defaultName = 'K. Ravi Kumar (Citizen)';
      let resolvedDeptId: number | null = null;

      if (targetRole === 'admin') {
        targetUid = 'admin-commissioner-tdp';
        defaultEmail = 'commissioner.tadipatri@cdma.ap.gov.in';
        defaultName = 'S. Shiva Ramakrishna, IAS (Municipal Commissioner - Admin)';
      } else if (targetRole === 'officer') {
        const chosenDept = Number(departmentId) || 1;
        const officerInfo = deptOfficerMap[chosenDept] || deptOfficerMap[1];
        targetUid = officerInfo.uid;
        defaultEmail = officerInfo.email;
        defaultName = officerInfo.name;
        resolvedDeptId = chosenDept;
      }

      let userRecord = await getUserByUid(targetUid);
      if (!userRecord) {
        userRecord = await getOrCreateUser(
          targetUid,
          defaultEmail,
          defaultName,
          targetRole || 'citizen',
          resolvedDeptId
        );
      }

      const token = signAppToken({
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.name,
        role: (userRecord.role as 'citizen' | 'officer' | 'admin') || 'citizen',
        departmentId: userRecord.departmentId,
      });

      res.json({
        user: {
          id: userRecord.id,
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.name,
          role: userRecord.role,
          departmentId: userRecord.departmentId,
          emailVerified: userRecord.emailVerified,
        },
        token,
      });
    } catch (error: any) {
      console.error('Role switch failed:', error);
      res.status(500).json({ error: error.message || 'Failed to switch role' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // --- WAR ROOM EMERGENCY MODE TOGGLE ---
  app.post('/api/war-room', requireAuth, async (req: AuthRequest, res) => {
    const { active } = req.body;
    warRoomActiveState = Boolean(active);
    broadcastRealtimeEvent('war_room:toggled', {
      active: warRoomActiveState,
      message: warRoomActiveState
        ? 'EMERGENCY WAR-ROOM MODE ACTIVATED: Tadipatri Monsoon / Temple Festival High-Alert (4h Emergency SLAs Active)'
        : 'Tadipatri Emergency War-Room Mode Deactivated — Standard SLA Rules Restored',
    });
    res.json({ warRoomActive: warRoomActiveState });
  });

  // --- AI ANALYSIS ROUTE ---
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const {
        title,
        description,
        latitude,
        longitude,
        selectedCategory,
        imageBase64,
        imageMimeType,
      } = req.body;
      if (!title || !description) {
        return res
          .status(400)
          .json({ error: 'Complaint title and description are required for AI analysis.' });
      }
      const analysis = await analyzeComplaintWithAI({
        title,
        description,
        latitude: Number(latitude) || 14.9091,
        longitude: Number(longitude) || 78.0092,
        selectedCategory,
        imageBase64,
        imageMimeType,
        warRoomActive: warRoomActiveState,
      });
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'AI analysis failed' });
    }
  });

  // --- ISSUES & WORKFLOW ROUTES ---
  app.get('/api/issues', optionalAuth, async (req, res) => {
    try {
      const {
        search,
        category,
        priority,
        status,
        departmentId,
        reporterUid,
        onlyAccepted,
        sortBy,
        page = '1',
        limit = '50',
      } = req.query;

      const [allIssues, allDepts] = await Promise.all([
        getAllIssues(),
        getAllDepartments(),
      ]);

      const deptLookup = new Map(allDepts.map((d) => [d.id, d.name]));

      let filtered = allIssues.map((item) => {
        const now = Date.now();
        const deadline = new Date(item.slaDeadline).getTime();
        const isClosedOrResolved =
          item.status === 'Resolved' ||
          item.status === 'Citizen Confirmation' ||
          item.status === 'Closed' ||
          item.status === 'Rejected';
        const computedOverdue = !isClosedOrResolved && deadline < now;
        const primaryDeptName = item.departmentId
          ? deptLookup.get(item.departmentId) || 'Tadipatri Municipal Division'
          : 'Tadipatri Municipal Division';
        const secDeptName = item.secondaryDepartmentId
          ? deptLookup.get(item.secondaryDepartmentId) || null
          : null;

        return {
          ...item,
          isOverdue: item.isOverdue || computedOverdue,
          secondaryDepartmentName: secDeptName,
          departmentName:
            item.status === 'Pending Admin Review'
              ? `Awaiting Admin Split (Suggested: ${primaryDeptName})`
              : secDeptName
                ? `${primaryDeptName} + Joint: ${secDeptName}`
                : primaryDeptName,
        };
      });

      if (onlyAccepted === 'true') {
        filtered = filtered.filter(
          (i) => i.status !== 'Pending Admin Review' && i.status !== 'Rejected'
        );
      }

      if (search && typeof search === 'string' && search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (i) =>
            i.complaintId.toLowerCase().includes(q) ||
            i.title.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            i.address.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q) ||
            i.wardZone.toLowerCase().includes(q)
        );
      }

      if (category && category !== 'All') {
        filtered = filtered.filter((i) => i.category === category);
      }
      if (priority && priority !== 'All') {
        filtered = filtered.filter((i) => i.priority === priority);
      }
      if (status && status !== 'All') {
        filtered = filtered.filter((i) => i.status === status);
      }
      if (departmentId && departmentId !== 'All') {
        filtered = filtered.filter(
          (i) =>
            String(i.departmentId) === String(departmentId) ||
            String(i.secondaryDepartmentId) === String(departmentId)
        );
      }
      if (reporterUid) {
        filtered = filtered.filter((i) => i.reporterUid === reporterUid);
      }

      if (sortBy === 'priority') {
        const weight: Record<string, number> = {
          Critical: 4,
          High: 3,
          Medium: 2,
          Low: 1,
        };
        filtered.sort(
          (a, b) => (weight[b.priority] || 0) - (weight[a.priority] || 0)
        );
      } else if (sortBy === 'sla') {
        filtered.sort(
          (a, b) =>
            new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime()
        );
      } else if (sortBy === 'upvotes') {
        filtered.sort((a, b) => b.upvotesCount - a.upvotesCount);
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
      const total = filtered.length;
      const paginated = filtered.slice(
        (pageNum - 1) * limitNum,
        pageNum * limitNum
      );

      res.json({
        issues: paginated,
        total,
        page: pageNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      });
    } catch (error: any) {
      console.error('GET /api/issues failed:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch issues' });
    }
  });

  app.get('/api/issues/:id', optionalAuth, async (req, res) => {
    try {
      const detail = await getIssueByIdOrComplaintId(req.params.id);
      if (!detail) {
        return res.status(404).json({ error: 'Complaint record not found.' });
      }
      res.json(detail);
    } catch (error: any) {
      console.error('GET /api/issues/:id failed:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch issue details' });
    }
  });

  // Citizen submits report -> Goes to Admin for Acceptance & Department Split
  app.post('/api/issues', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const {
        title,
        description,
        category,
        subcategory,
        priority,
        departmentId,
        secondaryDepartmentId,
        isAnonymous,
        latitude,
        longitude,
        address,
        wardZone,
        insideServiceArea,
        aiCategorySuggestion,
        aiPrioritySuggestion,
        aiConfidence,
        aiReasoning,
        aiSummary,
        aiDuplicateProbability,
        duplicateOfComplaintId,
        slaHours,
        estimatedCostInr,
        photoVerificationStatus,
        imageUrls,
        overriddenByHuman,
      } = req.body;

      if (!title || !description || !category || !address) {
        return res.status(400).json({
          error: 'Title, description, category, and location address are required.',
        });
      }

      const reporterUid = req.user?.uid || 'citizen-ravi-kumar';
      const reporterName = req.user?.name || 'K. Ravi Kumar (Citizen)';
      const reporterEmail = req.user?.email || 'ravi.kumar@tadipatri.org';

      const created = await createNewIssue({
        title: title.trim(),
        description: description.trim(),
        category,
        subcategory,
        priority: priority || 'Medium',
        departmentId: departmentId ? Number(departmentId) : 1,
        secondaryDepartmentId: secondaryDepartmentId
          ? Number(secondaryDepartmentId)
          : null,
        reporterUid,
        reporterName,
        reporterEmail,
        isAnonymous: Boolean(isAnonymous),
        latitude: Number(latitude) || 14.9091,
        longitude: Number(longitude) || 78.0092,
        address: address.trim(),
        wardZone: wardZone || 'Ward 12 — Clock Tower & Yellanur Road, Tadipatri',
        insideServiceArea: insideServiceArea !== false,
        aiCategorySuggestion,
        aiPrioritySuggestion,
        aiConfidence,
        aiReasoning,
        aiSummary,
        aiDuplicateProbability,
        duplicateOfComplaintId,
        slaHours: Number(slaHours) || 24,
        estimatedCostInr: Number(estimatedCostInr) || 12500,
        photoVerificationStatus: photoVerificationStatus || 'Verified Genuine',
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
        overriddenByHuman,
      });

      appCache.invalidatePrefix('analytics');
      broadcastRealtimeEvent('issue:created', {
        issue: created,
        message: `Citizen reported ${created.complaintId} in Tadipatri — Sent to Admin for Acceptance & Department Split`,
      });

      res.status(201).json(created);
    } catch (error: any) {
      console.error('POST /api/issues failed:', error);
      res.status(500).json({ error: error.message || 'Failed to create issue' });
    }
  });

  // Bulk Admin Accept & Department Split
  app.post('/api/issues/bulk-admin-accept', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No issues selected for bulk split.' });
      }
      const results = [];
      for (const item of items) {
        const updated = await adminAcceptAndRouteIssue({
          issueId: Number(item.issueId),
          departmentId: Number(item.departmentId) || 1,
          secondaryDepartmentId: item.secondaryDepartmentId
            ? Number(item.secondaryDepartmentId)
            : null,
          priority: item.priority || 'High',
          slaHours: Number(item.slaHours) || 24,
          estimatedCostInr: Number(item.estimatedCostInr) || 12500,
          budgetApproved: true,
          adminUid: req.user!.uid,
          adminName: req.user!.name,
          adminNote: 'Bulk accepted & routed department-wise by Municipal Commissioner.',
          decision: 'accept',
        });
        results.push(updated);
      }

      appCache.invalidatePrefix('analytics');
      broadcastRealtimeEvent('issue:admin_accepted', {
        count: results.length,
        message: `Admin bulk-accepted and split ${results.length} citizen report(s) across Tadipatri Departments!`,
      });

      res.json({ updatedCount: results.length, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Bulk Admin split failed' });
    }
  });

  // Admin Accepts & Splits Complaint Department-Wise
  app.post('/api/issues/:id/admin-accept', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {
        departmentId,
        secondaryDepartmentId,
        priority,
        slaHours,
        estimatedCostInr,
        budgetApproved,
        adminNote,
        decision,
      } = req.body;
      if (!departmentId && decision !== 'reject') {
        return res.status(400).json({
          error: 'Target Municipal Department selection is required to split the report.',
        });
      }

      const updated = await adminAcceptAndRouteIssue({
        issueId: Number(req.params.id),
        departmentId: Number(departmentId) || 1,
        secondaryDepartmentId: secondaryDepartmentId
          ? Number(secondaryDepartmentId)
          : null,
        priority: priority || 'High',
        slaHours: Number(slaHours) || 24,
        estimatedCostInr:
          estimatedCostInr !== undefined ? Number(estimatedCostInr) : undefined,
        budgetApproved:
          budgetApproved !== undefined ? Boolean(budgetApproved) : true,
        adminUid: req.user!.uid,
        adminName: req.user!.name,
        adminNote,
        decision: decision === 'reject' ? 'reject' : 'accept',
      });

      appCache.invalidatePrefix('analytics');
      broadcastRealtimeEvent('issue:admin_accepted', {
        issueId: updated.id,
        complaintId: updated.complaintId,
        departmentId: updated.departmentId,
        status: updated.status,
        message:
          decision === 'reject'
            ? `Admin rejected complaint ${updated.complaintId}`
            : `Admin accepted ${updated.complaintId} and split it to Department #${updated.departmentId} — Now live on Tadipatri Map & Department Console!`,
      });

      res.json(updated);
    } catch (error: any) {
      console.error('POST /api/issues/:id/admin-accept failed:', error);
      res.status(500).json({
        error: error.message || 'Failed to accept and split complaint department-wise',
      });
    }
  });

  // Commissioner Show-Cause Notice Generator
  app.post('/api/issues/:id/show-cause', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { noticeText } = req.body;
      const updated = await issueShowCauseNotice({
        issueId: Number(req.params.id),
        adminUid: req.user!.uid,
        adminName: req.user!.name,
        noticeText:
          noticeText ||
          'Formal Show-Cause Notice issued by Tadipatri Municipal Commissioner for SLA breach. Immediate field action required within 4 hours.',
      });

      broadcastRealtimeEvent('issue:sla_escalated', {
        issueId: updated.id,
        complaintId: updated.complaintId,
        message: `COMMISSIONER SHOW-CAUSE NOTICE served for ${updated.complaintId}`,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to issue Show-Cause Notice' });
    }
  });

  app.patch('/api/issues/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {
        status,
        note,
        resolutionNotes,
        resolutionEvidenceUrl,
        priorityOverride,
        materialsUsed,
        estimatedCostInr,
        budgetApproved,
      } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Target status is required.' });
      }

      const updated = await updateIssueStatus({
        issueId: Number(req.params.id),
        newStatus: status,
        actorUid: req.user!.uid,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        note,
        resolutionNotes,
        resolutionEvidenceUrl,
        priorityOverride,
        materialsUsed,
        estimatedCostInr,
        budgetApproved,
      });

      appCache.invalidatePrefix('analytics');
      broadcastRealtimeEvent('issue:status_changed', {
        issueId: updated.id,
        complaintId: updated.complaintId,
        newStatus: updated.status,
        actorName: req.user!.name,
        message: `Complaint ${updated.complaintId} status changed to ${updated.status}`,
      });

      res.json(updated);
    } catch (error: any) {
      console.error('PATCH /api/issues/:id/status failed:', error);
      res.status(500).json({ error: error.message || 'Failed to update status' });
    }
  });

  app.post('/api/issues/:id/assign', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { workerId, note } = req.body;
      if (!workerId) {
        return res.status(400).json({ error: 'Field worker selection is required.' });
      }

      const updated = await assignWorkerToIssue({
        issueId: Number(req.params.id),
        workerId: Number(workerId),
        actorUid: req.user!.uid,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        note,
      });

      appCache.invalidatePrefix('analytics');
      broadcastRealtimeEvent('issue:assigned', {
        issueId: updated.id,
        complaintId: updated.complaintId,
        workerName: updated.assignedWorkerName,
        message: `Complaint ${updated.complaintId} assigned to ${updated.assignedWorkerName}`,
      });

      res.json(updated);
    } catch (error: any) {
      console.error('POST /api/issues/:id/assign failed:', error);
      res.status(500).json({ error: error.message || 'Failed to assign worker' });
    }
  });

  app.post('/api/issues/:id/comments', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { content, isInternal } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content cannot be empty.' });
      }

      const created = await addIssueComment({
        issueId: Number(req.params.id),
        authorUid: req.user!.uid,
        authorName: req.user!.name,
        authorRole: req.user!.role,
        content: content.trim(),
        isInternal: Boolean(isInternal) && req.user!.role !== 'citizen',
      });

      broadcastRealtimeEvent('issue:comment_added', {
        issueId: Number(req.params.id),
        comment: created,
      });

      res.status(201).json(created);
    } catch (error: any) {
      console.error('POST /api/issues/:id/comments failed:', error);
      res.status(500).json({ error: error.message || 'Failed to add comment' });
    }
  });

  app.post('/api/issues/:id/confirm', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { confirmed, rating, comment } = req.body;
      const updated = await confirmIssueResolution({
        issueId: Number(req.params.id),
        citizenUid: req.user!.uid,
        citizenName: req.user!.name,
        confirmed: confirmed !== false,
        rating: Number(rating) || 5,
        comment: comment || 'Verified resolved.',
      });

      appCache.invalidatePrefix('analytics');
      broadcastRealtimeEvent('issue:status_changed', {
        issueId: updated.id,
        complaintId: updated.complaintId,
        newStatus: updated.status,
        actorName: req.user!.name,
        message: `Citizen ${req.user!.name} ${confirmed !== false ? 'confirmed closure of' : 'reopened'} ${updated.complaintId}`,
      });

      res.json(updated);
    } catch (error: any) {
      console.error('POST /api/issues/:id/confirm failed:', error);
      res.status(500).json({ error: error.message || 'Failed to confirm resolution' });
    }
  });

  app.post('/api/issues/:id/escalate', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { reason } = req.body;
      const updated = await escalateIssueSla({
        issueId: Number(req.params.id),
        actorUid: req.user!.uid,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        reason: reason || 'SLA threshold breached — expedited executive dispatch requested.',
      });

      appCache.invalidatePrefix('analytics');
      broadcastRealtimeEvent('issue:sla_escalated', {
        issueId: updated.id,
        complaintId: updated.complaintId,
        escalationLevel: updated.escalationLevel,
        message: `SLA Escalation Level ${updated.escalationLevel} triggered for ${updated.complaintId}`,
      });

      res.json(updated);
    } catch (error: any) {
      console.error('POST /api/issues/:id/escalate failed:', error);
      res.status(500).json({ error: error.message || 'Failed to escalate complaint' });
    }
  });

  app.post('/api/issues/:id/upvote', async (req, res) => {
    try {
      const updated = await upvoteIssueById(Number(req.params.id));
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to upvote issue' });
    }
  });

  // --- METADATA, DEPARTMENTS, WORKERS, SLA, ANALYTICS ---
  app.get('/api/departments', async (_req, res) => {
    try {
      const list = await getAllDepartments();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/categories', async (_req, res) => {
    try {
      const list = await getAllCategories();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/workers', async (_req, res) => {
    try {
      const list = await getAllWorkers();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sla-rules', async (_req, res) => {
    try {
      const rules = await getAllSlaRules();
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch(
    '/api/sla-rules/:id',
    requireAuth,
    requireRole(['admin']),
    async (req, res) => {
      try {
        const { resolutionHours, responseHours, autoEscalate } = req.body;
        const updated = await updateSlaRuleById(
          Number(req.params.id),
          Number(resolutionHours),
          Number(responseHours),
          Boolean(autoEscalate)
        );
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get('/api/analytics', async (_req, res) => {
    try {
      const [allIssues, allDepts, allWorkers] = await Promise.all([
        getAllIssues(),
        getAllDepartments(),
        getAllWorkers(),
      ]);

      const acceptedIssues = allIssues.filter(
        (i) => i.status !== 'Pending Admin Review' && i.status !== 'Rejected'
      );
      const pendingAdminCount = allIssues.filter(
        (i) => i.status === 'Pending Admin Review'
      ).length;

      const totalIssues = acceptedIssues.length;
      const resolvedIssues = acceptedIssues.filter(
        (i) =>
          i.status === 'Resolved' ||
          i.status === 'Citizen Confirmation' ||
          i.status === 'Closed'
      ).length;
      const inProgressIssues = acceptedIssues.filter(
        (i) => i.status === 'In Progress' || i.status === 'Assigned'
      ).length;
      const pendingIssues = acceptedIssues.filter(
        (i) => i.status === 'Verified' || i.status === 'Reported'
      ).length;
      const criticalIssues = acceptedIssues.filter(
        (i) => i.priority === 'Critical'
      ).length;
      const now = Date.now();
      const overdueIssues = acceptedIssues.filter(
        (i) =>
          i.isOverdue ||
          (i.status !== 'Resolved' &&
            i.status !== 'Closed' &&
            new Date(i.slaDeadline).getTime() < now)
      ).length;

      const totalBudgetEstimatedInr = allIssues.reduce(
        (acc, i) => acc + (i.estimatedCostInr || 0),
        0
      );
      const totalBudgetApprovedInr = acceptedIssues
        .filter((i) => i.budgetApproved)
        .reduce((acc, i) => acc + (i.estimatedCostInr || 0), 0);

      const resolutionRate =
        totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 100;
      const slaCompliantCount = totalIssues - overdueIssues;
      const slaComplianceRate =
        totalIssues > 0
          ? Math.round((slaCompliantCount / totalIssues) * 100)
          : 100;

      const categoryMap = new Map<string, { name: string; count: number; resolved: number }>();
      for (const issue of acceptedIssues) {
        const entry = categoryMap.get(issue.category) || {
          name: issue.category,
          count: 0,
          resolved: 0,
        };
        entry.count += 1;
        if (issue.status === 'Resolved' || issue.status === 'Closed') {
          entry.resolved += 1;
        }
        categoryMap.set(issue.category, entry);
      }

      const departmentPerformance = allDepts.map((dept) => {
        const deptIssues = acceptedIssues.filter(
          (i) =>
            i.departmentId === dept.id || i.secondaryDepartmentId === dept.id
        );
        const deptResolved = deptIssues.filter(
          (i) => i.status === 'Resolved' || i.status === 'Closed'
        ).length;
        const deptOverdue = deptIssues.filter((i) => i.isOverdue).length;
        return {
          id: dept.id,
          code: dept.code,
          name: dept.name,
          headOfficer: dept.headOfficerName,
          total: deptIssues.length,
          resolved: deptResolved,
          overdue: deptOverdue,
          complianceRate:
            deptIssues.length > 0
              ? Math.round(
                  ((deptIssues.length - deptOverdue) / deptIssues.length) * 100
                )
              : 100,
          avgResolutionHours: deptIssues.length > 0 ? 14.5 : 0,
        };
      });

      const trendData = [
        { day: 'Today', reported: allIssues.length, resolved: resolvedIssues, slaRate: slaComplianceRate },
      ];

      const payload = {
        kpis: {
          totalComplaints: totalIssues,
          pendingAdminCount,
          allSubmittedCount: allIssues.length,
          historicalCityTotal: totalIssues,
          historicalCityResolved: resolvedIssues,
          activeDepartmentsCount: allDepts.length,
          resolvedCount: resolvedIssues,
          inProgressCount: inProgressIssues,
          pendingCount: pendingIssues,
          criticalCount: criticalIssues,
          overdueCount: overdueIssues,
          resolutionRate,
          slaComplianceRate,
          avgResolutionHours: totalIssues > 0 ? 14.5 : 0,
          duplicatePreventionRate: 100,
          totalBudgetEstimatedInr,
          totalBudgetApprovedInr,
          warRoomActive: warRoomActiveState,
        },
        byCategory: Array.from(categoryMap.values()),
        departmentPerformance,
        trendData,
        workersSummary: {
          totalWorkers: allWorkers.length,
          availableWorkers: allWorkers.filter((w) => w.status === 'available').length,
          busyWorkers: allWorkers.filter((w) => w.status === 'busy').length,
        },
      };

      res.json(payload);
    } catch (error: any) {
      console.error('GET /api/analytics failed:', error);
      res.status(500).json({ error: error.message || 'Failed to compute analytics' });
    }
  });

  app.get('/api/notifications', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const list = await getNotificationsForUser(req.user?.uid, req.user?.role);
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const updated = await markNotificationRead(Number(req.params.id));
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/audit-logs', requireAuth, async (_req, res) => {
    try {
      const logs = await getAuditLogsList();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/users', requireAuth, async (_req, res) => {
    try {
      const all = await listAllUsers();
      res.json(
        all.map((u) => ({
          id: u.id,
          uid: u.uid,
          email: u.email,
          name: u.name,
          role: u.role,
          departmentId: u.departmentId,
          phone: u.phone,
          emailVerified: u.emailVerified,
          createdAt: u.createdAt,
        }))
      );
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch(
    '/api/users/:id/role',
    requireAuth,
    requireRole(['admin']),
    async (req, res) => {
      try {
        const { role, departmentId } = req.body;
        const updated = await updateUserRoleAndDept(
          Number(req.params.id),
          role,
          departmentId ? Number(departmentId) : null
        );
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicFix Tadipatri server running on http://localhost:${PORT}`);
  });
}

startServer();

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Users,
  FileText,
  BarChart3,
  Map as MapIcon,
  CheckCircle2,
  Inbox,
  Building2,
  Sparkles,
  Download,
  ArrowUpRight,
  XCircle,
  Siren,
  IndianRupee,
  FileWarning,
  Layers,
  EyeOff,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type {
  CivicIssue,
  Department,
  AnalyticsSummary,
  SlaRule,
  AuditLogItem,
  UserProfile,
} from '../types.ts';
import { CityMap } from './CityMap.tsx';
import { SafeImage } from './SafeImage.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminDashboardProps {
  issues: CivicIssue[];
  departments: Department[];
  analytics: AnalyticsSummary | null;
  onSelectIssue: (issue: CivicIssue) => void;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  issues,
  departments,
  analytics,
  onSelectIssue,
  onRefresh,
}) => {
  const { user, authFetch, realtimeTick } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<
    'intake' | 'overview' | 'heatmap' | 'sla' | 'users' | 'audit'
  >('intake');

  const [slaRules, setSlaRules] = useState<SlaRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState<boolean>(false);
  const [warRoomActive, setWarRoomActive] = useState<boolean>(
    analytics?.warRoomMode?.active || false
  );
  const [warRoomBusy, setWarRoomBusy] = useState<boolean>(false);

  // Per-issue Admin Split state (departmentId, secondaryDepartmentId, priority, slaHours, estimatedCostInr, note)
  const [splitSelections, setSplitSelections] = useState<
    Record<
      number,
      {
        departmentId: number;
        secondaryDepartmentId: number | null;
        priority: string;
        slaHours: number;
        estimatedCostInr: number;
        adminNote: string;
      }
    >
  >({});

  const loadAdminData = useCallback(async () => {
    try {
      const [slaRes, auditRes, usersRes] = await Promise.all([
        authFetch('/api/sla-rules'),
        authFetch('/api/audit-logs'),
        authFetch('/api/users'),
      ]);
      if (slaRes.ok) setSlaRules(await slaRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (usersRes.ok) setUsersList(await usersRes.json());
    } catch {
      // Ignore error
    }
  }, [authFetch]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData, realtimeTick]);

  useEffect(() => {
    if (analytics?.warRoomMode) {
      setWarRoomActive(analytics.warRoomMode.active);
    }
  }, [analytics?.warRoomMode]);

  const pendingAdminIssues = issues.filter(
    (i) => i.status === 'Pending Admin Review'
  );
  const acceptedIssues = issues.filter(
    (i) => i.status !== 'Pending Admin Review' && i.status !== 'Rejected'
  );

  const getSplitConfig = (issue: CivicIssue) => {
    if (splitSelections[issue.id]) {
      return splitSelections[issue.id];
    }
    return {
      departmentId: issue.departmentId || 1,
      secondaryDepartmentId: issue.secondaryDepartmentId || null,
      priority: issue.priority || 'High',
      slaHours: issue.slaHours || 24,
      estimatedCostInr: issue.estimatedCostInr || 12500,
      adminNote: '',
    };
  };

  const updateSplitConfig = (
    issue: CivicIssue,
    patch: Partial<{
      departmentId: number;
      secondaryDepartmentId: number | null;
      priority: string;
      slaHours: number;
      estimatedCostInr: number;
      adminNote: string;
    }>
  ) => {
    const current = getSplitConfig(issue);
    setSplitSelections((prev) => ({
      ...prev,
      [issue.id]: { ...current, ...patch },
    }));
  };

  const handleAdminDecision = async (
    issue: CivicIssue,
    decision: 'accept' | 'reject'
  ) => {
    const cfg = getSplitConfig(issue);
    setSavingId(issue.id);
    try {
      const res = await authFetch(`/api/issues/${issue.id}/admin-accept`, {
        method: 'POST',
        body: JSON.stringify({
          departmentId: cfg.departmentId,
          secondaryDepartmentId: cfg.secondaryDepartmentId,
          priority: cfg.priority,
          slaHours: cfg.slaHours,
          estimatedCostInr: cfg.estimatedCostInr,
          budgetApproved: true,
          adminNote:
            cfg.adminNote ||
            (decision === 'accept'
              ? 'Verified by Tadipatri Municipal Commissioner and split department-wise.'
              : 'Rejected during Admin verification.'),
          decision,
        }),
      });
      if (res.ok) {
        await loadAdminData();
        onRefresh();
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleBulkAutoSplit = async () => {
    if (pendingAdminIssues.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await authFetch('/api/issues/bulk-admin-accept', {
        method: 'POST',
        body: JSON.stringify({
          issueIds: pendingAdminIssues.map((i) => i.id),
        }),
      });
      if (res.ok) {
        await loadAdminData();
        onRefresh();
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const handleToggleWarRoom = async () => {
    setWarRoomBusy(true);
    try {
      const nextState = !warRoomActive;
      const res = await authFetch('/api/admin/war-room', {
        method: 'POST',
        body: JSON.stringify({
          active: nextState,
          title: 'Tadipatri Monsoon & Flood Emergency Task Force Protocol',
        }),
      });
      if (res.ok) {
        setWarRoomActive(nextState);
        onRefresh();
      }
    } finally {
      setWarRoomBusy(false);
    }
  };

  const handleIssueShowCause = async (issue: CivicIssue) => {
    setSavingId(issue.id);
    try {
      const res = await authFetch(`/api/issues/${issue.id}/show-cause`, {
        method: 'POST',
        body: JSON.stringify({
          reason: `Commissioner Show-Cause Notice issued for SLA delay on ${issue.complaintId} (${issue.departmentName}).`,
        }),
      });
      if (res.ok) {
        await loadAdminData();
        onRefresh();
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Complaint_ID',
      'Status',
      'Category',
      'Priority',
      'Primary_Department',
      'Secondary_Department',
      'Estimated_Cost_INR',
      'Title',
      'Tadipatri_Ward',
      'Address',
      'Reporter_Name',
      'Created_At',
    ];
    const rows = issues.map((i) => [
      i.complaintId,
      i.status,
      i.category,
      i.priority,
      `"${(i.departmentName || '').replace(/"/g, '""')}"`,
      `"${(i.secondaryDepartmentName || 'None').replace(/"/g, '""')}"`,
      i.estimatedCostInr || 0,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.wardZone.replace(/"/g, '""')}"`,
      `"${i.address.replace(/"/g, '""')}"`,
      `"${(i.isAnonymous ? 'Anonymous Whistleblower' : i.reporterName).replace(/"/g, '""')}"`,
      new Date(i.createdAt).toISOString(),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Tadipatri_Municipal_Complaints_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateSla = async (rule: SlaRule) => {
    setSavingId(rule.id);
    try {
      const res = await authFetch(`/api/sla-rules/${rule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          resolutionHours: rule.resolutionHours,
          responseHours: rule.responseHours,
          autoEscalate: rule.autoEscalate,
        }),
      });
      if (res.ok) {
        await loadAdminData();
        onRefresh();
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateUserRole = async (
    targetUserId: number,
    newRole: string,
    deptId: number | null
  ) => {
    setSavingId(targetUserId);
    try {
      const res = await authFetch(`/api/users/${targetUserId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole, departmentId: deptId }),
      });
      if (res.ok) {
        await loadAdminData();
      }
    } finally {
      setSavingId(null);
    }
  };

  const kpis = analytics?.kpis || {
    totalComplaints: acceptedIssues.length,
    pendingAdminCount: pendingAdminIssues.length,
    resolutionRate: 100,
    avgResolutionHours: 0,
    slaComplianceRate: 100,
    criticalCount: acceptedIssues.filter((i) => i.priority === 'Critical').length,
    overdueCount: acceptedIssues.filter((i) => i.isOverdue).length,
    totalEstimatedBudgetInr: acceptedIssues.reduce(
      (acc, i) => acc + (i.estimatedCostInr || 0),
      0
    ),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* War-Room Emergency Banner when active */}
      {warRoomActive && (
        <div className="bg-red-900 text-white rounded-lg p-4 border border-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Siren className="w-6 h-6 text-red-300 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-red-200 font-bold">
                COMMISSIONER EMERGENCY WAR-ROOM PROTOCOL ACTIVE
              </div>
              <div className="text-sm font-bold mt-0.5">
                Tadipatri Monsoon, Flood & Critical Infrastructure Rapid Response Mode
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                All drainage, water supply, and APSPDCL electrical hazard reports are prioritized with shortened 4-hour SLA windows across Wards 1–36.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={warRoomBusy}
            onClick={handleToggleWarRoom}
            className="px-3.5 py-2 text-xs font-bold bg-white text-red-900 hover:bg-red-50 rounded-lg whitespace-nowrap cursor-pointer"
          >
            Stand Down War-Room
          </button>
        </div>
      )}

      {/* Command Center Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono uppercase tracking-wider text-emerald-700 font-bold">
              3) Tadipatri Municipal Admin Command Center
            </span>
            <span>·</span>
            <span>
              Anantapur District, AP · Logged in as {user?.name || 'Municipal Commissioner'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Citizen Report Acceptance & Department-Wise Split Desk
          </h1>
        </div>

        {/* Sub-Navigation Pills + War-Room Toggle + CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={warRoomBusy}
            onClick={handleToggleWarRoom}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              warRoomActive
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
            }`}
          >
            <Siren className="w-3.5 h-3.5" />
            <span>
              {warRoomActive ? 'War-Room ON' : 'Activate Emergency War-Room'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Export CSV</span>
          </button>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            {[
              {
                id: 'intake',
                label: `Citizen Intake (${pendingAdminIssues.length})`,
                icon: Inbox,
              },
              {
                id: 'overview',
                label: 'Dept Split & Budget',
                icon: Building2,
              },
              { id: 'heatmap', label: 'Tadipatri Map', icon: MapIcon },
              { id: 'sla', label: 'SLA Rules', icon: Sliders },
              { id: 'users', label: 'Roles & Officers', icon: Users },
              { id: 'audit', label: 'Audit Logs', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSubTab === tab.id
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 6 Municipal KPI Cards (Includes Municipal Repair Budget in ₹ INR) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border-2 border-amber-400 rounded-lg p-4">
          <div className="text-xs font-semibold text-amber-900">
            Pending Admin Split
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {pendingAdminIssues.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            New citizen reports waiting
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Accepted & Split Issues</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {acceptedIssues.length}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            Live in Tadipatri Depts
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Resolution Rate</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {kpis.resolutionRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Verified closures
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Sanctioned Budget (₹)</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            ₹{(kpis.totalEstimatedBudgetInr || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            Tadipatri Engineering Fund
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">SLA Compliance</div>
          <div className="text-2xl font-bold font-mono text-[#0284C7] mt-1">
            {kpis.slaComplianceRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Within deadline window
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Critical / Overdue</div>
          <div className="text-2xl font-bold font-mono text-red-600 mt-1">
            {kpis.criticalCount} / {kpis.overdueCount}
          </div>
          <div className="text-[11px] text-red-600 mt-1">
            Immediate priority
          </div>
        </div>
      </div>

      {/* TAB 1: CITIZEN INTAKE & DEPARTMENT SPLIT DESK (With Bulk AI Auto-Split & Joint Task Force) */}
      {activeSubTab === 'intake' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Incoming Citizen Reports — Verify, Accept & Split Department-Wise
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every citizen report in Tadipatri lands here first. Select the Primary Department (plus optional Joint Secondary Department & Budget) and click <strong>Accept & Split to Department</strong>.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {pendingAdminIssues.length > 0 && (
                  <button
                    type="button"
                    disabled={bulkBusy}
                    onClick={handleBulkAutoSplit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {bulkBusy
                        ? 'Auto-Splitting...'
                        : `1-Click AI Smart Auto-Split All (${pendingAdminIssues.length})`}
                    </span>
                  </button>
                )}
                <span className="px-3 py-1.5 text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
                  {pendingAdminIssues.length} Pending Review
                </span>
              </div>
            </div>

            {pendingAdminIssues.length === 0 ? (
              <div className="p-10 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-base font-bold text-slate-900">
                  All Citizen Reports Have Been Reviewed & Split!
                </div>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  There are no unverified citizen reports waiting in the Admin queue right now. When a citizen submits a new report in Tadipatri, it will appear here immediately for your acceptance and department-wise split.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAdminIssues.map((issue) => {
                  const cfg = getSplitConfig(issue);
                  return (
                    <div
                      key={issue.id}
                      className="border-2 border-amber-300 bg-amber-50/20 rounded-lg p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
                    >
                      {/* Left 7 Cols: Citizen Report Details & Photo */}
                      <div className="lg:col-span-7 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0284C7] bg-white border border-sky-200 px-2.5 py-0.5 rounded">
                            {issue.complaintId}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-100 text-amber-900">
                            Pending Admin Acceptance
                          </span>
                          <span className="text-xs text-slate-600 font-medium">
                            {issue.category} · {issue.subcategory}
                          </span>
                          {issue.isAnonymous && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                              <EyeOff className="w-3 h-3" />
                              <span>Whistleblower Protected</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900">
                          {issue.title}
                        </h3>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {issue.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span>
                            Ward: <strong className="text-slate-800">{issue.wardZone}</strong>
                          </span>
                          <span>
                            Location: <strong className="text-slate-800">{issue.address}</strong>
                          </span>
                          <span>
                            Citizen:{' '}
                            <strong className="text-slate-800">
                              {issue.isAnonymous
                                ? 'Anonymous Whistleblower'
                                : issue.reporterName}
                            </strong>
                          </span>
                        </div>

                        {issue.aiSummary && (
                          <div className="p-3 bg-slate-900 text-white rounded-lg text-xs space-y-1">
                            <div className="flex items-center justify-between text-sky-400 font-semibold">
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI Recommended Department & Cost</span>
                              </span>
                              <span className="font-mono">
                                Est. ₹{(issue.estimatedCostInr || 12500).toLocaleString('en-IN')} · {Math.round((issue.aiConfidence ?? 0.95) * 100)}% Match
                              </span>
                            </div>
                            <p className="text-slate-200">{issue.aiSummary}</p>
                          </div>
                        )}

                        {issue.beforeImageUrl && (
                          <div className="flex items-center gap-3 pt-1">
                            <div className="w-28 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                              <SafeImage
                                src={issue.beforeImageUrl}
                                alt={issue.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelectIssue(issue)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer"
                            >
                              <span>Open Full Citizen Dossier & Map Pin</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right 5 Cols: Admin Department Split Controls (Primary + Joint Secondary + Budget) */}
                      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                        <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                          <span>Split Report to Tadipatri Department</span>
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Primary Municipal Department *
                          </label>
                          <select
                            value={cfg.departmentId}
                            onChange={(e) =>
                              updateSplitConfig(issue, {
                                departmentId: Number(e.target.value),
                              })
                            }
                            className="w-full px-2.5 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                Dept #{d.id}: {d.name} — {d.headOfficerName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Joint Supporting Department (Multi-Dept Split)
                          </label>
                          <select
                            value={cfg.secondaryDepartmentId || ''}
                            onChange={(e) =>
                              updateSplitConfig(issue, {
                                secondaryDepartmentId: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="">None (Single Department)</option>
                            {departments
                              .filter((d) => d.id !== cfg.departmentId)
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  Joint Support: {d.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Priority
                            </label>
                            <select
                              value={cfg.priority}
                              onChange={(e) =>
                                updateSplitConfig(issue, {
                                  priority: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                            >
                              <option value="Critical">Critical</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              SLA (Hrs)
                            </label>
                            <input
                              type="number"
                              min={4}
                              max={336}
                              value={cfg.slaHours}
                              onChange={(e) =>
                                updateSplitConfig(issue, {
                                  slaHours: Number(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Budget (₹)
                            </label>
                            <input
                              type="number"
                              min={500}
                              step={500}
                              value={cfg.estimatedCostInr}
                              onChange={(e) =>
                                updateSplitConfig(issue, {
                                  estimatedCostInr: Number(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Admin Instruction for Department Officer
                          </label>
                          <input
                            type="text"
                            value={cfg.adminNote}
                            onChange={(e) =>
                              updateSplitConfig(issue, {
                                adminNote: e.target.value,
                              })
                            }
                            placeholder="e.g., Accepted by Admin. Dispatch field crew immediately."
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={savingId === issue.id}
                            onClick={() => handleAdminDecision(issue, 'accept')}
                            className="flex-1 py-2.5 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                          >
                            {savingId === issue.id
                              ? 'Splitting...'
                              : 'Accept & Split to Department'}
                          </button>
                          <button
                            type="button"
                            disabled={savingId === issue.id}
                            onClick={() => handleAdminDecision(issue, 'reject')}
                            className="py-2.5 px-3 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENT-WISE SPLIT BOARD, PREDICTIVE AI ALERTS & ANALYTICS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Predictive Infrastructure Maintenance Alerts (Feature #15) */}
          {analytics?.predictiveAlerts && analytics.predictiveAlerts.length > 0 && (
            <div className="bg-slate-900 text-white rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <h2 className="text-base font-bold">
                    AI Predictive Infrastructure Maintenance Alerts (Tadipatri Wards 1–36)
                  </h2>
                </div>
                <span className="text-xs font-mono text-sky-300">
                  Preventive Engineering Intelligence
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.predictiveAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-lg bg-slate-800/90 border border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-amber-400">
                        {alert.wardZone} · {alert.category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold text-[11px]">
                        {alert.severity} Risk ({alert.incidentCount} incidents)
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {alert.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Department-Wise Split Summary Grid (Includes Budget Allocated per Dept) */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tadipatri Department-Wise Split Board & Engineering Budget (8 Divisions)
              </h2>
              <p className="text-xs text-slate-500">
                Live breakdown of accepted citizen complaints and sanctioned repair budgets split across each Tadipatri municipal department.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {departments.map((dept) => {
                const deptIssues = acceptedIssues.filter(
                  (i) =>
                    i.departmentId === dept.id ||
                    i.secondaryDepartmentId === dept.id
                );
                const resolvedCount = deptIssues.filter(
                  (i) =>
                    i.status === 'Resolved' ||
                    i.status === 'Citizen Confirmation' ||
                    i.status === 'Closed'
                ).length;
                const deptBudget = deptIssues.reduce(
                  (sum, i) => sum + (i.estimatedCostInr || 0),
                  0
                );
                return (
                  <div
                    key={dept.id}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-[#0284C7]">
                        {dept.code}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200">
                        {deptIssues.length} Split Issues
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {dept.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Officer: {dept.headOfficerName}
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-emerald-700 font-semibold">
                        Resolved: {resolvedCount}
                      </span>
                      <span className="font-mono text-slate-700 font-semibold flex items-center">
                        <IndianRupee className="w-3 h-3" />
                        {deptBudget.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accepted Issues Register with Re-Split & Show-Cause Notice Action */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Accepted & Split Tadipatri Complaints ({acceptedIssues.length})
            </h2>
            {acceptedIssues.length === 0 ? (
              <p className="text-xs text-slate-500">
                No complaints have been accepted and split yet. Accept a citizen report in the Intake tab or submit a new report to see it here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                      <th className="py-2.5 px-3 font-semibold">ID</th>
                      <th className="py-2.5 px-3 font-semibold">Issue Title</th>
                      <th className="py-2.5 px-3 font-semibold">Ward</th>
                      <th className="py-2.5 px-3 font-semibold">
                        Split Department (Re-Split)
                      </th>
                      <th className="py-2.5 px-3 font-semibold">Budget (₹)</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {acceptedIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0284C7]">
                          {issue.complaintId}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div>{issue.title}</div>
                          {issue.secondaryDepartmentName && (
                            <div className="text-[10px] text-indigo-700">
                              + Joint Support: {issue.secondaryDepartmentName}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {issue.wardZone}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={issue.departmentId ?? 1}
                            onChange={async (e) => {
                              const newDeptId = Number(e.target.value);
                              await authFetch(
                                `/api/issues/${issue.id}/admin-accept`,
                                {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    departmentId: newDeptId,
                                    priority: issue.priority,
                                    slaHours: issue.slaHours,
                                    adminNote:
                                      'Re-split to new department by Admin.',
                                    decision: 'accept',
                                  }),
                                }
                              );
                              onRefresh();
                            }}
                            className="px-2 py-1 text-xs border border-slate-300 rounded bg-white font-medium"
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                          ₹{(issue.estimatedCostInr || 12500).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                            {issue.status}
                          </span>
                          {issue.showCauseIssued && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                              Show-Cause Sent
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            {!issue.showCauseIssued &&
                              issue.status !== 'Resolved' &&
                              issue.status !== 'Closed' && (
                                <button
                                  type="button"
                                  disabled={savingId === issue.id}
                                  onClick={() => handleIssueShowCause(issue)}
                                  title="Issue Show-Cause Notice to Department Officer"
                                  className="px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded cursor-pointer inline-flex items-center gap-1"
                                >
                                  <FileWarning className="w-3 h-3" />
                                  <span>Show-Cause</span>
                                </button>
                              )}
                            <button
                              type="button"
                              onClick={() => onSelectIssue(issue)}
                              className="text-[#0284C7] font-semibold hover:underline cursor-pointer"
                            >
                              Inspect →
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Analytics Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0284C7]" />
              <h2 className="text-base font-bold text-slate-900">
                Department Performance & SLA Compliance
              </h2>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.departmentPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="code"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar
                    dataKey="totalAssigned"
                    name="Accepted & Split"
                    fill="#0284C7"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="resolvedCount"
                    name="Resolved"
                    fill="#16A34A"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TADIPATRI HEATMAP */}
      {activeSubTab === 'heatmap' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Tadipatri Ward Incident Density & Spatial Heatmap (Accepted Reports)
            </h2>
            <p className="text-xs text-slate-500">
              Displays only verified complaints accepted by the Municipal Admin across Tadipatri Wards 1–36.
            </p>
          </div>
          <CityMap
            issues={acceptedIssues}
            onSelectIssue={onSelectIssue}
            defaultHeatmap={true}
            heightClass="h-[520px]"
          />
        </div>
      )}

      {/* TAB 4: SLA CONFIGURATION MATRIX */}
      {activeSubTab === 'sla' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Tadipatri Municipal SLA Rules & Escalation Thresholds
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure response and resolution deadlines (in hours) for each civic issue category.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Default Priority</th>
                  <th className="py-3 px-4">Response Window (Hrs)</th>
                  <th className="py-3 px-4">Resolution Deadline (Hrs)</th>
                  <th className="py-3 px-4">Auto-Escalate</th>
                  <th className="py-3 px-4 text-right">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {slaRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {rule.categoryName}
                    </td>
                    <td className="py-3 px-4">{rule.priority}</td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={1}
                        max={72}
                        value={rule.responseHours}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSlaRules((prev) =>
                            prev.map((r) =>
                              r.id === rule.id ? { ...r, responseHours: val } : r
                            )
                          );
                        }}
                        className="w-20 px-2 py-1 border border-slate-300 rounded font-mono"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={2}
                        max={336}
                        value={rule.resolutionHours}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSlaRules((prev) =>
                            prev.map((r) =>
                              r.id === rule.id
                                ? { ...r, resolutionHours: val }
                                : r
                            )
                          );
                        }}
                        className="w-24 px-2 py-1 border border-slate-300 rounded font-mono"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={rule.autoEscalate}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setSlaRules((prev) =>
                            prev.map((r) =>
                              r.id === rule.id ? { ...r, autoEscalate: val } : r
                            )
                          );
                        }}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={savingId === rule.id}
                        onClick={() => handleUpdateSla(rule)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ROLES & DEPARTMENT OFFICERS */}
      {activeSubTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Tadipatri Municipal Users, Department Officers & Role Access Control
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage Citizen, Department Officer, and Admin permissions across Tadipatri Municipality.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          u.id &&
                          handleUpdateUserRole(
                            u.id,
                            e.target.value,
                            u.departmentId
                          )
                        }
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value="citizen">1) Citizen</option>
                        <option value="officer">2) Department Officer</option>
                        <option value="admin">3) Municipal Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={u.departmentId || ''}
                        onChange={(e) =>
                          u.id &&
                          handleUpdateUserRole(
                            u.id,
                            u.role,
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white"
                      >
                        <option value="">Unassigned (Citizen / Central)</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: IMMUTABLE AUDIT LOGS */}
      {activeSubTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              System Governance & Audit Log Stream (Tadipatri Municipality)
            </h2>
          </div>
          <div className="divide-y divide-slate-200 text-xs">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0284C7] px-2 py-0.5 bg-sky-50 rounded">
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {log.entityType} · {log.entityId}
                    </span>
                  </div>
                  <p className="text-slate-600">{log.details}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-slate-800">
                    {log.actorName} ({log.actorRole})
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

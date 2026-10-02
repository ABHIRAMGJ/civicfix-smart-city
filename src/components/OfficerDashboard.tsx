import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Search,
  ArrowUpRight,
  Building2,
  FileWarning,
  IndianRupee,
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
  FieldWorker,
  Department,
  AnalyticsSummary,
} from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { CityMap } from './CityMap.tsx';

interface OfficerDashboardProps {
  issues: CivicIssue[];
  workers: FieldWorker[];
  departments: Department[];
  analytics: AnalyticsSummary | null;
  onSelectIssue: (issue: CivicIssue) => void;
  onRefresh: () => void;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  issues,
  workers,
  departments,
  analytics,
  onSelectIssue,
  onRefresh,
}) => {
  const { user, authFetch, switchRolePersona } = useAuth();
  const [queueTab, setQueueTab] = useState<
    'all' | 'critical' | 'overdue' | 'unassigned'
  >('all');
  const [deptFilter, setDeptFilter] = useState<string>(
    user?.departmentId ? String(user.departmentId) : 'All'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickActionBusy, setQuickActionBusy] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role === 'officer' && user.departmentId) {
      setDeptFilter(String(user.departmentId));
    }
  }, [user?.role, user?.departmentId]);

  // Only Admin-Accepted issues appear in the Department Officer Console
  const acceptedIssues = issues.filter(
    (i) => i.status !== 'Pending Admin Review' && i.status !== 'Rejected'
  );

  const deptIssues =
    deptFilter === 'All'
      ? acceptedIssues
      : acceptedIssues.filter(
          (i) =>
            String(i.departmentId) === deptFilter ||
            String(i.secondaryDepartmentId) === deptFilter
        );

  const deptWorkers =
    deptFilter === 'All'
      ? workers
      : workers.filter((w) => String(w.departmentId) === deptFilter);

  const currentDeptObj =
    deptFilter !== 'All'
      ? departments.find((d) => String(d.id) === deptFilter)
      : null;

  const totalAssigned = deptIssues.length;
  const pendingCount = deptIssues.filter((i) => i.status === 'Verified').length;
  const inProgressCount = deptIssues.filter(
    (i) => i.status === 'Assigned' || i.status === 'In Progress'
  ).length;
  const resolvedCount = deptIssues.filter(
    (i) => i.status === 'Resolved' || i.status === 'Closed'
  ).length;
  const overdueCount = deptIssues.filter((i) => i.isOverdue).length;
  const criticalCount = deptIssues.filter(
    (i) => i.priority === 'Critical'
  ).length;

  const displayedIssues = deptIssues.filter((item) => {
    if (queueTab === 'critical' && item.priority !== 'Critical') return false;
    if (queueTab === 'overdue' && !item.isOverdue) return false;
    if (queueTab === 'unassigned' && item.assignedWorkerId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.complaintId.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.wardZone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleQuickAssign = async (issueId: number, workerId: number) => {
    setQuickActionBusy(issueId);
    try {
      const res = await authFetch(`/api/issues/${issueId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          workerId,
          note: 'Dispatched to Tadipatri field supervisor from Department Console.',
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setQuickActionBusy(null);
    }
  };

  const handleQuickResolve = async (issueId: number) => {
    setQuickActionBusy(issueId);
    try {
      const res = await authFetch(`/api/issues/${issueId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Resolved',
          note: 'Field work completed and verified by Tadipatri Department Officer.',
          materialsUsed: 'Standard municipal repair kit & field crew inspection',
          resolutionNotes:
            'On-site municipal repair completed and verified by Division Head.',
          resolutionEvidenceUrl:
            '/src/assets/images/issue_resolved_road_1790922369801.jpg',
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setQuickActionBusy(null);
    }
  };

  const categoryChartData =
    analytics?.byCategory && analytics.byCategory.length > 0
      ? analytics.byCategory
      : [
          { name: 'Roads', count: 0, resolved: 0 },
          { name: 'Water', count: 0, resolved: 0 },
          { name: 'Electricity', count: 0, resolved: 0 },
          { name: 'Sanitation', count: 0, resolved: 0 },
          { name: 'Drainage', count: 0, resolved: 0 },
        ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono uppercase tracking-wider text-amber-700 font-bold">
              2) Tadipatri Department Officer Operations Console
            </span>
            <span>·</span>
            <span>Anantapur District, Andhra Pradesh</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {currentDeptObj
              ? `${currentDeptObj.name} — Officer: ${currentDeptObj.headOfficerName}`
              : 'All Tadipatri Municipal Departments (Department-Wise Queue)'}
          </h1>
        </div>

        {/* Switch Department Division Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-slate-600">
              Active Division:
            </span>
            <select
              value={deptFilter}
              onChange={async (e) => {
                const val = e.target.value;
                setDeptFilter(val);
                if (val !== 'All') {
                  await switchRolePersona('officer', Number(val));
                }
              }}
              className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="All">All 8 Tadipatri Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  Dept #{d.id}: {d.name} ({d.headOfficerName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 6 Operational Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Admin-Split to Dept</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {totalAssigned}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Verified (Ready)</div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {pendingCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Field Crew Active</div>
          <div className="text-2xl font-bold font-mono text-[#0284C7] mt-1">
            {inProgressCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Resolved</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {resolvedCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Critical Priority</div>
          <div className="text-2xl font-bold font-mono text-red-600 mt-1">
            {criticalCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">SLA Overdue</div>
          <div className="text-2xl font-bold font-mono text-red-600 mt-1">
            {overdueCount}
          </div>
        </div>
      </div>

      {/* Main Operations Split: Left 8 Cols Dispatch Table, Right 4 Cols Field Crew & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Department Dispatch Table */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'all', label: `All Split (${deptIssues.length})` },
                { id: 'critical', label: `Critical (${criticalCount})` },
                { id: 'overdue', label: `Overdue (${overdueCount})` },
                {
                  id: 'unassigned',
                  label: `Unassigned (${deptIssues.filter((i) => !i.assignedWorkerId).length})`,
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setQueueTab(t.id as any)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    queueTab === t.id
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by ID, ward, street..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0284C7]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">ID & Ward</th>
                  <th className="py-3 px-4">Complaint & Location</th>
                  <th className="py-3 px-4">Priority / SLA</th>
                  <th className="py-3 px-4">Field Supervisor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {displayedIssues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-2">
                        <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                        <div className="text-sm font-bold text-slate-900">
                          0 Active Issues in This Tadipatri Department Queue
                        </div>
                        <p className="text-xs text-slate-500">
                          No artificial reports are shown. Issues appear here only after a Tadipatri citizen submits a report and the Municipal Admin accepts & splits it to this department.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedIssues.map((issue) => {
                    const deadlineMs = new Date(issue.slaDeadline).getTime();
                    const diffHours = Math.round(
                      (deadlineMs - Date.now()) / 3600000
                    );
                    const isDone =
                      issue.status === 'Resolved' || issue.status === 'Closed';
                    const isOver = !isDone && (issue.isOverdue || diffHours < 0);

                    return (
                      <tr
                        key={issue.id}
                        className="hover:bg-slate-50/90 transition-colors"
                      >
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectIssue(issue)}
                            className="font-mono font-bold text-[#0284C7] hover:underline cursor-pointer"
                          >
                            {issue.complaintId}
                          </button>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {issue.wardZone}
                          </div>
                          {issue.showCauseIssued && (
                            <span className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                              <FileWarning className="w-2.5 h-2.5" />
                              <span>Show-Cause</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top max-w-[230px]">
                          <div className="font-semibold text-slate-900 line-clamp-1">
                            {issue.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {issue.address}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{issue.departmentName}</span>
                            <span className="font-mono text-emerald-700 font-semibold inline-flex items-center">
                              <IndianRupee className="w-2.5 h-2.5" />
                              {(issue.estimatedCostInr || 12500).toLocaleString(
                                'en-IN'
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              issue.priority === 'Critical'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : issue.priority === 'High'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {issue.priority}
                          </span>
                          <div
                            className={`text-[11px] font-mono mt-1 ${
                              isDone
                                ? 'text-emerald-600'
                                : isOver
                                  ? 'text-red-600 font-semibold'
                                  : 'text-slate-500'
                            }`}
                          >
                            {isDone
                              ? 'SLA Met'
                              : isOver
                                ? `${Math.abs(diffHours)}h overdue`
                                : `${diffHours}h left`}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          {issue.assignedWorkerName ? (
                            <div>
                              <div className="font-medium text-slate-900">
                                {issue.assignedWorkerName}
                              </div>
                              <div className="text-[11px] text-emerald-600">
                                Dispatched
                              </div>
                            </div>
                          ) : (
                            <select
                              aria-label="Assign Field Worker"
                              disabled={quickActionBusy === issue.id}
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleQuickAssign(
                                    issue.id,
                                    Number(e.target.value)
                                  );
                                }
                              }}
                              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700"
                            >
                              <option value="" disabled>
                                + Assign Crew...
                              </option>
                              {(deptWorkers.length > 0
                                ? deptWorkers
                                : workers
                              ).map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                            {issue.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {!isDone && (
                              <button
                                type="button"
                                disabled={quickActionBusy === issue.id}
                                onClick={() => handleQuickResolve(issue.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                              >
                                Mark Resolved
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onSelectIssue(issue)}
                              className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                              title="Open Full Dossier"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 4 Cols: Field Supervisors Roster + Live GPS Map */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Tadipatri Field Supervisors ({deptWorkers.length})
              </h2>
              <span className="text-[11px] font-mono text-emerald-600">
                On-Duty Roster
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {deptWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {worker.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {worker.specialty || worker.roleTitle} · {worker.phone}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-white border border-slate-200 text-slate-700">
                    {worker.activeTasksCount} active
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Live Field Crew GPS & Department Map
            </h2>
            <CityMap
              issues={deptIssues}
              workers={deptWorkers}
              onSelectIssue={onSelectIssue}
              heightClass="h-60"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Category Volume vs. Resolved
            </h2>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name="Total"
                    fill="#0F172A"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="resolved"
                    name="Resolved"
                    fill="#0284C7"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

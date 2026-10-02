import React, { useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Bell,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { CivicIssue } from '../types.ts';
import { CityMap } from './CityMap.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface CitizenDashboardProps {
  issues: CivicIssue[];
  initialSearch?: string;
  onOpenReportModal: (category?: string) => void;
  onSelectIssue: (issue: CivicIssue) => void;
  onNavigateAdmin?: () => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({
  issues,
  initialSearch = '',
  onOpenReportModal,
  onSelectIssue,
  onNavigateAdmin,
}) => {
  const { user, notifications, markNotificationAsRead } = useAuth();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [scopeFilter, setScopeFilter] = useState<'accepted' | 'mine'>('accepted');

  // Public accepted issues in Tadipatri (excludes Pending Admin Review & Rejected)
  const acceptedIssues = issues.filter(
    (i) => i.status !== 'Pending Admin Review' && i.status !== 'Rejected'
  );

  // Citizen's own sent reports (includes Pending Admin Review so citizen can track what they sent to Admin)
  const mySentIssues = user
    ? issues.filter(
        (i) => i.reporterUid === user.uid || i.status === 'Pending Admin Review'
      )
    : issues;

  const pendingAdminIssues = issues.filter(
    (i) => i.status === 'Pending Admin Review'
  );

  const baseList = scopeFilter === 'mine' ? mySentIssues : acceptedIssues;

  const filteredIssues = baseList.filter((item) => {
    if (statusFilter !== 'All' && item.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false;
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        item.complaintId.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.wardZone.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalAcceptedCount = acceptedIssues.length;
  const awaitingAdminCount = pendingAdminIssues.length;
  const inProgressCount = acceptedIssues.filter(
    (i) =>
      i.status === 'Verified' ||
      i.status === 'Assigned' ||
      i.status === 'In Progress'
  ).length;
  const resolvedCount = acceptedIssues.filter(
    (i) => i.status === 'Resolved' || i.status === 'Citizen Confirmation'
  ).length;
  const closedCount = acceptedIssues.filter((i) => i.status === 'Closed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="text-xs text-slate-500">
            <span>Tadipatri Citizen Resident Portal</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{user?.name || 'K. Ravi Kumar (Citizen)'}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{user?.email || 'ravi.kumar@tadipatri.org'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Tadipatri Citizen Issue Reporting & Live Ward Tracker
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setScopeFilter('accepted')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                scopeFilter === 'accepted'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin-Accepted Public Issues ({acceptedIssues.length})
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('mine')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                scopeFilter === 'mine'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Sent Reports ({mySentIssues.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenReportModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Send Report to Admin</span>
          </button>
        </div>
      </div>

      {/* Banner if there are Citizen Reports awaiting Admin Acceptance */}
      {awaitingAdminCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-amber-950">
                {awaitingAdminCount} Citizen Report(s) Sent to Tadipatri Municipal Admin — Awaiting Acceptance & Department Split
              </div>
              <p className="text-amber-800 mt-0.5">
                Per municipal policy, newly reported issues remain in the Admin Acceptance Desk until the Commissioner accepts and splits them department-wise.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setScopeFilter('mine')}
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 cursor-pointer"
            >
              View Pending Reports ({awaitingAdminCount})
            </button>
            {onNavigateAdmin && user?.role === 'admin' && (
              <button
                type="button"
                onClick={onNavigateAdmin}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                Open Admin Desk to Accept →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Citizen KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          {
            label: 'Admin-Accepted Active',
            value: totalAcceptedCount,
            color: 'text-slate-900',
          },
          {
            label: 'Awaiting Admin Split',
            value: awaitingAdminCount,
            color: 'text-[#D97706]',
          },
          {
            label: 'Department Working',
            value: inProgressCount,
            color: 'text-[#0284C7]',
          },
          {
            label: 'Resolved (Confirm)',
            value: resolvedCount,
            color: 'text-[#16A34A]',
          },
          { label: 'Closed', value: closedCount, color: 'text-slate-700' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-slate-200 rounded-lg p-4"
          >
            <div className="text-xs text-slate-500">{kpi.label}</div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums mt-1 ${kpi.color}`}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search & Multi-Faceted Filtering */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Complaint ID (CIV-TDP-2026-...), ward, or street..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by Category"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Categories</option>
              {[
                'Roads',
                'Water',
                'Electricity',
                'Sanitation',
                'Traffic',
                'Environment',
                'Drainage',
                'Public Infrastructure',
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by Priority"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Pending Admin Review">Pending Admin Review</option>
              <option value="Verified">Accepted & Split to Dept</option>
              <option value="Assigned">Assigned to Crew</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* High-Density Complaints Table */}
        <div className="overflow-x-auto border-t border-slate-200 pt-2">
          {filteredIssues.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto" />
              <div className="text-sm font-bold text-slate-900">
                {scopeFilter === 'accepted'
                  ? '0 Active Problems in Tadipatri Municipality Right Now'
                  : 'No complaints match your current filter'}
              </div>
              <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                {scopeFilter === 'accepted'
                  ? 'No artificial or placeholder reports are displayed. When a citizen reports a problem in Tadipatri and the Municipal Admin accepts & splits it to a department, it will appear here immediately.'
                  : 'Submit a new civic complaint to send it to the Tadipatri Municipal Admin.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenReportModal()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg cursor-pointer"
                >
                  + Report a Problem in Tadipatri
                </button>
                {awaitingAdminCount > 0 && scopeFilter === 'accepted' && (
                  <button
                    type="button"
                    onClick={() => setScopeFilter('mine')}
                    className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    View {awaitingAdminCount} Report(s) Awaiting Admin Acceptance
                  </button>
                )}
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-3">Complaint ID</th>
                  <th className="py-2.5 px-3">Issue & Department Split</th>
                  <th className="py-2.5 px-3">Tadipatri Location</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    onClick={() => onSelectIssue(issue)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {issue.complaintId}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 line-clamp-1">
                        {issue.title}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        <span>{issue.category}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span className="font-medium text-slate-700">
                          {issue.departmentName || 'Tadipatri Municipal Division'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-[220px] truncate">
                      {issue.address}
                    </td>
                    <td className="py-3 px-3 font-semibold whitespace-nowrap">
                      <span
                        className={
                          issue.priority === 'Critical'
                            ? 'text-[#DC2626]'
                            : issue.priority === 'High'
                              ? 'text-[#D97706]'
                              : 'text-slate-700'
                        }
                      >
                        {issue.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium whitespace-nowrap">
                      <span
                        className={
                          issue.status === 'Pending Admin Review'
                            ? 'text-[#D97706] font-semibold'
                            : issue.status === 'Resolved' || issue.status === 'Closed'
                              ? 'text-[#16A34A] font-semibold'
                              : 'text-slate-800'
                        }
                      >
                        {issue.status === 'Verified'
                          ? 'Accepted & Split to Dept'
                          : issue.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[#0284C7] font-semibold">
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom Split: Tadipatri Ward Map + Live Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#0284C7]" />
              <span>Tadipatri, Anantapur, AP — Admin-Accepted Problems Map</span>
            </h2>
            <span className="text-xs text-slate-500">
              {acceptedIssues.length === 0
                ? '0 Active Problems'
                : `${acceptedIssues.length} Accepted Pin(s)`}
            </span>
          </div>
          <CityMap
            issues={acceptedIssues}
            onSelectIssue={onSelectIssue}
            heightClass="h-[340px]"
          />
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-[#0284C7]" />
              <span>Real-Time Notifications</span>
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {notifications.length} total
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No notifications yet. Submit a report to receive real-time Admin and Department updates.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markNotificationAsRead(n.id);
                    if (n.complaintId) {
                      const found = issues.find(
                        (i) => i.complaintId === n.complaintId
                      );
                      if (found) onSelectIssue(found);
                    }
                  }}
                  className={`py-3 px-2 -mx-2 rounded cursor-pointer transition-colors ${
                    n.isRead
                      ? 'opacity-75 hover:bg-slate-50'
                      : 'bg-sky-50/50 hover:bg-sky-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">{n.title}</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

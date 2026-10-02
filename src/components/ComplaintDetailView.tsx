import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  UserCheck,
  MessageSquare,
  Send,
  ThumbsUp,
  ShieldAlert,
  Sparkles,
  Star,
  Building2,
  Printer,
  Share2,
  Wrench,
  IndianRupee,
  EyeOff,
  FileWarning,
  SlidersHorizontal,
  QrCode,
} from 'lucide-react';
import type { CivicIssue, FieldWorker, Department } from '../types.ts';
import { SafeImage } from './SafeImage.tsx';
import { CityMap } from './CityMap.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface ComplaintDetailViewProps {
  issueIdOrCode: string;
  workers: FieldWorker[];
  departments: Department[];
  onBack: () => void;
  onUpdated: () => void;
}

const WORKFLOW_STEPS = [
  'Pending Admin Review',
  'Verified',
  'Assigned',
  'In Progress',
  'Resolved',
  'Closed',
];

export const ComplaintDetailView: React.FC<ComplaintDetailViewProps> = ({
  issueIdOrCode,
  workers,
  departments,
  onBack,
  onUpdated,
}) => {
  const { user, authFetch, realtimeTick } = useAuth();
  const [issue, setIssue] = useState<CivicIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin Department Split state (Supports Primary + Joint Secondary Department + Budget INR)
  const [splitDeptId, setSplitDeptId] = useState<number>(1);
  const [secondaryDeptId, setSecondaryDeptId] = useState<string>('');
  const [splitPriority, setSplitPriority] = useState<string>('High');
  const [splitSlaHours, setSplitSlaHours] = useState<number>(24);
  const [estimatedCostInr, setEstimatedCostInr] = useState<number>(12500);
  const [budgetApproved, setBudgetApproved] = useState<boolean>(true);
  const [adminNote, setAdminNote] = useState<string>('');

  // Officer action states (Includes Materials & Equipment Log)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [nextStatus, setNextStatus] = useState<string>('Verified');
  const [statusNote, setStatusNote] = useState<string>('');
  const [materialsUsed, setMaterialsUsed] = useState<string>(
    '4 Bags Cold-Mix Bitumen, 1 Mini Roller, 3 Field Crew Hours'
  );
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [resolutionPhotoUrl, setResolutionPhotoUrl] = useState<string>(
    '/src/assets/images/issue_resolved_road_1790922369801.jpg'
  );
  const [actionBusy, setActionBusy] = useState(false);

  // Interactive Before/After comparison slider position (0 to 100)
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  // Citizen Feedback / Confirmation state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState(
    'Verified on-site in Tadipatri: repair is complete and problem is resolved.'
  );

  const loadDetail = useCallback(async () => {
    try {
      const res = await authFetch(`/api/issues/${issueIdOrCode}`);
      if (!res.ok) {
        throw new Error('Complaint record could not be loaded.');
      }
      const data: CivicIssue = await res.json();
      setIssue(data);
      setNextStatus(data.status);
      setSplitDeptId(data.departmentId || 1);
      setSecondaryDeptId(
        data.secondaryDepartmentId ? String(data.secondaryDepartmentId) : ''
      );
      setSplitPriority(data.priority || 'High');
      setSplitSlaHours(data.slaHours || 24);
      setEstimatedCostInr(data.estimatedCostInr || 12500);
      setBudgetApproved(data.budgetApproved ?? true);
      if (data.materialsUsed) {
        setMaterialsUsed(data.materialsUsed);
      }
      if (data.assignedWorkerId) {
        setSelectedWorkerId(String(data.assignedWorkerId));
      } else if (workers.length > 0) {
        const deptWorker =
          workers.find((w) => w.departmentId === data.departmentId) || workers[0];
        setSelectedWorkerId(String(deptWorker.id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load complaint details');
    } finally {
      setLoading(false);
    }
  }, [issueIdOrCode, authFetch, workers]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail, realtimeTick]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="text-sm font-semibold text-red-600">
            {error || 'Complaint not found'}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const currentStageIndex = Math.max(
    0,
    WORKFLOW_STEPS.indexOf(
      issue.status === 'Reported' || issue.status === 'AI Analysis'
        ? 'Pending Admin Review'
        : issue.status === 'Citizen Confirmation'
          ? 'Resolved'
          : issue.status
    )
  );

  const deadlineMs = new Date(issue.slaDeadline).getTime();
  const diffHours = Math.round((deadlineMs - Date.now()) / 3600000);
  const isResolvedOrClosed =
    issue.status === 'Resolved' ||
    issue.status === 'Citizen Confirmation' ||
    issue.status === 'Closed';
  const isOverdue = !isResolvedOrClosed && (issue.isOverdue || diffHours < 0);

  const handleAdminAcceptAndSplit = async (decision: 'accept' | 'reject') => {
    setActionBusy(true);
    try {
      const res = await authFetch(`/api/issues/${issue.id}/admin-accept`, {
        method: 'POST',
        body: JSON.stringify({
          departmentId: splitDeptId,
          secondaryDepartmentId: secondaryDeptId
            ? Number(secondaryDeptId)
            : null,
          priority: splitPriority,
          slaHours: splitSlaHours,
          estimatedCostInr,
          budgetApproved,
          adminNote:
            adminNote ||
            (decision === 'accept'
              ? 'Verified by Tadipatri Municipal Admin and split department-wise.'
              : 'Rejected during Admin verification.'),
          decision,
        }),
      });
      if (res.ok) {
        setAdminNote('');
        await loadDetail();
        onUpdated();
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleAssignWorker = async () => {
    if (!selectedWorkerId) return;
    setActionBusy(true);
    try {
      const res = await authFetch(`/api/issues/${issue.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          workerId: Number(selectedWorkerId),
          note: statusNote || undefined,
        }),
      });
      if (res.ok) {
        setStatusNote('');
        await loadDetail();
        onUpdated();
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleStatusUpdate = async () => {
    setActionBusy(true);
    try {
      const res = await authFetch(`/api/issues/${issue.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          note: statusNote || undefined,
          materialsUsed: materialsUsed || undefined,
          estimatedCostInr: estimatedCostInr || undefined,
          resolutionNotes:
            nextStatus === 'Resolved'
              ? resolutionNotes ||
                'Field repair completed and inspected by Tadipatri Department Officer.'
              : undefined,
          resolutionEvidenceUrl:
            nextStatus === 'Resolved' ? resolutionPhotoUrl : undefined,
        }),
      });
      if (res.ok) {
        setStatusNote('');
        await loadDetail();
        onUpdated();
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleEscalateSla = async () => {
    setActionBusy(true);
    try {
      const res = await authFetch(`/api/issues/${issue.id}/escalate`, {
        method: 'POST',
        body: JSON.stringify({
          reason:
            statusNote ||
            'SLA deadline threshold reached; escalated to Tadipatri Municipal Commissioner.',
        }),
      });
      if (res.ok) {
        await loadDetail();
        onUpdated();
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleIssueShowCause = async () => {
    setActionBusy(true);
    try {
      const res = await authFetch(`/api/issues/${issue.id}/show-cause`, {
        method: 'POST',
        body: JSON.stringify({
          reason:
            statusNote ||
            `Official Show-Cause Notice issued by Tadipatri Municipal Commissioner for SLA delay on ${issue.complaintId}.`,
        }),
      });
      if (res.ok) {
        await loadDetail();
        onUpdated();
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setActionBusy(true);
    try {
      const res = await authFetch(`/api/issues/${issue.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: commentText,
          isInternal: isInternalComment,
        }),
      });
      if (res.ok) {
        setCommentText('');
        await loadDetail();
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleCitizenConfirm = async (confirmed: boolean) => {
    setActionBusy(true);
    try {
      const res = await authFetch(`/api/issues/${issue.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          rating: feedbackRating,
          comment: feedbackComment,
          confirmed,
        }),
      });
      if (res.ok) {
        await loadDetail();
        onUpdated();
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpvote = async () => {
    const res = await authFetch(`/api/issues/${issue.id}/upvote`, {
      method: 'POST',
    });
    if (res.ok) {
      await loadDetail();
      onUpdated();
    }
  };

  const handleWhatsAppShare = () => {
    const text = `*Tadipatri Municipality — CivicFix Official Status*\nComplaint ID: *${issue.complaintId}*\nIssue: ${issue.title}\nWard: ${issue.wardZone}\nStatus: *${issue.status}*\nDepartment: ${issue.departmentName || 'Pending Admin Split'}\nPriority: ${issue.priority}`;
    navigator.clipboard?.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  const beforeImages =
    issue.images?.filter((img) => img.type === 'before' || img.mediaType === 'before') || [];
  const afterImages =
    issue.images?.filter((img) => img.type === 'after' || img.mediaType === 'after') || [];
  const primaryBeforeUrl =
    beforeImages[0]?.fileUrl ||
    beforeImages[0]?.url ||
    issue.beforeImageUrl ||
    '/src/assets/images/issue_pothole_1775220265252.jpg';
  const primaryAfterUrl =
    afterImages[0]?.fileUrl || afterImages[0]?.url || issue.afterImageUrl;

  const canManageAsOfficer =
    user?.role === 'officer' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  // Filter workers for the issue's department first
  const deptWorkers = workers.filter(
    (w) => w.departmentId === issue.departmentId
  );
  const availableWorkers = deptWorkers.length > 0 ? deptWorkers : workers;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tadipatri Register</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {copiedShare
                ? 'WhatsApp / SMS Summary Copied!'
                : 'Share WhatsApp / SMS Update'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print QR Receipt</span>
          </button>

          <button
            type="button"
            onClick={handleUpvote}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <ThumbsUp className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>
              Confirm Local Impact ({issue.upvotesCount} Tadipatri Residents)
            </span>
          </button>

          {issue.escalationLevel > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Escalation Level {issue.escalationLevel}</span>
            </span>
          )}

          {issue.showCauseIssued && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-900 text-white rounded-lg">
              <FileWarning className="w-3.5 h-3.5" />
              <span>Commissioner Show-Cause Issued</span>
            </span>
          )}
        </div>
      </div>

      {/* Pending Admin Review Banner */}
      {issue.status === 'Pending Admin Review' && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Awaiting Tadipatri Municipal Admin Verification & Department Split
            </div>
            <p className="text-xs text-amber-800">
              This citizen complaint has been submitted to the Admin desk. Once the Municipal Admin verifies and accepts it, it will be split to the designated Tadipatri department and published on the active city map.
            </p>
          </div>
          <span className="px-3 py-1.5 text-xs font-semibold bg-amber-900 text-white rounded-lg whitespace-nowrap self-start sm:self-center">
            Stage 1: At Admin Desk
          </span>
        </div>
      )}

      {/* Header Dossier Summary + Scannable QR Receipt */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#0284C7] bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded">
                {issue.complaintId}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                  issue.priority === 'Critical'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : issue.priority === 'High'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-700'
                }`}
              >
                {issue.priority} Priority
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-900 text-white">
                {issue.status}
              </span>
              <span className="text-xs text-slate-500">
                {issue.category} · {issue.subcategory}
              </span>
              {issue.isAnonymous && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                  <EyeOff className="w-3 h-3" />
                  <span>Protected Whistleblower Report</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {issue.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {issue.address} ({issue.wardZone})
                </span>
              </span>
              <span className="font-mono">
                GPS: {(issue.lat || issue.latitude || 14.9091).toFixed(4)}, {(issue.lng || issue.longitude || 78.0092).toFixed(4)}
              </span>
              <span>
                Reported by:{' '}
                <strong className="text-slate-700">
                  {issue.isAnonymous
                    ? 'Anonymous Whistleblower (Identity Shielded)'
                    : issue.reporterName}
                </strong>
              </span>
            </div>
          </div>

          {/* Right side: Scannable QR Code Official Tadipatri Receipt + SLA Countdown */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
              {/* Deterministic SVG QR Matrix for Official Receipt */}
              <div className="w-14 h-14 bg-white p-1 border border-slate-300 rounded flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 21 21"
                  className="w-full h-full text-slate-900"
                  fill="currentColor"
                >
                  <path d="M0,0 h7 v7 h-7 z M1,1 v5 h5 v-5 z M2,2 h3 v3 h-3 z M14,0 h7 v7 h-7 z M15,1 v5 h5 v-5 z M16,2 h3 v3 h-3 z M0,14 h7 v7 h-7 z M1,15 v5 h5 v-5 z M2,16 h3 v3 h-3 z M8,1 h2 v2 h-2 z M11,2 h2 v3 h-2 z M8,5 h3 v2 h-3 z M1,8 h3 v2 h-3 z M5,9 h4 v2 h-4 z M10,8 h3 v3 h-3 z M14,9 h3 v2 h-3 z M18,8 h3 v3 h-3 z M8,12 h2 v4 h-2 z M11,13 h3 v2 h-3 z M15,12 h2 v3 h-2 z M18,14 h3 v2 h-3 z M9,17 h4 v3 h-4 z M14,16 h3 v4 h-3 z M18,18 h3 v3 h-3 z" />
                </svg>
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>Official QR Receipt</span>
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  {issue.complaintId}
                </div>
                <div className="text-[10px] text-slate-500">
                  Tadipatri Municipality
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 min-w-[210px]">
              <div className="text-xs text-slate-500">
                Tadipatri SLA Target ({issue.slaHours}h Window)
              </div>
              <div
                className={`text-base font-bold font-mono mt-1 flex items-center gap-1.5 ${
                  isResolvedOrClosed
                    ? 'text-emerald-600'
                    : isOverdue
                      ? 'text-red-600'
                      : 'text-slate-900'
                }`}
              >
                {isResolvedOrClosed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SLA Met ({issue.status})</span>
                  </>
                ) : isOverdue ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Overdue by {Math.abs(diffHours)}h</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-[#0284C7]" />
                    <span>{diffHours}h Remaining</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Primary Dept:{' '}
                <strong className="text-slate-800">
                  {issue.status === 'Pending Admin Review'
                    ? 'Pending Admin Split'
                    : issue.departmentName}
                </strong>
              </div>
              {issue.secondaryDepartmentName && (
                <div className="text-[11px] text-indigo-700 font-medium mt-0.5">
                  Joint Support: {issue.secondaryDepartmentName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6-Stage Lifecycle Stepper */}
        <div className="pt-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Citizen → Admin Acceptance → Department Split → Field Resolution Pipeline
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {WORKFLOW_STEPS.map((stage, index) => {
              const completed = index <= currentStageIndex;
              const current = index === currentStageIndex;
              return (
                <div
                  key={stage}
                  className={`p-2.5 rounded-lg border text-xs transition-colors ${
                    current
                      ? 'bg-sky-50 border-[#0284C7] text-slate-900 font-semibold'
                      : completed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px]">0{index + 1}</span>
                    {completed && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          current ? 'text-[#0284C7]' : 'text-emerald-600'
                        }`}
                      />
                    )}
                  </div>
                  <div className="truncate">{stage}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main 12-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Description, AI Triage, Before/After Slider, Timeline & Comments */}
        <div className="lg:col-span-7 space-y-6">
          {/* Issue Description & AI Analysis Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Citizen Field Report & AI Triage Intelligence
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              {issue.description}
            </p>

            {/* Engineering Cost & Materials Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Estimated Repair Cost</span>
                </div>
                <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                  ₹{(issue.estimatedCostInr || 12500).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  {issue.budgetApproved
                    ? 'Municipal Budget Sanctioned'
                    : 'Pending Sanction'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>AI Photo Authenticity</span>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {issue.photoVerificationStatus || 'Verified Genuine Field Image'}
                </div>
                <div className="text-[10px] text-slate-500">
                  Metadata & landmark verified
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span>Field Repair Materials</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
                  {issue.materialsUsed || 'Pending field crew log'}
                </div>
                <div className="text-[10px] text-slate-500">
                  Tadipatri Engineering Stores
                </div>
              </div>
            </div>

            {issue.aiSummary && (
              <div className="bg-slate-900 text-white rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                    <Sparkles className="w-4 h-4" />
                    <span>CivicFix AI Assessment (Tadipatri Ward Triage)</span>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                    {Math.round((issue.aiConfidence ?? 0.95) * 100)}% Confidence
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {issue.aiSummary}
                </p>
              </div>
            )}
          </div>

          {/* Interactive Before & After Photo Comparison Slider + Evidence Cards */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Before & After Field Evidence (Tadipatri)
              </h2>
              {primaryAfterUrl && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Interactive Before/After Slider Active</span>
                </span>
              )}
            </div>

            {/* Interactive Comparison Slider when After Photo exists */}
            {primaryAfterUrl && (
              <div className="space-y-2">
                <div className="relative h-64 w-full rounded-lg overflow-hidden border border-slate-200 select-none">
                  <SafeImage
                    src={primaryAfterUrl}
                    alt="After repair"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-y-0 left-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <SafeImage
                      src={primaryBeforeUrl}
                      alt="Before repair"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className="absolute inset-y-0 w-1 bg-white shadow-lg"
                    style={{ left: `${sliderPosition}%` }}
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 text-[11px] font-bold bg-slate-900/80 text-white rounded">
                    BEFORE REPAIR
                  </span>
                  <span className="absolute top-3 right-3 px-2.5 py-1 text-[11px] font-bold bg-emerald-700/90 text-white rounded">
                    AFTER RESOLUTION
                  </span>
                </div>
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Slide to Compare Before vs. After:
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="flex-1 accent-[#0284C7] cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-700">
                    {sliderPosition}%
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>1. Citizen Reported Evidence (Before)</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="h-48 overflow-hidden">
                  <SafeImage
                    src={primaryBeforeUrl}
                    alt={issue.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>2. Department Resolution Proof (After)</span>
                  <span className="font-mono text-[11px] text-emerald-600">
                    {primaryAfterUrl ? 'Verified' : 'Pending Repair'}
                  </span>
                </div>
                {primaryAfterUrl ? (
                  <div className="h-48 overflow-hidden">
                    <SafeImage
                      src={primaryAfterUrl}
                      alt="Resolution proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400">
                    <Clock className="w-6 h-6 mb-2 text-slate-300" />
                    <span>
                      Resolution photo will be uploaded by the assigned Tadipatri Department Officer upon repair completion.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {issue.resolutionNotes && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                <span className="font-semibold">
                  Department Resolution Summary:{' '}
                </span>
                {issue.resolutionNotes}
              </div>
            )}
          </div>

          {/* Citizen Resolution Verification & Rating */}
          {(issue.status === 'Resolved' ||
            issue.status === 'Citizen Confirmation') && (
            <div className="bg-white border-2 border-[#0284C7] rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Citizen Verification & Closure Confirmation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Confirm if the municipal repair in Tadipatri is satisfactory to close this complaint, or reopen it if the issue persists.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= feedbackRating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={2}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                placeholder="Share your verification feedback..."
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleCitizenConfirm(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  Confirm Resolved & Close Issue
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleCitizenConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                >
                  Unsatisfied — Reopen & Send Back to Department
                </button>
              </div>
            </div>
          )}

          {/* Status History & Audit Trail */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Immutable Status Audit Timeline
            </h2>
            <div className="space-y-3">
              {(issue.timeline || issue.statusHistory || []).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-none last:pb-0 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-[#0284C7] mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {entry.status || entry.newStatus}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{entry.note}</p>
                    <span className="text-[11px] text-slate-400">
                      Action by: {entry.changedByName} ({entry.changedByRole})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Public & Officer Comments Thread */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-bold text-slate-900">
                Field Updates & Citizen Discussion ({(issue.comments || []).length})
              </h2>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(issue.comments || []).length === 0 ? (
                <p className="text-xs text-slate-400">
                  No comments recorded yet. Add a field update or question below.
                </p>
              ) : (
                (issue.comments || []).map((c) => (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                      c.isInternal
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {c.authorName}
                        </span>
                        <span className=" uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {c.authorRole}
                        </span>
                        {c.isInternal && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                            Internal Department Note
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{c.body || c.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="space-y-3 pt-2">
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a public update or field observation for Tadipatri..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              />
              <div className="flex items-center justify-between">
                {canManageAsOfficer ? (
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Mark as Internal Officer Note</span>
                  </label>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Posting as {user?.name || 'Tadipatri Citizen'}
                  </span>
                )}

                <button
                  type="submit"
                  disabled={actionBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 5 Columns: Admin Acceptance & Dept Split Card + Department Officer Console + Map */}
        <div className="lg:col-span-5 space-y-6">
          {/* ADMIN ACCEPTANCE & DEPARTMENT SPLIT PANEL (With Joint Secondary Dept + Budget Sanction) */}
          {(isAdmin || issue.status === 'Pending Admin Review') && (
            <div className="bg-white border-2 border-emerald-600 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-bold">
                    3) Municipal Admin Gatekeeper
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Accept Citizen Report & Split Department-Wise
                  </h2>
                </div>
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Tadipatri Department Division *
                  </label>
                  <select
                    value={splitDeptId}
                    onChange={(e) => setSplitDeptId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dept #{d.id}: {d.name} ({d.headOfficerName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Secondary Joint Task-Force Department (Optional Multi-Dept Split)
                  </label>
                  <select
                    value={secondaryDeptId}
                    onChange={(e) => setSecondaryDeptId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">None (Single Department Resolution)</option>
                    {departments
                      .filter((d) => d.id !== splitDeptId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          Joint Support: {d.name} ({d.headOfficerName})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={splitPriority}
                      onChange={(e) => setSplitPriority(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      SLA Target (Hrs)
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={336}
                      value={splitSlaHours}
                      onChange={(e) => setSplitSlaHours(Number(e.target.value))}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Est. Cost (₹ INR)
                    </label>
                    <input
                      type="number"
                      min={500}
                      step={500}
                      value={estimatedCostInr}
                      onChange={(e) =>
                        setEstimatedCostInr(Number(e.target.value))
                      }
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Commissioner / Admin Dispatch Directive
                  </label>
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="e.g., Accepted by Admin. Dispatch R&B supervisor immediately."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => handleAdminAcceptAndSplit('accept')}
                    className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                  >
                    {issue.status === 'Pending Admin Review'
                      ? 'Accept & Split to Department'
                      : 'Re-Split / Transfer Department'}
                  </button>

                  {issue.status === 'Pending Admin Review' && (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleAdminAcceptAndSplit('reject')}
                      className="py-2.5 px-3 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Department Officer Dispatch & Status Controls */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#0284C7] font-semibold">
                  2) Tadipatri Department Officer Console
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Field Supervisor Dispatch & Repair Log
                </h2>
              </div>
              <UserCheck className="w-5 h-5 text-slate-400" />
            </div>

            {/* Assigned Field Worker Status */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="text-slate-500">Assigned Field Supervisor:</div>
              <div className="font-bold text-slate-900">
                {issue.assignedWorkerName ||
                  'Unassigned — Awaiting Department Officer Dispatch'}
              </div>
              <div className="text-slate-500">
                Department: {issue.departmentName}
              </div>
            </div>

            {/* Assign Field Worker Control */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Assign Tadipatri Field Supervisor
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {availableWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.specialty || w.roleTitle} ({w.activeTasksCount} active)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleAssignWorker}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap cursor-pointer"
                >
                  Assign Crew
                </button>
              </div>
            </div>

            {/* Transition Status Control + Materials Used */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                Update Complaint Status & Field Materials Log
              </label>
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {WORKFLOW_STEPS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Materials & Equipment Used (Tadipatri Engineering Log)
                </label>
                <input
                  type="text"
                  value={materialsUsed}
                  onChange={(e) => setMaterialsUsed(e.target.value)}
                  placeholder="e.g., 4 Bags Cold-Mix Asphalt, 1 JCB, 90W LED Luminaire..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <input
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Officer verification or field dispatch note..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />

              {nextStatus === 'Resolved' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                  <label className="block text-xs font-semibold text-emerald-900">
                    Upload Resolution Evidence Photo & Summary
                  </label>
                  <select
                    value={resolutionPhotoUrl}
                    onChange={(e) => setResolutionPhotoUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-emerald-300 rounded bg-white"
                  >
                    <option value="/src/assets/images/issue_resolved_road_1790922369801.jpg">
                      Verified Road Resurfacing Proof (After Photo)
                    </option>
                    <option value="/src/assets/images/city_command_hero_1775220265252.jpg">
                      Verified Municipal Infrastructure Inspection Proof
                    </option>
                  </select>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Describe completed repair work..."
                    className="w-full px-2.5 py-1.5 text-xs border border-emerald-300 rounded bg-white"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleStatusUpdate}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg cursor-pointer"
                >
                  Save Status & Materials
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleEscalateSla}
                  className="py-2.5 px-3 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
                >
                  Escalate SLA
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={handleIssueShowCause}
                    className="py-2.5 px-3 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                  >
                    Issue Show-Cause Notice
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Geo-Location Context Map with Field Crew GPS */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Tadipatri Ward Incident Pin & Live Field Crew GPS
            </h3>
            <CityMap
              issues={[issue]}
              workers={availableWorkers}
              selectedIssueId={issue.id}
              heightClass="h-64"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

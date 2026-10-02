import React, { useState } from 'react';
import {
  ArrowRight,
  Search,
  CheckCircle2,
  ChevronDown,
  MapPin,
  ShieldCheck,
  User,
  Building2,
  Lock,
  PhoneCall,
  Award,
  Sparkles,
} from 'lucide-react';
import type { CivicIssue, AnalyticsSummary, Department } from '../types.ts';
import { CityMap } from './CityMap.tsx';
import { SafeImage } from './SafeImage.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface LandingPageProps {
  issues: CivicIssue[];
  pendingAdminCount: number;
  departments: Department[];
  analytics: AnalyticsSummary | null;
  onOpenReportModal: (initialCategory?: string) => void;
  onTrackComplaint: (query?: string) => void;
  onSelectIssue: (issue: CivicIssue) => void;
  onNavigateTab: (tab: 'citizen' | 'officer' | 'admin' | 'map') => void;
  onOpenAuthWithRole: (section: 'citizen' | 'department' | 'admin') => void;
}

const CATEGORIES_LIST = [
  {
    name: 'Roads',
    teName: 'రోడ్లు & భవనాలు',
    department: 'Roads & Buildings (R&B) Division',
    sla: '24h SLA',
    desc: 'Potholes, Clock Tower & Yellanur Road resurfacing, damaged footpaths, and road cuts.',
  },
  {
    name: 'Electricity',
    teName: 'విద్యుత్ & వీధి దీపాలు',
    department: 'Electricity & Streetlighting (APSPDCL)',
    sla: '24h SLA',
    desc: 'LED streetlight outages, dark ward streets, sparking poles, and low-hanging cables.',
  },
  {
    name: 'Sanitation',
    teName: 'పారిశుధ్యం & ఆరోగ్యం',
    department: 'Sanitation & Public Health Division',
    sla: '24h SLA',
    desc: 'Garbage accumulation, uncollected ward bins, open dumping, and dead animal removal.',
  },
  {
    name: 'Water',
    teName: 'మంచినీటి సరఫరా',
    department: 'Municipal Water Supply & Engineering',
    sla: '24h SLA',
    desc: 'Drinking water pipeline leaks, Pennar supply main bursts, and borewell valve repairs.',
  },
  {
    name: 'Traffic',
    teName: 'ట్రాఫిక్ & సిగ్నల్స్',
    department: 'Traffic & Junction Signal Operations',
    sla: '12h SLA',
    desc: 'Malfunctioning junction signals, NH-67 bypass bottlenecks, and damaged road signage.',
  },
  {
    name: 'Environment',
    teName: 'ఉద్యానవనాలు & పర్యావరణం',
    department: 'Parks, Avenue Plantation & Environment',
    sla: '48h SLA',
    desc: 'Fallen trees obstructing roads, hazardous branches, and municipal park maintenance.',
  },
  {
    name: 'Drainage',
    teName: 'మురుగునీటి పారుదల (UGD)',
    department: 'Stormwater & Underground Drainage (UGD)',
    sla: '24h SLA',
    desc: 'Blocked UGD sewer lines, overflowing side drains, waterlogging, and missing manhole covers.',
  },
  {
    name: 'Public Infrastructure',
    teName: 'ప్రజా మౌలిక వసతులు',
    department: 'Town Planning & Public Infrastructure',
    sla: '72h SLA',
    desc: 'Damaged bus shelters, culverts, municipal compound walls, and public facility repairs.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'How does the Citizen → Admin → Department workflow operate in Tadipatri?',
    a: 'When a citizen submits a civic complaint in Tadipatri Municipality, our multimodal AI analyzes the issue and recommends a category, priority, and department. The report goes directly to the Municipal Admin (Commissioner Desk). Once the Admin verifies and accepts the complaint, it is split department-wise to the exact division officer and goes live on the public Tadipatri map.',
  },
  {
    q: 'Why does the map show 0 issues until a Citizen reports and Admin accepts?',
    a: 'CivicFix operates with zero artificial or fake placeholder complaints. If no citizen has reported an issue—or if a newly reported issue is still awaiting Admin verification—the public city map cleanly displays "0 Active Problems in Tadipatri". Only genuine citizen reports accepted by the Admin appear as active problems.',
  },
  {
    q: 'How do Department Officers access complaints assigned to their division?',
    a: 'In the 3-Section Login Portal, Department Officers select Section 2 (Department Login) and choose their specific division (such as R&B Roads, APSPDCL Electrical, Municipal Water Supply, Sanitation, or UGD Drainage). They immediately see all complaints split to their department by the Admin.',
  },
  {
    q: 'How do citizens confirm that a reported problem is resolved?',
    a: 'After the Department Officer assigns a field supervisor and uploads an after-repair photo, the status updates to Resolved. The reporting citizen can inspect the photo proof, rate the work from 1 to 5 stars, and confirm final closure.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  issues,
  pendingAdminCount,
  departments,
  analytics,
  onOpenReportModal,
  onTrackComplaint,
  onSelectIssue,
  onNavigateTab,
  onOpenAuthWithRole,
}) => {
  const { lang, user } = useAuth();
  const [trackingQuery, setTrackingQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mapCategoryFilter, setMapCategoryFilter] = useState<string>('All');

  // Strictly real database counts — zero artificial inflation
  const acceptedIssues = issues.filter(
    (i) => i.status !== 'Pending Admin Review' && i.status !== 'Rejected'
  );
  const resolvedIssues = acceptedIssues.filter(
    (i) =>
      i.status === 'Resolved' ||
      i.status === 'Citizen Confirmation' ||
      i.status === 'Closed'
  );
  const resolutionRate =
    acceptedIssues.length > 0
      ? Math.round((resolvedIssues.length / acceptedIssues.length) * 100)
      : 100;

  const filteredMapIssues =
    mapCategoryFilter === 'All'
      ? acceptedIssues
      : acceptedIssues.filter((i) => i.category === mapCategoryFilter);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTrackComplaint(trackingQuery.trim());
  };

  const isTelugu = lang === 'te';

  return (
    <div className="space-y-16 pb-16">
      {/* 1. HERO SECTION (Bilingual Telugu / English) */}
      <section className="pt-8 md:pt-12 border-b border-slate-200 pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="text-xs font-medium text-slate-600 flex flex-wrap items-center gap-2">
                <span>
                  {isTelugu
                    ? 'తాడిపత్రి పురపాలక సంఘం · అనంతపురం జిల్లా, ఆంధ్రప్రదేశ్ (515411)'
                    : 'Tadipatri Municipality · Anantapur District, AP (515411)'}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span>
                  {isTelugu ? '36 పురపాలక వార్డులు' : '36 Municipal Wards'}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="font-semibold text-emerald-700">
                  {isTelugu
                    ? 'నిజమైన పౌర నివేదికలు మాత్రమే'
                    : 'Zero Artificial Reports'}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-[1.14]">
                {isTelugu ? (
                  <>
                    సమస్యను నివేదించండి. ట్రాక్ చేయండి.{' '}
                    <span className="text-[#0284C7]">
                      పరిష్కరించండి.
                    </span>{' '}
                    తాడిపత్రిని మెరుగుపరచండి.
                  </>
                ) : (
                  <>
                    Report. Track. Resolve.{' '}
                    <span className="text-[#0284C7]">
                      Build a Better Tadipatri.
                    </span>
                  </>
                )}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                {isTelugu
                  ? 'తాడిపత్రి పౌరులు, మున్సిపల్ అడ్మిన్ కమిషనర్ డెస్క్ మరియు 8 ప్రత్యేక శాఖల విభాగాలను అనుసంధానించే అధికారిక స్మార్ట్ సిటీ ఫిర్యాదుల వేదిక. పౌరులు నివేదికను పంపుతారు, అడ్మిన్ ధృవీకరించి శాఖల వారీగా విభజిస్తారు, అధికారులు క్షేత్రస్థాయిలో పరిష్కరిస్తారు.'
                  : 'Official smart-city civic issue management platform connecting Tadipatri citizens, the Municipal Admin Commissioner Desk, and 8 specialized department divisions. Citizens send reports to Admin, Admin verifies and splits them department-wise, and Department Officers resolve them on the ground.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenReportModal()}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                >
                  <span>
                    {isTelugu
                      ? 'అడ్మిన్‌కు సమస్యను నివేదించండి'
                      : 'Report Issue to Admin'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onTrackComplaint()}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>
                    {isTelugu ? 'ఫిర్యాదు ట్రాక్ చేయండి' : 'Track Complaint'}
                  </span>
                </button>
              </div>

              {/* Instant Complaint ID Lookup Bar */}
              <form
                onSubmit={handleTrackSubmit}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl pt-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={trackingQuery}
                    onChange={(e) => setTrackingQuery(e.target.value)}
                    placeholder={
                      isTelugu
                        ? 'ఫిర్యాదు ఐడీ (ఉదా. CIV-TDP-2026-0001) లేదా వీధి పేరు...'
                        : 'Enter Complaint ID (e.g. CIV-TDP-2026-0001) or Tadipatri street...'
                    }
                    aria-label="Search complaint ID or street name"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {isTelugu ? 'స్థితి తనిఖీ' : 'Lookup Status'}
                </button>
              </form>

              {/* 100% Real Database-Backed Statistics (No Fake Numbers) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-slate-200">
                <div>
                  <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                    {acceptedIssues.length}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {isTelugu ? 'ఆమోదించబడిన సమస్యలు' : 'Admin-Accepted Issues'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#D97706] font-mono tabular-nums">
                    {pendingAdminCount}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {isTelugu ? 'అడ్మిన్ పరిశీలనలో' : 'Awaiting Admin Split'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                    {departments.length || 8}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {isTelugu ? 'తాడిపత్రి విభాగాలు' : 'Tadipatri Divisions'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#16A34A] font-mono tabular-nums">
                    {resolvedIssues.length} ({resolutionRate}%)
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {isTelugu ? 'పరిష్కరించబడినవి' : 'Resolved Problems'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Tadipatri Municipal Status Card */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <div className="relative">
                  <SafeImage
                    src="/src/assets/images/hero_smart_city_1790922309038.jpg"
                    alt="Tadipatri Municipal Infrastructure Operations"
                    className="w-full h-56 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-5 text-white">
                    <div className="text-xs text-slate-200 font-mono">
                      TADIPATRI MUNICIPAL CORPORATION · ANANTAPUR, AP
                    </div>
                    <p className="text-sm font-semibold mt-1">
                      {acceptedIssues.length === 0
                        ? 'All 36 Wards Clear — 0 Active Problems Reported'
                        : `${acceptedIssues.length} Verified Issue(s) Active Across Tadipatri Divisions`}
                    </p>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
                    <span className="font-semibold text-slate-900">
                      Live Admin-Accepted Dispatches
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('map')}
                      className="text-[#0284C7] hover:underline font-medium cursor-pointer"
                    >
                      View Live Map
                    </button>
                  </div>

                  {acceptedIssues.length === 0 ? (
                    <div className="py-6 text-center space-y-2 bg-emerald-50/60 border border-emerald-200 rounded-lg px-4">
                      <CheckCircle2 className="w-6 h-6 text-[#16A34A] mx-auto" />
                      <div className="text-xs font-bold text-slate-900">
                        No Active Problems in Tadipatri Right Now
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Zero artificial reports are shown. When a citizen reports a problem
                        and the Municipal Admin accepts & splits it to a department, it will
                        appear here live.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {acceptedIssues.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onSelectIssue(item)}
                          className="py-2.5 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-xs text-slate-500 font-mono tabular-nums">
                              <span>{item.complaintId}</span>
                              <span className="mx-1.5" aria-hidden="true">
                                ·
                              </span>
                              <span>{item.category}</span>
                              <span className="mx-1.5" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-[#0284C7] font-semibold">
                                {item.departmentName}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-slate-900 truncate mt-0.5">
                              {item.title}
                            </div>
                          </div>
                          <span className="text-xs font-medium text-slate-700 whitespace-nowrap shrink-0">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THREE-TIER ROLE PORTAL ACCESS CARDS (1. CITIZEN, 2. DEPARTMENT, 3. ADMIN) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            3-Tier Municipal Role Authentication Portals
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Strict role segregation: Citizens submit issues, Department Officers handle division-specific work, and the Municipal Commissioner manages citywide dispatch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Card 1: Citizen */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#0284C7]">
                  ROLE 01
                </span>
                <User className="w-5 h-5 text-[#0284C7]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                1) Citizen Resident Portal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Report civic problems in Tadipatri Wards 1–36 with photos, voice notes, and
                exact GPS coordinates. Your report is sent directly to the Municipal Admin
                for verification.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuthWithRole('citizen')}
                className="flex-1 py-2.5 px-3 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg cursor-pointer"
              >
                Citizen Sign In / Register
              </button>
              <button
                type="button"
                onClick={() => onOpenReportModal()}
                className="py-2.5 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Send Report
              </button>
            </div>
          </div>

          {/* Card 2: Department Officer */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#D97706]">
                  ROLE 02
                </span>
                <Building2 className="w-5 h-5 text-[#D97706]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                2) Department Officer Login
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated portal for division officers (R&B Roads, APSPDCL Electrical, Water Supply,
                Sanitation, Traffic, Environment, UGD Drainage, or Infrastructure) to resolve
                issues split to your division by Admin.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuthWithRole('department')}
                className="w-full py-2.5 px-3 text-xs font-semibold text-white bg-[#D97706] hover:bg-amber-700 rounded-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Department Officer Login</span>
              </button>
            </div>
          </div>

          {/* Card 3: Municipal Admin */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#16A34A]">
                  ROLE 03
                </span>
                <Lock className="w-5 h-5 text-[#16A34A]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                3) Municipal Admin Login
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Central Commissioner Desk: Review incoming citizen reports, inspect AI triage
                recommendations, accept genuine issues, and split them department-wise to
                the responsible division officer.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuthWithRole('admin')}
                className="w-full py-2.5 px-3 text-xs font-semibold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  Admin Login {pendingAdminCount > 0 ? `(${pendingAdminCount} Pending)` : ''}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PUBLIC WARD LEADERBOARD & CIVIC TRANSPARENCY SCORECARD (Feature #4) */}
      {analytics?.wardLeaderboard && analytics.wardLeaderboard.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#0284C7]" />
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Tadipatri Municipal Ward Transparency Leaderboard (Wards 1–36)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Public municipal performance ranking based on resolution speed, SLA compliance, and citizen confirmation satisfaction.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-sky-50 text-[#0284C7] border border-sky-200 self-start sm:self-center">
                Official CDMA AP Scorecard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {analytics.wardLeaderboard.slice(0, 8).map((ward, rank) => (
                <div
                  key={ward.wardZone}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-500">
                      Rank #{rank + 1}
                    </span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-emerald-700">
                      {ward.score} / 100
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900">
                    {ward.wardZone}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Key Landmark: {ward.landmark}
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">
                      Resolved: {ward.resolvedCount} / {ward.totalComplaints}
                    </span>
                    <span className="font-semibold text-[#0284C7]">
                      {ward.slaComplianceRate}% SLA
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. HOW IT WORKS: THE 6-STAGE PIPELINE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            How CivicFix Operates in Tadipatri
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Citizen → AI Multimodal Triage → Admin Gatekeeper → Department Split → Field Supervisor Resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {[
            {
              step: '01',
              title: 'Citizen Reports Issue',
              desc: 'Tadipatri resident submits description, photo evidence, and Ward GPS location.',
            },
            {
              step: '02',
              title: 'Admin Verification & Split',
              desc: 'Municipal Commissioner verifies the complaint and splits it to the exact Tadipatri department.',
            },
            {
              step: '03',
              title: 'Department Crew Dispatched',
              desc: 'Division Officer assigns a field crew and logs engineering materials & equipment.',
            },
            {
              step: '04',
              title: 'Citizen Confirms Closure',
              desc: 'Resident inspects the after-repair photo, confirms satisfactory resolution, and rates work.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-2"
            >
              <div className="font-mono text-sm font-bold text-[#0284C7]">
                STAGE {item.step}
              </div>
              <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. ISSUE CATEGORIES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Civic Infrastructure Categories
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Select any civic issue to immediately send a report directly to the Municipal Admin.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {CATEGORIES_LIST.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => onOpenReportModal(cat.name)}
              className="text-left bg-white border border-slate-200 hover:border-[#0284C7] rounded-lg p-5 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="truncate pr-2">{cat.department}</span>
                <span className="font-mono tabular-nums text-slate-700 shrink-0">
                  {cat.sla}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mt-2 group-hover:text-[#0284C7] transition-colors">
                {isTelugu ? cat.teName : cat.name}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {cat.desc}
              </p>
              <div className="mt-4 text-xs font-medium text-[#0284C7]">
                Report {cat.name} Issue →
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 6. LIVE TADIPATRI MAP PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Tadipatri, Anantapur, AP — Live Infrastructure Map
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Displays only real citizen complaints that have been verified and accepted by the Tadipatri Municipal Admin.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                'All',
                'Roads',
                'Water',
                'Electricity',
                'Sanitation',
                'Traffic',
                'Drainage',
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMapCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    mapCategoryFilter === cat
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <CityMap
              issues={filteredMapIssues}
              onSelectIssue={onSelectIssue}
              heightClass="h-[420px]"
            />
          </div>
        </div>
      </section>

      {/* 7. TADIPATRI EMERGENCY HELPLINE & WARD DIRECTORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="text-xs font-mono text-sky-400">
                TADIPATRI MUNICIPAL CORPORATION · 24/7 EMERGENCY HELPLINES
              </div>
              <h2 className="text-xl font-bold text-white mt-1 tracking-wide">
                Direct Department Control Room Directory (Anantapur District, AP)
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono bg-slate-800 px-3.5 py-2 rounded-lg text-sky-300">
              <PhoneCall className="w-4 h-4" />
              <span>Municipal Control Room: 08558-222101 / 1800-425-5154</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5 text-xs">
            {[
              {
                dept: 'Roads & Buildings (R&B)',
                officer: 'Er. K. Venkata Ramana (DEE)',
                phone: '+91 94401 80101',
                zone: 'Clock Tower, Yellanur Rd, NH-67',
              },
              {
                dept: 'APSPDCL Streetlighting',
                officer: 'Er. S. Narayana Reddy (AE)',
                phone: '+91 94401 80102',
                zone: '33/11kV Substation & All 36 Wards',
              },
              {
                dept: 'Municipal Water Supply',
                officer: 'Er. P. Srinivasulu (ME)',
                phone: '+91 94401 80104',
                zone: 'Pennar Infiltration Gallery & OHSRs',
              },
              {
                dept: 'Sanitation & UGD Drainage',
                officer: 'Dr. M. Lakshmi Devi / Er. C. Mallikarjuna',
                phone: '+91 94401 80103',
                zone: 'Old Town, Temple Streets & Markets',
              },
            ].map((item) => (
              <div
                key={item.dept}
                className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 space-y-1.5"
              >
                <div className="font-bold text-white tracking-wide">
                  {item.dept}
                </div>
                <div className="text-slate-300">{item.officer}</div>
                <div className="font-mono text-sky-400">{item.phone}</div>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/80">
                  {item.zone}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-slate-900">
          Frequently Asked Questions — Tadipatri CivicFix
        </h2>
        <div className="mt-6 divide-y divide-slate-200 border-t border-b border-slate-200">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={faq.q} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-4 cursor-pointer"
                >
                  <span className="text-sm font-semibold text-slate-900">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-slate-200 bg-white pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-10 border-b border-slate-200">
            <div className="col-span-2 space-y-3">
              <div className="text-lg font-bold text-slate-900">
                CivicFix — Tadipatri Municipality
              </div>
              <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                AI-Powered Smart City Issue Management Platform for Tadipatri
                Municipality, Anantapur District, Andhra Pradesh. Connecting citizens,
                the Municipal Commissioner Desk, and 8 engineering divisions.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>
                  Municipal Office Road, Near Clock Tower, Tadipatri, Anantapur, AP 515411
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-900">3-Tier Role Portals</div>
              <ul className="space-y-2 text-slate-600">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenAuthWithRole('citizen')}
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    1) Citizen Login & Reporting
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenAuthWithRole('department')}
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    2) Department Officer Login
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenAuthWithRole('admin')}
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    3) Municipal Admin Login
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('map')}
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    Tadipatri Live Map
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-900">Tadipatri Divisions</div>
              <ul className="space-y-2 text-slate-600">
                <li>Roads & Buildings (R&B)</li>
                <li>APSPDCL Streetlighting</li>
                <li>Municipal Water Supply</li>
                <li>Sanitation & Public Health</li>
                <li>Stormwater & UGD Drainage</li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-900">Governance & SLA</div>
              <ul className="space-y-2 text-slate-600">
                <li>CDMA Andhra Pradesh Charter</li>
                <li>Zero Artificial Reports Policy</li>
                <li>Public SLA Timelines</li>
                <li>Citizen Closure Verification</li>
                <li>Immutable Security Audit</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-slate-500">
            <div>
              © 2026 CivicFix Tadipatri Municipality, Anantapur District, Andhra Pradesh (PIN 515411).
            </div>
            <div className="flex items-center gap-4">
              <span>Emergency Control Room: 112 / 08558-222101</span>
              <span aria-hidden="true">·</span>
              <span>AP Municipal Digital Governance</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

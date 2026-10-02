import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  X,
  Languages,
  LogOut,
  User,
  ShieldCheck,
  Building2,
  Lock,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import type {
  CivicIssue,
  Department,
  IssueCategory,
  FieldWorker,
  AnalyticsSummary,
} from './types.ts';
import { LandingPage } from './components/LandingPage.tsx';
import { CitizenDashboard } from './components/CitizenDashboard.tsx';
import { OfficerDashboard } from './components/OfficerDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ComplaintDetailView } from './components/ComplaintDetailView.tsx';
import { ReportIssueModal } from './components/ReportIssueModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CityMap } from './components/CityMap.tsx';

function CivicFixShell() {
  const {
    user,
    lang,
    toggleLanguage,
    authFetch,
    logout,
    unreadCount,
    liveBanner,
    clearLiveBanner,
    realtimeTick,
  } = useAuth();

  const [activeView, setActiveView] = useState<
    'landing' | 'citizen' | 'officer' | 'admin' | 'map' | 'detail'
  >('landing');
  const [selectedIssueIdOrCode, setSelectedIssueIdOrCode] =
    useState<string>('CIV-TDP-2026-0001');
  const [previousView, setPreviousView] = useState<
    'landing' | 'citizen' | 'officer' | 'admin' | 'map'
  >('landing');
  const [initialCitizenSearch, setInitialCitizenSearch] = useState<string>('');

  // Modal states
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportInitialCategory, setReportInitialCategory] = useState<
    string | undefined
  >(undefined);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authInitialSection, setAuthInitialSection] = useState<
    'citizen' | 'department' | 'admin'
  >('citizen');

  // Core database state
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [workers, setWorkers] = useState<FieldWorker[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  const fetchCoreData = useCallback(async () => {
    try {
      const [issuesRes, deptsRes, catsRes, workersRes, analyticsRes] =
        await Promise.all([
          authFetch('/api/issues'),
          authFetch('/api/departments'),
          authFetch('/api/categories'),
          authFetch('/api/workers'),
          authFetch('/api/analytics'),
        ]);

      if (issuesRes.ok) {
        const data = await issuesRes.json();
        setIssues(data.issues || []);
      }
      if (deptsRes.ok) setDepartments(await deptsRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
      if (workersRes.ok) setWorkers(await workersRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch (err) {
      console.error('Failed to load CivicFix Tadipatri core data:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchCoreData();
  }, [fetchCoreData, realtimeTick]);

  const handleOpenIssueDetail = (issueOrCode: CivicIssue | string) => {
    if (activeView !== 'detail') {
      setPreviousView(activeView);
    }
    const code =
      typeof issueOrCode === 'string' ? issueOrCode : issueOrCode.complaintId;
    setSelectedIssueIdOrCode(code);
    setActiveView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReportModal = (category?: string) => {
    setReportInitialCategory(category);
    setReportModalOpen(true);
  };

  const handleOpenAuthWithRole = (
    section: 'citizen' | 'department' | 'admin'
  ) => {
    setAuthInitialSection(section);
    setAuthModalOpen(true);
  };

  const handleTrackComplaint = (query?: string) => {
    if (query) {
      const exact = issues.find(
        (i) => i.complaintId.toLowerCase() === query.toLowerCase()
      );
      if (exact) {
        handleOpenIssueDetail(exact);
        return;
      }
      setInitialCitizenSearch(query);
    } else {
      setInitialCitizenSearch('');
    }
    setActiveView('citizen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pendingAdminCount = issues.filter(
    (i) => i.status === 'Pending Admin Review'
  ).length;
  const acceptedIssues = issues.filter(
    (i) => i.status !== 'Pending Admin Review' && i.status !== 'Rejected'
  );

  const isOfficer = user?.role === 'officer';
  const isAdmin = user?.role === 'admin';
  const isCitizen = user?.role === 'citizen';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* NAVBAR: Strictly fulfills user requirement:
          - Public sees: Overview, Map, Report Issue, Login (plus bilingual EN/TE toggle)
          - Public & regular users CANNOT see Dept or Admin!
          - Only logged-in Department Officer sees Department Console
          - Only logged-in Admin sees Admin Split Desk (+ Dept Console)
          - Clicking Login displays Citizen, Department, and Admin logins separately */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('landing');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap flex items-center gap-2"
          >
            <span>CivicFix Tadipatri</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 hidden sm:inline-block">
              PIN 515411
            </span>
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {/* 1. Overview (Always visible) */}
            <a
              href="#overview"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('landing');
              }}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeView === 'landing'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-[#0284C7] font-semibold'
                  : ''
              }`}
            >
              {lang === 'te' ? 'అవలోకనం' : 'Overview'}
            </a>

            {/* 2. Map (Always visible) */}
            <a
              href="#city-map"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('map');
              }}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeView === 'map'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-[#0284C7] font-semibold'
                  : ''
              }`}
            >
              {lang === 'te' ? 'తాడిపత్రి మ్యాప్' : 'Map'}
            </a>

            {/* Citizen Portal (Visible when logged in as citizen) */}
            {isCitizen && (
              <a
                href="#citizen-portal"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView('citizen');
                }}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                  activeView === 'citizen'
                    ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-[#0284C7] font-semibold'
                    : ''
                }`}
              >
                {lang === 'te' ? 'నా ఫిర్యాదులు' : 'Citizen Portal'}
              </a>
            )}

            {/* STRICT ROLE VISIBILITY: Department Console is ONLY visible to Officers and Admin */}
            {(isOfficer || isAdmin) && (
              <a
                href="#officer-console"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView('officer');
                }}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                  activeView === 'officer'
                    ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-[#0284C7] font-semibold'
                    : ''
                }`}
              >
                Department Console
              </a>
            )}

            {/* STRICT ROLE VISIBILITY: Admin Split Desk is ONLY visible to Admin */}
            {isAdmin && (
              <a
                href="#admin-center"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView('admin');
                }}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                  activeView === 'admin'
                    ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-[#0284C7] font-semibold'
                    : ''
                }`}
              >
                Admin Split Desk
                {pendingAdminCount > 0 ? ` (${pendingAdminCount})` : ''}
              </a>
            )}
          </nav>

          {/* Right Action Zone */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bilingual Telugu / English Toggle (Feature #1) */}
            <button
              type="button"
              onClick={toggleLanguage}
              title="Switch Language (తెలుగు / English)"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              <Languages className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>{lang === 'te' ? 'తెలుగు' : 'English'}</span>
            </button>

            {/* Report Issue Button (Always accessible) */}
            <button
              type="button"
              onClick={() => handleOpenReportModal()}
              className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              {lang === 'te' ? 'సమస్యను నివేదించండి' : 'Report Issue'}
            </button>

            {/* Login / User Session Button */}
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  setAuthInitialSection('citizen');
                  setAuthModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {lang === 'te' ? 'లాగిన్' : 'Login'}
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  title="Switch Role or Department"
                  className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold">{user.name.split(' ')[0]}</span>
                  <span className="text-slate-500 font-normal">
                    (
                    {user.role === 'officer'
                      ? 'Dept'
                      : user.role === 'admin'
                        ? 'Admin'
                        : 'Citizen'}
                    )
                  </span>
                  {unreadCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#0284C7] text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setActiveView('landing');
                  }}
                  title="Log out"
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center gap-4 overflow-x-auto pt-3 mt-3 border-t border-slate-100 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveView('landing')}
            className={`whitespace-nowrap pb-1 ${
              activeView === 'landing'
                ? 'text-[#0284C7] font-semibold border-b-2 border-[#0284C7]'
                : ''
            }`}
          >
            {lang === 'te' ? 'అవలోకనం' : 'Overview'}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('map')}
            className={`whitespace-nowrap pb-1 ${
              activeView === 'map'
                ? 'text-[#0284C7] font-semibold border-b-2 border-[#0284C7]'
                : ''
            }`}
          >
            {lang === 'te' ? 'మ్యాప్' : 'Map'}
          </button>
          {isCitizen && (
            <button
              type="button"
              onClick={() => setActiveView('citizen')}
              className={`whitespace-nowrap pb-1 ${
                activeView === 'citizen'
                  ? 'text-[#0284C7] font-semibold border-b-2 border-[#0284C7]'
                  : ''
              }`}
            >
              Citizen Portal
            </button>
          )}
          {(isOfficer || isAdmin) && (
            <button
              type="button"
              onClick={() => setActiveView('officer')}
              className={`whitespace-nowrap pb-1 ${
                activeView === 'officer'
                  ? 'text-[#0284C7] font-semibold border-b-2 border-[#0284C7]'
                  : ''
              }`}
            >
              Department
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className={`whitespace-nowrap pb-1 ${
                activeView === 'admin'
                  ? 'text-[#0284C7] font-semibold border-b-2 border-[#0284C7]'
                  : ''
              }`}
            >
              Admin {pendingAdminCount > 0 ? `(${pendingAdminCount})` : ''}
            </button>
          )}
        </div>
      </header>

      {/* Real-Time WebSocket Broadcast Banner */}
      {liveBanner && (
        <div className="bg-slate-900 text-white px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-medium">{liveBanner}</span>
            </div>
            <button
              type="button"
              onClick={clearLiveBanner}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1">
        {activeView === 'landing' && (
          <LandingPage
            issues={issues}
            pendingAdminCount={pendingAdminCount}
            departments={departments}
            analytics={analytics}
            onOpenReportModal={handleOpenReportModal}
            onTrackComplaint={handleTrackComplaint}
            onSelectIssue={handleOpenIssueDetail}
            onNavigateTab={(tab) => {
              if (tab === 'officer' && !isOfficer && !isAdmin) {
                handleOpenAuthWithRole('department');
                return;
              }
              if (tab === 'admin' && !isAdmin) {
                handleOpenAuthWithRole('admin');
                return;
              }
              setActiveView(tab);
            }}
            onOpenAuthWithRole={handleOpenAuthWithRole}
          />
        )}

        {activeView === 'citizen' && (
          <CitizenDashboard
            issues={issues}
            initialSearch={initialCitizenSearch}
            onOpenReportModal={handleOpenReportModal}
            onSelectIssue={handleOpenIssueDetail}
            onNavigateAdmin={() => {
              if (isAdmin) {
                setActiveView('admin');
              } else {
                handleOpenAuthWithRole('admin');
              }
            }}
          />
        )}

        {/* Protected Officer Dashboard Gate */}
        {activeView === 'officer' && (
          isOfficer || isAdmin ? (
            <OfficerDashboard
              issues={issues}
              workers={workers}
              departments={departments}
              analytics={analytics}
              onSelectIssue={handleOpenIssueDetail}
              onRefresh={fetchCoreData}
            />
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
              <Building2 className="w-12 h-12 text-[#D97706] mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">
                Department Officer Authentication Required
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Only authenticated municipal officers can access their division's assigned complaints and dispatch field supervisors.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAuthWithRole('department')}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#D97706] hover:bg-amber-700 rounded-lg cursor-pointer"
              >
                Log In to Department Console
              </button>
            </div>
          )
        )}

        {/* Protected Admin Dashboard Gate */}
        {activeView === 'admin' && (
          isAdmin ? (
            <AdminDashboard
              issues={issues}
              departments={departments}
              analytics={analytics}
              onSelectIssue={handleOpenIssueDetail}
              onRefresh={fetchCoreData}
            />
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
              <Lock className="w-12 h-12 text-[#16A34A] mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">
                Municipal Commissioner Admin Access Required
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                The Central Admin Split Desk is reserved for the Tadipatri Municipal Commissioner to review citizen reports and split them department-wise.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAuthWithRole('admin')}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                Log In as Municipal Commissioner
              </button>
            </div>
          )
        )}

        {activeView === 'map' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="text-xs text-slate-500">
                  Tadipatri Municipality · Anantapur District, Andhra Pradesh (PIN 515411)
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  Tadipatri Live Infrastructure Map (Admin-Accepted Issues)
                </h1>
              </div>
              <button
                type="button"
                onClick={() => handleOpenReportModal()}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg whitespace-nowrap cursor-pointer shadow-xs"
              >
                Send Report to Admin
              </button>
            </div>
            <CityMap
              issues={acceptedIssues}
              workers={workers}
              onSelectIssue={handleOpenIssueDetail}
              heightClass="h-[580px]"
            />
          </div>
        )}

        {activeView === 'detail' && (
          <ComplaintDetailView
            issueIdOrCode={selectedIssueIdOrCode}
            workers={workers}
            departments={departments}
            onBack={() => setActiveView(previousView)}
            onUpdated={fetchCoreData}
          />
        )}
      </main>

      {/* Modals */}
      <ReportIssueModal
        isOpen={reportModalOpen}
        initialCategory={reportInitialCategory}
        categories={categories}
        departments={departments}
        existingIssues={acceptedIssues}
        onClose={() => setReportModalOpen(false)}
        onIssueCreated={() => {
          fetchCoreData();
        }}
        onInspectExistingIssue={(complaintId) => {
          setReportModalOpen(false);
          handleOpenIssueDetail(complaintId);
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        initialSection={authInitialSection}
        departments={departments}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(role) => {
          if (role === 'officer') setActiveView('officer');
          else if (role === 'admin') setActiveView('admin');
          else setActiveView('citizen');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CivicFixShell />
    </AuthProvider>
  );
}

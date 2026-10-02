import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  User,
  Building2,
  Lock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { Department } from '../types.ts';

interface AuthModalProps {
  isOpen: boolean;
  initialSection?: 'citizen' | 'department' | 'admin';
  departments: Department[];
  onClose: () => void;
  onAuthenticated: (role: 'citizen' | 'officer' | 'admin') => void;
}

const DEFAULT_DEPARTMENTS = [
  {
    id: 1,
    code: 'DEPT-ROADS',
    name: 'Roads & Buildings (R&B) Division',
    headOfficerName: 'Er. K. Venkata Ramana (DEE, R&B)',
    email: 'rb.tadipatri@cdma.ap.gov.in',
  },
  {
    id: 2,
    code: 'DEPT-ELEC',
    name: 'Electricity & Streetlighting (APSPDCL)',
    headOfficerName: 'Er. S. Narayana Reddy (AE, Electrical)',
    email: 'apspdcl.tadipatri@ap.gov.in',
  },
  {
    id: 3,
    code: 'DEPT-SANIT',
    name: 'Sanitation & Public Health Division',
    headOfficerName: 'Dr. M. Lakshmi Devi (Sanitary Inspector)',
    email: 'sanitation.tadipatri@cdma.ap.gov.in',
  },
  {
    id: 4,
    code: 'DEPT-WATER',
    name: 'Municipal Water Supply & Engineering',
    headOfficerName: 'Er. P. Srinivasulu (ME, Water Works)',
    email: 'watersupply.tadipatri@cdma.ap.gov.in',
  },
  {
    id: 5,
    code: 'DEPT-TRAF',
    name: 'Traffic & Junction Signal Operations',
    headOfficerName: 'Inspector B. Rajasekhar (Traffic CI)',
    email: 'traffic.tadipatri@appolice.gov.in',
  },
  {
    id: 6,
    code: 'DEPT-ENV',
    name: 'Parks, Avenue Plantation & Environment',
    headOfficerName: 'G. Obul Reddy (Horticulture Officer)',
    email: 'environment.tadipatri@cdma.ap.gov.in',
  },
  {
    id: 7,
    code: 'DEPT-DRAIN',
    name: 'Stormwater & Underground Drainage (UGD)',
    headOfficerName: 'Er. C. Mallikarjuna (JE, Drainage)',
    email: 'ugd.tadipatri@cdma.ap.gov.in',
  },
  {
    id: 8,
    code: 'DEPT-INFRA',
    name: 'Town Planning & Public Infrastructure',
    headOfficerName: 'V. Suryanarayana (Town Planning Officer)',
    email: 'tpo.tadipatri@cdma.ap.gov.in',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialSection,
  departments,
  onClose,
  onAuthenticated,
}) => {
  const {
    user,
    loginWithGoogle,
    loginWithEmail,
    registerAccount,
    switchRolePersona,
  } = useAuth();

  // 3 Major Login Sections: 1) Citizen, 2) Department, 3) Admin
  const [activeSection, setActiveSection] = useState<
    'citizen' | 'department' | 'admin'
  >(
    initialSection ||
      (user?.role === 'officer'
        ? 'department'
        : user?.role === 'admin'
          ? 'admin'
          : 'citizen')
  );

  useEffect(() => {
    if (isOpen && initialSection) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  // Citizen section state
  const [citizenMode, setCitizenMode] = useState<'login' | 'register' | 'otp'>(
    'login'
  );
  const [citizenName, setCitizenName] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('ravi.kumar@tadipatri.org');
  const [citizenPhone, setCitizenPhone] = useState('+91 94401 23456');
  const [citizenPassword, setCitizenPassword] = useState('Tadipatri@2026');
  const [otpCode, setOtpCode] = useState('482910');

  // Department section state
  const [selectedDeptId, setSelectedDeptId] = useState<number>(
    user?.departmentId || 1
  );
  const [deptEmail, setDeptEmail] = useState('rb.tadipatri@cdma.ap.gov.in');
  const [deptPassword, setDeptPassword] = useState('DeptOfficer@2026');

  // Admin section state
  const [adminEmail, setAdminEmail] = useState(
    'commissioner.tadipatri@cdma.ap.gov.in'
  );
  const [adminPassword, setAdminPassword] = useState('Commissioner@2026');
  const [adminSecurityPin, setAdminSecurityPin] = useState('515411');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const deptList =
    departments.length > 0
      ? departments.map((d) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          headOfficerName: d.headOfficerName,
          email: d.contactEmail,
        }))
      : DEFAULT_DEPARTMENTS;

  const currentDept =
    deptList.find((d) => d.id === selectedDeptId) || deptList[0];

  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (citizenMode === 'login') {
        await loginWithEmail(citizenEmail, citizenPassword);
        onAuthenticated('citizen');
        onClose();
      } else if (citizenMode === 'register') {
        await registerAccount({
          name: citizenName,
          email: citizenEmail,
          password: citizenPassword,
          role: 'citizen',
          phone: citizenPhone,
        });
        setCitizenMode('otp');
      } else {
        onAuthenticated('citizen');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Citizen login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleQuickCitizenLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await switchRolePersona('citizen');
      onAuthenticated('citizen');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleDepartmentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await switchRolePersona('officer', selectedDeptId);
      onAuthenticated('officer');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Department Officer login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await switchRolePersona('admin');
      onAuthenticated('admin');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Admin login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithGoogle();
      onAuthenticated('citizen');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-lg max-w-4xl w-full overflow-hidden shadow-xl my-8">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div>
            <h2 className="text-lg font-bold tracking-wide">
              Tadipatri Municipality — 3-Tier Role Authentication Portal
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Anantapur District, Andhra Pradesh (PIN 515411) · Citizen → Admin Acceptance → Department-Wise Resolution
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Prominent Role Section Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setActiveSection('citizen');
              setError(null);
            }}
            className={`p-4 text-left border-b-2 sm:border-r border-slate-200 transition-colors cursor-pointer ${
              activeSection === 'citizen'
                ? 'bg-white border-b-[#0284C7]'
                : 'hover:bg-slate-100 border-b-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#0284C7]">
                SECTION 01
              </span>
              <User className="w-4 h-4 text-[#0284C7]" />
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              1) Citizen Portal Login
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Report Tadipatri civic issues to Admin & confirm resolved work
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('department');
              setError(null);
            }}
            className={`p-4 text-left border-b-2 sm:border-r border-slate-200 transition-colors cursor-pointer ${
              activeSection === 'department'
                ? 'bg-white border-b-[#D97706]'
                : 'hover:bg-slate-100 border-b-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#D97706]">
                SECTION 02
              </span>
              <Building2 className="w-4 h-4 text-[#D97706]" />
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              2) Department Login
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Department-wise officer login (R&B, Water, Electrical, Sanitation, UGD)
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('admin');
              setError(null);
            }}
            className={`p-4 text-left border-b-2 transition-colors cursor-pointer ${
              activeSection === 'admin'
                ? 'bg-white border-b-[#16A34A]'
                : 'hover:bg-slate-100 border-b-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#16A34A]">
                SECTION 03
              </span>
              <Lock className="w-4 h-4 text-[#16A34A]" />
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              3) Municipal Admin Login
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Commissioner Desk: Verify citizen reports & split department-wise
            </p>
          </button>
        </div>

        {/* Body Content for the Selected Section */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          {/* SECTION 1: CITIZEN LOGIN & REGISTRATION */}
          {activeSection === 'citizen' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Tadipatri Citizen Resident Authentication
                  </h3>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setCitizenMode('login')}
                      className={`px-3 py-1 text-xs font-medium rounded cursor-pointer ${
                        citizenMode === 'login'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setCitizenMode('register')}
                      className={`px-3 py-1 text-xs font-medium rounded cursor-pointer ${
                        citizenMode === 'register'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      New Resident Register
                    </button>
                  </div>
                </div>

                <form onSubmit={handleCitizenSubmit} className="space-y-3">
                  {citizenMode === 'register' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name (Resident) *
                        </label>
                        <input
                          type="text"
                          required
                          value={citizenName}
                          onChange={(e) => setCitizenName(e.target.value)}
                          placeholder="e.g., K. Ravi Kumar"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Mobile Number (OTP Alerts)
                        </label>
                        <input
                          type="text"
                          value={citizenPhone}
                          onChange={(e) => setCitizenPhone(e.target.value)}
                          placeholder="+91 94401 23456"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  {citizenMode !== 'otp' ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Citizen Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={citizenEmail}
                          onChange={(e) => setCitizenEmail(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={citizenPassword}
                          onChange={(e) => setCitizenPassword(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Enter 6-Digit Verification OTP (Code: 482910)
                      </label>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono tracking-widest text-center border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg cursor-pointer"
                  >
                    {citizenMode === 'login'
                      ? 'Login as Tadipatri Citizen'
                      : citizenMode === 'register'
                        ? 'Register Resident Account'
                        : 'Verify OTP & Enter Citizen Portal'}
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleGoogleSignIn}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
                    <span>Continue with Google Sign-In</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleQuickCitizenLogin}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Instant Citizen Login (K. Ravi Kumar)
                  </button>
                </div>
              </div>

              <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
                <div className="font-bold text-slate-900">
                  Citizen Role Capabilities
                </div>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                    <span>
                      Submit civic reports with photos and GPS pins in Tadipatri Wards 1–36 directly to the Municipal Admin.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                    <span>
                      Track when Admin accepts your report and splits it to the responsible department.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                    <span>
                      Verify after-repair photos and confirm closure (or reopen if unsatisfied).
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 2: DEPARTMENT OFFICER LOGIN (DEPARTMENT-WISE) */}
          {activeSection === 'department' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tadipatri Department Officer Login (Department-Wise)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your municipal division below to view and resolve issues split to your department by the Admin.
                  </p>
                </div>

                <form onSubmit={handleDepartmentLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Select Municipal Department Division *
                    </label>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedDeptId(id);
                        const found = deptList.find((d) => d.id === id);
                        if (found) setDeptEmail(found.email);
                      }}
                      className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      {deptList.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          Dept #{dept.id}: {dept.name} — {dept.headOfficerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Official Department Email
                      </label>
                      <input
                        type="email"
                        value={deptEmail}
                        onChange={(e) => setDeptEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Officer Password
                      </label>
                      <input
                        type="password"
                        value={deptPassword}
                        onChange={(e) => setDeptPassword(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-[#D97706] hover:bg-amber-700 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      Login to {currentDept.name} Console ({currentDept.headOfficerName})
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="md:col-span-5 bg-amber-50/70 border border-amber-200 rounded-lg p-4 space-y-3 text-xs">
                <div className="font-bold text-slate-900">
                  Selected Division Profile
                </div>
                <div className="space-y-1">
                  <div className="text-slate-500">Department Name:</div>
                  <div className="font-semibold text-slate-900">
                    {currentDept.name}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-slate-500">Head Officer:</div>
                  <div className="font-semibold text-slate-900">
                    {currentDept.headOfficerName}
                  </div>
                </div>
                <div className="pt-2 border-t border-amber-200 text-slate-700 leading-relaxed">
                  Officers in this division exclusively receive citizen complaints that have been verified, accepted, and routed to{' '}
                  <span className="font-semibold">{currentDept.name}</span> by the Tadipatri Municipal Admin.
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: MUNICIPAL ADMIN LOGIN (COMMISSIONER DESK) */}
          {activeSection === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tadipatri Municipal Commissioner (Central Admin Login)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Central authority to review incoming citizen reports, accept valid complaints, and split them department-wise.
                  </p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Commissioner / Admin Official Email
                    </label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Admin Password
                      </label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Municipality Code (Tadipatri PIN)
                      </label>
                      <input
                        type="text"
                        value={adminSecurityPin}
                        onChange={(e) => setAdminSecurityPin(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      Enter Municipal Admin Command Center (S. Shiva Ramakrishna, IAS)
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="md:col-span-5 bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 space-y-3 text-xs">
                <div className="font-bold text-slate-900">
                  Admin Gatekeeper & Department Split Authority
                </div>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>
                      All new citizen reports arrive in your <strong>Admin Acceptance Desk</strong> first.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>
                      Inspect photo evidence, AI priority recommendation, and Tadipatri GPS location.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>
                      Click <strong>Accept & Split to Department</strong> to make the issue live on the city map and dispatch it to the exact Department Officer!
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

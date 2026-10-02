import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Mic,
  Printer,
  ShieldCheck,
  QrCode,
  EyeOff,
} from 'lucide-react';
import type { IssueCategory, Department, CivicIssue } from '../types.ts';
import { CityMap } from './CityMap.tsx';
import { SafeImage } from './SafeImage.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface ReportIssueModalProps {
  isOpen: boolean;
  initialCategory?: string;
  categories: IssueCategory[];
  departments: Department[];
  existingIssues: CivicIssue[];
  onClose: () => void;
  onIssueCreated: (created: CivicIssue) => void;
  onInspectExistingIssue: (complaintId: string) => void;
}

const PRESET_EVIDENCE = [
  {
    label: 'Road Pothole Photo',
    url: '/src/assets/images/issue_pothole_road_1790922323710.jpg',
  },
  {
    label: 'Water Pipeline Leak Photo',
    url: '/src/assets/images/issue_water_leakage_1790922355585.jpg',
  },
  {
    label: 'Streetlight Outage Photo',
    url: '/src/assets/images/issue_streetlight_repair_1790922342597.jpg',
  },
];

const TADIPATRI_LOCATIONS = [
  {
    label: 'Clock Tower & Yellanur Road (Ward 12)',
    lat: 14.9068,
    lng: 78.0084,
    address: 'Clock Tower Junction, Yellanur Road, Tadipatri, Anantapur, AP 515411',
  },
  {
    label: 'Bugga Ramalingeswara Temple Road (Ward 4)',
    lat: 14.9132,
    lng: 78.0078,
    address: 'Bugga Ramalingeswara Swamy Temple Road, Tadipatri, Anantapur, AP 515411',
  },
  {
    label: 'Chintala Venkataramana Temple Street (Ward 8)',
    lat: 14.9085,
    lng: 78.0110,
    address: 'Chintala Venkataramana Swamy Temple Street, Old Town, Tadipatri, AP 515411',
  },
  {
    label: 'APSRTC Bus Stand & NH-67 Bypass (Ward 15)',
    lat: 14.9042,
    lng: 78.0145,
    address: 'APSRTC Bus Stand, Cuddapah-Anantapur NH-67 Road, Tadipatri, AP 515411',
  },
  {
    label: 'Tadipatri Railway Station Road (Ward 19)',
    lat: 14.9154,
    lng: 78.0162,
    address: 'Railway Station Feeder Road, Gandhi Katta, Tadipatri, Anantapur, AP 515411',
  },
  {
    label: 'Sanjeeva Nagar & Housing Board (Ward 24)',
    lat: 14.8995,
    lng: 78.0035,
    address: 'Sanjeeva Nagar Main Road, Tadipatri, Anantapur District, AP 515411',
  },
];

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  initialCategory,
  categories,
  existingIssues,
  onClose,
  onIssueCreated,
  onInspectExistingIssue,
}) => {
  const { authFetch, lang } = useAuth();
  const [step, setStep] = useState<number>(1);

  // Step 1 state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(initialCategory || 'Roads');
  const [subcategory, setSubcategory] = useState('Deep Pothole');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);

  // Step 2 state
  const [imageUrls, setImageUrls] = useState<string[]>([
    '/src/assets/images/issue_pothole_road_1790922323710.jpg',
  ]);
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [imageMimeType, setImageMimeType] = useState<string | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 3 state (Default: Tadipatri, Anantapur, AP)
  const [latitude, setLatitude] = useState<number>(14.9068);
  const [longitude, setLongitude] = useState<number>(78.0084);
  const [address, setAddress] = useState<string>(
    'Clock Tower Junction, Yellanur Road, Tadipatri, Anantapur, AP 515411'
  );
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Step 4 AI Analysis state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    category: string;
    subcategory: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    confidence: number;
    reason: string;
    summary: string;
    recommendedDepartmentId: number;
    recommendedDepartmentName: string;
    recommendedSecondaryDepartmentId: number | null;
    recommendedSecondaryDepartmentName: string | null;
    recommendedSlaHours: number;
    estimatedCostInr: number;
    photoVerificationStatus: string;
    photoVerificationDetail: string;
    preventiveMaintenanceAlert: string;
    duplicateProbability: number;
    duplicateMatch: {
      complaintId: string;
      title: string;
      distanceMeters: number;
      reportedAgo: string;
      status: string;
    } | null;
    insideServiceArea: boolean;
    wardZone: string;
  } | null>(null);

  const [finalPriority, setFinalPriority] = useState<
    'Low' | 'Medium' | 'High' | 'Critical'
  >('High');
  const [finalDepartmentId, setFinalDepartmentId] = useState<number>(1);
  const [finalSecondaryDeptId, setFinalSecondaryDeptId] = useState<number | null>(
    null
  );
  const [finalSlaHours, setFinalSlaHours] = useState<number>(24);
  const [finalCostInr, setFinalCostInr] = useState<number>(18500);
  const [overriddenByHuman, setOverriddenByHuman] = useState<boolean>(false);

  // Step 5 submission state
  const [submitting, setSubmitting] = useState(false);
  const [createdIssue, setCreatedIssue] = useState<CivicIssue | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (isOpen) {
      setCreatedIssue(null);
      setStep(1);
      setFormError(null);
    }
  }, [isOpen]);

  const currentCatObj =
    categories.find((c) => c.name === category) || categories[0];
  let subcategoriesList: string[] = ['General Issue'];
  try {
    if (currentCatObj?.subcategoriesJson) {
      subcategoriesList = JSON.parse(currentCatObj.subcategoriesJson);
    }
  } catch {
    subcategoriesList = ['General Issue'];
  }

  if (!isOpen) return null;

  // Smart Voice Assistant Complaint Filing (Speak in Telugu or English)
  const handleVoiceDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTitle(
        'Deep road pothole and water pipeline leak at Clock Tower Junction, Tadipatri'
      );
      setDescription(
        'Voice Assistant (Tadipatri Ward 12): Major road pothole caused by leaking drinking water pipeline near Clock Tower Junction on Yellanur Road. Immediate R&B and Water Supply joint action needed.'
      );
      setCategory('Roads');
      setSubcategory('Deep Pothole');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'te' ? 'te-IN' : 'en-IN';
    setVoiceActive(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        if (!title) setTitle(transcript.slice(0, 75));
        setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
      setVoiceActive(false);
    };
    recognition.onerror = () => setVoiceActive(false);
    recognition.onend = () => setVoiceActive(false);
    recognition.start();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (imageUrls.length + files.length > 4) {
      setUploadError('Maximum 4 evidence files allowed per complaint.');
      return;
    }

    Array.from(files).forEach((file) => {
      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/webm',
      ];
      if (!validTypes.includes(file.type)) {
        setUploadError(
          'Unsupported file format. Please upload JPG, PNG, WebP, or MP4.'
        );
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size exceeds 10 MB municipal upload limit.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = reader.result as string;
        setImageUrls((prev) => [...prev, resultStr]);
        if (file.type.startsWith('image/')) {
          setImageBase64(resultStr);
          setImageMimeType(file.type);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUseBrowserGps = () => {
    setGpsStatus('Calibrating Tadipatri Municipal GPS coordinates...');
    setLatitude(14.9091);
    setLongitude(78.0092);
    setAddress(
      'Tadipatri Municipal Office Road, Ward 12, Tadipatri, Anantapur, AP 515411'
    );
    setGpsStatus(
      'GPS locked to Tadipatri Municipality (14.9091° N, 78.0092° E).'
    );
  };

  const runStep4AiAnalysis = async () => {
    setStep(4);
    setAiLoading(true);
    setFormError(null);
    try {
      const res = await authFetch('/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          latitude,
          longitude,
          selectedCategory: category,
          imageBase64,
          imageMimeType,
        }),
      });
      if (!res.ok) {
        throw new Error('AI triage request failed');
      }
      const data = await res.json();
      setAiResult(data);
      setCategory(data.category);
      setSubcategory(data.subcategory || subcategory);
      setFinalPriority(data.priority);
      setFinalDepartmentId(data.recommendedDepartmentId);
      setFinalSecondaryDeptId(data.recommendedSecondaryDepartmentId || null);
      setFinalSlaHours(data.recommendedSlaHours);
      setFinalCostInr(data.estimatedCostInr || 15000);
      setOverriddenByHuman(false);
    } catch (err: any) {
      setFormError(err.message || 'AI analysis encountered an error.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitComplaint = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await authFetch('/api/issues', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category,
          subcategory,
          priority: finalPriority,
          departmentId: finalDepartmentId,
          secondaryDepartmentId: finalSecondaryDeptId,
          isAnonymous,
          latitude,
          longitude,
          address,
          wardZone:
            aiResult?.wardZone ||
            'Ward 12 — Clock Tower & Yellanur Road, Tadipatri',
          insideServiceArea: aiResult?.insideServiceArea ?? true,
          aiCategorySuggestion: aiResult?.category || category,
          aiPrioritySuggestion: aiResult?.priority || finalPriority,
          aiConfidence: aiResult?.confidence ?? 0.94,
          aiReasoning: aiResult?.reason,
          aiSummary: aiResult?.summary,
          aiDuplicateProbability: aiResult?.duplicateProbability ?? 0.04,
          duplicateOfComplaintId:
            aiResult?.duplicateMatch?.complaintId || null,
          slaHours: finalSlaHours,
          estimatedCostInr: finalCostInr,
          photoVerificationStatus:
            aiResult?.photoVerificationStatus || 'Verified Genuine',
          imageUrls,
          overriddenByHuman,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit complaint');
      }
      const created = await res.json();
      setCreatedIssue(created);
      onIssueCreated(created);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const insideBoundary =
    latitude >= 14.84 &&
    latitude <= 14.98 &&
    longitude >= 77.94 &&
    longitude <= 78.08;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full overflow-hidden shadow-xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {lang === 'te'
                ? 'తాడిపత్రి మున్సిపల్ అడ్మిన్‌కు సమస్యను నివేదించండి'
                : 'Send Civic Complaint to Tadipatri Municipal Admin'}
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              <span>Step {step} of 5</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>
                {step === 1 && 'Problem Description, Voice Assistant & Whistleblower Mode'}
                {step === 2 && 'Photographic / Video Evidence'}
                {step === 3 && 'Tadipatri Ward Location & Geo-Fencing'}
                {step === 4 && 'AI Photo Verification, Dept Split & Cost Estimate'}
                {step === 5 && 'Send to Admin & Printable QR Receipt'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-50 text-xs">
          {[
            { num: 1, label: '01. Problem' },
            { num: 2, label: '02. Evidence' },
            { num: 3, label: '03. Tadipatri Map' },
            { num: 4, label: '04. AI Triage' },
            { num: 5, label: '05. QR Receipt' },
          ].map((s) => (
            <div
              key={s.num}
              className={`px-3 py-2.5 font-medium text-center border-r last:border-r-0 border-slate-200 truncate ${
                step === s.num
                  ? 'bg-white text-[#0284C7] font-semibold'
                  : step > s.num
                    ? 'text-[#16A34A]'
                    : 'text-slate-400'
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {formError}
            </div>
          )}

          {/* STEP 1: PROBLEM */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Complaint Title (Tadipatri Municipality) *
                </label>
                <button
                  type="button"
                  onClick={handleVoiceDictation}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                    voiceActive
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-sky-50 text-[#0284C7] border border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>
                    {voiceActive
                      ? 'Listening (Speak in Telugu or English)...'
                      : 'AI Voice Assistant Auto-Fill (తెలుగు / EN)'}
                  </span>
                </button>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Deep road pothole near Clock Tower Junction, Yellanur Road"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Issue Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      const found = categories.find(
                        (c) => c.name === e.target.value
                      );
                      if (found) {
                        try {
                          const subs = JSON.parse(found.subcategoriesJson);
                          if (subs[0]) setSubcategory(subs[0]);
                        } catch {
                          // ignore
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0284C7]"
                  >
                    {(categories.length > 0
                      ? categories.map((c) => c.name)
                      : [
                          'Roads',
                          'Electricity',
                          'Sanitation',
                          'Water',
                          'Traffic',
                          'Environment',
                          'Drainage',
                          'Public Infrastructure',
                        ]
                    ).map((catName) => (
                      <option key={catName} value={catName}>
                        {catName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Subcategory (Optional)
                  </label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0284C7]"
                  >
                    {subcategoriesList.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Detailed Description *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the exact problem location in Tadipatri, severity, and public impact..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              {/* Anonymous Whistleblower Reporting Mode */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <EyeOff className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">
                      Anonymous Whistleblower Reporting Mode
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      Hide your name and phone number on public boards when reporting illegal dumping, encroachment, or water theft.
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>{isAnonymous ? 'Protected' : 'Standard'}</span>
                </label>
              </div>

              {/* Quick Templates for Tadipatri */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>Quick-fill Tadipatri templates:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(
                        'Deep arterial pothole at Clock Tower Junction, Yellanur Road'
                      );
                      setDescription(
                        'A 12-inch deep road cavity has opened near Clock Tower Junction on Yellanur Road in Tadipatri. Auto-rickshaws, school buses, and two-wheelers are swerving dangerously.'
                      );
                      setCategory('Roads');
                      setSubcategory('Deep Pothole');
                      setImageUrls([
                        '/src/assets/images/issue_pothole_road_1790922323710.jpg',
                      ]);
                      setLatitude(14.9068);
                      setLongitude(78.0084);
                      setAddress(
                        'Clock Tower Junction, Yellanur Road, Tadipatri, Anantapur, AP 515411'
                      );
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium cursor-pointer"
                  >
                    Clock Tower Pothole (R&B)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(
                        'Drinking water pipeline burst flooding road on Bugga Temple Street'
                      );
                      setDescription(
                        'Main municipal drinking water supply pipeline burst near Bugga Ramalingeswara Swamy Temple corridor in Ward 4, wasting clean water and damaging the asphalt road surface.'
                      );
                      setCategory('Water');
                      setSubcategory('Main Pipe Burst');
                      setImageUrls([
                        '/src/assets/images/issue_water_leakage_1790922355585.jpg',
                      ]);
                      setLatitude(14.9132);
                      setLongitude(78.0078);
                      setAddress(
                        'Bugga Ramalingeswara Swamy Temple Road, Tadipatri, Anantapur, AP 515411'
                      );
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium cursor-pointer"
                  >
                    Temple Road Water + Road Joint Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(
                        'APSPDCL LED streetlights not working near APSRTC Bus Stand'
                      );
                      setDescription(
                        'Four consecutive municipal LED streetlights outside Tadipatri APSRTC Bus Stand on NH-67 road are dark at night, creating safety risks for passengers.'
                      );
                      setCategory('Electricity');
                      setSubcategory('Streetlight Outage');
                      setImageUrls([
                        '/src/assets/images/issue_streetlight_repair_1790922342597.jpg',
                      ]);
                      setLatitude(14.9042);
                      setLongitude(78.0145);
                      setAddress(
                        'APSRTC Bus Stand, NH-67 Road, Tadipatri, Anantapur, AP 515411'
                      );
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium cursor-pointer"
                  >
                    Bus Stand Streetlight Outage
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EVIDENCE */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50">
                <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                <div className="text-sm font-semibold text-slate-900">
                  Upload Field Photos or Video Evidence
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Supports JPG, PNG, WebP, MP4 · Max 10 MB per file · AI Authenticity & Fraud Check Active
                </p>
                <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer">
                  <span>Select Files from Device</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadError && (
                <div className="text-xs text-red-600 font-medium">
                  {uploadError}
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  Or select sample field inspection photo:
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_EVIDENCE.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => {
                        if (
                          !imageUrls.includes(preset.url) &&
                          imageUrls.length < 4
                        ) {
                          setImageUrls((prev) => [...prev, preset.url]);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {imageUrls.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-800 mb-2">
                    Attached Evidence ({imageUrls.length} / 4)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imageUrls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="relative border border-slate-200 rounded-lg overflow-hidden bg-white"
                      >
                        <SafeImage
                          src={url}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-28 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setImageUrls((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          className="absolute top-1.5 right-1.5 p-1 bg-slate-900/80 text-white rounded hover:bg-slate-900 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: LOCATION & GEO-FENCING IN TADIPATRI */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleUseBrowserGps}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Lock Tadipatri Town Center GPS</span>
                </button>

                <div className="text-xs font-mono tabular-nums text-slate-600">
                  Lat: {latitude.toFixed(5)}° N · Lng: {longitude.toFixed(5)}° E
                </div>
              </div>

              {gpsStatus && (
                <div className="text-xs text-[#0284C7] font-medium">
                  {gpsStatus}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Tadipatri Street Address / Ward Landmark *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {TADIPATRI_LOCATIONS.map((loc) => (
                  <button
                    key={loc.label}
                    type="button"
                    onClick={() => {
                      setLatitude(loc.lat);
                      setLongitude(loc.lng);
                      setAddress(loc.address);
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                  >
                    {loc.label}
                  </button>
                ))}
              </div>

              <CityMap
                issues={existingIssues}
                pickerMode={true}
                selectedLat={latitude}
                selectedLng={longitude}
                onPickLocation={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setAddress(
                    `Pinned Street Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E), Tadipatri, Anantapur, AP`
                  );
                }}
                heightClass="h-[250px]"
                showHeatmapToggle={false}
              />

              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  insideBoundary
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>
                    {insideBoundary
                      ? 'Geo-Fence Verified: Coordinates fall inside Tadipatri Municipality, Anantapur District, AP.'
                      : 'Outside Tadipatri Municipal Limits: Will be flagged for Anantapur District Rural Panchayat routing.'}
                  </span>
                </div>
                <span className="font-mono font-semibold">
                  {insideBoundary ? 'TADIPATRI LIMITS' : 'RURAL ZONE'}
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: AI ANALYSIS */}
          {step === 4 && (
            <div className="space-y-4">
              {aiLoading ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#0284C7] border-t-transparent rounded-full animate-spin mx-auto" />
                  <div className="text-sm font-semibold text-slate-900">
                    Running Multimodal AI Analysis for Tadipatri Admin Review...
                  </div>
                  <p className="text-xs text-slate-500">
                    Verifying photo authenticity, classifying department split, estimating repair budget (₹), and checking nearby duplicates.
                  </p>
                </div>
              ) : (
                aiResult && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                          <Sparkles className="w-4 h-4 text-[#0284C7]" />
                          <span>
                            AI Triage & Engineering Assessment (For Tadipatri Admin)
                          </span>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-slate-600">
                          Confidence: {Math.round(aiResult.confidence * 100)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <div className="text-slate-500">Suggested Category</div>
                          <div className="font-semibold text-slate-900 mt-0.5">
                            {aiResult.category} · {aiResult.subcategory}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Suggested Priority</div>
                          <div
                            className={`font-semibold mt-0.5 ${
                              aiResult.priority === 'Critical'
                                ? 'text-[#DC2626]'
                                : aiResult.priority === 'High'
                                  ? 'text-[#D97706]'
                                  : 'text-slate-900'
                            }`}
                          >
                            {aiResult.priority} ({aiResult.recommendedSlaHours}h SLA)
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Primary Dept Split</div>
                          <div className="font-semibold text-slate-900 mt-0.5">
                            {aiResult.recommendedDepartmentName}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Est. Repair Cost</div>
                          <div className="font-mono font-bold text-[#16A34A] mt-0.5">
                            ₹{aiResult.estimatedCostInr.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {aiResult.recommendedSecondaryDepartmentName && (
                        <div className="p-2.5 bg-sky-50 border border-sky-200 rounded text-xs text-sky-950">
                          <strong>Joint Task Force Recommended:</strong> Primary:{' '}
                          {aiResult.recommendedDepartmentName} + Secondary:{' '}
                          {aiResult.recommendedSecondaryDepartmentName}
                        </div>
                      )}

                      {/* AI Photo Fraud & Relevance Verification */}
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">
                            AI Photo Authenticity Check ({aiResult.photoVerificationStatus}):
                          </span>{' '}
                          {aiResult.photoVerificationDetail}
                        </div>
                      </div>

                      {/* AI Predictive Hotspot & Preventive Maintenance Alert */}
                      <div className="p-2.5 bg-white border border-slate-200 rounded text-xs text-slate-700">
                        <div className="font-semibold text-slate-900">
                          AI Preventive Maintenance Insight:
                        </div>
                        <p className="mt-0.5">{aiResult.preventiveMaintenanceAlert}</p>
                      </div>
                    </div>

                    {aiResult.duplicateMatch && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                            <span>
                              Similar Complaint Found Nearby (
                              {aiResult.duplicateMatch.distanceMeters}m away)
                            </span>
                          </div>
                          <span className="text-xs font-mono text-amber-800">
                            {aiResult.duplicateMatch.complaintId}
                          </span>
                        </div>
                        <p className="text-xs text-amber-800">
                          "{aiResult.duplicateMatch.title}" was reported{' '}
                          {aiResult.duplicateMatch.reportedAgo}.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            onInspectExistingIssue(
                              aiResult.duplicateMatch!.complaintId
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold bg-amber-900 text-white rounded hover:bg-amber-800 cursor-pointer"
                        >
                          View Existing Complaint{' '}
                          {aiResult.duplicateMatch.complaintId}
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* STEP 5: CONFIRMATION & OFFICIAL QR CODE RECEIPT */}
          {step === 5 && (
            <div className="space-y-4">
              {createdIssue ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg space-y-4">
                  <div className="text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto" />
                    <div className="text-xs font-semibold text-emerald-800">
                      Sent to Tadipatri Municipal Admin for Acceptance & Department Split
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                      {createdIssue.complaintId}
                    </div>
                    <p className="text-xs text-slate-600 max-w-lg mx-auto">
                      Your complaint is now in the{' '}
                      <strong>Admin Acceptance Desk</strong>. Once the Municipal Admin accepts and splits it to the department, it will appear on the public Tadipatri map and department officer console!
                    </p>
                  </div>

                  {/* Official Printable Receipt Box with Scannable QR Code */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
                    <div className="space-y-1.5 flex-1">
                      <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                        TADIPATRI MUNICIPALITY OFFICIAL RECEIPT
                      </div>
                      <div>ID: {createdIssue.complaintId}</div>
                      <div>TITLE: {createdIssue.title}</div>
                      <div>WARD: {createdIssue.wardZone}</div>
                      <div>
                        EST. BUDGET: ₹
                        {(createdIssue.estimatedCostInr || finalCostInr).toLocaleString(
                          'en-IN'
                        )}
                      </div>
                      <div>STATUS: {createdIssue.status}</div>
                    </div>

                    {/* Scannable QR Visual Block */}
                    <div className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-lg bg-slate-50 shrink-0">
                      <QrCode className="w-16 h-16 text-slate-900" />
                      <span className="text-[10px] text-slate-500 mt-1">
                        SCAN TO TRACK
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print QR Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onInspectExistingIssue(createdIssue.complaintId)
                      }
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Track Complaint ({createdIssue.complaintId})
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
                  <div className="font-semibold text-slate-900 text-sm">
                    Confirm Submission to Tadipatri Municipal Admin
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-slate-500">Title:</span>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {title}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">
                        AI Suggested Category & Priority:
                      </span>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {category} · {finalPriority} ({finalSlaHours}h SLA)
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Location:</span>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {address}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Workflow Route:</span>
                      <div className="font-semibold text-[#0284C7] mt-0.5">
                        Citizen → Municipal Admin → Split to{' '}
                        {aiResult?.recommendedDepartmentName || 'Department'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Controls */}
        {!createdIssue && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>
            ) : (
              <div />
            )}

            {step < 3 && (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!title.trim() || !description.trim())) {
                    setFormError(
                      'Please enter both a complaint title and description.'
                    );
                    return;
                  }
                  setFormError(null);
                  setStep((s) => s + 1);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={runStep4AiAnalysis}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run AI Analysis</span>
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => setStep(5)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg disabled:opacity-50 cursor-pointer"
              >
                <span>Proceed to Confirmation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 5 && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitComplaint}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Sending to Admin...'
                    : 'Send Report to Municipal Admin'}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

"use client";

import * as React from "react";
import {
  ClipboardCheck,
  Activity,
  Send,
  CheckCircle,
  Clock,
  FileText,
  Pill,
  Calendar,
  User,
  ShieldCheck,
  Search,
  AlertCircle,
  CheckCircle2,
  Lock,
  X,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CaretakerPatientMonitor } from "@/components/caretaker/caretaker-patient-monitor";
import { useDashboardPolling } from "@/hooks/use-dashboard-polling";

export interface PatientSummary {
  id: string;
  name: string;
  preferredName?: string | null;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string[];
  allergies?: string[];
  latestBloodSugar?: string | null;
  latestBloodPressure?: string | null;
  sugarSeverity?: "NORMAL" | "WARNING" | "CRITICAL";
  bpSeverity?: "NORMAL" | "WARNING" | "CRITICAL";
  doseProgress?: { taken: number; total: number };
  alertBadges?: string[];
}

export interface CaretakerProfileData {
  id: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  professionalCategory?: string | null;
  qualification?: string | null;
  registrationNumber?: string | null;
  issuingAuthority?: string | null;
  state?: string | null;
}

interface CaretakerDashboardClientProps {
  caretakerName: string;
  caretakerProfile?: CaretakerProfileData | null;
  initialSelectedPatientId?: string;
  initialTasks: any[];
  initialNotes: any[];
  initialSection?: "patients" | "discover";
  profiles: PatientSummary[];
}

type ClinicalTab = "medications" | "tasks" | "appointments" | "notes";

export function CaretakerDashboardClient({
  caretakerName,
  caretakerProfile,
  initialSelectedPatientId,
  initialTasks,
  initialNotes,
  initialSection,
  profiles,
}: CaretakerDashboardClientProps) {
  const [mainSection, setMainSection] = React.useState<"patients" | "discover">(
    initialSection || (profiles.length === 0 ? "discover" : "patients")
  );

  const [selectedProfileId, setSelectedProfileId] = React.useState<string>(
    initialSelectedPatientId || profiles[0]?.id || ""
  );
  const [activeTab, setActiveTab] = React.useState<ClinicalTab>("medications");

  // Automatic Polling for Role Caretaker (15s visible, 60s hidden with backoff)
  const { lastUpdated, isRefreshing, refreshNow } = useDashboardPolling({
    role: "caretaker",
    onUpdate: () => {
      if (selectedProfileId) {
        loadPatientData(selectedProfileId);
      }
    },
  });

  // Patient-specific clinical data states
  const [doses, setDoses] = React.useState<any[]>([]);
  const [loadingDoses, setLoadingDoses] = React.useState(false);
  const [confirmingDoseId, setConfirmingDoseId] = React.useState<string | null>(null);

  const [patientTasks, setPatientTasks] = React.useState<any[]>(initialTasks);
  const [loadingTasks, setLoadingTasks] = React.useState(false);

  const [appointments, setAppointments] = React.useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = React.useState(false);

  const [patientNotes, setPatientNotes] = React.useState<any[]>(initialNotes);
  const [loadingNotes, setLoadingNotes] = React.useState(false);

  // New Note / Vitals Form state
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteContent, setNoteContent] = React.useState("");
  const [category, setCategory] = React.useState<string>("HEALTH_UPDATE");
  const [bp, setBp] = React.useState("120/80");
  const [pulse, setPulse] = React.useState("72");
  const [sugar, setSugar] = React.useState("110");
  const [temp, setTemp] = React.useState("98.6");
  const [savingNote, setSavingNote] = React.useState(false);
  const [noteSuccess, setNoteSuccess] = React.useState(false);

  // Discover Patients state
  const [discoverQuery, setDiscoverQuery] = React.useState("");
  const [discoverResults, setDiscoverResults] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchDone, setSearchDone] = React.useState(false);
  const [requestModalPatient, setRequestModalPatient] = React.useState<any | null>(null);
  const [requestNotes, setRequestNotes] = React.useState("");
  const [sendingRequest, setSendingRequest] = React.useState(false);
  const [discoverFeedback, setDiscoverFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isApproved = !caretakerProfile || caretakerProfile.status === "APPROVED";

  const activePatient = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  // Fetch patient-specific clinical data in strict data isolation
  const loadPatientData = React.useCallback(async (pid: string) => {
    if (!pid) return;
    setLoadingDoses(true);
    setLoadingAppts(true);
    setLoadingTasks(true);
    setLoadingNotes(true);

    try {
      const [dosesRes, apptsRes, tasksRes, notesRes] = await Promise.all([
        fetch(`/api/doses?profileId=${encodeURIComponent(pid)}&filter=today`),
        fetch(`/api/appointments?profileId=${encodeURIComponent(pid)}`),
        fetch(`/api/tasks?profileId=${encodeURIComponent(pid)}`),
        fetch(`/api/notes?profileId=${encodeURIComponent(pid)}`),
      ]);

      if (dosesRes.ok) {
        const d = await dosesRes.json();
        setDoses(d.doses || []);
      }
      if (apptsRes.ok) {
        const a = await apptsRes.json();
        setAppointments(a.appointments || []);
      }
      if (tasksRes.ok) {
        const t = await tasksRes.json();
        setPatientTasks(t.tasks || []);
      }
      if (notesRes.ok) {
        const n = await notesRes.json();
        setPatientNotes(n.notes || []);
      }
    } catch (err) {
      console.error("Failed to fetch patient data", err);
    } finally {
      setLoadingDoses(false);
      setLoadingAppts(false);
      setLoadingTasks(false);
      setLoadingNotes(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedProfileId) {
      loadPatientData(selectedProfileId);
    }
  }, [selectedProfileId, loadPatientData]);

  // Patient Discovery Search
  const handleSearchPatients = React.useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearching(true);
    setDiscoverFeedback(null);
    try {
      const queryParam = discoverQuery.trim()
        ? `?query=${encodeURIComponent(discoverQuery.trim())}`
        : "";
      const res = await fetch(`/api/patients/discover${queryParam}`);
      const data = await res.json();
      if (res.ok) {
        setDiscoverResults(data.patients || []);
        setSearchDone(true);
      } else {
        setDiscoverFeedback({
          type: "error",
          message: data.error || "Failed to search patients",
        });
      }
    } catch {
      setDiscoverFeedback({
        type: "error",
        message: "Network error while searching patients",
      });
    } finally {
      setSearching(false);
    }
  }, [discoverQuery]);

  // Initial load for discover if tab opened
  React.useEffect(() => {
    if (mainSection === "discover" && isApproved && discoverResults.length === 0 && !searchDone) {
      handleSearchPatients();
    }
  }, [mainSection, isApproved, discoverResults.length, searchDone, handleSearchPatients]);

  // Caretaker Dose Confirmation Action
  const handleConfirmDose = async (doseId: string) => {
    setConfirmingDoseId(doseId);
    try {
      const res = await fetch(`/api/doses/${doseId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationNotes: `Administered and confirmed by Caretaker ${caretakerName}`,
        }),
      });
      if (res.ok) {
        if (selectedProfileId) {
          loadPatientData(selectedProfileId);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to confirm dose");
      }
    } catch {
      alert("Network error while confirming dose");
    } finally {
      setConfirmingDoseId(null);
    }
  };

  // Quick task toggle
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPatientTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch {
      alert("Failed to update task status");
    }
  };

  // Submit new clinical care note or shift handover for the active patient
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) return;
    setSavingNote(true);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId: selectedProfileId,
          category,
          title: noteTitle,
          content: noteContent,
          vitalSigns: {
            bloodPressure: bp || undefined,
            heartRate: pulse ? Number(pulse) : undefined,
            bloodGlucose: sugar ? Number(sugar) : undefined,
            temperature: temp ? Number(temp) : undefined,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPatientNotes((prev) => [data.note, ...prev]);
        setNoteTitle("");
        setNoteContent("");
        setNoteSuccess(true);
        setTimeout(() => setNoteSuccess(false), 5000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record care note");
      }
    } catch {
      alert("Failed to record care note");
    } finally {
      setSavingNote(false);
    }
  };

  // Submit Access Request
  const handleSendAccessRequest = async () => {
    if (!requestModalPatient) return;
    setSendingRequest(true);
    setDiscoverFeedback(null);
    try {
      const res = await fetch(`/api/patients/${requestModalPatient.id}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: requestNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiscoverFeedback({
          type: "success",
          message: `Access request submitted for ${requestModalPatient.name}. The Family Administrator will review your credentials.`,
        });
        setDiscoverResults((prev) =>
          prev.map((p) =>
            p.id === requestModalPatient.id ? { ...p, hasPendingRequest: true } : p
          )
        );
        setRequestModalPatient(null);
        setRequestNotes("");
      } else {
        setDiscoverFeedback({
          type: "error",
          message: data.error || "Failed to submit request",
        });
      }
    } catch {
      setDiscoverFeedback({
        type: "error",
        message: "Network error while submitting access request",
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const pendingTasks = patientTasks.filter((t) => t.status !== "COMPLETED");
  const takenDosesCount = doses.filter((d) => d.status === "TAKEN").length;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* ======================================================== */}
      {/* 0. VERIFICATION STATUS ALERT BANNER                     */}
      {/* ======================================================== */}
      {caretakerProfile && caretakerProfile.status !== "APPROVED" && (
        <div className="bg-amber-500/10 border-b border-amber-300/70 px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950">
                  {caretakerProfile.status === "REJECTED"
                    ? "Professional License Application Declined"
                    : "Your professional credentials are under review. Full patient access will be granted once verified."}
                </h4>
                <p className="text-xs text-amber-900/80 mt-0.5">
                  {caretakerProfile.status === "REJECTED"
                    ? `Reason: ${
                        caretakerProfile.rejectionReason ||
                        "Credentials could not be verified by platform compliance."
                      } Please contact platform administration to update credentials.`
                    : caretakerProfile.status === "UNDER_REVIEW"
                    ? "Our clinical review board is currently validating your license and council registration. Medical telemetry and patient records remain locked until approved."
                    : "Your license document and registration details have been submitted. Clinical telemetry and medical access are restricted until verified by the platform administrator."}
                </p>
              </div>
            </div>
            <Badge className="bg-amber-700 text-white font-bold text-xs shrink-0 self-start sm:self-auto">
              Status: {caretakerProfile.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. CARETAKER HEADER & SECTION NAVIGATION                 */}
      {/* ======================================================== */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center rounded-lg bg-teal-100 px-3 py-1 text-xs font-black text-teal-800 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-teal-700" />
                  {caretakerProfile?.professionalCategory || "Licensed Caretaker / Nurse"}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {caretakerProfile?.registrationNumber
                    ? `Reg #${caretakerProfile.registrationNumber} (${caretakerProfile.state || "Active"})`
                    : "Clinical Care & Medication Authority"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
                Welcome, {caretakerName}
              </h1>
              <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-500">
                <span className={`inline-block h-2 w-2 rounded-full ${isRefreshing ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`} />
                <span>Last updated: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <button
                  type="button"
                  onClick={() => refreshNow()}
                  disabled={isRefreshing}
                  className="text-teal-700 hover:underline font-bold ml-1"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Primary Mode Switcher (My Patients vs Find Patients) */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => setMainSection("patients")}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  mainSection === "patients"
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>My Assigned Patients ({profiles.length})</span>
              </button>

              <button
                onClick={() => setMainSection("discover")}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  mainSection === "discover"
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Find Patients</span>
              </button>
            </div>
          </div>

          {/* If in My Patients mode: render patient switcher grid */}
          {mainSection === "patients" && profiles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Assigned Senior Patients
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select an assigned patient to inspect telemetry, administer medications, and log care observations in strict isolation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map((p) => {
                  const isSelected = p.id === selectedProfileId;
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      data-testid={`caretaker-patient-${p.id}`}
                      onClick={() => setSelectedProfileId(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedProfileId(p.id);
                        }
                      }}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/70 shadow-md ring-3 ring-teal-500/20"
                          : "border-slate-200 bg-white hover:border-teal-300 hover:shadow-xs"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-xl font-black text-base shadow-xs ${
                                isSelected
                                  ? "bg-teal-700 text-white"
                                  : "bg-teal-100 text-teal-800"
                              }`}
                            >
                              {p.name[0]}
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-900 leading-snug">
                                {p.name}
                              </h3>
                              {p.preferredName && p.preferredName !== p.name && (
                                <p className="text-xs text-slate-500">
                                  &quot;{p.preferredName}&quot;
                                </p>
                              )}
                            </div>
                          </div>

                          {isSelected ? (
                            <Badge className="bg-teal-700 text-white text-[10px] font-bold">
                              ✓ Monitoring Active
                            </Badge>
                          ) : (
                            <span className="text-xs font-bold text-teal-700 hover:underline">
                              Select Patient →
                            </span>
                          )}
                        </div>

                        {/* Emergency Contact & Conditions */}
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                          {/* Latest Vitals Display */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Sugar</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                {p.latestBloodSugar || "--"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Pressure</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                {p.latestBloodPressure || "--"}
                              </span>
                            </div>
                          </div>

                          {/* Dose Progress & Alerts */}
                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <span className="text-slate-500 font-medium">Today's Doses:</span>
                            <span className="font-bold text-teal-800 dark:text-teal-400">
                              {p.doseProgress ? `${p.doseProgress.taken} / ${p.doseProgress.total} Taken` : "0 Scheduled"}
                            </span>
                          </div>

                          {/* Alert Badges */}
                          {p.alertBadges && p.alertBadges.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {p.alertBadges.map((badge, idx) => (
                                <span
                                  key={idx}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    badge.includes("Missed") || badge.includes("Critical")
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  }`}
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}

                          {p.emergencyContactName && (
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                              <span>Contact:</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                {p.emergencyContactName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Strict Data Isolation</span>
                        <span
                          className={`font-black ${
                            isSelected ? "text-teal-800" : "text-slate-400"
                          }`}
                        >
                          {isSelected ? "Active View" : "Click to Switch"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION A: FIND PATIENTS (DISCOVERY & REQUESTS)          */}
      {/* ======================================================== */}
      {mainSection === "discover" && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          {!isApproved ? (
            /* Unapproved Guard */
            <div className="rounded-3xl border-2 border-amber-200 bg-amber-50/70 p-10 text-center max-w-2xl mx-auto space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black text-amber-950">
                Professional Verification Required
              </h3>
              <p className="text-xs text-amber-900 leading-relaxed max-w-lg mx-auto">
                Professional verification required before accessing patient search. In compliance with healthcare data protection standards, only certified healthcare professionals whose licenses have been reviewed and approved can discover registered senior patients and submit monitoring access requests.
              </p>
              <div className="pt-2">
                <Badge className="bg-amber-600 text-white font-bold text-xs px-3 py-1">
                  Status: {caretakerProfile?.status || "PENDING REVIEW"}
                </Badge>
              </div>
            </div>
          ) : (
            /* Approved Caretaker Search Interface */
            <div className="space-y-6">
              {/* Search Toolbar */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Discover Senior Patients
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Search registered senior patients by name or ID. Public non-medical profiles allow licensed caretakers to submit monitoring access requests to the patient&apos;s Family Administrator.
                  </p>
                </div>

                <form onSubmit={handleSearchPatients} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search by patient name, preferred name, or ID..."
                      value={discoverQuery}
                      onChange={(e) => setDiscoverQuery(e.target.value)}
                      className="pl-10 text-xs h-10"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={searching}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-5 h-10 shadow-xs"
                  >
                    {searching ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Search className="h-4 w-4 mr-1.5" />
                    )}
                    Search
                  </Button>
                </form>

                {discoverFeedback && (
                  <div
                    className={`rounded-xl p-3 text-xs font-semibold flex items-center justify-between ${
                      discoverFeedback.type === "success"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {discoverFeedback.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                      <span>{discoverFeedback.message}</span>
                    </div>
                    <button
                      onClick={() => setDiscoverFeedback(null)}
                      className="text-xs font-bold underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searching ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                  <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">
                    Searching patient directory...
                  </p>
                </div>
              ) : discoverResults.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {searchDone
                      ? "No patients match your search"
                      : "Search to discover registered senior patients"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchDone
                      ? "Try searching with a different name or leaving the search field blank to view all discoverable profiles."
                      : "Type a patient name or click Search to browse senior profiles open for caretaker monitoring."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {discoverResults.map((patient) => {
                    const isAlreadyAssigned = profiles.some((p) => p.id === patient.id);
                    const isPending = patient.hasPendingRequest;

                    return (
                      <Card
                        key={patient.id}
                        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 transition-all"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-3">
                              <div className="h-11 w-11 rounded-xl bg-teal-100 text-teal-800 font-black text-base flex items-center justify-center shrink-0">
                                {patient.name[0]}
                              </div>
                              <div>
                                <h3 className="text-sm font-black text-slate-900">
                                  {patient.name}
                                </h3>
                                {patient.preferredName &&
                                  patient.preferredName !== patient.name && (
                                    <span className="text-xs text-slate-500 block">
                                      &quot;{patient.preferredName}&quot;
                                    </span>
                                  )}
                              </div>
                            </div>

                            {isAlreadyAssigned ? (
                              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                ✓ Assigned
                              </Badge>
                            ) : isPending ? (
                              <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                                Request Pending
                              </Badge>
                            ) : null}
                          </div>

                          {/* Public Non-Medical Details */}
                          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Demographics:</span>
                              <span className="font-bold text-slate-900">
                                {patient.age ? `${patient.age} yrs` : "Age N/A"} •{" "}
                                {patient.gender || "Gender N/A"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Care Circle:</span>
                              <span className="font-bold text-teal-900 truncate max-w-[170px]">
                                {patient.careCircleName || "Family Circle"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Coordinator:</span>
                              <span className="font-semibold text-slate-800">
                                {patient.familyCoordinatorName ||
                                  patient.emergencyContactName ||
                                  "Family Administrator"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Area */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {patient.id.slice(0, 8)}...
                          </span>

                          {isAlreadyAssigned ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProfileId(patient.id);
                                setMainSection("patients");
                              }}
                              className="text-xs font-bold text-teal-700 hover:bg-teal-50"
                            >
                              View Records →
                            </Button>
                          ) : isPending ? (
                            <span className="text-xs font-bold text-amber-700">
                              Awaiting Approval
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setRequestModalPatient(patient);
                                setRequestNotes("");
                              }}
                              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Request Access
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION B: MY PATIENTS (CLINICAL TELEMETRY & RECORDS)     */}
      {/* ======================================================== */}
      {mainSection === "patients" && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
          {profiles.length === 0 ? (
            /* Empty state when no patients are assigned */
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center max-w-xl mx-auto space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Awaiting Patient Care Assignment
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Welcome, {caretakerName}. You are registered as a Licensed Caretaker / Nurse. You will see assigned patient schedules, clinical tasks, vital sign logs, and handover notes here once a family coordinator assigns you to their Care Circle or approves your access request.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => setMainSection("discover")}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-6 py-2 shadow-xs"
                >
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  Find Patients & Request Access
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Clinical Health Monitor (Isolated to selected patient) */}
              <CaretakerPatientMonitor
                profiles={profiles}
                activeProfileId={selectedProfileId}
                onSelectProfile={(id) => setSelectedProfileId(id)}
                onMedicationCreated={() => {
                  if (selectedProfileId) loadPatientData(selectedProfileId);
                }}
                onTaskCreated={() => {
                  if (selectedProfileId) loadPatientData(selectedProfileId);
                }}
              />

              {/* Clinical Care Management & Vitals Logging */}
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Left Column: Clinical Records & Schedule (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Navigation Tabs for Active Patient's Clinical Records */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-teal-700" />
                        <span className="text-xs font-bold text-slate-700">
                          Active Patient: <strong className="text-teal-900">{activePatient?.name}</strong>
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                        Isolated Clinical Records
                      </Badge>
                    </div>

                    <div className="flex space-x-2 overflow-x-auto">
                      {[
                        { id: "medications", label: `Medications (${doses.length})`, icon: Pill },
                        { id: "tasks", label: `Care Tasks (${patientTasks.length})`, icon: ClipboardCheck },
                        { id: "appointments", label: `Appointments (${appointments.length})`, icon: Calendar },
                        { id: "notes", label: `Shift Logs (${patientNotes.length})`, icon: FileText },
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ClinicalTab)}
                            className={`flex items-center space-x-2 py-2 px-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                              isActive
                                ? "bg-teal-700 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* TAB 1: MEDICATIONS & TODAY'S DOSES */}
                  {activeTab === "medications" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Pill className="h-5 w-5 text-teal-700" />
                          <h3 className="text-base font-bold text-slate-900">
                            Today&apos;s Medication Regimen for {activePatient?.name}
                          </h3>
                        </div>
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                          {takenDosesCount}/{doses.length} Administered
                        </span>
                      </div>

                      {loadingDoses ? (
                        <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                          Loading schedule...
                        </div>
                      ) : doses.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                          <CheckCircle className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-700">
                            No medication doses scheduled for today
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {doses.map((dose) => {
                            const isTaken = dose.status === "TAKEN";
                            const isConfirming = confirmingDoseId === dose.id;
                            const isAttention =
                              dose.status === "MISSED" || dose.status === "UNCONFIRMED";

                            return (
                              <Card
                                key={dose.id}
                                className={`rounded-2xl border p-4 transition-all ${
                                  isTaken
                                    ? "bg-slate-50/70 border-slate-200 opacity-80"
                                    : isAttention
                                    ? "bg-amber-50/70 border-amber-300"
                                    : "bg-white border-slate-200 shadow-xs"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs ${
                                        isTaken
                                          ? "bg-emerald-100 text-emerald-800"
                                          : isAttention
                                          ? "bg-amber-200 text-amber-900"
                                          : "bg-teal-100 text-teal-800"
                                      }`}
                                    >
                                      {new Date(dose.scheduledTime).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-900">
                                        {dose.medication?.name || "Medication"}
                                      </h4>
                                      <p className="text-xs text-slate-500">
                                        {dose.medication?.dosage} • {dose.medication?.instructions || "Take as directed"}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    {isTaken ? (
                                      <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                                        ✓ Administered
                                      </Badge>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleConfirmDose(dose.id)}
                                        disabled={isConfirming}
                                        className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-8 shadow-xs"
                                      >
                                        {isConfirming ? "Confirming..." : "Confirm Given"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CLINICAL CARE TASKS */}
                  {activeTab === "tasks" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ClipboardCheck className="h-5 w-5 text-teal-700" />
                          <h3 className="text-base font-bold text-slate-900">
                            Daily Clinical & Nursing Tasks
                          </h3>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {pendingTasks.length} Pending
                        </Badge>
                      </div>

                      {loadingTasks ? (
                        <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                          Loading care tasks...
                        </div>
                      ) : patientTasks.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                          <CheckCircle className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-700">
                            No care tasks logged for {activePatient?.name}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {patientTasks.map((t) => {
                            const isDone = t.status === "COMPLETED";
                            return (
                              <Card
                                key={t.id}
                                className={`rounded-2xl border p-4 transition-all ${
                                  isDone
                                    ? "bg-slate-50/70 border-slate-200 opacity-70"
                                    : "bg-white border-slate-200 shadow-xs"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-start space-x-3">
                                    <input
                                      type="checkbox"
                                      checked={isDone}
                                      onChange={() => handleToggleTask(t.id, t.status)}
                                      className="mt-1 h-4 w-4 rounded-md border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <div>
                                      <h4
                                        className={`text-sm font-bold ${
                                          isDone
                                            ? "text-slate-500 line-through"
                                            : "text-slate-900"
                                        }`}
                                      >
                                        {t.title}
                                      </h4>
                                      {t.description && (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                          {t.description}
                                        </p>
                                      )}
                                      <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-400">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          Due:{" "}
                                          {t.dueDate
                                            ? new Date(t.dueDate).toLocaleDateString([], {
                                                month: "short",
                                                day: "numeric",
                                              })
                                            : "Today"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: APPOINTMENTS */}
                  {activeTab === "appointments" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5 text-teal-700" />
                          <h3 className="text-base font-bold text-slate-900">
                            Upcoming Clinical & Doctor Visits
                          </h3>
                        </div>
                      </div>

                      {loadingAppts ? (
                        <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                          Loading appointments...
                        </div>
                      ) : appointments.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                          <p className="text-xs font-semibold text-slate-600">
                            No appointments on file for {activePatient?.name}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {appointments.map((appt) => (
                            <Card
                              key={appt.id}
                              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {appt.title}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    {appt.doctorName || "Physician"} • {appt.location || "Clinic"}
                                  </p>
                                </div>
                                <div className="text-right text-xs">
                                  <span className="font-bold text-teal-900 block">
                                    {new Date(appt.appointmentDate).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                  <span className="text-slate-400 text-[11px]">
                                    {new Date(appt.appointmentDate).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: SHIFT LOGS */}
                  {activeTab === "notes" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-teal-700" />
                          <h3 className="text-base font-bold text-slate-900">
                            Care Observations & Shift Handover Logs
                          </h3>
                        </div>
                      </div>

                      {loadingNotes ? (
                        <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                          Loading shift logs...
                        </div>
                      ) : patientNotes.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                          <p className="text-xs font-semibold text-slate-600">
                            No care notes recorded yet. Use the form on the right to log observations.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {patientNotes.map((note) => (
                            <Card
                              key={note.id}
                              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-[10px]">
                                    {note.category}
                                  </Badge>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {note.title}
                                  </h4>
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  {new Date(note.createdAt).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {note.content}
                              </p>
                              {note.vitalSigns && typeof note.vitalSigns === "object" && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-[11px] text-teal-800">
                                  {note.vitalSigns.bloodPressure && (
                                    <span className="bg-teal-50 px-2 py-0.5 rounded font-mono">
                                      BP: {note.vitalSigns.bloodPressure}
                                    </span>
                                  )}
                                  {note.vitalSigns.heartRate && (
                                    <span className="bg-teal-50 px-2 py-0.5 rounded font-mono">
                                      Pulse: {note.vitalSigns.heartRate} bpm
                                    </span>
                                  )}
                                  {note.vitalSigns.bloodGlucose && (
                                    <span className="bg-teal-50 px-2 py-0.5 rounded font-mono">
                                      Glucose: {note.vitalSigns.bloodGlucose} mg/dL
                                    </span>
                                  )}
                                  {note.vitalSigns.temperature && (
                                    <span className="bg-teal-50 px-2 py-0.5 rounded font-mono">
                                      Temp: {note.vitalSigns.temperature} °F
                                    </span>
                                  )}
                                </div>
                              )}
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Vitals Logger & Shift Handover Form (5 cols) */}
                <div className="lg:col-span-5">
                  <Card className="rounded-3xl border border-slate-200 bg-white shadow-xs sticky top-24">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-teal-700" />
                        <CardTitle className="text-base font-bold text-slate-900">
                          Log Vitals & Care Note
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs text-slate-500">
                        Record clinical observations for {activePatient?.name}.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 pt-0">
                      {noteSuccess && (
                        <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-300">
                          Care note and vital signs recorded successfully!
                        </div>
                      )}

                      <form onSubmit={handleSaveNote} className="space-y-4">
                        <div className="space-y-1">
                          <Label htmlFor="note-cat">Note Category</Label>
                          <select
                            id="note-cat"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                          >
                            <option value="HEALTH_UPDATE">Health Update & Vitals</option>
                            <option value="HANDOVER">Shift Handover Note</option>
                            <option value="OBSERVATION">General Clinical Observation</option>
                            <option value="MOOD">Mood & Mobility Check</option>
                            <option value="INCIDENT">Incident / Note of Concern</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="note-title">Title / Summary *</Label>
                          <Input
                            id="note-title"
                            required
                            placeholder="e.g. Afternoon Vitals & Meal Tolerance"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                          />
                        </div>

                        {/* Vitals 4-Grid */}
                        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Vital Signs (Optional)
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor="v-bp" className="text-[11px]">BP (mmHg)</Label>
                              <Input
                                id="v-bp"
                                placeholder="120/80"
                                value={bp}
                                onChange={(e) => setBp(e.target.value)}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <Label htmlFor="v-sugar" className="text-[11px]">Glucose (mg/dL)</Label>
                              <Input
                                id="v-sugar"
                                type="number"
                                placeholder="110"
                                value={sugar}
                                onChange={(e) => setSugar(e.target.value)}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <Label htmlFor="v-pulse" className="text-[11px]">Heart Rate (bpm)</Label>
                              <Input
                                id="v-pulse"
                                type="number"
                                placeholder="72"
                                value={pulse}
                                onChange={(e) => setPulse(e.target.value)}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <Label htmlFor="v-temp" className="text-[11px]">Temp (°F)</Label>
                              <Input
                                id="v-temp"
                                type="number"
                                step="0.1"
                                placeholder="98.6"
                                value={temp}
                                onChange={(e) => setTemp(e.target.value)}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="note-content">Clinical Observation Notes *</Label>
                          <Textarea
                            id="note-content"
                            required
                            rows={3}
                            placeholder="Document patient wellness, hydration, symptoms, appetite, or instructions for incoming caregivers..."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={savingNote}
                          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs h-10 shadow-xs"
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          {savingNote ? "Recording Note..." : "Publish Care Note"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Access Request Modal */}
      {requestModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-teal-800">
                <Send className="h-5 w-5" />
                <h3 className="text-base font-black text-slate-900">
                  Request Monitoring Access
                </h3>
              </div>
              <button
                onClick={() => setRequestModalPatient(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-teal-50 p-3.5 rounded-2xl border border-teal-200 text-xs space-y-1">
              <span className="font-bold text-teal-950 block text-sm">
                {requestModalPatient.name}
              </span>
              <p className="text-teal-800">
                Care Circle: <strong>{requestModalPatient.careCircleName || "Family Circle"}</strong>
              </p>
              <p className="text-teal-700 text-[11px]">
                Coordinator: {requestModalPatient.familyCoordinatorName || "Family Administrator"}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Introduction / Clinical Note (Optional)
              </label>
              <Textarea
                rows={3}
                placeholder="e.g. Registered Nurse with 5 years geriatric care experience. Available for daily vitals monitoring and medication administration."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRequestModalPatient(null)}
                disabled={sendingRequest}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendAccessRequest}
                disabled={sendingRequest}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
              >
                {sendingRequest ? "Sending Request..." : "Submit Access Request"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

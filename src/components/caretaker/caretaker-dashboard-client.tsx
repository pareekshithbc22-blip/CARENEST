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
  Footprints,
  Moon,
  Droplets,
  Utensils,
  HeartPulse,
  Info,
  ChevronRight,
  Eye,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDashboardPolling } from "@/hooks/use-dashboard-polling";
import { LiveVitalCharts, TimeRange } from "@/components/charts/live-vital-charts";
import { getSuggestedTaskValues } from "@/lib/domain/task-suggestions";
import { CaretakerVerificationTracker } from "@/components/caretaker/caretaker-verification-tracker";

export interface PatientSummary {
  id: string;
  name: string;
  preferredName?: string | null;
  patientCode?: string | null;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string[];
  allergies?: string[];
  latestBloodSugar?: string | null;
  latestBloodPressure?: string | null;
  sugarSeverity?: "NORMAL" | "WARNING" | "CRITICAL";
  bpSeverity?: "NORMAL" | "WARNING" | "CRITICAL";
  latestCondition?: string | null;
  doseProgress?: { taken: number; total: number };
  alertBadges?: string[];
}

export interface CaretakerProfileData {
  id: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "AUTO_APPROVED" | "AUTO_REJECTED" | "EXPIRED" | string;
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

type ClinicalTab = "telemetry" | "medications" | "tasks" | "appointments" | "notes";

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
  const [activeTab, setActiveTab] = React.useState<ClinicalTab>("telemetry");

  // Incoming Patient Requests (F4)
  const [incomingRequests, setIncomingRequests] = React.useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = React.useState(false);
  const [respondingReqId, setRespondingReqId] = React.useState<string | null>(null);
  const [requestFeedback, setRequestFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadIncomingRequests = React.useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/caretakers/requests");
      if (res.ok) {
        const data = await res.json();
        setIncomingRequests(data.requests || []);
      }
    } catch {
      // quiet fail
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // Telemetry Range & Data (F14)
  const [telemetryRange, setTelemetryRange] = React.useState<TimeRange>("live");
  const [telemetryReadings, setTelemetryReadings] = React.useState<any[]>([]);
  const [loadingTelemetry, setLoadingTelemetry] = React.useState(false);

  const loadTelemetry = React.useCallback(async (pid: string, range: TimeRange) => {
    if (!pid) return;
    setLoadingTelemetry(true);
    try {
      const res = await fetch(`/api/health-metrics/ranges?profileId=${encodeURIComponent(pid)}&range=${range}`);
      if (res.ok) {
        const data = await res.json();
        setTelemetryReadings(data.readings || []);
      }
    } catch {
      // quiet fail
    } finally {
      setLoadingTelemetry(false);
    }
  }, []);

  // Automatic Polling
  const { lastUpdated, isRefreshing, refreshNow } = useDashboardPolling({
    role: "caretaker",
    onUpdate: () => {
      loadIncomingRequests();
      if (selectedProfileId) {
        loadPatientData(selectedProfileId);
        loadTelemetry(selectedProfileId, telemetryRange);
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

  // Prescribe Medicine Form state (F6)
  const [showPrescribeForm, setShowPrescribeForm] = React.useState(false);
  const [prescribeName, setPrescribeName] = React.useState("");
  const [strengthNumber, setStrengthNumber] = React.useState<string>("500");
  const [strengthUnit, setStrengthUnit] = React.useState<"mg" | "mcg" | "ml">("mg");
  const [medForm, setMedForm] = React.useState<"tablet" | "capsule" | "syrup" | "drops">("tablet");
  const [scheduleTimes, setScheduleTimes] = React.useState<string>("08:00, 20:00");
  const [durationDays, setDurationDays] = React.useState<number>(30);
  const [reason, setReason] = React.useState("");
  const [initialStock, setInitialStock] = React.useState<number>(30);
  const [savingPrescription, setSavingPrescription] = React.useState(false);
  const [prescribeFeedback, setPrescribeFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Daily Tasks Form state (F8)
  const [showTaskForm, setShowTaskForm] = React.useState(false);
  const [selectedTaskType, setSelectedTaskType] = React.useState<string>("walking");
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDescription, setTaskDescription] = React.useState("");
  const [taskDurationDays, setTaskDurationDays] = React.useState<number | "everyday">("everyday");
  const [taskPriority, setTaskPriority] = React.useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [savingDailyTask, setSavingDailyTask] = React.useState(false);
  const [taskFeedback, setTaskFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Health Condition Update Form state (F10)
  const [noteCondition, setNoteCondition] = React.useState<"STABLE" | "IMPROVING" | "NEEDS_ATTENTION" | "CRITICAL">("STABLE");
  const [noteObservations, setNoteObservations] = React.useState("");
  const [appetite, setAppetite] = React.useState<string>("Good");
  const [mood, setMood] = React.useState<string>("Cheerful");
  const [sleepQuality, setSleepQuality] = React.useState<string>("Restful");
  const [painLevel, setPainLevel] = React.useState<number>(0);
  const [mobility, setMobility] = React.useState<string>("Independent");
  const [bp, setBp] = React.useState("120/80");
  const [pulse, setPulse] = React.useState("72");
  const [sugar, setSugar] = React.useState("110");
  const [temp, setTemp] = React.useState("98.6");
  const [savingNote, setSavingNote] = React.useState(false);
  const [noteFeedback, setNoteFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Discover Patients state
  const [discoverQuery, setDiscoverQuery] = React.useState("");
  const [discoverResults, setDiscoverResults] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchDone, setSearchDone] = React.useState(false);
  const [requestModalPatient, setRequestModalPatient] = React.useState<any | null>(null);
  const [requestNotes, setRequestNotes] = React.useState("");
  const [sendingRequest, setSendingRequest] = React.useState(false);
  const [discoverFeedback, setDiscoverFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const isApproved = !caretakerProfile || caretakerProfile.status === "APPROVED";
  const activePatient = profiles.find((p) => p.id === selectedProfileId) || profiles[0];
  const patientCount = profiles.length;
  const isAtMaxCapacity = patientCount >= 5;

  // Derive patient age
  const patientAge = React.useMemo(() => {
    if (!activePatient?.dateOfBirth) return 72;
    const diffMs = Date.now() - new Date(activePatient.dateOfBirth).getTime();
    return Math.abs(new Date(diffMs).getUTCFullYear() - 1970);
  }, [activePatient]);

  // Load clinical data
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
        fetch(`/api/tasks?profileId=${encodeURIComponent(pid)}&withHistory=true`),
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
    loadIncomingRequests();
  }, [loadIncomingRequests]);

  React.useEffect(() => {
    if (selectedProfileId) {
      loadPatientData(selectedProfileId);
      loadTelemetry(selectedProfileId, telemetryRange);
    }
  }, [selectedProfileId, loadPatientData, loadTelemetry, telemetryRange]);

  // Handle incoming request response (Accept / Reject)
  const handleRespondToRequest = async (requestId: string, action: "ACCEPT" | "REJECT") => {
    setRespondingReqId(requestId);
    setRequestFeedback(null);

    try {
      const res = await fetch(`/api/caretakers/requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok) {
        setRequestFeedback({
          type: "success",
          message: action === "ACCEPT" ? "Patient request accepted! Added to active patient roster." : "Patient request declined.",
        });
        loadIncomingRequests();
        window.location.reload();
      } else {
        setRequestFeedback({
          type: "error",
          message: data.error || "Failed to respond to request.",
        });
      }
    } catch {
      setRequestFeedback({
        type: "error",
        message: "Network error while responding to request.",
      });
    } finally {
      setRespondingReqId(null);
    }
  };

  // Submit Prescription (F6)
  const handlePrescribeMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId || !prescribeName.trim()) return;

    setSavingPrescription(true);
    setPrescribeFeedback(null);

    const timesArray = scheduleTimes
      .split(",")
      .map((t) => t.trim())
      .filter((t) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t));

    if (timesArray.length === 0) {
      setPrescribeFeedback({ type: "error", message: "Enter at least one valid 24-hr schedule time (e.g. 08:00, 20:00)." });
      setSavingPrescription(false);
      return;
    }

    try {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId: selectedProfileId,
          name: prescribeName.trim(),
          strengthNumber: parseFloat(strengthNumber) || undefined,
          strengthUnit,
          strength: `${strengthNumber} ${strengthUnit}`,
          form: medForm,
          dosageInstructions: reason.trim() || `Take 1 ${medForm} on schedule`,
          timesOfDay: timesArray,
          durationDays: durationDays || 30,
          reason: reason.trim() || undefined,
          initialStock: initialStock || 30,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPrescribeFeedback({ type: "success", message: `Prescribed ${prescribeName} successfully!` });
        setPrescribeName("");
        setReason("");
        setShowPrescribeForm(false);
        loadPatientData(selectedProfileId);
      } else {
        setPrescribeFeedback({ type: "error", message: data.error || "Failed to prescribe medication." });
      }
    } catch {
      setPrescribeFeedback({ type: "error", message: "Network error while prescribing medication." });
    } finally {
      setSavingPrescription(false);
    }
  };

  // Submit Daily Task (F8)
  const handleCreateDailyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId || !taskTitle.trim()) return;

    setSavingDailyTask(true);
    setTaskFeedback(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId: selectedProfileId,
          taskType: selectedTaskType,
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          priority: taskPriority,
          durationDays: taskDurationDays === "everyday" ? null : taskDurationDays,
          untilStopped: taskDurationDays === "everyday",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTaskFeedback({ type: "success", message: `Assigned task "${taskTitle}" to ${activePatient?.name}!` });
        setTaskTitle("");
        setTaskDescription("");
        setShowTaskForm(false);
        loadPatientData(selectedProfileId);
      } else {
        setTaskFeedback({ type: "error", message: data.error || "Failed to assign daily task." });
      }
    } catch {
      setTaskFeedback({ type: "error", message: "Network error while assigning daily task." });
    } finally {
      setSavingDailyTask(false);
    }
  };

  // Apply age-based suggestion preset
  const handleSelectTaskPreset = (type: string) => {
    setSelectedTaskType(type);
    const suggestions = getSuggestedTaskValues(patientAge);

    if (type === "walking") {
      setTaskTitle("Walking / Mobility Exercise");
      setTaskDescription(`${suggestions.walking.activity.replace("_", " ")} for ${suggestions.walking.durationMinutes} mins. ${suggestions.walking.notes}`);
    } else if (type === "sleep") {
      setTaskTitle("Sleep & Rest Schedule");
      setTaskDescription(`Target ${suggestions.sleep.targetSleepHours}h (${suggestions.sleep.bedtime} - ${suggestions.sleep.wakeupTime}). ${suggestions.sleep.notes}`);
    } else if (type === "sugar") {
      setTaskTitle("Check Blood Sugar (Fasting & Post-Meal)");
      setTaskDescription(`Check times: ${suggestions.bloodSugar.sugarTimes.join(", ")}. ${suggestions.bloodSugar.notes}`);
    } else if (type === "bp") {
      setTaskTitle("Check Blood Pressure (Resting)");
      setTaskDescription(`Check times: ${suggestions.bloodPressure.bpTimes.join(", ")}. ${suggestions.bloodPressure.notes}`);
    } else if (type === "hydration") {
      setTaskTitle("Daily Hydration Goal");
      setTaskDescription(`${suggestions.hydration.glassesPerDay} glasses per day. ${suggestions.hydration.notes}`);
    } else if (type === "meals") {
      setTaskTitle("Nutritious Meals & Diet Routine");
      setTaskDescription(`Meals: ${suggestions.meals.mealTimes.join(", ")}. ${suggestions.meals.dietNote}`);
    } else {
      setTaskTitle("Daily Routine Check");
      setTaskDescription("");
    }
  };

  // Submit Health Condition Update (F10)
  const handleSaveConditionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId || !noteObservations.trim()) return;

    setSavingNote(true);
    setNoteFeedback(null);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId: selectedProfileId,
          overallCondition: noteCondition,
          observations: noteObservations.trim(),
          quickFields: {
            appetite,
            mood,
            sleepQuality,
            painLevel,
            mobility,
          },
          vitalSigns: {
            bloodPressure: bp || undefined,
            heartRate: pulse ? Number(pulse) : undefined,
            bloodGlucose: sugar ? Number(sugar) : undefined,
            temperature: temp ? Number(temp) : undefined,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNoteFeedback({ type: "success", message: `Published condition update for ${activePatient?.name}!` });
        setNoteObservations("");
        loadPatientData(selectedProfileId);
      } else {
        setNoteFeedback({ type: "error", message: data.error || "Failed to record condition update." });
      }
    } catch {
      setNoteFeedback({ type: "error", message: "Network error while recording condition update." });
    } finally {
      setSavingNote(false);
    }
  };

  // Confirm dose
  const handleConfirmDose = async (doseId: string) => {
    setConfirmingDoseId(doseId);
    try {
      const res = await fetch(`/api/doses/${doseId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationNotes: `Administered by Caretaker ${caretakerName}` }),
      });
      if (res.ok) {
        if (selectedProfileId) loadPatientData(selectedProfileId);
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

  const takenDosesCount = doses.filter((d) => d.status === "TAKEN").length;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* 0. VERIFICATION STATUS LIVE TRACKER & BANNER */}
      {caretakerProfile && (
        <CaretakerVerificationTracker
          initialStatus={caretakerProfile.status}
          profileId={caretakerProfile.id}
        />
      )}

      {/* 1. HEADER & CAPACITY INDICATOR (F5) */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center rounded-lg bg-teal-100 px-3 py-1 text-xs font-black text-teal-800 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-teal-700" />
                  {caretakerProfile?.professionalCategory || "Licensed Caretaker / Nurse"}
                </span>
                {/* 5-Patient Cap Header Display (F5) */}
                <Badge
                  variant="outline"
                  className={`font-mono font-bold text-xs ${
                    isAtMaxCapacity ? "bg-rose-50 border-rose-300 text-rose-700" : "bg-teal-50 border-teal-300 text-teal-800"
                  }`}
                >
                  Patients: {patientCount} / 5
                </Badge>
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

            {/* Mode Switcher */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMainSection("patients")}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  mainSection === "patients" ? "bg-teal-700 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Assigned Patients ({patientCount})</span>
              </button>
              <button
                onClick={() => setMainSection("discover")}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  mainSection === "discover" ? "bg-teal-700 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Discover Directory</span>
              </button>
            </div>
          </div>

          {/* INCOMING PATIENT REQUESTS SECTION (F4) */}
          {incomingRequests.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-300/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                  <Users className="h-4 w-4 text-amber-700" />
                  <span>Incoming Patient Assignment Requests ({incomingRequests.length})</span>
                </div>
                {isAtMaxCapacity && (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                    Capacity reached (5/5) — decline or revoke to accept new patients
                  </span>
                )}
              </div>

              {requestFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold ${
                    requestFeedback.type === "success" ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-rose-100 text-rose-900 border border-rose-300"
                  }`}
                >
                  {requestFeedback.message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {incomingRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-xl border border-amber-200 p-3 shadow-xs space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{req.patientName}</h4>
                        <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                          {req.patientCode || "PT-xxxx"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">Age: {req.age ?? "N/A"}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <span>Family Coordinator: </span>
                      <strong className="text-slate-900">{req.familyAdminName}</strong>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={respondingReqId === req.id}
                        onClick={() => handleRespondToRequest(req.id, "REJECT")}
                        className="text-xs h-7 text-slate-600 hover:text-rose-700"
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        disabled={isAtMaxCapacity || respondingReqId === req.id}
                        onClick={() => handleRespondToRequest(req.id, "ACCEPT")}
                        className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-7 font-bold"
                      >
                        {respondingReqId === req.id ? "Processing..." : "Accept Request"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient Switcher Grid */}
          {mainSection === "patients" && profiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {profiles.map((p) => {
                const isSelected = p.id === selectedProfileId;
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`cursor-pointer rounded-2xl border-2 p-3 transition-all text-left flex flex-col justify-between ${
                      isSelected ? "border-teal-600 bg-teal-50/70 shadow-xs ring-2 ring-teal-500/20" : "border-slate-200 bg-white hover:border-teal-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${isSelected ? "bg-teal-700 text-white" : "bg-teal-100 text-teal-800"}`}>
                          {p.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-black text-slate-900">{p.name}</h3>
                            {p.patientCode && (
                              <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-100 px-1 rounded">
                                {p.patientCode}
                              </span>
                            )}
                          </div>
                          {p.latestCondition && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              {p.latestCondition}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected ? (
                        <Badge className="bg-teal-700 text-white text-[9px] font-bold">Active</Badge>
                      ) : (
                        <span className="text-[10px] font-bold text-teal-700">Select →</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 2. ACTIVE PATIENT CLINICAL WORKSPACE */}
      {mainSection === "patients" && profiles.length > 0 && activePatient && (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex space-x-2 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
            {[
              { id: "telemetry", label: "Live Telemetry", icon: Activity },
              { id: "medications", label: `Medications (${doses.length})`, icon: Pill },
              { id: "tasks", label: `Daily Tasks (${patientTasks.length})`, icon: ClipboardCheck },
              { id: "notes", label: `Health Condition & Notes (${patientNotes.length})`, icon: FileText },
              { id: "appointments", label: `Appointments (${appointments.length})`, icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ClinicalTab)}
                  className={`flex items-center space-x-2 py-2 px-3.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    isActive ? "bg-teal-700 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: LIVE TELEMETRY & CHARTS (F14) */}
          {activeTab === "telemetry" && (
            <div className="space-y-4">
              <LiveVitalCharts
                patientId={activePatient.id}
                patientName={activePatient.name}
                vitals={telemetryReadings.map((r) => ({
                  id: r.id,
                  recordedAt: r.timestamp,
                  bloodGlucose: r.bloodGlucose,
                  bloodPressure: r.bloodPressure,
                  bloodPressureSystolic: r.systolic,
                  bloodPressureDiastolic: r.diastolic,
                  sugarSeverity: r.sugarSeverity,
                  bpSeverity: r.bpSeverity,
                  authorName: r.authorName,
                }))}
                onRangeChange={(r) => {
                  setTelemetryRange(r);
                  loadTelemetry(activePatient.id, r);
                }}
                isLoading={loadingTelemetry}
              />
            </div>
          )}

          {/* TAB 2: MEDICATIONS & PRESCRIBE (F6) */}
          {activeTab === "medications" && (
            <div className="space-y-5">
              {/* Prescribe Medicine Header & Toggle (F6) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Pill className="h-5 w-5 text-teal-700" />
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Prescribed Medications</h3>
                      <p className="text-xs text-slate-500">Manage patient regimen, stock levels, and prescribe new medications.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowPrescribeForm(!showPrescribeForm)}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {showPrescribeForm ? "Close Form" : "Prescribe Medicine"}
                  </Button>
                </div>

                {prescribeFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${prescribeFeedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                    {prescribeFeedback.message}
                  </div>
                )}

                {/* Prescribe Medicine Form (F6) */}
                {showPrescribeForm && (
                  <form onSubmit={handlePrescribeMedicine} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">New Clinical Prescription</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Medicine Name *</Label>
                        <Input
                          required
                          placeholder="Metformin"
                          value={prescribeName}
                          onChange={(e) => setPrescribeName(e.target.value)}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Strength *</Label>
                          <Input
                            required
                            type="number"
                            placeholder="500"
                            value={strengthNumber}
                            onChange={(e) => setStrengthNumber(e.target.value)}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          <select
                            value={strengthUnit}
                            onChange={(e: any) => setStrengthUnit(e.target.value)}
                            className="w-full h-8 rounded-md border text-xs bg-white px-2"
                          >
                            <option value="mg">mg</option>
                            <option value="mcg">mcg</option>
                            <option value="ml">ml</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Form</Label>
                        <select
                          value={medForm}
                          onChange={(e: any) => setMedForm(e.target.value)}
                          className="w-full h-8 rounded-md border text-xs bg-white px-2"
                        >
                          <option value="tablet">Tablet</option>
                          <option value="capsule">Capsule</option>
                          <option value="syrup">Syrup</option>
                          <option value="drops">Drops</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Schedule Times (24-hr)</Label>
                        <Input
                          placeholder="08:00, 20:00"
                          value={scheduleTimes}
                          onChange={(e) => setScheduleTimes(e.target.value)}
                          className="text-xs h-8 bg-white font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Duration (Days, 1-365)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={durationDays}
                          onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 30)}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Initial Stock (Units)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={initialStock}
                          onChange={(e) => setInitialStock(parseInt(e.target.value, 10) || 30)}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Clinical Reason & Instructions</Label>
                      <Input
                        placeholder="Glycemic control post breakfast and dinner"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowPrescribeForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={savingPrescription} className="bg-teal-700 hover:bg-teal-800 text-white font-bold">
                        {savingPrescription ? "Publishing..." : "Publish Prescription"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Today's Doses List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                    <span>Today&apos;s Scheduled Doses</span>
                    <span className="text-teal-800 bg-teal-50 px-2 py-0.5 rounded border">{takenDosesCount}/{doses.length} Administered</span>
                  </div>

                  {loadingDoses ? (
                    <div className="p-6 text-center text-xs text-slate-400">Loading schedule...</div>
                  ) : doses.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">No doses scheduled for today.</div>
                  ) : (
                    doses.map((dose) => (
                      <Card key={dose.id} className="p-3.5 border rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs ${dose.status === "TAKEN" ? "bg-emerald-100 text-emerald-800" : "bg-teal-100 text-teal-800"}`}>
                            {new Date(dose.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{dose.medicationName || dose.medication?.name}</h4>
                            <p className="text-[11px] text-slate-500">{dose.strength || dose.medication?.strength} • {dose.form || dose.medication?.form}</p>
                          </div>
                        </div>

                        <div>
                          {dose.status === "TAKEN" ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] font-bold">✓ Administered</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleConfirmDose(dose.id)}
                              disabled={confirmingDoseId === dose.id}
                              className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-7 font-bold"
                            >
                              {confirmingDoseId === dose.id ? "Saving..." : "Confirm Given"}
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DAILY TASKS (F8, F9) */}
          {activeTab === "tasks" && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ClipboardCheck className="h-5 w-5 text-teal-700" />
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Daily Care Tasks</h3>
                      <p className="text-xs text-slate-500">Tasks assigned by caretaker. Senior patient completes each task daily.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {showTaskForm ? "Close Form" : "Assign Daily Task"}
                  </Button>
                </div>

                {taskFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${taskFeedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                    {taskFeedback.message}
                  </div>
                )}

                {/* Assign Task Form with Clinical Presets (F8) */}
                {showTaskForm && (
                  <form onSubmit={handleCreateDailyTask} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">Select Clinical Task Type</h4>
                      <span className="text-[10px] text-slate-500">Age: {patientAge} yrs suggestions loaded</span>
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "walking", label: "Walking / Exercise", icon: Footprints },
                        { id: "sleep", label: "Sleep Routine", icon: Moon },
                        { id: "sugar", label: "Check Blood Sugar", icon: Droplets },
                        { id: "bp", label: "Check Blood Pressure", icon: HeartPulse },
                        { id: "hydration", label: "Hydration Goal", icon: Droplets },
                        { id: "meals", label: "Meals & Diet", icon: Utensils },
                        { id: "custom", label: "Custom Task", icon: ClipboardCheck },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSel = selectedTaskType === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectTaskPreset(item.id)}
                            className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                              isSel ? "border-teal-600 bg-teal-100/70 text-teal-950 font-bold" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0 text-teal-700" />
                            <span className="text-xs truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <Label className="text-xs">Task Title *</Label>
                        <Input
                          required
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="e.g. 20-min Morning Walk"
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Priority</Label>
                        <select
                          value={taskPriority}
                          onChange={(e: any) => setTaskPriority(e.target.value)}
                          className="w-full h-8 rounded-md border text-xs bg-white px-2"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Clinical Description & Details</Label>
                      <Textarea
                        rows={2}
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Notes or clinical instructions for patient"
                        className="text-xs bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowTaskForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={savingDailyTask} className="bg-teal-700 hover:bg-teal-800 text-white font-bold">
                        {savingDailyTask ? "Assigning..." : "Assign Task"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Task List with 7-Day History and F9 Read-Only Restriction */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                    <span>Assigned Tasks & 7-Day Completion History</span>
                    <span className="text-slate-400 font-normal">Completed by Senior Patient Only (Read-Only for Caretaker)</span>
                  </div>

                  {loadingTasks ? (
                    <div className="p-6 text-center text-xs text-slate-400">Loading tasks...</div>
                  ) : patientTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">No daily tasks currently assigned.</div>
                  ) : (
                    patientTasks.map((task) => (
                      <Card key={task.id} className="p-4 border rounded-2xl bg-white shadow-xs space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-black text-slate-900">{task.title}</h4>
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {task.priority}
                              </Badge>
                            </div>
                            {task.description && <p className="text-xs text-slate-600 mt-1">{task.description}</p>}
                          </div>
                          <div>
                            {task.isCompleted ? (
                              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                ✓ Done today by Senior
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">
                                Pending Senior action
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* 7-Day History Chips (F8) */}
                        {task.history && task.history.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[10px]">
                            <span className="text-slate-400 font-semibold mr-1 shrink-0">7-Day:</span>
                            {task.history.map((h: any, i: number) => (
                              <div
                                key={i}
                                title={`${h.dateFormatted}: ${h.label}`}
                                className={`px-2 py-0.5 rounded-md font-mono shrink-0 flex items-center space-x-1 ${
                                  h.status === "COMPLETED"
                                    ? "bg-emerald-100 text-emerald-800 font-bold"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                <span>{h.date.slice(5)}</span>
                                <span>{h.status === "COMPLETED" ? "✓" : "—"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HEALTH CONDITION & NOTES (F10) */}
          {activeTab === "notes" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Previous Shift & Care Notes */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Health Condition Records & Shift Handover Logs</h3>
                {loadingNotes ? (
                  <div className="p-6 text-center text-xs text-slate-400">Loading notes...</div>
                ) : patientNotes.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-white border rounded-2xl">No condition logs on record.</div>
                ) : (
                  patientNotes.map((n) => (
                    <Card key={n.id} className="p-4 border rounded-2xl bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {n.condition && (
                            <Badge className="bg-teal-700 text-white text-[10px] font-bold">
                              {n.condition}
                            </Badge>
                          )}
                          <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{n.observations || n.content}</p>
                      {/* Quick Fields summary */}
                      {(n.appetite || n.mood || n.sleepQuality || n.mobility) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                          {n.appetite && <span>Appetite: <strong className="text-slate-800">{n.appetite}</strong></span>}
                          {n.mood && <span>• Mood: <strong className="text-slate-800">{n.mood}</strong></span>}
                          {n.sleepQuality && <span>• Sleep: <strong className="text-slate-800">{n.sleepQuality}</strong></span>}
                          {n.mobility && <span>• Mobility: <strong className="text-slate-800">{n.mobility}</strong></span>}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>

              {/* Right: Health Condition Update Form (F10) */}
              <div className="lg:col-span-5">
                <Card className="p-5 border rounded-3xl bg-white shadow-xs space-y-4 sticky top-24">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-teal-700" />
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Health Condition Update</h3>
                      <p className="text-[11px] text-slate-500">Record overall patient condition & observations</p>
                    </div>
                  </div>

                  {noteFeedback && (
                    <div className={`p-2.5 rounded-xl text-xs font-semibold ${noteFeedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                      {noteFeedback.message}
                    </div>
                  )}

                  <form onSubmit={handleSaveConditionUpdate} className="space-y-3">
                    <div>
                      <Label className="text-xs font-bold">Overall Health Condition *</Label>
                      <select
                        value={noteCondition}
                        onChange={(e: any) => setNoteCondition(e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-teal-900"
                      >
                        <option value="STABLE">Stable — No immediate clinical concern</option>
                        <option value="IMPROVING">Improving — Positive vital trajectory</option>
                        <option value="NEEDS_ATTENTION">Needs Attention — Guarded / Monitoring</option>
                        <option value="CRITICAL">Critical — Urgent medical review required</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Clinical Observations *</Label>
                      <Textarea
                        required
                        rows={3}
                        value={noteObservations}
                        onChange={(e) => setNoteObservations(e.target.value)}
                        placeholder="Detailed physical observations, alertness, and symptoms..."
                        className="text-xs"
                      />
                    </div>

                    {/* Quick Fields */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quick Clinical Fields</Label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <Label className="text-[10px] text-slate-400">Appetite</Label>
                          <select value={appetite} onChange={(e) => setAppetite(e.target.value)} className="w-full h-7 rounded border text-[11px] px-1 bg-white">
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Poor">Poor</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">Mood</Label>
                          <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full h-7 rounded border text-[11px] px-1 bg-white">
                            <option value="Cheerful">Cheerful</option>
                            <option value="Calm">Calm</option>
                            <option value="Anxious">Anxious</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">Sleep Quality</Label>
                          <select value={sleepQuality} onChange={(e) => setSleepQuality(e.target.value)} className="w-full h-7 rounded border text-[11px] px-1 bg-white">
                            <option value="Restful">Restful</option>
                            <option value="Interrupted">Interrupted</option>
                            <option value="Restless">Restless</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">Mobility</Label>
                          <select value={mobility} onChange={(e) => setMobility(e.target.value)} className="w-full h-7 rounded border text-[11px] px-1 bg-white">
                            <option value="Independent">Independent</option>
                            <option value="Assisted">Assisted</option>
                            <option value="Bedbound">Bedbound</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={savingNote} className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-9 shadow-xs">
                      {savingNote ? "Publishing Update..." : "Publish Health Condition Update"}
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 5: APPOINTMENTS */}
          {activeTab === "appointments" && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Upcoming Clinical & Doctor Visits</h3>
              {loadingAppts ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading visits...</div>
              ) : appointments.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">No appointments on file.</div>
              ) : (
                appointments.map((appt) => (
                  <div key={appt.id} className="p-3 border rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{appt.title}</h4>
                      <p className="text-[11px] text-slate-500">{appt.doctorName} • {appt.clinicName || appt.location}</p>
                    </div>
                    <span className="text-xs font-bold text-teal-800">
                      {new Date(appt.appointmentDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

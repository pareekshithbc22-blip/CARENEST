"use client";

import * as React from "react";
import {
  Check,
  Clock,
  Phone,
  AlertCircle,
  Calendar,
  ShieldCheck,
  Pill,
  Activity,
  Bell,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeniorHealthMonitor, HealthMeasurement } from "@/components/senior/senior-health-monitor";
import { useSeniorAlarm } from "@/hooks/use-senior-alarm";
import { useDashboardPolling } from "@/hooks/use-dashboard-polling";

export interface DoseItem {
  id: string;
  medication: {
    id: string;
    name: string;
    strength: string;
    form: string;
    dosageInstructions: string;
    purpose?: string | null;
  };
  scheduledAt: string;
  status: "SCHEDULED" | "TAKEN" | "MISSED" | "SKIPPED" | "UNCONFIRMED";
  confirmedAt?: string | null;
  confirmationNotes?: string | null;
}

export interface PrescribedMedicine {
  id: string;
  name: string;
  strength: string;
  form: string;
  dosageInstructions: string;
  purpose?: string | null;
  frequency?: string;
  timesOfDay?: string[];
  stockCount?: number;
}

export interface SeniorAppointment {
  id: string;
  title: string;
  doctorName: string;
  clinicName: string;
  appointmentDate: string;
  notes?: string | null;
}

interface SeniorDashboardClientProps {
  initialProfile: {
    id: string;
    name: string;
    preferredName?: string | null;
    emergencyContactName: string;
    emergencyContactPhone: string;
    notes?: string | null;
  };
  initialDoses: DoseItem[];
  allMedications?: PrescribedMedicine[];
  upcomingAppointments: SeniorAppointment[];
  initialMeasurements?: HealthMeasurement[];
  caretaker?: {
    name: string;
    phone?: string | null;
    role?: string;
  } | null;
}

type SeniorNavTab = "overview" | "medicines" | "vitals" | "appointments" | "emergency";

export function SeniorDashboardClient({
  initialProfile,
  initialDoses,
  allMedications = [],
  upcomingAppointments,
  initialMeasurements = [],
  caretaker,
}: SeniorDashboardClientProps) {
  const [activeTab, setActiveTab] = React.useState<SeniorNavTab>("overview");
  const [doses, setDoses] = React.useState<DoseItem[]>(initialDoses);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [completingTaskId, setCompletingTaskId] = React.useState<string | null>(null);
  const [medsList, setMedsList] = React.useState<PrescribedMedicine[]>(allMedications);
  const [editingStockMedId, setEditingStockMedId] = React.useState<string | null>(null);
  const [stockInputVal, setStockInputVal] = React.useState<string>("");
  const [savingStock, setSavingStock] = React.useState(false);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [skippingDoseId, setSkippingDoseId] = React.useState<string | null>(null);
  const [skipReason, setSkipReason] = React.useState<string>("Physician advised / feeling unwell");
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null);

  // Load latest doses via background snapshot polling
  const loadDoses = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/doses?profileId=${encodeURIComponent(initialProfile.id)}&filter=today`);
      if (res.ok) {
        const data = await res.json();
        setDoses(data.doses || []);
      }
    } catch (e) {
      console.warn("Failed to reload senior doses", e);
    }
  }, [initialProfile.id]);

  const loadTasks = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?profileId=${encodeURIComponent(initialProfile.id)}&withHistory=true`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.warn("Failed to reload senior tasks", e);
    }
  }, [initialProfile.id]);

  const { lastUpdated, isRefreshing, refreshNow } = useDashboardPolling({
    role: "senior",
    onUpdate: () => {
      loadDoses();
      loadTasks();
    },
  });

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        setSuccessBanner("Great job! You completed your daily task. Your family and caretaker have been notified.");
        setTimeout(() => setSuccessBanner(null), 6000);
        loadTasks();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to complete task.");
      }
    } catch {
      alert("Network error while completing task.");
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleSaveStock = async (medId: string) => {
    const parsed = parseInt(stockInputVal, 10);
    const clamped = isNaN(parsed) ? 0 : Math.max(0, Math.min(999, parsed));
    setSavingStock(true);
    try {
      const res = await fetch(`/api/medications/${medId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockCount: clamped }),
      });
      if (res.ok) {
        setMedsList((prev) =>
          prev.map((m) => (m.id === medId ? { ...m, stockCount: clamped } : m))
        );
        setEditingStockMedId(null);
        setSuccessBanner(`Medication stock updated to ${clamped} doses.`);
        setTimeout(() => setSuccessBanner(null), 5000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update stock count.");
      }
    } catch {
      alert("Network error while updating stock.");
    } finally {
      setSavingStock(false);
    }
  };

  // Dose Confirmation Handler
  const handleConfirmDose = async (doseId: string, medName?: string) => {
    setConfirmingId(doseId);
    try {
      const res = await fetch(`/api/doses/${doseId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationNotes: "Confirmed in Senior Mode" }),
      });

      if (res.ok) {
        setDoses((prev) =>
          prev.map((d) =>
            d.id === doseId
              ? {
                  ...d,
                  status: "TAKEN",
                  confirmedAt: new Date().toISOString(),
                  confirmationNotes: "Confirmed in Senior Mode",
                }
              : d
          )
        );
        setSuccessBanner(`Well done! You confirmed taking ${medName || "your medication"}.`);
        setTimeout(() => setSuccessBanner(null), 6000);
      }
    } catch {
      alert("Unable to confirm dose right now. Please notify your caregiver.");
    } finally {
      setConfirmingId(null);
    }
  };

  // Dose Skip Handler
  const handleSkipDose = async (doseId: string, reasonText = "Skipped by patient request") => {
    setConfirmingId(doseId);
    try {
      const res = await fetch(`/api/doses/${doseId}/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasonText }),
      });

      if (res.ok) {
        setDoses((prev) =>
          prev.map((d) =>
            d.id === doseId
              ? {
                  ...d,
                  status: "SKIPPED",
                  confirmedAt: new Date().toISOString(),
                  confirmationNotes: `Skipped: ${reasonText}`,
                }
              : d
          )
        );
        setSkippingDoseId(null);
        setSuccessBanner(`Dose marked as skipped.`);
        setTimeout(() => setSuccessBanner(null), 6000);
      }
    } catch {
      alert("Unable to skip dose right now.");
    } finally {
      setConfirmingId(null);
    }
  };

  // Web Audio Alarm (Repeating Tone, Multi-tab Lock, Session Enablement)
  const dueDosesForAlarm = React.useMemo(() => {
    return doses
      .filter((d) => d.status === "SCHEDULED")
      .map((d) => ({
        id: d.id,
        medicationName: d.medication.name,
        strength: d.medication.strength,
        form: d.medication.form,
        scheduledAt: d.scheduledAt,
        status: d.status,
      }));
  }, [doses]);

  const {
    audioEnabled,
    enableAudio,
    isMuted,
    toggleMute,
    volume,
    setVolume,
    isRinging,
    activeDose,
    confirmDoseWithAlarmStop,
    skipDoseWithAlarmStop,
  } = useSeniorAlarm({
    dueDoses: dueDosesForAlarm,
    onConfirmDose: async (id) => {
      const dose = doses.find((d) => d.id === id);
      await handleConfirmDose(id, dose?.medication.name);
    },
    onSkipDose: async (id) => {
      await handleSkipDose(id, "Skipped from alarm banner");
    },
  });

  const takenCount = doses.filter((d) => d.status === "TAKEN").length;
  const pendingCount = doses.filter((d) => d.status === "SCHEDULED" || d.status === "UNCONFIRMED").length;

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* ======================================================== */}
        {/* 1. SENIOR BANNER & AUDIO ALARM PREFERENCE BAR           */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-3xl bg-teal-800 p-6 sm:p-8 text-white shadow-xl gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-lg bg-teal-700/90 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-100">
                Senior Friendly Mode Active
              </span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
              Hello, {initialProfile.preferredName || initialProfile.name}
            </h1>
            <p className="mt-1 text-base font-semibold text-teal-100">{todayFormatted}</p>
            <div className="flex items-center space-x-2 mt-2 text-xs text-teal-200">
              <span className={`inline-block h-2 w-2 rounded-full ${isRefreshing ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
              <span>Last updated: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <button
                type="button"
                onClick={() => refreshNow()}
                className="text-white underline font-bold ml-1 hover:text-teal-100"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            {/* Audio Alarm Activation Button */}
            {!audioEnabled ? (
              <button
                type="button"
                onClick={enableAudio}
                className="flex items-center space-x-2 rounded-2xl bg-amber-400 text-slate-950 px-5 py-3 text-sm font-black shadow-lg hover:bg-amber-300 transition-all active:scale-95 animate-pulse"
              >
                <Bell className="h-5 w-5 text-slate-950" />
                <span>Enable Alarm Sound</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 bg-teal-900/80 p-2 rounded-2xl border border-teal-600/40">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-teal-200"
                  title={isMuted ? "Unmute Alarm" : "Mute Alarm"}
                >
                  {isMuted ? <VolumeX className="h-5 w-5 text-amber-300" /> : <Volume2 className="h-5 w-5 text-emerald-300" />}
                </button>
                <div className="flex items-center space-x-1 pr-2">
                  <span className="text-[11px] font-bold text-teal-200">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-16 accent-teal-400 cursor-pointer"
                  />
                </div>
              </div>
            )}
            <p className="text-[11px] text-teal-200/80 italic">
              * Alarms ring only while this page is open
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. REPEATING WEB AUDIO ALARM BANNER (Dose Due Now)        */}
        {/* ======================================================== */}
        {activeDose && (
          <div
            role="alert"
            className="rounded-3xl border-4 border-rose-500 bg-rose-50 p-6 sm:p-8 shadow-2xl animate-pulse space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-start space-x-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-white shrink-0 shadow-lg">
                  <Bell className="h-8 w-8 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-900 bg-rose-200 px-2.5 py-0.5 rounded-md">
                      Dose Due Right Now
                    </span>
                    <span className="text-xs font-bold text-rose-700">
                      Scheduled for {new Date(activeDose.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mt-1">
                    Take {activeDose.medicationName} ({activeDose.strength})
                  </h3>
                  <p className="text-sm font-semibold text-rose-900 mt-0.5">
                    Please take your dose now to stay on schedule. The alarm will stop as soon as you confirm or skip.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Confirm & Skip */}
              <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-center">
                <button
                  type="button"
                  onClick={() => confirmDoseWithAlarmStop(activeDose.id)}
                  disabled={confirmingId === activeDose.id}
                  className="flex-1 sm:flex-none h-16 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl shadow-lg active:scale-95 transition-all"
                >
                  {confirmingId === activeDose.id ? "Recording..." : "I Took It"}
                </button>
                <button
                  type="button"
                  onClick={() => skipDoseWithAlarmStop(activeDose.id)}
                  disabled={confirmingId === activeDose.id}
                  className="h-16 px-5 rounded-2xl border-2 border-rose-300 bg-white hover:bg-rose-100 text-rose-900 font-extrabold text-sm transition-all"
                >
                  Skip Dose
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Success Announcement */}
        {successBanner && (
          <div
            role="alert"
            className="flex items-center space-x-3 rounded-2xl bg-emerald-100 border-2 border-emerald-500 p-5 text-emerald-900 font-bold text-lg shadow-md animate-in fade-in"
          >
            <Check className="h-8 w-8 text-emerald-600 shrink-0 stroke-3" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Accessible Navigation Tabs */}
        <nav
          aria-label="Senior Dashboard Navigation"
          className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2 border border-slate-200 shadow-xs"
        >
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex-1 min-w-[120px] rounded-xl py-3 px-4 text-sm font-black transition-all flex items-center justify-center space-x-2 ${
              activeTab === "overview"
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Today&apos;s Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vitals")}
            className={`flex-1 min-w-[120px] rounded-xl py-3 px-4 text-sm font-black transition-all flex items-center justify-center space-x-2 ${
              activeTab === "vitals"
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Health Readings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("medicines")}
            className={`flex-1 min-w-[120px] rounded-xl py-3 px-4 text-sm font-black transition-all flex items-center justify-center space-x-2 ${
              activeTab === "medicines"
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Pill className="h-4 w-4" />
            <span>All Medicines</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("appointments")}
            className={`flex-1 min-w-[120px] rounded-xl py-3 px-4 text-sm font-black transition-all flex items-center justify-center space-x-2 ${
              activeTab === "appointments"
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Appointments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("emergency")}
            className={`flex-1 min-w-[120px] rounded-xl py-3 px-4 text-sm font-black transition-all flex items-center justify-center space-x-2 ${
              activeTab === "emergency"
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Phone className="h-4 w-4" />
            <span>Emergency</span>
          </button>
        </nav>

        {/* TAB 1: OVERVIEW (TODAY'S SCHEDULE) */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Daily Status Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Confirmed Today
                </span>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-teal-700">{takenCount}</span>
                  <span className="text-sm font-bold text-slate-600">doses taken</span>
                </div>
              </div>

              <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Remaining Today
                </span>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-amber-700">{pendingCount}</span>
                  <span className="text-sm font-bold text-slate-600">doses remaining</span>
                </div>
              </div>
            </div>

            {/* Doses List */}
            <section className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Today&apos;s Medication Schedule
              </h2>

              {doses.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
                  <p className="text-lg font-bold text-slate-600">
                    No medications scheduled for today.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Your caretaker or family will assign your prescriptions here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {doses.map((dose) => {
                    const isTaken = dose.status === "TAKEN";
                    const isSkipped = dose.status === "SKIPPED";
                    const isMissed = dose.status === "MISSED" || dose.status === "UNCONFIRMED";
                    const timeString = new Date(dose.scheduledAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={dose.id}
                        className={`rounded-3xl border-3 p-6 transition-all shadow-sm ${
                          isTaken
                            ? "border-emerald-300 bg-emerald-50/60"
                            : isSkipped
                            ? "border-slate-300 bg-slate-100/70"
                            : isMissed
                            ? "border-amber-400 bg-amber-50/70"
                            : "border-slate-300 bg-white hover:border-teal-500"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-3">
                              <span className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1 text-sm font-extrabold text-white">
                                <Clock className="h-4 w-4 mr-1.5" />
                                {timeString}
                              </span>
                              {isTaken && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs px-2.5 py-0.5 font-bold">
                                  ✓ Taken
                                </Badge>
                              )}
                              {isSkipped && (
                                <Badge className="bg-slate-200 text-slate-700 border-slate-300 text-xs px-2.5 py-0.5 font-bold">
                                  Skipped
                                </Badge>
                              )}
                              {isMissed && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-2.5 py-0.5 font-bold">
                                  Missed Window
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 pt-2">
                              {dose.medication.name}
                            </h3>

                            <p className="text-base font-bold text-teal-800">
                              {dose.medication.strength} • {dose.medication.form}
                            </p>

                            <p className="text-sm text-slate-700 font-medium">
                              {dose.medication.dosageInstructions}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="sm:self-center flex flex-wrap items-center gap-2">
                            {isTaken ? (
                              <div className="flex items-center space-x-2 text-emerald-800 font-extrabold text-sm bg-emerald-100 rounded-2xl px-5 py-3 border-2 border-emerald-400">
                                <Check className="h-5 w-5 stroke-3" />
                                <span>Confirmed Taken</span>
                              </div>
                            ) : isSkipped ? (
                              <div className="text-slate-600 font-bold text-sm bg-slate-200 rounded-2xl px-4 py-2.5">
                                Dose Skipped
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDose(dose.id, dose.medication.name)}
                                  disabled={confirmingId === dose.id}
                                  className="h-14 px-6 rounded-2xl bg-teal-700 text-white font-black text-base hover:bg-teal-800 active:scale-95 transition-all shadow-md disabled:opacity-50"
                                >
                                  {confirmingId === dose.id ? "Recording..." : "I Took It"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSkippingDoseId(dose.id)}
                                  disabled={confirmingId === dose.id}
                                  className="h-14 px-4 rounded-2xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all"
                                >
                                  Skip
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Daily Care Tasks for Senior (F9) */}
            <section className="space-y-4 pt-4 border-t-2 border-slate-200">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Today&apos;s Daily Tasks
                </h2>
                <p className="text-sm font-semibold text-slate-600">
                  Tasks assigned by your caretaker. Tap the button when you finish each task.
                </p>
              </div>

              {tasks.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
                  <p className="text-base font-bold text-slate-600">
                    No daily care tasks assigned for today.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => {
                    const isDone = task.isCompleted;
                    return (
                      <div
                        key={task.id}
                        className={`rounded-3xl border-3 p-6 transition-all shadow-sm ${
                          isDone
                            ? "border-emerald-300 bg-emerald-50/60"
                            : "border-slate-300 bg-white hover:border-teal-500"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="text-2xl font-black text-slate-900">
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-slate-700 font-medium">
                                {task.description}
                              </p>
                            )}
                          </div>

                          <div className="sm:self-center">
                            {isDone ? (
                              <div className="flex items-center space-x-2 text-emerald-800 font-extrabold text-sm bg-emerald-100 rounded-2xl px-6 py-4 border-2 border-emerald-400">
                                <Check className="h-6 w-6 stroke-3" />
                                <span className="text-base">Completed Today</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCompleteTask(task.id)}
                                disabled={completingTaskId === task.id}
                                className="h-16 px-8 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-black text-lg shadow-lg active:scale-95 transition-all"
                              >
                                {completingTaskId === task.id ? "Recording..." : "Mark as Completed"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: HEALTH READINGS */}
        {activeTab === "vitals" && (
          <SeniorHealthMonitor
            profileId={initialProfile.id}
            patientName={initialProfile.preferredName || initialProfile.name}
            initialMeasurements={initialMeasurements}
            caretaker={caretaker}
          />
        )}

        {/* TAB 3: ALL MEDICINES */}
        {activeTab === "medicines" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                All Prescribed Medicines
              </h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Prescriptions assigned by your authorized caretaker or family coordinator.
              </p>
            </div>

            <div className="space-y-4">
              {medsList.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
                  <p className="text-base font-bold text-slate-600">
                    No medications registered yet.
                  </p>
                </div>
              ) : (
                medsList.map((med) => {
                  const stockVal = med.stockCount ?? 0;
                  const isEditing = editingStockMedId === med.id;
                  const isLow = stockVal <= 5;

                  return (
                    <div key={med.id} className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-slate-900">{med.name}</h3>
                            {isLow && (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs">Low Stock</Badge>
                            )}
                          </div>
                          <p className="text-sm font-bold text-teal-800">{med.strength} • {med.form}</p>
                          <p className="text-xs text-slate-600 mt-1">{med.dosageInstructions}</p>
                        </div>

                        <div className="flex items-center gap-3 self-start sm:self-auto">
                          <div className="text-right">
                            <span className="text-xs text-slate-500 block">Stock Remaining</span>
                            <span className="text-lg font-black text-slate-800">{stockVal} doses</span>
                          </div>

                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStockMedId(med.id);
                                setStockInputVal(String(stockVal));
                              }}
                              className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700"
                            >
                              Update stock
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                              <input
                                type="number"
                                min={0}
                                max={999}
                                value={stockInputVal}
                                onChange={(e) => setStockInputVal(e.target.value)}
                                className="w-16 h-8 text-center font-bold text-sm bg-white border rounded-lg"
                              />
                              <button
                                type="button"
                                disabled={savingStock}
                                onClick={() => handleSaveStock(med.id)}
                                className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
                              >
                                {savingStock ? "..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStockMedId(null)}
                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* TAB 4: APPOINTMENTS */}
        {activeTab === "appointments" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Upcoming Appointments
              </h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Medical visits scheduled with your doctors.
              </p>
            </div>

            <div className="space-y-4">
              {upcomingAppointments.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
                  <p className="text-base font-bold text-slate-600">
                    No upcoming appointments scheduled.
                  </p>
                </div>
              ) : (
                upcomingAppointments.map((appt) => (
                  <div key={appt.id} className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="inline-flex items-center rounded-lg bg-teal-100 text-teal-800 px-3 py-1 text-xs font-black">
                        {new Date(appt.appointmentDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900">{appt.title}</h3>
                    <p className="text-sm font-bold text-teal-800">Dr. {appt.doctorName} • {appt.clinicName}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* TAB 5: EMERGENCY CONTACT */}
        {activeTab === "emergency" && (
          <section className="space-y-6">
            <div className="rounded-3xl border-3 border-rose-300 bg-rose-50 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-black text-rose-950">Emergency Contact</h2>
              <p className="text-sm font-medium text-rose-900 mt-1">
                Tap below to immediately dial your primary emergency coordinator.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl border border-rose-200 gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{initialProfile.emergencyContactName}</h3>
                  <p className="text-lg font-extrabold text-teal-800">{initialProfile.emergencyContactPhone}</p>
                </div>
                <a
                  href={`tel:${initialProfile.emergencyContactPhone}`}
                  className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-lg flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Phone className="h-5 w-5" />
                  <span>Call Emergency Contact</span>
                </a>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Skip Dose Modal */}
      {skippingDoseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-1">Skip Medication Dose</h3>
            <p className="text-xs text-slate-500 mb-4">
              Please choose why this dose is being skipped so your care circle stays informed.
            </p>

            <div className="space-y-3">
              {[
                "Physician advised / scheduled fasting",
                "Experiencing nausea / feeling unwell",
                "Sleeping / rested",
                "Other clinical reason",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSkipReason(reason)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all ${
                    skipReason === reason
                      ? "border-teal-600 bg-teal-50 text-teal-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSkippingDoseId(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleSkipDose(skippingDoseId, skipReason)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Confirm Skip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

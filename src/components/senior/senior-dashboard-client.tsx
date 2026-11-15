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
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeniorHealthMonitor, HealthMeasurement } from "@/components/senior/senior-health-monitor";

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
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null);

  // Audio reminder state
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [acknowledgedDoses, setAcknowledgedDoses] = React.useState<Set<string>>(new Set());

  // Web Audio chime generator (runs purely in-browser without external audio files)
  const playChimeSound = React.useCallback(() => {
    if (isAudioMuted || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const t = ctx.currentTime;

      // Soothing 3-tone chime: C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz)
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(523.25, t, 0.4);
      playTone(659.25, t + 0.25, 0.4);
      playTone(783.99, t + 0.5, 0.6);
    } catch (err) {
      console.warn("Chime audio playback prevented by browser policy:", err);
    }
  }, [isAudioMuted]);

  // Identify currently due or pending dose
  const dueDose = React.useMemo(() => {
    return doses.find(
      (d) =>
        (d.status === "SCHEDULED" || d.status === "UNCONFIRMED") &&
        !acknowledgedDoses.has(d.id)
    );
  }, [doses, acknowledgedDoses]);

  // Trigger sound when a dose is due
  React.useEffect(() => {
    if (dueDose) {
      playChimeSound();
    }
  }, [dueDose, playChimeSound]);

  const handleConfirmDose = async (doseId: string, medName: string) => {
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
        setAcknowledgedDoses((prev) => new Set([...prev, doseId]));
        setSuccessBanner(`Great job! You confirmed taking your ${medName}.`);
        setTimeout(() => setSuccessBanner(null), 6000);
      }
    } catch {
      alert("Unable to confirm dose right now. Please notify your caregiver.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSilenceReminder = (doseId: string) => {
    setAcknowledgedDoses((prev) => new Set([...prev, doseId]));
  };

  const takenCount = doses.filter((d) => d.status === "TAKEN").length;
  const pendingCount = doses.filter((d) => d.status === "SCHEDULED" || d.status === "UNCONFIRMED").length;

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Caretaker contact numbers
  const caretakerPhoneRaw = caretaker?.phone || null;
  const cleanPhone = caretakerPhoneRaw ? caretakerPhoneRaw.replace(/\D/g, "") : null;
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hello ${caretaker?.name || "Care Staff"}, this is ${
          initialProfile.preferredName || initialProfile.name
        } from CareNest.`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Senior Mode Accessibility Banner */}
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
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="flex items-center space-x-2 rounded-2xl bg-teal-900/80 px-4 py-2.5 text-xs font-bold text-teal-200 border border-teal-600/40 hover:bg-teal-900 transition-colors"
              title={isAudioMuted ? "Audio chime muted" : "Audio chime active"}
            >
              {isAudioMuted ? (
                <>
                  <VolumeX className="h-4 w-4 text-amber-300" />
                  <span>Chime Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 text-emerald-300 animate-pulse" />
                  <span>Chime Active</span>
                </>
              )}
            </button>

            <div className="hidden md:flex items-center space-x-2 text-xs font-bold bg-teal-900/60 rounded-2xl px-4 py-2.5 border border-teal-600/40">
              <ShieldCheck className="h-4 w-4 text-teal-300" />
              <span>Circle Connected</span>
            </div>
          </div>
        </div>

        {/* Audible Medication Reminder Banner (When Dose is Due) */}
        {dueDose && (
          <div
            role="alert"
            className="rounded-3xl border-3 border-amber-400 bg-amber-50 p-6 shadow-xl animate-in fade-in space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shrink-0 shadow-md">
                  <Bell className="h-7 w-7 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                      Medication Due Now
                    </span>
                    <Badge variant="warning" className="text-[10px] font-bold">
                      Reminder
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">
                    Time to take {dueDose.medication.name}
                  </h3>
                  <p className="text-sm font-bold text-amber-950">
                    {dueDose.medication.strength} • {dueDose.medication.dosageInstructions}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleSilenceReminder(dueDose.id)}
                  className="h-14 px-5 rounded-2xl border-2 border-amber-300 bg-white font-extrabold text-sm text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  Silence Chime
                </button>
                <button
                  onClick={() => handleConfirmDose(dueDose.id, dueDose.medication.name)}
                  disabled={confirmingId === dueDose.id}
                  className="h-14 px-8 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-black text-lg shadow-md active:scale-95 transition-all"
                >
                  {confirmingId === dueDose.id ? "Recording..." : "I Took This Dose"}
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
            <span>Overview</span>
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
            <span>My Medicines</span>
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
            <span>Health Records</span>
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
            <span>Emergency Contact</span>
          </button>
        </nav>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Daily Summary Status Bar */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Confirmed Today
                </span>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-teal-700">{takenCount}</span>
                  <span className="text-base font-bold text-slate-600">doses completed</span>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Remaining Today
                </span>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-amber-700">{pendingCount}</span>
                  <span className="text-base font-bold text-slate-600">doses remaining</span>
                </div>
              </div>
            </div>

            {/* Today's Schedule Quick View */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Today&apos;s Medicine Schedule
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("medicines")}
                  className="font-bold text-xs"
                >
                  View All Medicines →
                </Button>
              </div>

              {doses.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
                  <p className="text-xl font-bold text-slate-600">
                    No medications scheduled for today.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {doses.map((dose) => {
                    const isTaken = dose.status === "TAKEN";
                    const isMissed = dose.status === "MISSED" || dose.status === "UNCONFIRMED";
                    const timeString = new Date(dose.scheduledAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={dose.id}
                        className={`rounded-2xl border-3 p-6 transition-all shadow-sm ${
                          isTaken
                            ? "border-emerald-300 bg-emerald-50/60"
                            : isMissed
                            ? "border-amber-300 bg-amber-50/70"
                            : "border-slate-300 bg-white hover:border-teal-500"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-3">
                              <span className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1 text-base font-extrabold text-white">
                                <Clock className="h-4 w-4 mr-1.5" />
                                {timeString}
                              </span>
                              {isTaken && (
                                <Badge variant="success" className="text-sm px-3 py-1 font-bold">
                                  ✓ Taken
                                </Badge>
                              )}
                              {isMissed && (
                                <Badge variant="warning" className="text-sm px-3 py-1 font-bold">
                                  Attention Needed
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 pt-2">
                              {dose.medication.name}
                            </h3>

                            <p className="text-lg font-bold text-teal-800">
                              {dose.medication.strength} • {dose.medication.form}
                            </p>

                            <p className="text-base text-slate-700 font-medium">
                              {dose.medication.dosageInstructions}
                            </p>
                          </div>

                          <div className="sm:self-center">
                            {isTaken ? (
                              <div className="flex items-center space-x-2 text-emerald-800 font-extrabold text-base bg-emerald-100 rounded-xl px-5 py-3.5 border-2 border-emerald-400">
                                <Check className="h-6 w-6 stroke-3" />
                                <span>Confirmed Taken</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleConfirmDose(dose.id, dose.medication.name)}
                                disabled={confirmingId === dose.id}
                                className="w-full sm:w-auto h-16 min-w-[200px] px-8 rounded-2xl bg-teal-700 text-white font-black text-xl hover:bg-teal-800 active:scale-95 transition-all shadow-md focus:outline-4 focus:outline-teal-500 disabled:opacity-50"
                              >
                                {confirmingId === dose.id ? "Recording..." : "I Took This Dose"}
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

        {/* TAB 2: MY MEDICINES */}
        {activeTab === "medicines" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                All Prescribed Medicines
              </h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Every prescription assigned to {initialProfile.preferredName || initialProfile.name} by your authorized caretaker or family guardian.
              </p>
            </div>

            {/* List of Prescribed Medicines */}
            <div className="space-y-4">
              {allMedications.length === 0 && doses.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
                  <p className="text-base font-bold text-slate-600">
                    No medicines currently registered. Ask your caretaker or family coordinator to add your prescription schedule.
                  </p>
                </div>
              ) : (
                (allMedications.length > 0 ? allMedications : doses.map((d) => d.medication)).map((med, idx) => (
                  <div
                    key={med.id || idx}
                    className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 font-black">
                          <Pill className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900">{med.name}</h3>
                          <span className="text-xs font-bold text-teal-700">
                            {med.strength} • {med.form}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs self-start sm:self-auto">
                        Prescription Active
                      </Badge>
                    </div>

                    <p className="text-sm font-semibold text-slate-700">
                      Instructions: {med.dosageInstructions}
                    </p>

                    {med.purpose && (
                      <p className="text-xs font-medium text-slate-500">
                        Purpose: {med.purpose}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* TAB 3: HEALTH RECORDS */}
        {activeTab === "vitals" && (
          <SeniorHealthMonitor
            profileId={initialProfile.id}
            patientName={initialProfile.preferredName || initialProfile.name}
            initialMeasurements={initialMeasurements}
            caretaker={caretaker}
          />
        )}

        {/* TAB 4: APPOINTMENTS */}
        {activeTab === "appointments" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Doctor Consultations & Appointments
              </h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Scheduled hospital visits, checkups, and consultations coordinated with your circle.
              </p>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-base font-bold text-slate-600">
                  No upcoming doctor visits scheduled.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs space-y-2"
                  >
                    <div className="flex items-center space-x-2 text-teal-700 font-bold text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(appt.appointmentDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900">{appt.title}</h3>
                    <p className="text-sm font-bold text-slate-700">{appt.doctorName}</p>
                    <p className="text-xs text-slate-500">{appt.clinicName}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 5: EMERGENCY CONTACT (ASSIGNED CARETAKER) */}
        {activeTab === "emergency" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Assigned Caretaker & Support
              </h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Direct phone and WhatsApp communication to your assigned clinical caretaker.
              </p>
            </div>

            {caretaker && caretaker.phone ? (
              <div className="rounded-3xl border-3 border-teal-300 bg-teal-50/80 p-8 shadow-md space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2 text-teal-800 font-black text-xs uppercase tracking-wider">
                      <ShieldCheck className="h-5 w-5 text-teal-700" />
                      <span>Assigned Healthcare Provider</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mt-2">
                      {caretaker.name}
                    </h3>
                    <p className="text-base font-bold text-teal-900 mt-0.5">
                      {caretaker.role || "Licensed Caretaker & Nurse"} • Assigned to your Care Circle
                    </p>
                    <p className="text-sm text-slate-600 mt-2 font-mono font-semibold">
                      Registered Phone: {caretaker.phone}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <a
                      href={`tel:${caretaker.phone}`}
                      className="w-full sm:w-auto h-14 min-w-[180px] px-8 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-black text-lg flex items-center justify-center space-x-2 active:scale-95 shadow-md transition-all"
                    >
                      <Phone className="h-5 w-5 stroke-3" />
                      <span>Call Caretaker</span>
                    </a>

                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto h-14 min-w-[180px] px-8 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-lg flex items-center justify-center space-x-2 active:scale-95 shadow-md transition-all"
                      >
                        <MessageCircle className="h-5 w-5 stroke-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-slate-200 bg-white p-8 text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
                <h3 className="text-xl font-black text-slate-900">
                  No Caretaker Assigned Yet
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Your family coordinator has not assigned a licensed caretaker to your care circle yet. Please contact your family coordinator for assistance.
                </p>
                {initialProfile.emergencyContactPhone && (
                  <div className="pt-2">
                    <span className="text-xs text-slate-500 block">Family Coordinator:</span>
                    <a
                      href={`tel:${initialProfile.emergencyContactPhone}`}
                      className="inline-flex items-center space-x-2 font-bold text-teal-800 hover:underline text-sm"
                    >
                      <Phone className="h-4 w-4" />
                      <span>{initialProfile.emergencyContactName}: {initialProfile.emergencyContactPhone}</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

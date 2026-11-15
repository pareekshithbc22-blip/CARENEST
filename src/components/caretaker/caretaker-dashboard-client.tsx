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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CaretakerPatientMonitor } from "@/components/caretaker/caretaker-patient-monitor";

export interface PatientSummary {
  id: string;
  name: string;
  preferredName?: string | null;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string[];
  allergies?: string[];
}

interface CaretakerDashboardClientProps {
  caretakerName: string;
  initialSelectedPatientId?: string;
  initialTasks: any[];
  initialNotes: any[];
  profiles: PatientSummary[];
}

type ClinicalTab = "medications" | "tasks" | "appointments" | "notes";

export function CaretakerDashboardClient({
  caretakerName,
  initialSelectedPatientId,
  initialTasks,
  initialNotes,
  profiles,
}: CaretakerDashboardClientProps) {
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>(
    initialSelectedPatientId || profiles[0]?.id || ""
  );
  const [activeTab, setActiveTab] = React.useState<ClinicalTab>("medications");

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
    setNoteSuccess(false);

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

  const pendingTasks = patientTasks.filter((t) => t.status !== "COMPLETED");
  const takenDosesCount = doses.filter((d) => d.status === "TAKEN").length;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* ======================================================== */}
      {/* 1. CARETAKER HEADER & MULTI-PATIENT ASSIGNMENT GRID      */}
      {/* ======================================================== */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center rounded-lg bg-teal-100 px-3 py-1 text-xs font-black text-teal-800 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-teal-700" />
                  Licensed Caretaker / Nurse
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Clinical Care & Medication Authority
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
                Welcome, {caretakerName}
              </h1>
              <p className="text-xs font-medium text-slate-600 mt-1">
                Overseeing multi-patient vital signs telemetry, administering scheduled doses, and coordinating daily shift handovers.
              </p>
            </div>

            <div className="flex items-center space-x-3 self-start md:self-auto">
              <Badge className="bg-teal-700 text-white font-bold text-xs px-3 py-1.5">
                {profiles.length} Assigned {profiles.length === 1 ? "Patient" : "Patients"}
              </Badge>
            </div>
          </div>

          {/* Assigned Patients Multi-Select Grid */}
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
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                        {p.emergencyContactName && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Family Contact:</span>
                            <span className="font-semibold text-slate-800">
                              {p.emergencyContactName} ({p.emergencyContactPhone || "No phone"})
                            </span>
                          </div>
                        )}
                        {p.medicalConditions && p.medicalConditions.length > 0 && (
                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <span className="text-slate-500">Conditions:</span>
                            <span className="font-semibold text-teal-800 truncate max-w-[180px]">
                              {p.medicalConditions.join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Strict Data Isolation</span>
                      <span className={`font-black ${isSelected ? "text-teal-800" : "text-slate-400"}`}>
                        {isSelected ? "Active View" : "Click to Switch"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. LIVE HEALTH TELEMETRY (ISOLATED TO ACTIVE PATIENT)     */}
      {/* ======================================================== */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {profiles.length > 0 && (
          <CaretakerPatientMonitor
            profiles={profiles}
            activeProfileId={selectedProfileId}
            onSelectProfile={(id) => setSelectedProfileId(id)}
          />
        )}

        {/* ======================================================== */}
        {/* 3. CLINICAL CARE MANAGEMENT & VITALS LOGGING (2-COL)      */}
        {/* ======================================================== */}
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
                    {takenDosesCount} / {doses.length} Confirmed
                  </span>
                </div>

                {loadingDoses ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Loading doses...</p>
                ) : doses.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                    No scheduled doses found for {activePatient?.name} today.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {doses.map((dose) => {
                      const isTaken = dose.status === "TAKEN";
                      const isMissed = dose.status === "MISSED" || dose.status === "UNCONFIRMED";
                      const timeStr = new Date(dose.scheduledAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={dose.id}
                          className={`rounded-2xl border p-4 transition-all shadow-2xs ${
                            isTaken
                              ? "border-emerald-200 bg-emerald-50/40"
                              : isMissed
                              ? "border-amber-300 bg-amber-50/60"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {timeStr}
                                </span>
                                {isTaken && <Badge variant="success" className="text-[10px]">Confirmed Administered</Badge>}
                                {isMissed && <Badge variant="warning" className="text-[10px]">Grace Period Elapsed</Badge>}
                                {!isTaken && !isMissed && <Badge variant="secondary" className="text-[10px]">Scheduled</Badge>}
                              </div>
                              <h4 className="text-sm font-black text-slate-900 pt-0.5">
                                {dose.medication.name} ({dose.medication.strength})
                              </h4>
                              <p className="text-xs text-slate-600">
                                {dose.medication.dosageInstructions}
                              </p>
                            </div>

                            {!isTaken && (
                              <Button
                                size="sm"
                                disabled={confirmingDoseId === dose.id}
                                onClick={() => handleConfirmDose(dose.id)}
                                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs self-start sm:self-auto shadow-xs"
                              >
                                {confirmingDoseId === dose.id ? "Confirming..." : "Confirm Dose"}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CARE TASKS */}
            {activeTab === "tasks" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ClipboardCheck className="h-5 w-5 text-teal-700" />
                    <h3 className="text-base font-bold text-slate-900">
                      Care Tasks for {activePatient?.name} ({pendingTasks.length} pending)
                    </h3>
                  </div>
                </div>

                {loadingTasks ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Loading tasks...</p>
                ) : patientTasks.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                    No care tasks assigned for this patient.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientTasks.map((task) => {
                      const isDone = task.status === "COMPLETED";
                      return (
                        <div
                          key={task.id}
                          className={`rounded-2xl border p-4 shadow-2xs transition-all flex items-start justify-between ${
                            isDone
                              ? "border-emerald-200 bg-emerald-50/40 opacity-75"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <button
                              onClick={() => handleToggleTask(task.id, task.status)}
                              className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                isDone
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-300 hover:border-teal-600"
                              }`}
                            >
                              {isDone && <CheckCircle className="h-3.5 w-3.5" />}
                            </button>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`text-sm font-bold ${
                                    isDone ? "line-through text-slate-400" : "text-slate-900"
                                  }`}
                                >
                                  {task.title}
                                </span>
                                <Badge
                                  variant={
                                    task.priority === "URGENT"
                                      ? "urgent"
                                      : task.priority === "HIGH"
                                      ? "warning"
                                      : "secondary"
                                  }
                                  className="text-[9px]"
                                >
                                  {task.priority}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                              )}
                              <div className="mt-1 flex items-center space-x-2 text-[11px] text-slate-400">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Due:{" "}
                                  {new Date(task.dueDate).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {task.completedAt && (
                                  <span className="text-emerald-700 font-semibold">
                                    • Completed {new Date(task.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: UPCOMING APPOINTMENTS */}
            {activeTab === "appointments" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-teal-700" />
                    <h3 className="text-base font-bold text-slate-900">
                      Appointments for {activePatient?.name}
                    </h3>
                  </div>
                </div>

                {loadingAppts ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Loading appointments...</p>
                ) : appointments.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                    No doctor appointments scheduled for {activePatient?.name}.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {appt.doctorName}
                            </h4>
                            <p className="text-xs text-teal-800 font-semibold">
                              {appt.specialty} • {appt.location || "Clinic Consultation"}
                            </p>
                          </div>
                          <Badge variant={appt.status === "UPCOMING" ? "default" : "secondary"} className="text-[10px]">
                            {appt.status}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-600 flex items-center space-x-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {new Date(appt.appointmentDate).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>

                        {appt.purpose && (
                          <p className="text-xs text-slate-500 italic">Purpose: {appt.purpose}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: CARE NOTES & HANDOVERS */}
            {activeTab === "notes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-teal-700" />
                    <h3 className="text-base font-bold text-slate-900">
                      Shift Observations for {activePatient?.name}
                    </h3>
                  </div>
                </div>

                {loadingNotes ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Loading notes...</p>
                ) : patientNotes.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                    No clinical observations recorded yet for {activePatient?.name}.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientNotes.map((note) => (
                      <Card key={note.id}>
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900">
                              {note.title}
                            </span>
                            <Badge variant={note.category === "HANDOVER" ? "default" : "secondary"}>
                              {note.category}
                            </Badge>
                          </div>
                          <CardDescription className="text-[11px]">
                            Logged by {note.author?.name || "Care Staff"} •{" "}
                            {new Date(note.createdAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 space-y-2">
                          <p className="text-xs text-slate-700">{note.content}</p>

                          {note.vitalSigns && Object.keys(note.vitalSigns).length > 0 && (
                            <div className="rounded-lg bg-teal-50/60 p-2.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {note.vitalSigns.bloodPressure && (
                                <div>
                                  <span className="text-[10px] text-slate-400 block">BP (mmHg)</span>
                                  <strong className="font-bold text-teal-900">
                                    {note.vitalSigns.bloodPressure}
                                  </strong>
                                </div>
                              )}
                              {note.vitalSigns.bloodGlucose && (
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Glucose (mg/dL)</span>
                                  <strong className="font-bold text-teal-900">
                                    {note.vitalSigns.bloodGlucose}
                                  </strong>
                                </div>
                              )}
                              {note.vitalSigns.heartRate && (
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Heart Rate</span>
                                  <strong className="font-bold text-teal-900">
                                    {note.vitalSigns.heartRate} bpm
                                  </strong>
                                </div>
                              )}
                              {note.vitalSigns.temperature && (
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Temp (°F)</span>
                                  <strong className="font-bold text-teal-900">
                                    {note.vitalSigns.temperature}°
                                  </strong>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Vitals & Shift Handover Form (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="sticky top-20 border-slate-200 shadow-xs">
              <CardHeader className="p-5">
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-teal-700" />
                  <span>Log Vitals & Care Note</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Record real-time clinical vital signs for{" "}
                  <strong className="text-teal-900">{activePatient?.name}</strong>.
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
      </div>
    </div>
  );
}

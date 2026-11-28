"use client";

import * as React from "react";
import {
  ClipboardCheck,
  Activity,
  CheckCircle,
  Clock,
  FileText,
  Pill,
  Calendar,
  User,
  ShieldCheck,
  Search,
  AlertCircle,
  X,
  Users,
  Plus,
  AlertTriangle,
  Footprints,
  Moon,
  Droplets,
  Utensils,
  HeartPulse,
  Info,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DemoLiveCharts } from "./demo-live-charts";
import {
  getDemoCaretakerProps,
  subscribeToDemoUpdates,
  recordDemoVital,
  publishPrescription,
  publishCareNote,
  createDailyTask,
  assignDemoMedication,
  respondToCaretakerRequest,
  formatTimeAgo,
  setActiveSeniorPatientId,
} from "../store";
import { getSuggestedTaskValues } from "../task-suggestions";
import { DemoTaskType, DemoHealthCondition, DemoCareTask } from "../types";

export function DemoCaretakerView() {
  const [data, setData] = React.useState(() => getDemoCaretakerProps());
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>(
    data.initialSelectedPatientId || data.profiles[0]?.id || ""
  );
  const [activeTab, setActiveTab] = React.useState<"telemetry" | "medications" | "notes" | "tasks">("telemetry");

  // Health Condition / Care Note form state (Requirement 3)
  const [noteCondition, setNoteCondition] = React.useState<DemoHealthCondition>("Stable");
  const [noteObservations, setNoteObservations] = React.useState("");
  const [appetite, setAppetite] = React.useState<"Good" | "Fair" | "Poor" | "">("Good");
  const [mood, setMood] = React.useState<"Cheerful" | "Calm" | "Anxious" | "Depressed" | "">("Cheerful");
  const [sleepQuality, setSleepQuality] = React.useState<"Restful" | "Interrupted" | "Insomnia" | "">("Restful");
  const [painLevel, setPainLevel] = React.useState<number>(0);
  const [mobility, setMobility] = React.useState<"Independent" | "Assisted" | "Bedbound" | "">("Independent");
  const [noteFeedback, setNoteFeedback] = React.useState<{ success?: string; error?: string } | null>(null);

  // Prescription fields (Requirement 1: in Medications tab)
  const [showPrescribeSection, setShowPrescribeSection] = React.useState(true);
  const [prescribeName, setPrescribeName] = React.useState("");
  const [strengthNumber, setStrengthNumber] = React.useState<number | "">("");
  const [strengthUnit, setStrengthUnit] = React.useState<"mg" | "mcg" | "ml">("mg");
  const [medForm, setMedForm] = React.useState<"tablet" | "capsule" | "syrup" | "drops">("tablet");
  const [medTimes, setMedTimes] = React.useState<string>("08:00, 20:00");
  const [durationDays, setDurationDays] = React.useState<number>(30);
  const [medReason, setMedReason] = React.useState("");
  const [prescribeFeedback, setPrescribeFeedback] = React.useState<{ success?: string; error?: string } | null>(null);

  // Manual vital log state
  const [sugarInput, setSugarInput] = React.useState("");
  const [sysInput, setSysInput] = React.useState("");
  const [diaInput, setDiaInput] = React.useState("");
  const [vitalNotes, setVitalNotes] = React.useState("");
  const [vitalSuccess, setVitalSuccess] = React.useState<string | null>(null);

  // Daily Tasks state (Requirement 2)
  const [showTaskModal, setShowTaskModal] = React.useState(false);
  const [selectedTaskType, setSelectedTaskType] = React.useState<DemoTaskType | null>(null);
  const [taskDetailItem, setTaskDetailItem] = React.useState<DemoCareTask | null>(null);
  const [taskFeedback, setTaskFeedback] = React.useState<{ success?: string; error?: string } | null>(null);

  // Task form fields
  const [taskFormTitle, setTaskFormTitle] = React.useState("");
  const [taskFormStartDate, setTaskFormStartDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [taskFormDuration, setTaskFormDuration] = React.useState<number | "everyday">("everyday");
  const [taskFormPriority, setTaskFormPriority] = React.useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  // Specific task details
  const [walkingActivity, setWalkingActivity] = React.useState<"walking" | "stretching" | "chair_exercises" | "yoga" | "physiotherapy">("walking");
  const [walkingDuration, setWalkingDuration] = React.useState<number>(25);
  const [walkingTimesPerDay, setWalkingTimesPerDay] = React.useState<number>(1);
  const [walkingPreferredTime, setWalkingPreferredTime] = React.useState("08:30 AM");
  const [walkingIntensity, setWalkingIntensity] = React.useState<"light" | "moderate">("light");
  const [walkingNotes, setWalkingNotes] = React.useState("");

  const [sleepTargetHours, setSleepTargetHours] = React.useState<number>(8);
  const [sleepBedtime, setSleepBedtime] = React.useState("22:00");
  const [sleepWakeup, setSleepWakeup] = React.useState("06:30");
  const [sleepNapAllowed, setSleepNapAllowed] = React.useState(true);
  const [sleepNapMinutes, setSleepNapMinutes] = React.useState(30);
  const [sleepNotes, setSleepNotes] = React.useState("");

  const [sugarTimes, setSugarTimes] = React.useState<string[]>(["fasting", "after_breakfast"]);
  const [sugarNotes, setSugarNotes] = React.useState("");

  const [bpTimes, setBpTimes] = React.useState<string[]>(["morning", "evening"]);
  const [bpRestingReminder, setBpRestingReminder] = React.useState(true);
  const [bpNotes, setBpNotes] = React.useState("");

  const [hydrationGlasses, setHydrationGlasses] = React.useState<number>(7);
  const [hydrationReminders, setHydrationReminders] = React.useState("08:00, 11:00, 14:00, 17:00, 20:00");
  const [hydrationNotes, setHydrationNotes] = React.useState("");

  const [mealsTimes, setMealsTimes] = React.useState("08:30 (Breakfast), 13:00 (Lunch), 20:00 (Dinner)");
  const [mealsDietNote, setMealsDietNote] = React.useState("Heart-healthy, low sodium diet");

  const [customTitle, setCustomTitle] = React.useState("");
  const [customDesc, setCustomDesc] = React.useState("");
  const [customTime, setCustomTime] = React.useState("10:00 AM");

  // Assign Medication Modal state
  const [showAssignMedModal, setShowAssignMedModal] = React.useState(false);
  const [assignMedName, setAssignMedName] = React.useState("");
  const [assignMedDosage, setAssignMedDosage] = React.useState("");
  const [assignMedTimes, setAssignMedTimes] = React.useState("09:00");
  const [assignMedInstructions, setAssignMedInstructions] = React.useState("Take with water");

  // Request response feedback
  const [requestError, setRequestError] = React.useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = subscribeToDemoUpdates(() => {
      setData(getDemoCaretakerProps(selectedPatientId));
    });
    return unsub;
  }, [selectedPatientId]);

  // Keep selected patient valid if active caretaker changes
  React.useEffect(() => {
    if (!data.profiles.some((p) => p.id === selectedPatientId)) {
      if (data.profiles.length > 0) {
        setSelectedPatientId(data.profiles[0].id);
      }
    }
  }, [data.profiles, selectedPatientId]);

  React.useEffect(() => {
    if (selectedPatientId) {
      setActiveSeniorPatientId(selectedPatientId);
    }
  }, [selectedPatientId]);

  const selectedPatient = data.profiles.find((p) => p.id === selectedPatientId) || data.profiles[0];

  const patientAge = React.useMemo(() => {
    if (!selectedPatient?.dateOfBirth) return 70;
    const dob = new Date(selectedPatient.dateOfBirth);
    return Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970) || 70;
  }, [selectedPatient?.dateOfBirth]);

  const suggestions = React.useMemo(() => {
    return getSuggestedTaskValues(patientAge);
  }, [patientAge]);

  // When task type is chosen, prefill suggestions
  const handleSelectTaskType = (type: DemoTaskType) => {
    setSelectedTaskType(type);
    setTaskFeedback(null);

    switch (type) {
      case "walking":
        setTaskFormTitle(`Daily Walking & Mobility (${suggestions.walking.activity.replace("_", " ")})`);
        setWalkingActivity(suggestions.walking.activity);
        setWalkingDuration(suggestions.walking.durationMinutes);
        setWalkingTimesPerDay(suggestions.walking.timesPerDay);
        setWalkingPreferredTime(suggestions.walking.preferredTime);
        setWalkingIntensity(suggestions.walking.intensity);
        setWalkingNotes(suggestions.walking.notes);
        break;
      case "sleep":
        setTaskFormTitle(`Sleep & Rest Schedule (${suggestions.sleep.targetSleepHours}h target)`);
        setSleepTargetHours(suggestions.sleep.targetSleepHours);
        setSleepBedtime(suggestions.sleep.bedtime);
        setSleepWakeup(suggestions.sleep.wakeupTime);
        setSleepNapAllowed(suggestions.sleep.napAllowed);
        setSleepNapMinutes(suggestions.sleep.napMinutes);
        setSleepNotes(suggestions.sleep.notes);
        break;
      case "blood_sugar":
        setTaskFormTitle("Capillary Blood Sugar Check");
        setSugarTimes(suggestions.bloodSugar.sugarTimes);
        setSugarNotes(suggestions.bloodSugar.notes);
        break;
      case "blood_pressure":
        setTaskFormTitle("Blood Pressure & Pulse Check");
        setBpTimes(suggestions.bloodPressure.bpTimes);
        setBpRestingReminder(suggestions.bloodPressure.restingReminder);
        setBpNotes(suggestions.bloodPressure.notes);
        break;
      case "hydration":
        setTaskFormTitle(`Hydration Goal (${suggestions.hydration.glassesPerDay} glasses)`);
        setHydrationGlasses(suggestions.hydration.glassesPerDay);
        setHydrationReminders(suggestions.hydration.reminderTimes.join(", "));
        setHydrationNotes(suggestions.hydration.notes);
        break;
      case "meals":
        setTaskFormTitle("Scheduled Meal Times & Diet");
        setMealsTimes(suggestions.meals.mealTimes.join(", "));
        setMealsDietNote(suggestions.meals.dietNote);
        break;
      case "custom":
        setTaskFormTitle("");
        setCustomTitle("");
        setCustomDesc("");
        setCustomTime("10:00 AM");
        break;
    }
  };

  // Requirement 1: Handle Publish Prescription
  const handlePublishPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    setPrescribeFeedback(null);

    if (!selectedPatient) return;
    if (!prescribeName.trim()) {
      setPrescribeFeedback({ error: "Medicine name is required." });
      return;
    }
    if (!strengthNumber || Number(strengthNumber) <= 0) {
      setPrescribeFeedback({ error: "Please enter a valid numeric strength." });
      return;
    }
    if (!medReason.trim()) {
      setPrescribeFeedback({ error: "Clinical reason for prescription is required." });
      return;
    }

    const timesArray = medTimes
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (timesArray.length === 0) {
      setPrescribeFeedback({ error: "Please provide at least one daily schedule time (e.g. 08:00)." });
      return;
    }

    try {
      publishPrescription(selectedPatient.id, {
        name: prescribeName.trim(),
        strengthNumber: Number(strengthNumber),
        strengthUnit,
        form: medForm,
        times: timesArray,
        durationDays: durationDays || 30,
        reason: medReason.trim(),
      });

      setPrescribeFeedback({
        success: `Prescription for "${prescribeName}" published and synced to patient & family view!`,
      });

      // Clear prescription form
      setPrescribeName("");
      setStrengthNumber("");
      setMedReason("");
      setTimeout(() => setPrescribeFeedback(null), 4000);
    } catch (err: any) {
      setPrescribeFeedback({ error: err.message || "Failed to publish prescription." });
    }
  };

  // Requirement 3: Handle Publish Health Condition Note
  const handlePublishCareNote = (e: React.FormEvent) => {
    e.preventDefault();
    setNoteFeedback(null);

    if (!selectedPatient) return;
    if (!noteObservations.trim()) {
      setNoteFeedback({ error: "Clinical observation content is required." });
      return;
    }

    try {
      publishCareNote(selectedPatient.id, {
        overallCondition: noteCondition,
        observations: noteObservations.trim(),
        quickFields: {
          appetite: appetite || undefined,
          mood: mood || undefined,
          sleepQuality: sleepQuality || undefined,
          painLevel,
          mobility: mobility || undefined,
        },
      });

      setNoteFeedback({
        success: `Health condition update ("${noteCondition}") published and updated on patient profile!`,
      });

      // Clear note form
      setNoteObservations("");
      setTimeout(() => setNoteFeedback(null), 4000);
    } catch (err: any) {
      setNoteFeedback({ error: err.message || "Failed to publish care note." });
    }
  };

  // Requirement 2: Handle Create Daily Task
  const handleCreateDailyTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFeedback(null);

    if (!selectedPatient || !selectedTaskType) return;
    const finalTitle = selectedTaskType === "custom" ? customTitle.trim() : taskFormTitle.trim();

    if (!finalTitle) {
      setTaskFeedback({ error: "Task title is required." });
      return;
    }

    let details: any = {
      startDate: taskFormStartDate,
      durationDays: taskFormDuration,
    };

    if (selectedTaskType === "walking") {
      details = {
        ...details,
        activity: walkingActivity,
        durationMinutes: walkingDuration,
        timesPerDay: walkingTimesPerDay,
        preferredTime: walkingPreferredTime,
        intensity: walkingIntensity,
        notes: walkingNotes,
      };
    } else if (selectedTaskType === "sleep") {
      details = {
        ...details,
        targetSleepHours: sleepTargetHours,
        bedtime: sleepBedtime,
        wakeupTime: sleepWakeup,
        napAllowed: sleepNapAllowed,
        napMinutes: sleepNapMinutes,
        notes: sleepNotes,
      };
    } else if (selectedTaskType === "blood_sugar") {
      details = {
        ...details,
        sugarTimes,
        notes: sugarNotes,
      };
    } else if (selectedTaskType === "blood_pressure") {
      details = {
        ...details,
        bpTimes,
        restingReminder: bpRestingReminder,
        notes: bpNotes,
      };
    } else if (selectedTaskType === "hydration") {
      details = {
        ...details,
        glassesPerDay: hydrationGlasses,
        reminderTimes: hydrationReminders.split(",").map((t) => t.trim()).filter(Boolean),
        notes: hydrationNotes,
      };
    } else if (selectedTaskType === "meals") {
      details = {
        ...details,
        mealTimes: mealsTimes.split(",").map((t) => t.trim()).filter(Boolean),
        dietNote: mealsDietNote,
      };
    } else if (selectedTaskType === "custom") {
      details = {
        ...details,
        notes: customDesc,
        timeOfDay: customTime,
      };
    }

    try {
      createDailyTask(selectedPatient.id, {
        taskType: selectedTaskType,
        title: finalTitle,
        description: selectedTaskType === "custom" ? customDesc : `${details.activity || selectedTaskType} task`,
        startDate: taskFormStartDate,
        durationDays: taskFormDuration,
        priority: taskFormPriority,
        details,
      });

      setShowTaskModal(false);
      setSelectedTaskType(null);
    } catch (err: any) {
      setTaskFeedback({ error: err.message || "Failed to create task." });
    }
  };

  const handleRecordVital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const sugar = sugarInput ? parseFloat(sugarInput) : null;
    const sys = sysInput ? parseFloat(sysInput) : null;
    const dia = diaInput ? parseFloat(diaInput) : null;

    recordDemoVital(selectedPatient.id, sugar, sys, dia, vitalNotes);
    setSugarInput("");
    setSysInput("");
    setDiaInput("");
    setVitalNotes("");
    setVitalSuccess("Vital reading recorded and synced to real-time telemetry.");
    setTimeout(() => setVitalSuccess(null), 3000);
  };

  const handleAssignMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !assignMedName.trim() || !assignMedDosage.trim()) return;

    assignDemoMedication(selectedPatient.id, {
      name: assignMedName.trim(),
      dosage: assignMedDosage.trim(),
      times: assignMedTimes.split(",").map((t) => t.trim()).filter(Boolean),
      instructions: assignMedInstructions.trim(),
    });

    setShowAssignMedModal(false);
    setAssignMedName("");
    setAssignMedDosage("");
  };

  const handleRespondRequest = (requestId: string, action: "ACCEPTED" | "REJECTED") => {
    setRequestError(null);
    setRequestSuccess(null);

    const res = respondToCaretakerRequest(requestId, action);
    if (!res.success) {
      setRequestError(res.error || "Failed to respond to request");
    } else {
      setRequestSuccess(
        action === "ACCEPTED"
          ? "Patient request accepted! Patient has been added to your care roster."
          : "Patient request declined."
      );
      setTimeout(() => setRequestSuccess(null), 4000);
    }
  };

  const getConditionChip = (condition?: string) => {
    switch (condition) {
      case "Improving":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Needs attention":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Critical":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "Stable":
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Caretaker Clinical Header */}
      <div className="bg-card border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">{data.caretakerName}</h1>
            <Badge className="bg-teal-700 text-white font-bold text-xs">Verified Nurse</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.caretakerProfile.qualification} • Reg: {data.caretakerProfile.registrationNumber} ({data.caretakerProfile.issuingAuthority})
          </p>
        </div>

        {/* Capacity Meter */}
        <div className="flex items-center gap-3">
          <div className="text-left md:text-right">
            <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">
              Assigned Patients
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-lg font-black font-mono text-foreground">{data.patientsCount} / 5</span>
              {data.isFullyBooked && (
                <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                  Fully Booked
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Incoming Patient Requests Notification */}
      {data.pendingRequests && data.pendingRequests.length > 0 && (
        <div className="rounded-2xl border-2 border-teal-500 bg-teal-50/40 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-700" />
              <h3 className="text-sm font-black text-teal-950">
                Incoming Patient Care Requests ({data.pendingRequests.length})
              </h3>
            </div>
            <span className="text-xs text-teal-800 font-semibold">
              Action required to begin health monitoring
            </span>
          </div>

          {requestError && (
            <div className="rounded-xl bg-rose-100 border border-rose-300 p-2.5 text-xs text-rose-800 font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{requestError}</span>
            </div>
          )}

          {requestSuccess && (
            <div className="rounded-xl bg-emerald-100 border border-emerald-300 p-2.5 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{requestSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-teal-200 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                      {req.patientCode}
                    </span>
                    <span className="text-xs text-slate-500">Age {req.patientAge}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-1">{req.patientName}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Requested by Family Admin: <strong>{req.familyAdminName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleRespondRequest(req.id, "ACCEPTED")}
                    className="flex-1 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    Accept Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondRequest(req.id, "REJECTED")}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Left Column Patient Cards, Right Column Clinical Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assigned Patients List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-black tracking-tight uppercase text-muted-foreground">
              Assigned Patients ({data.profiles.length})
            </h2>
            <span className="text-xs text-muted-foreground font-mono">Max 5</span>
          </div>

          {data.profiles.length === 0 ? (
            <div className="border border-dashed rounded-xl p-8 text-center bg-card">
              <User className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-muted-foreground">No patients assigned to this caretaker.</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Family administrators can send care requests to you.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.profiles.map((p) => {
                const isSelected = p.id === selectedPatient?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-teal-50/50 border-teal-600 ring-2 ring-teal-600/20 shadow-xs"
                        : "bg-card hover:bg-muted/40 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-extrabold text-teal-800 bg-teal-100/60 px-1.5 py-0.5 rounded border border-teal-200">
                          {p.patientCode}
                        </span>
                        <h3 className="font-bold text-sm text-foreground">{p.name}</h3>
                      </div>
                      {/* Health Condition Chip (Requirement 3) */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getConditionChip(p.latestCondition)}`}>
                        {p.latestCondition || "Stable"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {p.latestBloodSugar && (
                        <span className="px-1.5 py-0.5 rounded bg-muted font-mono font-medium">
                          Sugar: {p.latestBloodSugar}
                        </span>
                      )}
                      {p.latestBloodPressure && (
                        <span className="px-1.5 py-0.5 rounded bg-muted font-mono font-medium">
                          BP: {p.latestBloodPressure}
                        </span>
                      )}
                    </div>

                    {p.alertBadges && p.alertBadges.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.alertBadges.map((b, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 border border-rose-500/20"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Patient Workspace */}
        <div className="lg:col-span-8 space-y-4">
          {selectedPatient ? (
            <>
              {/* Selected Patient Overview Header */}
              <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-300">
                      {selectedPatient.patientCode}
                    </span>
                    <h2 className="text-xl font-black tracking-tight">{selectedPatient.name}</h2>
                    {/* Latest Condition Chip */}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getConditionChip(selectedPatient.latestCondition)}`}>
                      {selectedPatient.latestCondition || "Stable"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Age: {patientAge} • Conditions: {selectedPatient.medicalConditions?.join(", ") || "None"} • Allergies:{" "}
                    {selectedPatient.allergies?.join(", ") || "None"}
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("medications");
                      setShowPrescribeSection(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Pill className="h-3.5 w-3.5 text-teal-700" />
                    <span>Prescribe Med</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("tasks");
                      setShowTaskModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Assign Task</span>
                  </button>
                </div>
              </div>

              {/* Requirement 5: TODAY'S MEDICINES CARD AT TOP OF PATIENT VIEW */}
              <div className="bg-card border rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-teal-700" />
                    <h3 className="text-sm font-bold text-foreground">Today's Medicines Schedule</h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Live telemetry synced with senior patient actions
                  </span>
                </div>

                {!selectedPatient.todayDoses || selectedPatient.todayDoses.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    No medications scheduled for today.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedPatient.todayDoses.map((dose) => (
                      <div
                        key={dose.id}
                        className="p-3 rounded-lg border bg-background flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-foreground text-sm">{dose.medicationName}</div>
                          <div className="text-muted-foreground text-[11px] flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{dose.scheduledTime}</span>
                            <span>•</span>
                            <span>{dose.dosage}</span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-md text-[11px] font-bold border shrink-0 ${dose.chipClass}`}
                        >
                          {dose.statusLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LIVE CHARTS (Requirement 2) */}
              <DemoLiveCharts
                patientId={selectedPatient.id}
                patientName={selectedPatient.name}
                vitals={selectedPatient.vitals || []}
              />

              {/* Navigation Tabs for Workspace */}
              <div className="flex border-b border-border text-xs font-bold">
                {[
                  { id: "telemetry", label: "Log Vitals & Telemetry" },
                  { id: "medications", label: `Medications (${selectedPatient.medications?.length || 0})` },
                  { id: "notes", label: `Care Notes & Condition (${selectedPatient.notesList?.length || 0})` },
                  { id: "tasks", label: `Daily Tasks (${selectedPatient.tasks?.length || 0})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-4 py-2.5 border-b-2 font-bold transition-all ${
                      activeTab === t.id
                        ? "border-teal-600 text-teal-800"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: LOG VITALS & TELEMETRY */}
              {activeTab === "telemetry" && (
                <div className="bg-card border rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-bold">Log Clinical Vitals for {selectedPatient.name}</h3>

                  {vitalSuccess && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-800 font-bold flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>{vitalSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleRecordVital} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1">Blood Sugar (mg/dL)</label>
                      <input
                        type="number"
                        placeholder="e.g. 120"
                        value={sugarInput}
                        onChange={(e) => setSugarInput(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Systolic BP (mmHg)</label>
                      <input
                        type="number"
                        placeholder="e.g. 120"
                        value={sysInput}
                        onChange={(e) => setSysInput(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Diastolic BP (mmHg)</label>
                      <input
                        type="number"
                        placeholder="e.g. 80"
                        value={diaInput}
                        onChange={(e) => setDiaInput(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold mb-1">Clinical Notes (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Capillary blood check after breakfast"
                        value={vitalNotes}
                        onChange={(e) => setVitalNotes(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                      />
                    </div>
                    <div className="sm:col-span-1 flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        Record Vitals
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: MEDICATIONS (WITH PRESCRIBE MEDICINE SECTION - Requirement 1) */}
              {activeTab === "medications" && (
                <div className="space-y-4">
                  {/* Prescribe Medicine Section (Requirement 1: Moved from care notes to medications tab) */}
                  <div className="rounded-xl border-2 border-teal-500/30 bg-teal-50/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-teal-700" />
                        <h4 className="text-sm font-extrabold uppercase tracking-wider text-teal-950">
                          Prescribe Medicine
                        </h4>
                      </div>
                      <span className="text-[11px] text-teal-800">
                        Propagates immediately to Family and Senior views
                      </span>
                    </div>

                    {prescribeFeedback?.error && (
                      <div className="rounded-lg bg-rose-50 border border-rose-300 p-2.5 text-xs text-rose-800 font-bold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>{prescribeFeedback.error}</span>
                      </div>
                    )}

                    {prescribeFeedback?.success && (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-2.5 text-xs text-emerald-800 font-bold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>{prescribeFeedback.success}</span>
                      </div>
                    )}

                    <form onSubmit={handlePublishPrescription} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-6">
                          <label className="block text-xs font-bold mb-1">Medicine Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Paracetamol / Metformin"
                            value={prescribeName}
                            onChange={(e) => setPrescribeName(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 text-xs bg-background"
                            required
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold mb-1">Strength *</label>
                          <input
                            type="number"
                            placeholder="e.g. 500"
                            value={strengthNumber}
                            onChange={(e) => setStrengthNumber(e.target.value ? parseFloat(e.target.value) : "")}
                            className="w-full rounded-lg border px-3 py-2 text-xs bg-background"
                            required
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold mb-1">Unit *</label>
                          <select
                            value={strengthUnit}
                            onChange={(e) => setStrengthUnit(e.target.value as any)}
                            className="w-full rounded-lg border px-3 py-2 text-xs bg-background"
                          >
                            <option value="mg">mg</option>
                            <option value="mcg">mcg</option>
                            <option value="ml">ml</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold mb-1">Form *</label>
                          <select
                            value={medForm}
                            onChange={(e) => setMedForm(e.target.value as any)}
                            className="w-full rounded-lg border px-3 py-2 text-xs bg-background"
                          >
                            <option value="tablet">Tablet</option>
                            <option value="capsule">Capsule</option>
                            <option value="syrup">Syrup</option>
                            <option value="drops">Drops</option>
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-xs font-bold mb-1">Daily Schedule Times *</label>
                          <input
                            type="text"
                            placeholder="08:00, 20:00"
                            value={medTimes}
                            onChange={(e) => setMedTimes(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 text-xs bg-background"
                            required
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold mb-1">Days *</label>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={durationDays}
                            onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 30)}
                            className="w-full rounded-lg border px-3 py-2 text-xs bg-background"
                            required
                          />
                        </div>

                        <div className="sm:col-span-12">
                          <label className="block text-xs font-bold mb-1">Clinical Reason *</label>
                          <input
                            type="text"
                            placeholder="e.g. Blood pressure control / Glycemic stabilization"
                            value={medReason}
                            onChange={(e) => setMedReason(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 text-xs bg-background"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Pill className="h-3.5 w-3.5" />
                          <span>Publish Prescription</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Existing Medication List & Assign Modal Trigger */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <h3 className="text-sm font-bold">Active Prescriptions & Stock Telemetry</h3>
                      <button
                        type="button"
                        onClick={() => setShowAssignMedModal(true)}
                        className="px-2.5 py-1 rounded bg-teal-700 text-white text-xs font-bold"
                      >
                        + Assign Medication
                      </button>
                    </div>

                    {selectedPatient.medications?.map((m) => {
                      const stock = m.stockCount ?? 30;
                      const isLowStock = stock <= 5;
                      const stockLabel = `${stock} ${m.form === "syrup" || m.form === "drops" ? "units" : "tablets"} left${
                        m.stockUpdatedBy ? `, updated by ${m.stockUpdatedBy} ${formatTimeAgo(m.stockUpdatedAt)}` : ""
                      }`;

                      return (
                        <div key={m.id} className="bg-card border rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-foreground">{m.name}</h4>
                              <span className="text-xs font-mono font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {m.dosage}
                              </span>
                              {isLowStock && (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{m.instructions}</p>
                            {m.reason && (
                              <p className="text-[11px] text-muted-foreground italic">Reason: {m.reason}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Assigned by {m.assignedByName} on {new Date(m.assignedAt).toLocaleDateString()} • Times: {m.times?.join(", ")}
                            </p>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <span className="text-[11px] text-muted-foreground block font-medium">Inventory Stock</span>
                            <span className="text-sm font-black font-mono text-slate-800">{stockLabel}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: CARE NOTES = HEALTH CONDITION UPDATES (Requirement 3) */}
              {activeTab === "notes" && (
                <div className="space-y-4">
                  <div className="bg-card border rounded-xl p-4 space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="text-sm font-bold">Health Condition Update</h3>
                      <p className="text-xs text-muted-foreground">
                        Record clinical observations and overall health status. Updates the patient's condition chip across Caretaker and Family views.
                      </p>
                    </div>

                    {noteFeedback?.error && (
                      <div className="rounded-lg bg-rose-50 border border-rose-300 p-2.5 text-xs text-rose-800 font-bold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>{noteFeedback.error}</span>
                      </div>
                    )}

                    {noteFeedback?.success && (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-2.5 text-xs text-emerald-800 font-bold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>{noteFeedback.success}</span>
                      </div>
                    )}

                    <form onSubmit={handlePublishCareNote} className="space-y-4">
                      {/* Overall condition picker */}
                      <div>
                        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-muted-foreground">
                          Overall Condition *
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(["Stable", "Improving", "Needs attention", "Critical"] as DemoHealthCondition[]).map((cond) => {
                            const isSelected = noteCondition === cond;
                            return (
                              <button
                                key={cond}
                                type="button"
                                onClick={() => setNoteCondition(cond)}
                                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                                  isSelected
                                    ? cond === "Critical"
                                      ? "bg-rose-100 text-rose-900 border-rose-400 ring-2 ring-rose-400/30"
                                      : cond === "Needs attention"
                                      ? "bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/30"
                                      : cond === "Improving"
                                      ? "bg-blue-100 text-blue-900 border-blue-400 ring-2 ring-blue-400/30"
                                      : "bg-emerald-100 text-emerald-900 border-emerald-400 ring-2 ring-emerald-400/30"
                                    : "bg-background hover:bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {cond}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Observations text */}
                      <div>
                        <label className="block text-xs font-bold mb-1">
                          Clinical Observations *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Detailed notes on patient condition, symptoms, medication adherence, mental status..."
                          value={noteObservations}
                          onChange={(e) => setNoteObservations(e.target.value)}
                          className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                          required
                        />
                      </div>

                      {/* Optional quick fields */}
                      <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Optional Quick Assessments
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold mb-1">Appetite</label>
                            <select
                              value={appetite}
                              onChange={(e) => setAppetite(e.target.value as any)}
                              className="w-full rounded border px-2 py-1.5 text-xs bg-background"
                            >
                              <option value="Good">Good</option>
                              <option value="Fair">Fair</option>
                              <option value="Poor">Poor</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold mb-1">Mood</label>
                            <select
                              value={mood}
                              onChange={(e) => setMood(e.target.value as any)}
                              className="w-full rounded border px-2 py-1.5 text-xs bg-background"
                            >
                              <option value="Cheerful">Cheerful</option>
                              <option value="Calm">Calm</option>
                              <option value="Anxious">Anxious</option>
                              <option value="Depressed">Depressed</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold mb-1">Sleep Quality</label>
                            <select
                              value={sleepQuality}
                              onChange={(e) => setSleepQuality(e.target.value as any)}
                              className="w-full rounded border px-2 py-1.5 text-xs bg-background"
                            >
                              <option value="Restful">Restful</option>
                              <option value="Interrupted">Interrupted</option>
                              <option value="Insomnia">Insomnia</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold mb-1">
                              Pain Level (0 - 10): <strong>{painLevel}</strong>
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={10}
                              value={painLevel}
                              onChange={(e) => setPainLevel(parseInt(e.target.value, 10) || 0)}
                              className="w-full"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold mb-1">Mobility</label>
                            <select
                              value={mobility}
                              onChange={(e) => setMobility(e.target.value as any)}
                              className="w-full rounded border px-2 py-1.5 text-xs bg-background"
                            >
                              <option value="Independent">Independent</option>
                              <option value="Assisted">Assisted</option>
                              <option value="Bedbound">Bedbound</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-black text-xs shadow-md transition-all active:scale-95"
                        >
                          Publish Care Note
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Existing Care Notes List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold">Past Health Condition Updates ({selectedPatient.notesList?.length || 0})</h3>
                    {selectedPatient.notesList?.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-4 bg-card border rounded-lg">No care notes recorded yet.</p>
                    ) : (
                      selectedPatient.notesList?.map((n) => (
                        <div key={n.id} className="bg-card border rounded-xl p-4 shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {n.overallCondition && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getConditionChip(n.overallCondition)}`}>
                                  {n.overallCondition}
                                </span>
                              )}
                              <h4 className="font-bold text-xs text-foreground">{n.title}</h4>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(n.createdAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/90">{n.observations || n.content}</p>
                          {n.quickFields && (
                            <div className="flex flex-wrap gap-2 pt-1 border-t text-[10px] text-muted-foreground">
                              {n.quickFields.appetite && <span>Appetite: <strong>{n.quickFields.appetite}</strong></span>}
                              {n.quickFields.mood && <span>Mood: <strong>{n.quickFields.mood}</strong></span>}
                              {n.quickFields.sleepQuality && <span>Sleep: <strong>{n.quickFields.sleepQuality}</strong></span>}
                              {n.quickFields.painLevel !== undefined && <span>Pain: <strong>{n.quickFields.painLevel}/10</strong></span>}
                              {n.quickFields.mobility && <span>Mobility: <strong>{n.quickFields.mobility}</strong></span>}
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            Logged by {n.authorName}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: DAILY TASKS (Requirement 2) */}
              {activeTab === "tasks" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h3 className="text-sm font-bold">Daily Care Tasks</h3>
                      <p className="text-xs text-muted-foreground">Assigned clinical and lifestyle routines for {selectedPatient.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskType(null);
                        setShowTaskModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Assign Daily Task</span>
                    </button>
                  </div>

                  {selectedPatient.tasks?.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-4 bg-card border rounded-lg">No care tasks scheduled today.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedPatient.tasks?.map((t) => {
                        const isDone = t.isCompleted;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setTaskDetailItem(t)}
                            className="bg-card border rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-teal-400 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="shrink-0">
                                {isDone ? (
                                  <span className="flex h-5 w-5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-700 items-center justify-center">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </span>
                                ) : (
                                  <span className="flex h-5 w-5 rounded-md bg-slate-100 border border-slate-300 text-slate-400 items-center justify-center">
                                    <Clock className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-foreground">
                                  {t.title}
                                </h4>
                                {t.description && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                      isDone
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        : "bg-amber-50 text-amber-800 border-amber-200"
                                    }`}
                                  >
                                    {isDone ? (
                                      <>
                                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                                        <span>
                                          {(t as any).todayStatusLabel ||
                                            `Completed by ${(t as any).completedByName || selectedPatient.name} at ${
                                              t.completedAt
                                                ? new Date(t.completedAt).toLocaleTimeString([], {
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                  })
                                                : "today"
                                            }`}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="h-3 w-3 text-amber-600" />
                                        <span>Pending (Only patient can complete)</span>
                                      </>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Assigned by {t.assignedToName}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className="text-[10px] uppercase font-bold">{t.priority}</Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="border border-dashed rounded-xl p-12 text-center bg-card">
              <p className="text-sm font-bold text-muted-foreground">Select a patient to view clinical telemetry.</p>
            </div>
          )}
        </div>
      </div>

      {/* REQUIREMENT 2: ASSIGN DAILY TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border-2 border-slate-200 my-8 max-h-[90dvh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {selectedTaskType ? `Configure ${selectedTaskType.replace("_", " ").toUpperCase()} Task` : "Assign Daily Task"}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedTaskType ? "Review age-based starting values. The caretaker decides." : "Step 1: Pick a task category"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTaskType(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {taskFeedback?.error && (
              <div className="rounded-xl bg-rose-50 border border-rose-300 p-2.5 text-xs text-rose-800 font-bold flex items-center gap-2 mt-3 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{taskFeedback.error}</span>
              </div>
            )}

            <div className="pt-4 overflow-y-auto pr-1 flex-1">
              {!selectedTaskType ? (
                /* Step 1: Type Selection Cards */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { type: "walking" as DemoTaskType, title: "Walking / Exercise", icon: Footprints, desc: "Ambulation, stretching, chair exercises" },
                    { type: "sleep" as DemoTaskType, title: "Sleep", icon: Moon, desc: "Night rest target, bedtime, nap allowances" },
                    { type: "blood_sugar" as DemoTaskType, title: "Check Blood Sugar", icon: Activity, desc: "Fasting, pre/post meal glucose testing" },
                    { type: "blood_pressure" as DemoTaskType, title: "Check Blood Pressure", icon: HeartPulse, desc: "Resting BP and pulse monitoring" },
                    { type: "hydration" as DemoTaskType, title: "Hydration", icon: Droplets, desc: "Daily water intake goals and reminders" },
                    { type: "meals" as DemoTaskType, title: "Meals and Diet", icon: Utensils, desc: "Scheduled nutrition and dietary guidelines" },
                    { type: "custom" as DemoTaskType, title: "Custom Task", icon: Plus, desc: "Freeform clinical or personal care task" },
                  ].map((card) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.type}
                        type="button"
                        onClick={() => handleSelectTaskType(card.type)}
                        className="p-4 rounded-2xl border-2 border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-left transition-all flex items-start gap-3 group"
                      >
                        <div className="p-2.5 rounded-xl bg-slate-100 group-hover:bg-teal-100 text-teal-800 shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-teal-950">{card.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Step 2: Task Form with Age-Based Suggestions */
                <form onSubmit={handleCreateDailyTaskSubmit} className="space-y-4">
                  {/* Age-based suggestions disclaimer label */}
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-amber-900 text-xs">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{suggestions.disclaimer}</span>
                    </div>
                  </div>

                  {/* Common fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
                      <input
                        type="text"
                        value={selectedTaskType === "custom" ? customTitle : taskFormTitle}
                        onChange={(e) => {
                          if (selectedTaskType === "custom") setCustomTitle(e.target.value);
                          else setTaskFormTitle(e.target.value);
                        }}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
                      <input
                        type="date"
                        value={taskFormStartDate}
                        onChange={(e) => setTaskFormStartDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Duration Days</label>
                      <select
                        value={taskFormDuration}
                        onChange={(e) => setTaskFormDuration(e.target.value === "everyday" ? "everyday" : parseInt(e.target.value, 10))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      >
                        <option value="everyday">Every day until stopped</option>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={90}>90 days</option>
                      </select>
                    </div>
                  </div>

                  {/* Task Specific Detail Form */}
                  {selectedTaskType === "walking" && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Activity Type</label>
                          <select
                            value={walkingActivity}
                            onChange={(e) => setWalkingActivity(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          >
                            <option value="walking">Walking</option>
                            <option value="stretching">Stretching</option>
                            <option value="chair_exercises">Chair exercises</option>
                            <option value="yoga">Yoga</option>
                            <option value="physiotherapy">Physiotherapy</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Duration (minutes)</label>
                          <input
                            type="number"
                            min={5}
                            max={120}
                            value={walkingDuration}
                            onChange={(e) => setWalkingDuration(parseInt(e.target.value, 10) || 15)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Times Per Day</label>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={walkingTimesPerDay}
                            onChange={(e) => setWalkingTimesPerDay(parseInt(e.target.value, 10) || 1)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Time</label>
                          <input
                            type="text"
                            value={walkingPreferredTime}
                            onChange={(e) => setWalkingPreferredTime(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Intensity</label>
                          <select
                            value={walkingIntensity}
                            onChange={(e) => setWalkingIntensity(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          >
                            <option value="light">Light</option>
                            <option value="moderate">Moderate</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                          <input
                            type="text"
                            value={walkingNotes}
                            onChange={(e) => setWalkingNotes(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTaskType === "sleep" && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Target Hours of Sleep</label>
                          <input
                            type="number"
                            step="0.5"
                            min={4}
                            max={12}
                            value={sleepTargetHours}
                            onChange={(e) => setSleepTargetHours(parseFloat(e.target.value) || 8)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Target Bedtime</label>
                          <input
                            type="time"
                            value={sleepBedtime}
                            onChange={(e) => setSleepBedtime(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Target Wake-up Time</label>
                          <input
                            type="time"
                            value={sleepWakeup}
                            onChange={(e) => setSleepWakeup(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Afternoon Nap Allowed?</label>
                          <div className="flex items-center gap-3 pt-1">
                            <label className="flex items-center gap-1.5 text-xs">
                              <input
                                type="radio"
                                checked={sleepNapAllowed}
                                onChange={() => setSleepNapAllowed(true)}
                              />
                              <span>Yes ({sleepNapMinutes}m)</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs">
                              <input
                                type="radio"
                                checked={!sleepNapAllowed}
                                onChange={() => setSleepNapAllowed(false)}
                              />
                              <span>No</span>
                            </label>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                          <input
                            type="text"
                            value={sleepNotes}
                            onChange={(e) => setSleepNotes(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTaskType === "blood_sugar" && (
                    <div className="space-y-3 pt-2 border-t">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Check Times</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            "fasting",
                            "before_breakfast",
                            "after_breakfast",
                            "before_lunch",
                            "after_lunch",
                            "before_dinner",
                            "bedtime",
                          ].map((t) => {
                            const isChecked = sugarTimes.includes(t);
                            return (
                              <label key={t} className="flex items-center gap-1.5 text-xs">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) setSugarTimes([...sugarTimes, t]);
                                    else setSugarTimes(sugarTimes.filter((x) => x !== t));
                                  }}
                                />
                                <span>{t.replace("_", " ")}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                        <input
                          type="text"
                          value={sugarNotes}
                          onChange={(e) => setSugarNotes(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {selectedTaskType === "blood_pressure" && (
                    <div className="space-y-3 pt-2 border-t">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Check Times</label>
                        <div className="flex items-center gap-4">
                          {["morning", "afternoon", "evening"].map((t) => {
                            const isChecked = bpTimes.includes(t);
                            return (
                              <label key={t} className="flex items-center gap-1.5 text-xs">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) setBpTimes([...bpTimes, t]);
                                    else setBpTimes(bpTimes.filter((x) => x !== t));
                                  }}
                                />
                                <span className="capitalize">{t}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <input
                            type="checkbox"
                            checked={bpRestingReminder}
                            onChange={(e) => setBpRestingReminder(e.target.checked)}
                          />
                          <span>Include "Rest quietly for 5 minutes before measurement" reminder</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                        <input
                          type="text"
                          value={bpNotes}
                          onChange={(e) => setBpNotes(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {selectedTaskType === "hydration" && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Glasses of Water / Day</label>
                          <input
                            type="number"
                            min={1}
                            max={16}
                            value={hydrationGlasses}
                            onChange={(e) => setHydrationGlasses(parseInt(e.target.value, 10) || 7)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Reminder Times</label>
                          <input
                            type="text"
                            value={hydrationReminders}
                            onChange={(e) => setHydrationReminders(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                          <input
                            type="text"
                            value={hydrationNotes}
                            onChange={(e) => setHydrationNotes(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTaskType === "meals" && (
                    <div className="space-y-3 pt-2 border-t">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Meal Times</label>
                        <input
                          type="text"
                          value={mealsTimes}
                          onChange={(e) => setMealsTimes(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Diet Note</label>
                        <input
                          type="text"
                          value={mealsDietNote}
                          onChange={(e) => setMealsDietNote(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {selectedTaskType === "custom" && (
                    <div className="space-y-3 pt-2 border-t">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={customDesc}
                          onChange={(e) => setCustomDesc(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          placeholder="Task instructions and guidelines..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Time</label>
                        <input
                          type="text"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskType(null)}
                      className="px-3 py-1.5 rounded-xl border text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      ← Back to Types
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                    >
                      Save & Assign Task
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REQUIREMENT 2: TASK DETAIL MODAL */}
      {taskDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-teal-800 bg-teal-100 px-2 py-0.5 rounded uppercase">
                  {taskDetailItem.taskType || "TASK"}
                </span>
                <Badge className="text-[10px] uppercase font-bold">{taskDetailItem.priority}</Badge>
              </div>
              <button
                type="button"
                onClick={() => setTaskDetailItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{taskDetailItem.title}</h3>
              {taskDetailItem.description && (
                <p className="text-xs text-slate-600 mt-1">{taskDetailItem.description}</p>
              )}
            </div>

            {/* Structured details display */}
            <div className="rounded-2xl bg-slate-50 border p-3.5 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Today's Status:</span>
                <span
                  className={`font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                    taskDetailItem.isCompleted
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  {taskDetailItem.isCompleted ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      <span>
                        {(taskDetailItem as any).todayStatusLabel ||
                          `Completed by ${(taskDetailItem as any).completedByName || selectedPatient.name} at ${
                            taskDetailItem.completedAt
                              ? new Date(taskDetailItem.completedAt).toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "today"
                          }`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 text-amber-600" />
                      <span>Pending (Patient only)</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Start Date:</span>
                <span className="font-medium">{taskDetailItem.details?.startDate || taskDetailItem.dueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-medium">
                  {taskDetailItem.details?.durationDays === "everyday"
                    ? "Every day until stopped"
                    : `${taskDetailItem.details?.durationDays || 30} days`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned By:</span>
                <span className="font-medium">{taskDetailItem.assignedToName}</span>
              </div>
              {taskDetailItem.assignedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned On:</span>
                  <span className="font-medium">{new Date(taskDetailItem.assignedAt).toLocaleDateString()}</span>
                </div>
              )}
              {taskDetailItem.details?.notes && (
                <div className="pt-2 border-t">
                  <span className="text-slate-500 block mb-0.5">Clinical Notes:</span>
                  <p className="text-slate-800 font-medium">{taskDetailItem.details.notes}</p>
                </div>
              )}
            </div>

            {/* 7-Day Completion History (Today + Past 7 Days) */}
            <div className="rounded-2xl bg-white border p-3 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b">
                <h4 className="text-xs font-bold text-slate-900">7-Day Completion History</h4>
                <span className="text-[10px] text-slate-500 font-medium">Read-only (Patient completions)</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {((taskDetailItem as any).history || []).map((h: any, idx: number) => {
                  const isToday = idx === 0;
                  return (
                    <div
                      key={h.date}
                      className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 text-[11px] border border-slate-100"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">{h.dateFormatted}</span>
                        {isToday && (
                          <span className="text-[9px] uppercase font-black bg-teal-100 text-teal-800 px-1 rounded">
                            Today
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-semibold inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                          h.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : h.status === "NOT_COMPLETED"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {h.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end items-center pt-2">
              <button
                type="button"
                onClick={() => setTaskDetailItem(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN MEDICATION MODAL */}
      {showAssignMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold">Assign Medication</h3>
              <button onClick={() => setShowAssignMedModal(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAssignMedication} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Medication Name</label>
                <input
                  type="text"
                  value={assignMedName}
                  onChange={(e) => setAssignMedName(e.target.value)}
                  placeholder="e.g. Amlodipine"
                  className="w-full rounded border px-3 py-1.5 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Dosage</label>
                <input
                  type="text"
                  value={assignMedDosage}
                  onChange={(e) => setAssignMedDosage(e.target.value)}
                  placeholder="e.g. 5 mg"
                  className="w-full rounded border px-3 py-1.5 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Daily Times (comma-separated)</label>
                <input
                  type="text"
                  value={assignMedTimes}
                  onChange={(e) => setAssignMedTimes(e.target.value)}
                  placeholder="08:00, 20:00"
                  className="w-full rounded border px-3 py-1.5 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Instructions</label>
                <input
                  type="text"
                  value={assignMedInstructions}
                  onChange={(e) => setAssignMedInstructions(e.target.value)}
                  placeholder="Take 1 tablet morning"
                  className="w-full rounded border px-3 py-1.5 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAssignMedModal(false)}
                  className="px-3 py-1 rounded border text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1 rounded bg-teal-700 text-white text-xs font-bold">
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

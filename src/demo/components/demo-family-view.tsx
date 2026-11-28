"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Clock,
  Pill,
  Activity,
  Calendar,
  AlertCircle,
  CheckCircle,
  Phone,
  ChevronRight,
  X,
  AlertTriangle,
  RotateCcw,
  Check,
  ClipboardList,
  FileText,
  Footprints,
  Moon,
  Droplets,
  Utensils,
  HeartPulse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getDemoFamilyProps,
  subscribeToDemoUpdates,
  createSeniorPatientWithRequest,
  cancelCaretakerRequest,
  reassignCaretaker,
  getDemoCaretakersList,
  markFamilyTabRead,
  formatTimeAgo,
  setActiveSeniorPatientId,
} from "../store";

export function DemoFamilyView() {
  const [data, setData] = React.useState(() => getDemoFamilyProps());
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>(
    data.profile?.id || data.managedSeniors[0]?.id || ""
  );

  // Requirement 4: Active tab for caretaker assignments
  const [activeCaretakerTab, setActiveCaretakerTab] = React.useState<"tasks" | "medicines" | "notes">("tasks");

  // Add Patient Modal State
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPreferredName, setNewPreferredName] = React.useState("");
  const [newDob, setNewDob] = React.useState("1952-06-15");
  const [newGender, setNewGender] = React.useState("Female");
  const [newBloodGroup, setNewBloodGroup] = React.useState("B+");
  const [newConditions, setNewConditions] = React.useState("Hypertension, Mild Diabetes");
  const [newAllergies, setNewAllergies] = React.useState("None");
  const [newEmergencyName, setNewEmergencyName] = React.useState("Vikram Sharma");
  const [newEmergencyPhone, setNewEmergencyPhone] = React.useState("+00 0000000001");
  const [newNotes, setNewNotes] = React.useState("");
  const [chosenCaretakerId, setChosenCaretakerId] = React.useState<string>("");
  const [addError, setAddError] = React.useState<string | null>(null);

  // Reassign Caretaker Modal State
  const [reassignPatient, setReassignPatient] = React.useState<{ id: string; name: string; declined: string[] } | null>(null);
  const [reassignCaretakerId, setReassignCaretakerId] = React.useState<string>("");
  const [reassignError, setReassignError] = React.useState<string | null>(null);

  // Success Feedback Banner
  const [feedbackSuccess, setFeedbackSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = subscribeToDemoUpdates(() => {
      setData(getDemoFamilyProps(selectedProfileId));
    });
    return unsub;
  }, [selectedProfileId]);

  // Keep selectedProfileId valid
  React.useEffect(() => {
    if (!data.managedSeniors.some((p) => p.id === selectedProfileId)) {
      if (data.managedSeniors.length > 0) {
        setSelectedProfileId(data.managedSeniors[0].id);
      }
    }
  }, [data.managedSeniors, selectedProfileId]);

  React.useEffect(() => {
    if (selectedProfileId) {
      setActiveSeniorPatientId(selectedProfileId);
    }
  }, [selectedProfileId]);

  const activeSenior =
    data.managedSeniors.find((p) => p.id === selectedProfileId) || data.managedSeniors[0];

  const caretakersList = getDemoCaretakersList();

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newName.trim()) {
      setAddError("Patient full name is required.");
      return;
    }
    if (!newDob) {
      setAddError("Date of birth is required.");
      return;
    }
    if (!chosenCaretakerId) {
      setAddError("Please select a licensed caretaker for this senior patient.");
      return;
    }

    try {
      const { patient, request } = createSeniorPatientWithRequest(
        {
          name: newName.trim(),
          preferredName: newPreferredName.trim() || undefined,
          dateOfBirth: newDob,
          gender: newGender,
          bloodGroup: newBloodGroup,
          medicalConditions: newConditions.split(",").map((s) => s.trim()).filter(Boolean),
          allergies: newAllergies.split(",").map((s) => s.trim()).filter(Boolean),
          emergencyContactName: newEmergencyName,
          emergencyContactPhone: newEmergencyPhone,
          notes: newNotes,
        },
        chosenCaretakerId
      );

      setShowAddModal(false);
      setFeedbackSuccess(
        `Added ${patient.name} (${patient.patientCode})! Care request sent to ${request.caretakerName}.`
      );
      setSelectedProfileId(patient.id);

      // Reset form
      setNewName("");
      setNewPreferredName("");
      setChosenCaretakerId("");
    } catch (err: any) {
      setAddError(err.message || "Failed to create senior patient.");
    }
  };

  const handleCancelRequest = (patientId: string) => {
    const req = data.caretakerRequests.find((r) => r.patientId === patientId && r.status === "PENDING");
    if (!req) return;

    cancelCaretakerRequest(req.id);
    setFeedbackSuccess("Care request cancelled. You can now choose another caretaker.");
  };

  const handleOpenReassignModal = (patient: any) => {
    setReassignPatient({
      id: patient.id,
      name: patient.name,
      declined: patient.declinedCaretakerIds || [],
    });
    setReassignCaretakerId("");
    setReassignError(null);
  };

  const handleReassignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignPatient || !reassignCaretakerId) return;

    const res = reassignCaretaker(reassignPatient.id, reassignCaretakerId);
    if (!res.success) {
      setReassignError(res.error || "Failed to reassign caretaker");
    } else {
      setFeedbackSuccess(`New care request sent for ${reassignPatient.name}.`);
      setReassignPatient(null);
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

  const isUpdatedRecently = (dateStr?: string) => {
    if (!dateStr) return false;
    const diffSec = (Date.now() - new Date(dateStr).getTime()) / 1000;
    return diffSec >= -60 && diffSec < 600; // Within 10 minutes
  };

  return (
    <div className="space-y-6">
      {/* Family Administrator Header */}
      <div className="bg-card border rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">{data.adminUser.name}</h1>
            <Badge className="bg-teal-700 text-white font-bold text-xs">Family Administrator</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Guardian Account: {data.adminUser.email} • Circle of Care Coordinator
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs active:scale-95"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Senior Patient</span>
        </button>
      </div>

      {/* Global Success Notification */}
      {feedbackSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button onClick={() => setFeedbackSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Senior Patients Selector Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Managed Loved Ones ({data.managedSeniors.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.managedSeniors.map((p) => {
            const isSelected = p.id === activeSenior?.id;
            const isApproved = p.approvalStatus === "APPROVED";
            const isPending = p.approvalStatus === "PENDING_APPROVAL";
            const isNoCaretaker = p.approvalStatus === "NO_CARETAKER";

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProfileId(p.id)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? "bg-teal-50/50 border-teal-600 ring-2 ring-teal-600/20 shadow-xs"
                    : "bg-card hover:bg-muted/40 border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-300">
                      {p.patientCode}
                    </span>
                    <h3 className="font-bold text-sm text-foreground">{p.name}</h3>
                  </div>
                  {/* Health Condition Chip (Requirement 3) */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getConditionChip(p.latestCondition)}`}>
                    {p.latestCondition || "Stable"}
                  </span>
                </div>

                {/* Status Badges & Lifecycle Controls */}
                <div className="mt-2 space-y-2">
                  {isApproved && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        <CheckCircle className="h-3 w-3" />
                        Caretaker: {p.caretakerName}
                      </span>
                    </div>
                  )}

                  {isPending && (
                    <div className="flex items-center justify-between gap-2 text-xs bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-1.5 text-amber-800 text-[11px] font-bold">
                        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Awaiting {p.caretakerName} approval</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelRequest(p.id);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {isNoCaretaker && (
                    <div className="flex items-center justify-between gap-2 text-xs bg-rose-50 p-2 rounded-lg border border-rose-200">
                      <div className="flex items-center gap-1.5 text-rose-800 text-[11px] font-bold">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>No caretaker assigned</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReassignModal(p);
                        }}
                        className="px-2.5 py-1 rounded text-[10px] font-bold bg-rose-700 hover:bg-rose-600 text-white shadow-xs"
                      >
                        Choose another
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Patient Details View */}
      {activeSenior && (
        <div className="space-y-6 pt-2">
          {/* Patient Banner */}
          <div className="bg-card border rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-300">
                  {activeSenior.patientCode}
                </span>
                <h2 className="text-xl font-black">{activeSenior.name}</h2>
                <span className="text-xs text-muted-foreground">({activeSenior.preferredName})</span>
                {/* Health Condition Chip (Requirement 3) */}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ml-1 ${getConditionChip(activeSenior.latestCondition || data.latestCondition)}`}>
                  {activeSenior.latestCondition || data.latestCondition || "Stable"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                DOB: {activeSenior.dateOfBirth} • Blood Group: {activeSenior.bloodGroup} • Conditions:{" "}
                {activeSenior.medicalConditions?.join(", ") || "None"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-bold text-muted-foreground block uppercase tracking-wider">
                  Assigned Caretaker
                </span>
                <span className="text-xs font-bold text-foreground">
                  {activeSenior.caretakerName || "Pending Assignment"}
                </span>
              </div>
            </div>
          </div>

          {/* REQUIREMENT 5: TODAY'S MEDICINES CARD AT TOP OF PATIENT VIEW */}
          <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-teal-700" />
                <h3 className="text-sm font-bold text-foreground">Today's Medicines Schedule</h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Live adherence updates when senior marks dose as taken or skipped
              </span>
            </div>

            {!data.todayDoses || data.todayDoses.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                No medications scheduled for today.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.todayDoses.map((dose) => (
                  <div
                    key={dose.id}
                    className="p-3.5 rounded-xl border bg-background flex items-center justify-between gap-3 text-xs shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-foreground text-sm">{dose.medicationName}</div>
                      <div className="text-muted-foreground text-[11px] flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>Scheduled: {dose.scheduledTime}</span>
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

          {/* REQUIREMENT 4: THREE TABS FOR WHAT CARETAKER ASSIGNS */}
          <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Caretaker Assignments for {activeSenior.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Synchronized in real time as the caretaker prescribes medicines, assigns tasks, and updates health conditions.
                </p>
              </div>

              {/* Three Tabs with Unread Markers */}
              <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCaretakerTab("tasks");
                    markFamilyTabRead(activeSenior.id, "tasks");
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeCaretakerTab === "tasks"
                      ? "bg-white text-teal-900 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>Tasks ({data.activePatientTasks?.length || 0})</span>
                  {data.unreadTabs?.tasks && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Unread updates" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveCaretakerTab("medicines");
                    markFamilyTabRead(activeSenior.id, "medications");
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeCaretakerTab === "medicines"
                      ? "bg-white text-teal-900 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Pill className="h-3.5 w-3.5" />
                  <span>Medicines ({data.activePatientMedications?.length || 0})</span>
                  {data.unreadTabs?.medications && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Unread updates" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveCaretakerTab("notes");
                    markFamilyTabRead(activeSenior.id, "notes");
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeCaretakerTab === "notes"
                      ? "bg-white text-teal-900 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Care Notes ({data.activePatientNotes?.length || 0})</span>
                  {data.unreadTabs?.notes && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Unread updates" />
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: Tasks assigned by caretaker */}
            {activeCaretakerTab === "tasks" && (
              <div className="space-y-3">
                {!data.activePatientTasks || data.activePatientTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 bg-muted/20 rounded-xl text-center">
                    No care tasks currently assigned for {activeSenior.name}.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.activePatientTasks.map((t) => {
                      const updatedJustNow = isUpdatedRecently(t.assignedAt);
                      return (
                        <div key={t.id} className="bg-background border rounded-xl p-4 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-black uppercase text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {t.taskType || "TASK"}
                              </span>
                              <h4 className="font-bold text-xs text-foreground">{t.title}</h4>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {updatedJustNow && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-teal-100 text-teal-900 border border-teal-300">
                                  updated just now
                                </span>
                              )}
                              <Badge className="text-[10px] uppercase font-bold">{t.priority}</Badge>
                            </div>
                          </div>

                          {t.description && (
                            <p className="text-xs text-muted-foreground">{t.description}</p>
                          )}

                          {/* Specific Task Details */}
                          {t.details && (
                            <div className="bg-muted/30 p-2.5 rounded-lg text-[11px] space-y-1 text-slate-700">
                              {t.details.activity && (
                                <div>Activity: <strong className="capitalize">{t.details.activity.replace("_", " ")}</strong> ({t.details.durationMinutes || 25} mins, {t.details.intensity || "light"} intensity)</div>
                              )}
                              {t.details.preferredTime && <div>Preferred Time: <strong>{t.details.preferredTime}</strong></div>}
                              {t.details.targetSleepHours && (
                                <div>Sleep Goal: <strong>{t.details.targetSleepHours} hrs</strong> (Bed: {t.details.bedtime}, Wake: {t.details.wakeupTime})</div>
                              )}
                              {t.details.napAllowed && (
                                <div>Nap: Allowed ({t.details.napMinutes || 30} mins)</div>
                              )}
                              {t.details.sugarTimes && (
                                <div>Check Times: <strong>{t.details.sugarTimes.join(", ").replace(/_/g, " ")}</strong></div>
                              )}
                              {t.details.bpTimes && (
                                <div>BP Check: <strong>{t.details.bpTimes.join(", ")}</strong> {t.details.restingReminder ? "(with 5m resting reminder)" : ""}</div>
                              )}
                              {t.details.glassesPerDay && (
                                <div>Water Target: <strong>{t.details.glassesPerDay} glasses</strong> ({t.details.reminderTimes?.join(", ") || "throughout day"})</div>
                              )}
                              {t.details.mealTimes && (
                                <div>Meal Times: <strong>{t.details.mealTimes.join(", ")}</strong></div>
                              )}
                              {t.details.dietNote && <div>Diet Guideline: <em>{t.details.dietNote}</em></div>}
                              {t.details.notes && <div>Clinical Notes: <em>{t.details.notes}</em></div>}
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-muted-foreground pt-2 border-t gap-1">
                            <span>Assigned by: <strong>{t.assignedToName}</strong></span>
                            <span
                              className={`font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                                t.isCompleted
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {t.todayStatusLabel ||
                                (t.isCompleted
                                  ? `Completed by ${t.completedByName || activeSenior.name} at ${
                                      t.completedAt
                                        ? new Date(t.completedAt).toLocaleTimeString([], {
                                            hour: "numeric",
                                            minute: "2-digit",
                                          })
                                        : "today"
                                    }`
                                  : "Pending")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Medicines assigned by caretaker */}
            {activeCaretakerTab === "medicines" && (
              <div className="space-y-3">
                {!data.activePatientMedications || data.activePatientMedications.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 bg-muted/20 rounded-xl text-center">
                    No medications prescribed yet for {activeSenior.name}.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.activePatientMedications.map((m) => {
                      const stock = m.stockCount ?? 30;
                      const isLowStock = stock <= 5;
                      const updatedJustNow = isUpdatedRecently(m.assignedAt);

                      return (
                        <div key={m.id} className="bg-background border rounded-xl p-4 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-foreground">{m.name}</h4>
                              <span className="font-mono text-xs font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {m.dosage}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {updatedJustNow && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-teal-100 text-teal-900 border border-teal-300">
                                  updated just now
                                </span>
                              )}
                              {isLowStock && (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground">{m.instructions}</p>
                          {m.reason && (
                            <p className="text-[11px] text-muted-foreground italic">Reason: {m.reason}</p>
                          )}

                          <div className="bg-muted/30 p-2.5 rounded-lg text-[11px] space-y-0.5 text-slate-700">
                            <div>Form: <strong className="capitalize">{m.form || "tablet"}</strong> • Duration: <strong>{m.durationDays || 30} days</strong></div>
                            <div>Daily Schedule Times: <strong>{m.times?.join(", ")}</strong></div>
                            <div>Remaining Inventory: <strong>{stock} {m.form === "syrup" || m.form === "drops" ? "units" : "tablets"} left</strong></div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                            <span>Prescribed by: <strong>{m.assignedByName}</strong></span>
                            <span>{new Date(m.assignedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Care notes from caretaker */}
            {activeCaretakerTab === "notes" && (
              <div className="space-y-3">
                {!data.activePatientNotes || data.activePatientNotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 bg-muted/20 rounded-xl text-center">
                    No care notes recorded yet for {activeSenior.name}.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.activePatientNotes.map((n) => {
                      const updatedJustNow = isUpdatedRecently(n.createdAt);
                      return (
                        <div key={n.id} className="bg-background border rounded-xl p-4 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {n.overallCondition && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getConditionChip(n.overallCondition)}`}>
                                  {n.overallCondition}
                                </span>
                              )}
                              <h4 className="font-bold text-xs text-foreground">{n.title}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {updatedJustNow && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-teal-100 text-teal-900 border border-teal-300">
                                  updated just now
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(n.createdAt).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
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

                          <div className="text-[10px] text-muted-foreground pt-1 border-t">
                            Author: <strong>{n.authorName}</strong> ({n.authorRole || "Licensed Nurse"})
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Clinical Telemetry Records */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Recent Clinical Telemetry Records
            </h3>

            <div className="bg-card border rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b text-muted-foreground font-semibold">
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5">Blood Sugar</th>
                    <th className="p-2.5">Blood Pressure</th>
                    <th className="p-2.5">Logged By</th>
                    <th className="p-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.vitalsHistory?.slice(0, 8).map((v) => (
                    <tr key={v.id} className="hover:bg-muted/30">
                      <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(v.recordedAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-2.5 font-medium">{v.bloodGlucose ? `${v.bloodGlucose} mg/dL` : "—"}</td>
                      <td className="p-2.5 font-medium">{v.bloodPressure || "—"} mmHg</td>
                      <td className="p-2.5 text-muted-foreground">{v.authorName}</td>
                      <td className="p-2.5 text-muted-foreground">{v.notes || "Routine observation"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD SENIOR PATIENT MODAL WITH REQUIRED CARETAKER SELECTION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border-2 border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add New Senior Patient</h3>
                <p className="text-xs text-slate-500">
                  Every patient receives an automatic sequential ID. Select an available verified caretaker to assign.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div className="rounded-xl bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800 font-bold flex items-center gap-2 mt-3 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddPatient} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-1">
              {/* Senior Patient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meenakshi Ramanathan"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Preferred / Calling Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amma"
                    value={newPreferredName}
                    onChange={(e) => setNewPreferredName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Blood Group
                  </label>
                  <select
                    value={newBloodGroup}
                    onChange={(e) => setNewBloodGroup(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={newEmergencyPhone}
                    onChange={(e) => setNewEmergencyPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Medical Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Medical Conditions (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newConditions}
                    onChange={(e) => setNewConditions(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Allergies (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newAllergies}
                    onChange={(e) => setNewAllergies(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* REQUIRED CARETAKER SELECTION */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Select Licensed Caretaker * (Required)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Max 5 patients per caretaker capacity enforced
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {caretakersList.map((c) => {
                    const isSelected = chosenCaretakerId === c.user.id;
                    const isFull = c.isFull;

                    return (
                      <div
                        key={c.user.id}
                        onClick={() => !isFull && setChosenCaretakerId(c.user.id)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isFull
                            ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "bg-teal-50 border-teal-600 ring-2 ring-teal-600/20 cursor-pointer shadow-xs"
                            : "bg-white hover:bg-slate-50 border-slate-200 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="caretakerSelection"
                            checked={isSelected}
                            disabled={isFull}
                            onChange={() => setChosenCaretakerId(c.user.id)}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs text-slate-900">{c.user.name}</h4>
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                {c.profile.qualification}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {c.profile.specialization} • {c.profile.yearsOfExperience} yrs exp
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFull
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            }`}
                          >
                            {isFull ? "Fully Booked (5/5)" : `${c.assignedCount}/5 Patients (${c.freeSlots} slot${c.freeSlots > 1 ? "s" : ""} left)`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!chosenCaretakerId}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  Add Patient & Send Care Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN CARETAKER MODAL */}
      {reassignPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border-2 border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="text-base font-black text-slate-900">Choose Available Caretaker</h3>
                <p className="text-xs text-slate-500">
                  Select a new caretaker for <strong>{reassignPatient.name}</strong>. Previously declined caretakers are disabled.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReassignPatient(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reassignError && (
              <div className="rounded-xl bg-rose-50 border border-rose-300 p-2.5 text-xs text-rose-800 font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{reassignError}</span>
              </div>
            )}

            <form onSubmit={handleReassignSubmit} className="space-y-3">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {caretakersList.map((c) => {
                  const wasDeclined = reassignPatient.declined?.includes(c.user.id);
                  const isFull = c.isFull;
                  const isDisabled = wasDeclined || isFull;
                  const isSelected = reassignCaretakerId === c.user.id;

                  return (
                    <div
                      key={c.user.id}
                      onClick={() => !isDisabled && setReassignCaretakerId(c.user.id)}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isDisabled
                          ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "bg-teal-50 border-teal-600 ring-2 ring-teal-600/20 cursor-pointer shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-200 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="reassignSelection"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => setReassignCaretakerId(c.user.id)}
                          className="h-4 w-4 text-teal-600"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{c.user.name}</h4>
                          <p className="text-[11px] text-slate-500">
                            {c.profile.qualification} • {c.profile.specialization}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {wasDeclined ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                            Previously Declined
                          </span>
                        ) : isFull ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Fully Booked (5/5)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {c.freeSlots} slot{c.freeSlots > 1 ? "s" : ""} free
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setReassignPatient(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reassignCaretakerId}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
                >
                  Send Care Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
  Edit3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeniorHealthMonitor } from "@/components/senior/senior-health-monitor";
import {
  updateMedicationStock,
  formatTimeAgo,
  confirmDemoDose,
  skipDemoDose,
  completeTaskBySenior,
  getDemoSeniorProps,
  subscribeToDemoUpdates,
} from "../store";

export function DemoSeniorView() {
  const [data, setData] = React.useState(() => getDemoSeniorProps());
  const [activeTab, setActiveTab] = React.useState<"overview" | "medicines" | "vitals" | "appointments" | "emergency">("overview");

  // Stock edit modal state
  const [editingMed, setEditingMed] = React.useState<{ id: string; name: string; currentStock: number } | null>(null);
  const [stockInput, setStockInput] = React.useState<string>("");
  const [stockError, setStockError] = React.useState<string | null>(null);
  const [stockSuccess, setStockSuccess] = React.useState<string | null>(null);

  // Dose action banner
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Subscribe to demo store updates
  React.useEffect(() => {
    const unsub = subscribeToDemoUpdates(() => {
      setData(getDemoSeniorProps());
    });
    return unsub;
  }, []);

  const {
    initialProfile,
    initialDoses,
    allMedications,
    upcomingAppointments,
    initialMeasurements,
    caretaker,
    tasks = [],
  } = data as any;

  const handleCompleteTask = (taskId: string) => {
    const res = completeTaskBySenior(taskId);
    if (res.success) {
      setActionSuccess("Task marked as completed!");
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleOpenStockModal = (med: { id: string; name: string; stockCount?: number }) => {
    setEditingMed({
      id: med.id,
      name: med.name,
      currentStock: med.stockCount ?? 30,
    });
    setStockInput(String(med.stockCount ?? 30));
    setStockError(null);
  };

  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMed) return;

    const val = parseInt(stockInput.trim(), 10);
    if (isNaN(val) || val < 0 || val > 999) {
      setStockError("Please enter a valid stock between 0 and 999 units.");
      return;
    }

    updateMedicationStock(editingMed.id, val, "patient");
    setEditingMed(null);
    setStockSuccess(`Stock for ${editingMed.name} updated to ${val} units (Updated just now).`);
    setTimeout(() => setStockSuccess(null), 4000);
  };

  const handleConfirmDose = (doseId: string) => {
    confirmDemoDose(doseId, "Confirmed by patient in Senior Mode", "patient");
    setActionSuccess("Dose marked as taken!");
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleSkipDose = (doseId: string) => {
    skipDemoDose(doseId, "Skipped by patient");
    setActionSuccess("Dose marked as skipped.");
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const takenCount = initialDoses.filter((d: { status: string }) => d.status === "TAKEN").length;
  const pendingCount = initialDoses.filter((d: { status: string }) => d.status === "SCHEDULED").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Banner with Patient ID */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-3xl bg-teal-800 p-6 sm:p-8 text-white shadow-xl gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-teal-700/90 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-100">
                Senior Friendly Mode Active
              </span>
              <span className="rounded-lg bg-teal-950 px-2.5 py-1 text-xs font-mono font-black text-amber-300 border border-teal-600/40">
                {initialProfile.patientCode}
              </span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
              Hello, {initialProfile.preferredName || initialProfile.name}
            </h1>
            <p className="mt-1 text-base font-semibold text-teal-100">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <div className="flex items-center space-x-2 mt-2 text-xs text-teal-200">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <span>Assigned Caretaker: {caretaker?.name}</span>
            </div>
          </div>
        </div>

        {/* Notifications / Success Banners */}
        {actionSuccess && (
          <div className="rounded-2xl bg-emerald-600 text-white p-4 font-bold flex items-center justify-between shadow-md">
            <span>✓ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-white hover:text-emerald-200">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {stockSuccess && (
          <div className="rounded-2xl bg-teal-700 text-white p-4 font-bold flex items-center justify-between shadow-md">
            <span>✓ {stockSuccess}</span>
            <button onClick={() => setStockSuccess(null)} className="text-white hover:text-teal-200">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Big Touch Navigation Tabs */}
        <nav className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300 shadow-xs">
          {[
            { id: "overview", label: "Today's Schedule", icon: Clock },
            { id: "medicines", label: "All Medicines", icon: Pill },
            { id: "vitals", label: "Health & Vitals", icon: Activity },
            { id: "appointments", label: "Appointments", icon: Calendar },
            { id: "emergency", label: "Emergency", icon: Phone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[120px] rounded-xl py-3 px-4 text-sm font-black transition-all flex items-center justify-center space-x-2 ${
                  isActive
                    ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Confirmed Today</span>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-teal-700">{takenCount}</span>
                  <span className="text-sm font-bold text-slate-600">doses taken</span>
                </div>
              </div>

              <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Remaining Today</span>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-amber-700">{pendingCount}</span>
                  <span className="text-sm font-bold text-slate-600">doses remaining</span>
                </div>
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Today&apos;s Medication Schedule</h2>
              {initialDoses.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
                  <p className="text-lg font-bold text-slate-600">No medications scheduled for today.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {initialDoses.map((dose: any) => {
                    const isTaken = dose.status === "TAKEN";
                    const isSkipped = dose.status === "SKIPPED";
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
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 pt-2">{dose.medication.name}</h3>
                            <p className="text-base font-bold text-teal-800">
                              {dose.medication.strength} • {dose.medication.form}
                            </p>
                            <p className="text-sm text-slate-700 font-medium">{dose.medication.dosageInstructions}</p>
                            {dose.medication.reason && (
                              <p className="text-xs text-slate-500 italic">Purpose: {dose.medication.reason}</p>
                            )}
                          </div>

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
                                  onClick={() => handleConfirmDose(dose.id)}
                                  className="rounded-2xl bg-teal-700 hover:bg-teal-600 text-white px-6 py-3.5 text-base font-black shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center space-x-2"
                                >
                                  <Check className="h-5 w-5 stroke-3" />
                                  <span>Take Medicine</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSkipDose(dose.id)}
                                  className="rounded-2xl border-2 border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-3 text-sm font-bold transition-all"
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

            {/* TODAY'S TASKS & ACTIVITIES (Requirement 2) */}
            <section className="space-y-4 pt-4 border-t-2 border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Today&apos;s Tasks &amp; Activities</h2>
                  <p className="text-sm font-bold text-slate-600">Assigned by your licensed nurse for healthy daily routine.</p>
                </div>
                <Badge className="bg-teal-100 text-teal-900 border-teal-300 text-xs px-3 py-1 font-bold w-fit">
                  {tasks.filter((t: any) => t.isCompletedToday).length} / {tasks.length} Done
                </Badge>
              </div>

              {tasks.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
                  <p className="text-lg font-bold text-slate-600">No care tasks scheduled for today.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task: any) => {
                    const isDone = task.isCompletedToday;
                    return (
                      <div
                        key={task.id}
                        className={`rounded-3xl border-3 p-6 transition-all shadow-sm ${
                          isDone
                            ? "border-emerald-300 bg-emerald-50/70"
                            : "border-slate-300 bg-white hover:border-teal-500"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-lg bg-teal-900 px-3 py-1 text-xs font-extrabold text-teal-100 uppercase tracking-wider">
                                {task.taskType ? task.taskType.replace("_", " ") : "DAILY TASK"}
                              </span>
                              {isDone ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs px-2.5 py-0.5 font-bold">
                                  ✓ Completed
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-2.5 py-0.5 font-bold">
                                  Pending
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-2xl font-black text-slate-900">{task.title}</h3>
                            {task.description && (
                              <p className="text-base font-bold text-slate-700">{task.description}</p>
                            )}

                            {/* Formatted clinical details */}
                            <div className="text-sm text-slate-600 font-semibold space-y-1 pt-1">
                              {task.details?.durationMinutes && (
                                <p>• Duration: <strong>{task.details.durationMinutes} minutes</strong></p>
                              )}
                              {task.details?.preferredTime && (
                                <p>• Scheduled Time: <strong>{task.details.preferredTime}</strong></p>
                              )}
                              {task.details?.bedtime && (
                                <p>• Sleep Goal: <strong>{task.details.targetSleepHours || 8} hours</strong> by {task.details.bedtime}</p>
                              )}
                              {task.details?.sugarTimes && (
                                <p>• Sugar Check Times: <strong>{task.details.sugarTimes.join(", ")}</strong></p>
                              )}
                              {task.details?.bpTimes && (
                                <p>• BP Check Times: <strong>{task.details.bpTimes.join(", ")}</strong></p>
                              )}
                              {task.details?.glassesPerDay && (
                                <p>• Water Target: <strong>{task.details.glassesPerDay} glasses</strong> throughout the day</p>
                              )}
                              {task.details?.notes && (
                                <p className="italic text-slate-500">• Note: {task.details.notes}</p>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 font-bold pt-1">
                              Assigned by: <span className="text-teal-900 font-black">{task.assignedToName}</span>
                            </p>
                          </div>

                          {/* Completion button or status badge */}
                          <div className="sm:self-center shrink-0">
                            {isDone ? (
                              <div className="flex items-center space-x-2 text-emerald-900 font-extrabold text-sm bg-emerald-100 rounded-2xl px-5 py-3.5 border-2 border-emerald-400">
                                <Check className="h-5 w-5 stroke-3 text-emerald-700" />
                                <div>
                                  <div className="text-xs uppercase tracking-wider text-emerald-800">Done</div>
                                  <div className="text-[11px] font-bold text-emerald-700">
                                    {task.todayStatusLabel ||
                                      `Completed by you at ${
                                        task.completedAt
                                          ? new Date(task.completedAt).toLocaleTimeString([], {
                                              hour: "numeric",
                                              minute: "2-digit",
                                            })
                                          : "today"
                                      }`}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCompleteTask(task.id)}
                                className="rounded-2xl bg-teal-700 hover:bg-teal-600 text-white px-7 py-4 text-base font-black shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center space-x-2"
                              >
                                <Check className="h-6 w-6 stroke-3" />
                                <span>Mark as Completed</span>
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

        {/* TAB 2: ALL MEDICINES (WITH STOCK UPDATE) */}
        {activeTab === "medicines" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">All Prescribed Medicines</h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Prescriptions assigned by your authorized caretaker. You can update your remaining pill stock directly below.
              </p>
            </div>

            <div className="space-y-4">
              {allMedications.map((med: any) => {
                const stock = med.stockCount ?? 30;
                const isLowStock = stock <= 5;
                const updatedTimeStr = med.stockUpdatedAt ? formatTimeAgo(med.stockUpdatedAt) : null;

                return (
                  <div key={med.id} className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-slate-900">{med.name}</h3>
                          {isLowStock && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs px-2 py-0.5 font-bold">
                              ⚠️ Low Stock
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-bold text-teal-800">
                          {med.strength} • {med.form}
                        </p>
                        <p className="text-xs text-slate-600">{med.dosageInstructions}</p>
                        {med.reason && (
                          <p className="text-xs text-slate-500 italic">Prescribed for: {med.reason}</p>
                        )}
                      </div>

                      {/* Stock Details & Update Button */}
                      <div className="flex flex-col sm:items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="text-left sm:text-right">
                            <span className="text-xs text-slate-500 block font-semibold">Remaining Stock</span>
                            <span className="text-lg font-black text-slate-800">
                              {stock} {med.form === "SYRUP" || med.form === "DROPS" ? "units" : "tablets"}
                            </span>
                            {updatedTimeStr && (
                              <span className="text-[10px] text-teal-700 block font-medium">
                                Updated {updatedTimeStr} {med.stockUpdatedBy ? `by ${med.stockUpdatedBy}` : ""}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenStockModal(med)}
                            className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Update stock</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 3: HEALTH & VITALS */}
        {activeTab === "vitals" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Your Health Vitals</h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Self-log capillary blood sugar and blood pressure, or view historical records monitored by your caretaker.
              </p>
            </div>
            <SeniorHealthMonitor
              profileId={initialProfile.id}
              patientName={initialProfile.name}
              initialMeasurements={initialMeasurements}
              caretaker={caretaker}
            />
          </section>
        )}

        {/* TAB 4: APPOINTMENTS */}
        {activeTab === "appointments" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Upcoming Appointments</h2>
              <p className="text-sm font-medium text-slate-600 mt-1">Medical visits scheduled with your doctors.</p>
            </div>

            <div className="space-y-4">
              {upcomingAppointments.map((appt: any) => (
                <div key={appt.id} className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="inline-flex items-center rounded-lg bg-teal-100 text-teal-800 px-3 py-1 text-xs font-black">
                      {new Date(appt.appointmentDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-sm font-bold text-slate-500">
                      {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{appt.title}</h3>
                  <p className="text-sm font-bold text-teal-800 mt-1">{appt.doctorName} • {appt.clinicName}</p>
                  {appt.notes && <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl">{appt.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 5: EMERGENCY CONTACT */}
        {activeTab === "emergency" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-rose-900 tracking-tight">Emergency Assistance</h2>
              <p className="text-sm font-medium text-slate-600 mt-1">One-tap contacts for immediate help.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-3xl border-3 border-rose-300 bg-rose-50 p-6 space-y-4">
                <span className="text-xs font-black text-rose-700 uppercase tracking-wider">Primary Family Contact</span>
                <h3 className="text-2xl font-black text-slate-900">{initialProfile.emergencyContactName}</h3>
                <p className="text-lg font-mono font-bold text-slate-700">{initialProfile.emergencyContactPhone}</p>
                <a
                  href={`tel:${initialProfile.emergencyContactPhone}`}
                  className="inline-flex items-center justify-center w-full rounded-2xl bg-rose-600 hover:bg-rose-700 text-white py-4 font-black text-base shadow-md transition-all"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Call Family Coordinator
                </a>
              </div>

              <div className="rounded-3xl border-3 border-teal-300 bg-teal-50 p-6 space-y-4">
                <span className="text-xs font-black text-teal-700 uppercase tracking-wider">Assigned Caretaker</span>
                <h3 className="text-2xl font-black text-slate-900">{caretaker?.name || "Sister Anjali Nair"}</h3>
                <p className="text-lg font-mono font-bold text-slate-700">{caretaker?.phone || "+00 0000000000"}</p>
                <a
                  href={`tel:${caretaker?.phone || "+00 0000000000"}`}
                  className="inline-flex items-center justify-center w-full rounded-2xl bg-teal-700 hover:bg-teal-800 text-white py-4 font-black text-base shadow-md transition-all"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Call Caretaker
                </a>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* UPDATE STOCK MODAL (0 - 999 units, validation, Save/Cancel) */}
      {editingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border-2 border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-lg font-black text-slate-900">Update Medicine Stock</h3>
              <button
                type="button"
                onClick={() => setEditingMed(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Medicine Name
                </label>
                <p className="text-base font-bold text-slate-900">{editingMed.name}</p>
              </div>

              <div>
                <label htmlFor="stockCountInput" className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Remaining Count (0 - 999 tablets/units)
                </label>
                <input
                  id="stockCountInput"
                  type="number"
                  min="0"
                  max="999"
                  value={stockInput}
                  onChange={(e) => {
                    setStockInput(e.target.value);
                    setStockError(null);
                  }}
                  className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-2xl font-black text-slate-900 focus:border-teal-600 focus:outline-hidden"
                  autoFocus
                />
                {stockError && <p className="text-xs font-bold text-rose-600 mt-1">{stockError}</p>}
                <p className="text-[11px] text-slate-500 mt-1">
                  This update will immediately sync with your caretaker and family administrator.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingMed(null)}
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-sm font-black shadow-md transition-all active:scale-95"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

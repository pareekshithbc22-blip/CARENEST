"use client";

import * as React from "react";
import { Check, Clock, Phone, AlertCircle, Calendar, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DoseItem {
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
  upcomingAppointments: Array<{
    id: string;
    title: string;
    doctorName: string;
    clinicName: string;
    appointmentDate: string;
  }>;
}

export function SeniorDashboardClient({
  initialProfile,
  initialDoses,
  upcomingAppointments,
}: SeniorDashboardClientProps) {
  const [doses, setDoses] = React.useState<DoseItem[]>(initialDoses);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null);

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
        setSuccessBanner(`Great job! You confirmed taking your ${medName}.`);
        setTimeout(() => setSuccessBanner(null), 6000,);
      }
    } catch {
      alert("Unable to confirm dose right now. Please notify your caregiver.");
    } finally {
      setConfirmingId(null);
    }
  };

  const takenCount = doses.filter((d) => d.status === "TAKEN").length;
  const pendingCount = doses.filter((d) => d.status === "SCHEDULED" || d.status === "UNCONFIRMED").length;

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Senior Mode Accessibility Banner */}
        <div className="flex items-center justify-between rounded-2xl bg-teal-800 p-6 text-white shadow-lg">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-md bg-teal-700/80 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-teal-100">
                Senior Friendly Mode Active
              </span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Hello, {initialProfile.preferredName || initialProfile.name}
            </h1>
            <p className="mt-1 text-lg font-medium text-teal-100">{todayFormatted}</p>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center space-x-2 text-sm font-semibold bg-teal-900/60 rounded-xl px-4 py-2 border border-teal-600/40">
              <ShieldCheck className="h-5 w-5 text-teal-300" />
              <span>Care Circle Connected</span>
            </div>
          </div>
        </div>

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

        {/* Daily Summary Status Bar */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-sm font-bold text-slate-500 uppercase">Completed Today</span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-4xl font-black text-teal-700">{takenCount}</span>
              <span className="text-lg font-semibold text-slate-600">doses confirmed</span>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-sm font-bold text-slate-500 uppercase">Upcoming Today</span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-4xl font-black text-amber-700">{pendingCount}</span>
              <span className="text-lg font-semibold text-slate-600">doses remaining</span>
            </div>
          </div>
        </div>

        {/* Today's Medications List */}
        <section aria-labelledby="medication-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="medication-heading" className="text-2xl font-black text-slate-900 tracking-tight">
              Today&apos;s Medicine Schedule
            </h2>
            <span className="text-sm font-bold text-slate-500">Tap the large button when taken</span>
          </div>

          {doses.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-xl font-bold text-slate-600">No medications scheduled for today.</p>
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
                      {/* Medicine Info */}
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

                        {dose.medication.purpose && (
                          <p className="text-xs font-semibold text-slate-500">
                            Prescribed for: {dose.medication.purpose}
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
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
                            aria-label={`Confirm taking ${dose.medication.name} ${dose.medication.strength}`}
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

        {/* Upcoming Appointments Section */}
        {upcomingAppointments.length > 0 && (
          <section aria-labelledby="appointments-heading" className="pt-4">
            <h2 id="appointments-heading" className="text-2xl font-black text-slate-900 mb-4">
              Upcoming Doctor Appointments
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs"
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
                  <h3 className="text-lg font-extrabold text-slate-900 mt-2">{appt.title}</h3>
                  <p className="text-sm font-semibold text-slate-600">{appt.doctorName}</p>
                  <p className="text-xs text-slate-500 mt-1">{appt.clinicName}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Emergency Contact & Family Dial Card */}
        <section
          id="emergency"
          aria-labelledby="emergency-heading"
          className="rounded-2xl border-3 border-rose-300 bg-rose-50/80 p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-rose-800 font-extrabold uppercase text-sm tracking-wider">
                <AlertCircle className="h-5 w-5" />
                <span>Family & Emergency Support</span>
              </div>
              <h2 id="emergency-heading" className="text-2xl font-black text-slate-900 mt-1">
                {initialProfile.emergencyContactName}
              </h2>
              <p className="text-base font-semibold text-slate-700 mt-0.5">
                Primary Circle Coordinator • Call anytime if you feel unwell
              </p>
            </div>

            <a
              href={`tel:${initialProfile.emergencyContactPhone}`}
              className="inline-flex h-14 items-center justify-center space-x-3 rounded-2xl bg-rose-700 px-8 text-lg font-extrabold text-white hover:bg-rose-800 active:scale-95 shadow-md transition-all text-center"
            >
              <Phone className="h-6 w-6 stroke-3" />
              <span>Call {initialProfile.emergencyContactPhone}</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

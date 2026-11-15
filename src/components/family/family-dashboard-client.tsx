"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  Calendar,
  Users,
  Activity,
  AlertTriangle,
  Clock,
  Plus,
  TrendingUp,
  Trash2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AnalyticsCharts } from "./analytics-charts";
import { AddMedicationModal } from "./add-medication-modal";
import { AddAppointmentModal } from "./add-appointment-modal";
import { InviteMemberModal } from "./invite-member-modal";
import { AddElderlyProfileModal } from "./add-elderly-profile-modal";
import { UserPlus } from "lucide-react";

interface FamilyDashboardClientProps {
  profile: any;
  availableProfiles: Array<{ id: string; name: string; preferredName?: string | null }>;
  analytics: any;
  refillEstimates: any[];
  timeline: any[];
  currentUserId: string;
}

export function FamilyDashboardClient({
  profile,
  availableProfiles,
  analytics,
  refillEstimates,
  timeline,
  currentUserId,
}: FamilyDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"overview" | "medications" | "appointments" | "circle" | "timeline" | "analytics">("overview");

  // Modals state
  const [showAddMedModal, setShowAddMedModal] = React.useState(false);
  const [showAddApptModal, setShowAddApptModal] = React.useState(false);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = React.useState(false);

  // Background escalation trigger
  const [isEscalating, setIsEscalating] = React.useState(false);
  const [escalationFeedback, setEscalationFeedback] = React.useState<string | null>(null);

  // Today's Doses
  const [doses, setDoses] = React.useState<any[]>([]);
  const [loadingDoses, setLoadingDoses] = React.useState(true);

  // Fetch today's doses
  const loadDoses = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/doses?profileId=${profile.id}&filter=today`);
      if (res.ok) {
        const data = await res.json();
        setDoses(data.doses || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDoses(false);
    }
  }, [profile.id]);

  React.useEffect(() => {
    loadDoses();
  }, [loadDoses]);

  // Quick dose confirmation from family portal
  const handleConfirmDose = async (doseId: string) => {
    try {
      const res = await fetch(`/api/doses/${doseId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationNotes: "Confirmed via Family Coordinator Portal" }),
      });
      if (res.ok) {
        loadDoses();
      }
    } catch {
      alert("Failed to confirm dose");
    }
  };

  // Run escalation engine manually (for evaluation & demonstration)
  const handleRunEscalationEngine = async () => {
    setIsEscalating(true);
    setEscalationFeedback(null);
    try {
      const res = await fetch("/api/scheduler/process-escalations", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        const s = data.summary;
        setEscalationFeedback(
          `Escalation processed: Checked ${s.processedDoses} doses. Tier 1 alerts: ${s.tier1CaretakerAlerts}. Tier 2 family alerts: ${s.tier2FamilyEscalations}.`
        );
        loadDoses();
      } else {
        setEscalationFeedback(`Escalation notice: ${data.error}`);
      }
    } catch (err: any) {
      setEscalationFeedback(`Escalation test error: ${err.message}`);
    } finally {
      setIsEscalating(false);
    }
  };

  // Handle member revocation
  const handleRevokeMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to revoke this member's access to the Care Circle?")) return;
    const circleId = profile.careCircles[0]?.id;
    if (!circleId) return;

    try {
      const res = await fetch(`/api/care-circles/${circleId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Member access revoked successfully.");
        window.location.reload();
      }
    } catch {
      alert("Failed to revoke member.");
    }
  };

  // Handle medication discontinuation
  const handleDiscontinueMed = async (medId: string, medName: string) => {
    const reason = prompt(`Reason for discontinuing ${medName}:`, "Prescription updated by physician");
    if (!reason) return;

    try {
      const res = await fetch(`/api/medications/${medId}?reason=${encodeURIComponent(reason)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Medication discontinued and safely archived.");
        window.location.reload();
      }
    } catch {
      alert("Failed to discontinue medication.");
    }
  };

  const careCircle = profile.careCircles[0];
  const members = careCircle?.members || [];
  const medications = profile.medications || [];
  const appointments = profile.appointments || [];

  const attentionDoses = doses.filter((d) => d.status === "MISSED" || d.status === "UNCONFIRMED");
  const takenDosesCount = doses.filter((d) => d.status === "TAKEN").length;
  const lowStockMeds = refillEstimates.filter((r) => r.isLowStock);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 pb-16">
      {/* Top Profile Header */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-teal-100 ring-4 ring-teal-50 dark:bg-teal-900/40">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-teal-800 text-xl">
                    {profile.name[0]}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {profile.name}
                  </h1>
                  {profile.preferredName && (
                    <span className="text-sm font-medium text-slate-500">
                      (&quot;{profile.preferredName}&quot;)
                    </span>
                  )}
                  {profile.isSeniorModeActive && (
                    <Badge variant="outline" className="text-xs bg-teal-50 text-teal-800 border-teal-200">
                      Senior Mode Enabled
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Blood Group: <strong className="text-slate-700 dark:text-slate-300">{profile.bloodGroup || "A+"}</strong> • Emergency Contact:{" "}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {profile.emergencyContactName} ({profile.emergencyContactPhone})
                  </strong>
                </p>
                {profile.allergies?.length > 0 && (
                  <div className="flex items-center space-x-1.5 mt-1.5">
                    <span className="text-[11px] font-semibold text-rose-700">Allergies:</span>
                    {profile.allergies.map((a: string) => (
                      <span key={a} className="inline-block rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 border border-rose-200">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {availableProfiles && availableProfiles.length > 1 && (
                <div className="flex items-center space-x-1.5 mr-1">
                  <span className="text-xs font-semibold text-slate-500">Loved One:</span>
                  <select
                    value={profile.id}
                    onChange={(e) => {
                      router.push(`/dashboard/family?profileId=${e.target.value}`);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:outline-teal-600"
                  >
                    {availableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.preferredName ? `("${p.preferredName}")` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddProfileModal(true)}
                className="text-xs border-teal-300 text-teal-800 hover:bg-teal-50"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunEscalationEngine}
                disabled={isEscalating}
                className="text-xs border-amber-300 text-amber-900 hover:bg-amber-50"
                title="Run the missed-dose escalation evaluation engine on demand"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                {isEscalating ? "Running Engine..." : "Run Escalation Check"}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddMedModal(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Medication
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddApptModal(true)}
                className="text-xs font-semibold"
              >
                <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule Visit
              </Button>
            </div>
          </div>

          {/* Escalation Test Banner if triggered */}
          {escalationFeedback && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-semibold text-amber-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{escalationFeedback}</span>
              </div>
              <button
                onClick={() => setEscalationFeedback(null)}
                className="text-amber-700 hover:text-amber-900 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex space-x-1 sm:space-x-4 border-t border-slate-100 dark:border-slate-800 mt-6 pt-3 overflow-x-auto">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "medications", label: `Medications (${medications.length})`, icon: Pill },
              { id: "appointments", label: `Appointments (${appointments.length})`, icon: Calendar },
              { id: "circle", label: `Care Circle (${members.length})`, icon: Users },
              { id: "timeline", label: "Healthcare Timeline", icon: Clock },
              { id: "analytics", label: "Adherence Analytics", icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Attention Banner if unconfirmed doses exist */}
            {attentionDoses.length > 0 && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 shadow-xs">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-900">
                      Attention Required: {attentionDoses.length} Dose(s) Pending Confirmation
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      The scheduled grace period has elapsed. Notifications have been dispatched to assigned caretakers.
                    </p>
                    <div className="mt-3 divide-y divide-amber-200/60">
                      {attentionDoses.map((d) => (
                        <div key={d.id} className="pt-2 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-amber-950">
                              {d.medication.name} ({d.medication.strength})
                            </span>
                            <span className="text-xs text-amber-700 ml-2">
                              Scheduled for {new Date(d.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <Button
                            size="xs"
                            onClick={() => handleConfirmDose(d.id)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                          >
                            Confirm Dose Administered
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Metrics 4-Grid */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader className="p-4 pb-1">
                  <CardDescription className="text-xs font-semibold">14-Day Adherence</CardDescription>
                  <CardTitle className="text-2xl font-black text-teal-700 dark:text-teal-400">
                    {analytics?.adherencePercentage || 100}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <span className="text-[11px] text-slate-500">Calculated from actual dose records</span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-1">
                  <CardDescription className="text-xs font-semibold">Today&apos;s Doses</CardDescription>
                  <CardTitle className="text-2xl font-black text-slate-900 dark:text-white">
                    {takenDosesCount} / {doses.length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <span className="text-[11px] text-slate-500">
                    {doses.length - takenDosesCount} remaining today
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-1">
                  <CardDescription className="text-xs font-semibold">Upcoming Visits</CardDescription>
                  <CardTitle className="text-2xl font-black text-slate-900 dark:text-white">
                    {appointments.filter((a: any) => a.status === "UPCOMING").length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <span className="text-[11px] text-slate-500">Consultations scheduled</span>
                </CardContent>
              </Card>

              <Card className={lowStockMeds.length > 0 ? "border-rose-200 bg-rose-50/40" : ""}>
                <CardHeader className="p-4 pb-1">
                  <CardDescription className="text-xs font-semibold">Low Stock Refills</CardDescription>
                  <CardTitle className={`text-2xl font-black ${lowStockMeds.length > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {lowStockMeds.length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <span className="text-[11px] text-slate-500">
                    {lowStockMeds.length > 0 ? "Refills needed soon" : "All inventories adequate"}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Today's Schedule & Refill Warnings split view */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left 2 Cols: Today's Dose Administration */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Today&apos;s Medication Schedule
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">Real-time status updates</span>
                </div>

                {loadingDoses ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Loading schedule...</p>
                ) : doses.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                    No medications scheduled for today.
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
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs ${
                              isTaken ? "bg-emerald-100 text-emerald-800" : isMissed ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                            }`}>
                              {timeStr}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                  {dose.medication.name}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {dose.medication.strength}
                                </Badge>
                                {isTaken && <Badge variant="success">Confirmed Taken</Badge>}
                                {isMissed && <Badge variant="warning">Unconfirmed</Badge>}
                                {dose.status === "SCHEDULED" && <Badge variant="secondary">Upcoming</Badge>}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {dose.medication.dosageInstructions}
                              </p>
                              {dose.confirmedBy && (
                                <p className="text-[10px] text-teal-700 dark:text-teal-400 mt-0.5">
                                  Confirmed by {dose.confirmedBy.name} at {new Date(dose.confirmedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              )}
                            </div>
                          </div>

                          {!isTaken && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleConfirmDose(dose.id)}
                              className="text-xs font-semibold"
                            >
                              Confirm
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Col: Refill Estimation Projections */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Refill Countdown
                  </h2>
                  <span className="text-[11px] text-slate-400">Advisory estimate</span>
                </div>

                <div className="space-y-3">
                  {refillEstimates.map((refill) => (
                    <div
                      key={refill.medicationId}
                      className={`rounded-xl border p-4 shadow-2xs ${
                        refill.isLowStock
                          ? "border-rose-300 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {refill.medicationName}
                        </span>
                        {refill.isLowStock ? (
                          <Badge variant="urgent" className="text-[10px]">Low Supply</Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">Adequate</Badge>
                        )}
                      </div>

                      <div className="mt-2 flex items-baseline justify-between text-xs">
                        <span className="text-slate-500">Remaining Inventory:</span>
                        <strong className="text-slate-900 dark:text-white font-extrabold">
                          {refill.currentStock} {refill.unit}
                        </strong>
                      </div>

                      <div className="flex items-baseline justify-between text-xs mt-1">
                        <span className="text-slate-500">Est. Depletion Date:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {refill.estimatedDepletionDate || "N/A"} ({refill.daysRemaining} days left)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MEDICATIONS */}
        {/* ======================================================== */}
        {activeTab === "medications" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Active Prescriptions & Regimens
                </h2>
                <p className="text-xs text-slate-500">
                  Comprehensive medication schedule, prescribing physician data, and inventory thresholds.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddMedModal(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Medication
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {medications.map((med: any) => (
                <Card key={med.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                          {med.name} {med.strength}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {med.brandName ? `Brand: ${med.brandName}` : med.form} • Rx: {med.rxNumber || "On file"}
                        </CardDescription>
                      </div>
                      <button
                        onClick={() => handleDiscontinueMed(med.id, med.name)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Archive or discontinue prescription"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                        Prescription Instructions:
                      </span>
                      <p className="text-slate-600 dark:text-slate-400">{med.dosageInstructions}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">Doctor:</span>
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {med.prescribingDoctor || "Primary Care Physician"}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Clinic:</span>
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {med.prescribingClinic || "Metro Clinic"}
                        </div>
                      </div>
                    </div>

                    {med.stock && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="text-slate-500">Current Stock:</span>
                        <span className="font-bold text-teal-800 dark:text-teal-300">
                          {med.stock.currentStock} {med.stock.unit} (Warning threshold: {med.stock.refillThreshold})
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: APPOINTMENTS */}
        {/* ======================================================== */}
        {activeTab === "appointments" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Clinical Appointments & Consultations
                </h2>
                <p className="text-xs text-slate-500">
                  Track upcoming specialist visits, routine check-ups, and outcome summaries.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddApptModal(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Appointment
              </Button>
            </div>

            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  No appointments recorded yet.
                </div>
              ) : (
                appointments.map((appt: any) => {
                  const isUpcoming = appt.status === "UPCOMING";
                  return (
                    <Card key={appt.id}>
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant={isUpcoming ? "default" : "secondary"}>
                                {appt.status}
                              </Badge>
                              <span className="text-xs font-bold text-teal-800 dark:text-teal-400">
                                {new Date(appt.appointmentDate).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white pt-1">
                              {appt.title}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {appt.doctorName} {appt.specialty ? `(${appt.specialty})` : ""} • {appt.clinicName}
                            </p>
                            {appt.locationAddress && (
                              <p className="text-[11px] text-slate-400">{appt.locationAddress}</p>
                            )}
                            {appt.notes && (
                              <p className="text-xs text-slate-500 mt-2 italic bg-slate-50 p-2 rounded-lg dark:bg-slate-800">
                                Preparation: {appt.notes}
                              </p>
                            )}
                            {appt.outcomeSummary && (
                              <p className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-2 font-medium">
                                Clinical Outcome: {appt.outcomeSummary}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CARE CIRCLE */}
        {/* ======================================================== */}
        {activeTab === "circle" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Care Circle Members & Permissions
                </h2>
                <p className="text-xs text-slate-500">
                  Manage authorized family members and caretakers with strict server-side access controls.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowInviteModal(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Invite Member
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m: any) => (
                <Card key={m.id}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200">
                          {m.user?.name?.[0] || "U"}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                            {m.user?.name}
                          </CardTitle>
                          <span className="text-[11px] text-slate-400 block">{m.user?.email}</span>
                          {m.user?.phoneNumber && (
                            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 block">
                              📞 {m.user.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={m.role === "ADMIN" ? "default" : m.role === "CARETAKER" ? "info" : "secondary"} className="text-[10px]">
                        {m.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Active Permissions
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {m.permissions?.map((p: string) => (
                          <span
                            key={p}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {p.replace("CAN_", "").toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {m.userId !== currentUserId && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => handleRevokeMember(m.id)}
                          className="text-[10px] font-bold"
                        >
                          Revoke Access
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: HEALTHCARE TIMELINE */}
        {/* ======================================================== */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Chronological Healthcare Timeline
              </h2>
              <p className="text-xs text-slate-500">
                Audited stream of medication confirmations, caregiver notes, vital signs, and clinical appointments.
              </p>
            </div>

            <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6">
              {timeline.map((event: any) => (
                <div key={event.id} className="relative group">
                  <div className={`absolute -left-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 ${
                    event.severity === "danger"
                      ? "bg-red-500 text-white"
                      : event.severity === "success"
                      ? "bg-teal-600 text-white"
                      : event.severity === "warning"
                      ? "bg-amber-500 text-white"
                      : "bg-sky-500 text-white"
                  }`}>
                    <Activity className="h-3 w-3" />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {event.title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(event.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">{event.description}</p>

                    {event.actorName && (
                      <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold mt-1 block">
                        Logged by: {event.actorName}
                      </span>
                    )}

                    {event.metadata && (
                      <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[10px] font-mono grid grid-cols-2 gap-1 dark:bg-slate-800">
                        {Object.entries(event.metadata).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-slate-400">{k}: </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: ANALYTICS */}
        {/* ======================================================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Adherence & Healthcare Analytics
              </h2>
              <p className="text-xs text-slate-500">
                Visualized adherence trends and cumulative administration statistics calculated directly from database records.
              </p>
            </div>

            {analytics && (
              <AnalyticsCharts
                trendData={analytics.trendLast7Days || []}
                distributionData={analytics.statusDistribution || []}
                adherencePercentage={analytics.adherencePercentage || 100}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddMedicationModal
        open={showAddMedModal}
        onOpenChange={setShowAddMedModal}
        elderlyProfileId={profile.id}
        onSuccess={() => window.location.reload()}
      />

      <AddAppointmentModal
        open={showAddApptModal}
        onOpenChange={setShowAddApptModal}
        elderlyProfileId={profile.id}
        onSuccess={() => window.location.reload()}
      />

      <InviteMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        careCircleId={careCircle?.id || ""}
        onSuccess={() => {}}
      />

      <AddElderlyProfileModal
        open={showAddProfileModal}
        onOpenChange={setShowAddProfileModal}
        onSuccess={(id) => {
          if (id) {
            router.push(`/dashboard/family?profileId=${id}`);
          } else {
            router.refresh();
          }
        }}
      />
    </div>
  );
}

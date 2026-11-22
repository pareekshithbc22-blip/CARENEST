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
  TrendingUp,
  Zap,
  ArrowLeft,
  UserPlus,
  Phone,
  ShieldCheck,
  Heart,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AnalyticsCharts } from "./analytics-charts";
import { AddAppointmentModal } from "./add-appointment-modal";
import { InviteMemberModal } from "./invite-member-modal";
import { AddElderlyProfileModal } from "./add-elderly-profile-modal";
import { evaluateBloodSugar, evaluateBloodPressure } from "@/lib/config";
import { useDashboardPolling } from "@/hooks/use-dashboard-polling";

export interface ManagedSeniorSummary {
  id: string;
  name: string;
  preferredName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  allergies: string[];
  medicalConditions: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  notes?: string | null;
  avatarUrl?: string | null;
  caretaker: {
    id: string;
    name: string;
    phoneNumber?: string | null;
    email: string;
  } | null;
  medicationsCount: number;
  upcomingAppointmentsCount: number;
}

export interface VitalMeasurement {
  id: string;
  createdAt: string;
  heartRate?: number | null;
  bloodGlucose?: number | null;
  bloodPressure?: string | null;
  systolic?: number | null;
  diastolic?: number | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
  weight?: number | null;
  notes?: string | null;
}

interface FamilyDashboardClientProps {
  adminUser: {
    id: string;
    name: string;
    email: string;
  };
  managedSeniors: ManagedSeniorSummary[];
  profile: any;
  activeAge?: number | null;
  activeCaretaker: {
    name: string;
    phoneNumber?: string | null;
    email: string;
  } | null;
  vitalsHistory: VitalMeasurement[];
  availableProfiles: Array<{ id: string; name: string; preferredName?: string | null }>;
  analytics: any;
  refillEstimates: any[];
  timeline: any[];
  currentUserId: string;
}

type FamilyTab = "overview" | "vitals" | "medications" | "appointments" | "circle" | "caretakers" | "timeline" | "analytics";

export function FamilyDashboardClient({
  adminUser,
  managedSeniors,
  profile,
  activeAge,
  activeCaretaker,
  vitalsHistory = [],
  analytics,
  refillEstimates,
  timeline,
  currentUserId,
}: FamilyDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<FamilyTab>("overview");

  // Caretaker Requests & Management state
  const [caretakerRequests, setCaretakerRequests] = React.useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = React.useState(false);
  const [requestActionLoading, setRequestActionLoading] = React.useState<string | null>(null);
  const [requestSuccessNotice, setRequestSuccessNotice] = React.useState<string | null>(null);

  const loadCaretakerRequests = React.useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/family/caretaker-requests");
      if (res.ok) {
        const data = await res.json();
        setCaretakerRequests(data.requests || []);
      }
    } catch {
      // quiet fail
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const [todayDoses, setTodayDoses] = React.useState<any[]>([]);
  const [loadingTodayDoses, setLoadingTodayDoses] = React.useState(false);

  const loadTodayDoses = React.useCallback(async (pid: string) => {
    if (!pid) return;
    setLoadingTodayDoses(true);
    try {
      const res = await fetch(`/api/doses?profileId=${encodeURIComponent(pid)}&filter=today`);
      if (res.ok) {
        const data = await res.json();
        setTodayDoses(data.doses || []);
      }
    } catch {
      // quiet fail
    } finally {
      setLoadingTodayDoses(false);
    }
  }, []);

  // Automatic Polling for Family Role
  const { lastUpdated, isRefreshing, refreshNow } = useDashboardPolling({
    role: "family",
    onUpdate: () => {
      if (profile?.id) {
        loadTodayDoses(profile.id);
        loadCaretakerRequests();
      }
    },
  });

  React.useEffect(() => {
    loadCaretakerRequests();
    if (profile?.id) {
      loadTodayDoses(profile.id);
    }
  }, [loadCaretakerRequests, loadTodayDoses, profile?.id]);

  const handleRespondCaretakerRequest = async (
    requestId: string,
    action: "APPROVE" | "REJECT",
    reason?: string
  ) => {
    setRequestActionLoading(requestId);
    setRequestSuccessNotice(null);
    try {
      const res = await fetch(`/api/family/caretaker-requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequestSuccessNotice(data.message || `Caretaker request ${action.toLowerCase()}d successfully`);
        setTimeout(() => setRequestSuccessNotice(null), 5000);
        await loadCaretakerRequests();
        router.refresh();
      } else {
        alert(data.error || "Failed to process request");
      }
    } catch {
      alert("Network error while responding to caretaker request");
    } finally {
      setRequestActionLoading(null);
    }
  };

  const handleRevokeCaretaker = async (requestId: string, caretakerName: string) => {
    if (
      !confirm(
        `Are you sure you want to revoke monitoring access for ${caretakerName}? This caretaker will immediately lose all access to this patient's medical records.`
      )
    ) {
      return;
    }
    setRequestActionLoading(requestId);
    setRequestSuccessNotice(null);
    try {
      const res = await fetch(`/api/family/caretaker-requests/${requestId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Revoked by family administrator" }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequestSuccessNotice(data.message || `Caretaker access revoked successfully`);
        setTimeout(() => setRequestSuccessNotice(null), 5000);
        await loadCaretakerRequests();
        router.refresh();
      } else {
        alert(data.error || "Failed to revoke access");
      }
    } catch {
      alert("Network error while revoking caretaker access");
    } finally {
      setRequestActionLoading(null);
    }
  };

  // Modals state
  const [showAddApptModal, setShowAddApptModal] = React.useState(false);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = React.useState(false);

  // Background escalation trigger state
  const [isEscalating, setIsEscalating] = React.useState(false);
  const [escalationFeedback, setEscalationFeedback] = React.useState<string | null>(null);

  // Today's Doses state for active senior
  const [doses, setDoses] = React.useState<any[]>([]);
  const [loadingDoses, setLoadingDoses] = React.useState(true);

  // Reference for scrolling to patient list
  const memberListRef = React.useRef<HTMLDivElement>(null);

  // Fetch today's doses for the currently active senior
  const activeProfileId = profile?.id;
  const loadDoses = React.useCallback(async () => {
    if (!activeProfileId) {
      setDoses([]);
      setLoadingDoses(false);
      return;
    }
    try {
      const res = await fetch(`/api/doses?profileId=${activeProfileId}&filter=today`);
      if (res.ok) {
        const data = await res.json();
        setDoses(data.doses || []);
      }
    } catch {
      // ignore network transient
    } finally {
      setLoadingDoses(false);
    }
  }, [activeProfileId]);

  React.useEffect(() => {
    loadDoses();
  }, [loadDoses]);

  // Quick dose confirmation from family portal (read-only verification)
  const handleConfirmDose = async (doseId: string) => {
    try {
      const res = await fetch(`/api/doses/${doseId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationNotes: "Confirmed via Family Administrator Portal" }),
      });
      if (res.ok) {
        loadDoses();
      }
    } catch {
      alert("Failed to confirm dose");
    }
  };

  // Run escalation engine manually (for demonstration and evaluation)
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

  // Handle member revocation from care circle
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

  const handleSelectSenior = (seniorId: string) => {
    router.push(`/dashboard/family?profileId=${seniorId}`);
  };

  const scrollToMemberList = () => {
    if (memberListRef.current) {
      memberListRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const careCircle = profile?.careCircles?.[0];
  const members = careCircle?.members || [];
  const medications = profile?.medications || [];
  const appointments = profile?.appointments || [];

  const attentionDoses = doses.filter((d) => d.status === "MISSED" || d.status === "UNCONFIRMED");
  const takenDosesCount = doses.filter((d) => d.status === "TAKEN").length;
  const lowStockMeds = (refillEstimates || []).filter((r) => r.isLowStock);

  // Latest vital measurement from history
  const latestVital = vitalsHistory.length > 0 ? vitalsHistory[0] : null;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* ======================================================== */}
      {/* 1. FAMILY ADMINISTRATOR IDENTITY & PATIENT LIST SECTION  */}
      {/* ======================================================== */}
      <section ref={memberListRef} className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Family Administrator Identity Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center rounded-lg bg-teal-100 px-3 py-1 text-xs font-black text-teal-800 uppercase tracking-wider">
                  Family Administrator
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Care Circle Guardian & Coordinator
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
                Family Administrator: {adminUser.name}
              </h1>
              <p className="text-xs font-medium text-slate-600 mt-1">
                {adminUser.email} • Overseeing senior health records, coordinating appointments, and reviewing medication adherence.
              </p>
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

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setShowAddProfileModal(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md"
              >
                <UserPlus className="h-4 w-4 mr-1.5" /> Add Senior Patient
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunEscalationEngine}
                disabled={isEscalating}
                className="text-xs border-amber-300 text-amber-900 hover:bg-amber-50"
                title="Run the missed-dose escalation evaluation engine"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                {isEscalating ? "Running Engine..." : "Run Escalation Check"}
              </Button>
            </div>
          </div>

          {/* Escalation Feedback Notice if triggered */}
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

          {/* List of Managed Senior Family Members */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  My Family Members
                </h2>
                <p className="text-xs text-slate-500">
                  Select a senior patient card below to inspect their complete individual health records and care coordination details.
                </p>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">
                {managedSeniors.length} {managedSeniors.length === 1 ? "Senior Profile" : "Senior Profiles"} Managed
              </span>
            </div>

            {/* Selectable Senior Cards Grid or Empty State */}
            {managedSeniors.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-teal-200 bg-white p-10 text-center space-y-5 shadow-xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-8 ring-teal-50/50">
                  <Heart className="h-8 w-8 text-teal-600" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-xl font-black text-slate-900">
                    No Senior Patients Registered Yet
                  </h3>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">
                    Add your first senior patient to begin coordinating care with family and caretakers. Once registered, licensed caretakers will be automatically assigned to coordinate prescriptions and vitals monitoring.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => setShowAddProfileModal(true)}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md px-6 py-2.5"
                  >
                    <UserPlus className="h-4 w-4 mr-2" /> Add Senior Patient
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 max-w-4xl mx-auto text-left">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 font-black text-xs mb-2">1</span>
                    <h4 className="font-bold text-slate-900 text-xs">Add Senior Profile</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Register your loved one with their medical conditions and emergency contact info.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 font-black text-xs mb-2">2</span>
                    <h4 className="font-bold text-slate-900 text-xs">Auto Caretaker Assignment</h4>
                    <p className="text-[11px] text-slate-500 mt-1">CareNest automatically pairs an available licensed nurse to oversee medications.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 font-black text-xs mb-2">3</span>
                    <h4 className="font-bold text-slate-900 text-xs">Unified Care Circle</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Track live dose adherence, vitals telemetry, appointments, and care logs in real time.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {managedSeniors.map((senior) => {
                  const isSelected = profile ? senior.id === profile.id : false;
                  const relationDisplay = senior.emergencyContactRelation
                    ? `(${senior.emergencyContactRelation})`
                    : "";

                  return (
                    <div
                      key={senior.id}
                      role="button"
                      tabIndex={0}
                      data-testid={`senior-card-${senior.id}`}
                      onClick={() => handleSelectSenior(senior.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectSenior(senior.id);
                        }
                      }}
                      className={`cursor-pointer rounded-2xl border-2 p-5 transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/70 shadow-md ring-3 ring-teal-500/20"
                          : "border-slate-200 bg-white hover:border-teal-300 hover:shadow-xs"
                      }`}
                    >
                      <div>
                        {/* Senior Name & Selection Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-xl font-black text-base shadow-xs ${
                                isSelected
                                  ? "bg-teal-700 text-white"
                                  : "bg-teal-100 text-teal-800"
                              }`}
                            >
                              {senior.name[0]}
                            </div>
                            <div>
                              <h3 className="text-base font-black text-slate-900 leading-snug">
                                {senior.name} {relationDisplay}
                              </h3>
                              {senior.preferredName && senior.preferredName !== senior.name && (
                                <p className="text-xs font-semibold text-slate-500">
                                  &quot;{senior.preferredName}&quot;
                                </p>
                              )}
                            </div>
                          </div>

                          {isSelected ? (
                            <Badge className="bg-teal-700 text-white text-[10px] font-bold">
                              ✓ Selected
                            </Badge>
                          ) : (
                            <span className="text-xs font-bold text-teal-700 hover:underline">
                              View Details →
                            </span>
                          )}
                        </div>

                        {/* Caretaker Assignment Status */}
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Assigned Caretaker:</span>
                            {senior.caretaker ? (
                              <span className="font-bold text-slate-900">
                                {senior.caretaker.name}
                              </span>
                            ) : (
                              <Badge variant="warning" className="text-[10px] font-bold">
                                Caretaker Pending Assignment
                              </Badge>
                            )}
                          </div>

                          {senior.caretaker && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Registered Phone:</span>
                              <span className="font-semibold text-teal-800 font-mono">
                                {senior.caretaker.phoneNumber || "No phone listed"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {senior.bloodGroup && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              Blood: {senior.bloodGroup}
                            </span>
                          )}
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            {senior.medicationsCount} Active Meds
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            {senior.upcomingAppointmentsCount} Visits
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium truncate max-w-[180px]">
                          {senior.medicalConditions.slice(0, 2).join(", ") || "General Care"}
                        </span>
                        <span className={`font-black ${isSelected ? "text-teal-800" : "text-slate-400"}`}>
                          {isSelected ? "Active Patient" : "Click to Select"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. INDIVIDUAL SENIOR PROFILE DETAILS (SELECTED PATIENT) */}
      {/* ======================================================== */}
      {profile && (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb & Back to List Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={scrollToMemberList}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-teal-50 px-3.5 py-2 text-xs font-black text-teal-900 border border-teal-300 hover:bg-teal-100 transition-colors shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4 stroke-3" />
              <span>← Back to Family Member List</span>
            </button>
            <span className="text-xs font-bold text-slate-700 hidden sm:inline">
              Currently viewing individual records for: <strong className="text-teal-800">{profile.name}</strong> {profile.emergencyContactRelation ? `(${profile.emergencyContactRelation})` : ""}
            </span>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-300">
              Profile ID: {profile.id.slice(0, 8)}
            </Badge>
          </div>
        </div>

        {/* Selected Senior Core Information Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left: Patient Snapshot */}
            <div className="flex items-start space-x-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-teal-100 ring-4 ring-teal-50 shrink-0">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-black text-teal-800 text-2xl">
                    {profile.name[0]}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {profile.name}
                  </h2>
                  {profile.emergencyContactRelation && (
                    <span className="text-sm font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                      {profile.emergencyContactRelation}
                    </span>
                  )}
                  {profile.preferredName && profile.preferredName !== profile.name && (
                    <span className="text-xs font-semibold text-slate-500">
                      (&quot;{profile.preferredName}&quot;)
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 font-medium">
                  {activeAge ? `${activeAge} years old` : "Age not specified"} • Gender:{" "}
                  <strong>{profile.gender || "Not specified"}</strong> • Blood Group:{" "}
                  <strong className="text-slate-900 font-black">{profile.bloodGroup || "A+"}</strong>
                </p>

                {/* Medical Conditions */}
                {profile.medicalConditions?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs font-bold text-slate-500">Conditions:</span>
                    {profile.medicalConditions.map((c: string) => (
                      <span
                        key={c}
                        className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 border border-slate-200"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Allergies */}
                {profile.allergies?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs font-bold text-rose-700">Allergies:</span>
                    {profile.allergies.map((a: string) => (
                      <span
                        key={a}
                        className="inline-block rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-800 border border-rose-200"
                      >
                        ⚠ {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Assigned Caretaker Details */}
            <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/60 p-5 lg:max-w-md w-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-teal-900 font-black text-xs uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-teal-700" />
                  <span>Assigned Caretaker</span>
                </div>
                {activeCaretaker && (
                  <Badge variant="success" className="text-[10px] font-bold">
                    Active on Circle
                  </Badge>
                )}
              </div>

              {activeCaretaker ? (
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">
                    {activeCaretaker.name}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Licensed Caretaker & Nurse • Assigned to {profile.name}&apos;s care circle
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                        Registered Contact:
                      </span>
                      <strong className="text-slate-900 font-mono font-bold">
                        {activeCaretaker.phoneNumber || "No registered phone"}
                      </strong>
                    </div>

                    {activeCaretaker.phoneNumber && (
                      <a
                        href={`tel:${activeCaretaker.phoneNumber}`}
                        className="inline-flex items-center space-x-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-black text-white hover:bg-teal-800 shadow-xs transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Call Caretaker</span>
                      </a>
                    )}
                  </div>

                  <div className="pt-2 border-t border-teal-200/60">
                    <button
                      onClick={() => setActiveTab("caretakers")}
                      className="text-[11px] font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                      Manage Caretaker Access {caretakerRequests.filter((r) => r.status === "PENDING" && (!profile || r.elderlyProfileId === profile.id)).length > 0 ? `(${caretakerRequests.filter((r) => r.status === "PENDING" && (!profile || r.elderlyProfileId === profile.id)).length} Pending)` : ""} →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-amber-800 font-bold">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Caretaker Pending Assignment</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    No licensed caretaker is currently assigned to this care circle. When caretakers request monitoring access, review and approve them under Caretaker Requests.
                  </p>
                  <div className="pt-2 border-t border-amber-200/60">
                    <button
                      onClick={() => setActiveTab("caretakers")}
                      className="text-[11px] font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                      View Caretaker Requests {caretakerRequests.filter((r) => r.status === "PENDING" && (!profile || r.elderlyProfileId === profile.id)).length > 0 ? `(${caretakerRequests.filter((r) => r.status === "PENDING" && (!profile || r.elderlyProfileId === profile.id)).length} Pending)` : ""} →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact & Mobility Notes Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Emergency Contact (Family)
              </span>
              <p className="text-sm font-bold text-slate-900">
                {profile.emergencyContactName} ({profile.emergencyContactPhone})
              </p>
              <span className="text-xs text-slate-500">
                Relation: {profile.emergencyContactRelation || "Family Coordinator"}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Care & Mobility Notes
              </span>
              <p className="text-xs text-slate-700 italic">
                {profile.notes || "No special mobility or routine notes logged."}
              </p>
            </div>
          </div>

          {/* Individual Senior Dashboard Tabs Navigation */}
          <div className="flex space-x-1 sm:space-x-3 border-t border-slate-100 pt-4 overflow-x-auto">
            {[
              { id: "overview", label: "Overview & Schedule", icon: Activity },
              { id: "vitals", label: "Health Records & Vitals", icon: Heart },
              { id: "medications", label: `Medications (${medications.length}) - Read Only`, icon: Pill },
              { id: "appointments", label: `Appointments (${appointments.length})`, icon: Calendar },
              { id: "circle", label: `Care Circle (${members.length})`, icon: Users },
              {
                id: "caretakers",
                label:
                  caretakerRequests.filter((r) => r.status === "PENDING" && (!profile || r.elderlyProfileId === profile.id)).length > 0
                    ? `Caretaker Requests (${caretakerRequests.filter((r) => r.status === "PENDING" && (!profile || r.elderlyProfileId === profile.id)).length})`
                    : "Caretakers",
                icon: ShieldCheck,
              },
              { id: "timeline", label: "Healthcare Timeline", icon: Clock },
              { id: "analytics", label: "Adherence Analytics", icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FamilyTab)}
                  className={`flex items-center space-x-2 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-teal-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW & SCHEDULE                               */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Attention Banner if unconfirmed doses exist */}
            {attentionDoses.length > 0 && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-xs">
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
                            Confirm Administered
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
                  <CardTitle className="text-2xl font-black text-teal-700">
                    {analytics?.adherencePercentage || 100}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <span className="text-[11px] text-slate-500">Calculated from actual dose confirmations</span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-1">
                  <CardDescription className="text-xs font-semibold">Today&apos;s Doses</CardDescription>
                  <CardTitle className="text-2xl font-black text-slate-900">
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
                  <CardDescription className="text-xs font-semibold">Upcoming Doctor Visits</CardDescription>
                  <CardTitle className="text-2xl font-black text-slate-900">
                    {appointments.filter((a: any) => a.status === "UPCOMING").length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <span className="text-[11px] text-slate-500">Scheduled consultations</span>
                </CardContent>
              </Card>

              <Card className={lowStockMeds.length > 0 ? "border-rose-200 bg-rose-50/40" : ""}>
                <CardHeader className="p-4 pb-1">
                  <CardDescription className="text-xs font-semibold">Refill Alerts</CardDescription>
                  <CardTitle className={`text-2xl font-black ${lowStockMeds.length > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {lowStockMeds.length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <span className="text-[11px] text-slate-500">
                    {lowStockMeds.length > 0 ? "Low supply warning" : "All inventories adequate"}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Split View: Today's Schedule & Refill Projections */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Today&apos;s Medication Schedule
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">Real-time status</span>
                </div>

                {loadingDoses ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Loading schedule...</p>
                ) : doses.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                    No medications scheduled for today.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {doses.map((dose) => {
                      const isTaken = dose.status === "TAKEN";
                      const isSkipped = dose.status === "SKIPPED";
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
                              : isSkipped
                              ? "border-slate-200 bg-slate-50/70"
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
                                {isTaken && <Badge variant="success" className="text-[10px]">Taken</Badge>}
                                {isSkipped && <Badge className="bg-slate-200 text-slate-700 text-[10px]">Skipped</Badge>}
                                {isMissed && <Badge variant="warning" className="text-[10px]">Missed</Badge>}
                                {!isTaken && !isSkipped && !isMissed && <Badge variant="outline" className="text-[10px]">Pending</Badge>}
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 pt-0.5">
                                {dose.medication.name} ({dose.medication.strength})
                              </h4>
                              <p className="text-xs text-slate-600">
                                {dose.medication.dosageInstructions}
                              </p>
                              {dose.confirmedAt && (
                                <p className="text-[11px] text-slate-500 pt-0.5 font-medium">
                                  {isTaken ? "Confirmed taken at " : isSkipped ? "Marked skipped at " : "Recorded at "}
                                  {new Date(dose.confirmedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  {dose.confirmationNotes ? ` (${dose.confirmationNotes})` : ""}
                                </p>
                              )}
                            </div>

                            {!isTaken && !isSkipped && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleConfirmDose(dose.id)}
                                className="text-xs font-semibold self-start sm:self-auto"
                              >
                                Confirm Taken
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Col: Refill Countdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Refill Countdown
                  </h3>
                  <span className="text-[11px] text-slate-400">Inventory estimate</span>
                </div>

                <div className="space-y-3">
                  {refillEstimates.map((refill) => (
                    <div
                      key={refill.medicationId}
                      className={`rounded-2xl border p-4 shadow-2xs ${
                        refill.isLowStock
                          ? "border-rose-300 bg-rose-50/70"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">
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
                        <strong className="text-slate-900 font-black">
                          {refill.currentStock} {refill.unit}
                        </strong>
                      </div>

                      <div className="flex items-baseline justify-between text-xs mt-1">
                        <span className="text-slate-500">Est. Depletion:</span>
                        <span className="font-semibold text-slate-700">
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
        {/* TAB 2: HEALTH RECORDS & VITAL READINGS                   */}
        {/* ======================================================== */}
        {activeTab === "vitals" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Health Records & Vital Signs
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Recorded vital measurements, physiological readings, and clinical observations for {profile.name}.
              </p>
            </div>

            {/* Latest Vitals: Blood Sugar & Blood Pressure Only */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blood Glucose */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Blood Sugar (Glucose)
                  </span>
                  {latestVital?.bloodGlucose !== null && latestVital?.bloodGlucose !== undefined ? (
                    (() => {
                      const evalResult = evaluateBloodSugar(latestVital.bloodGlucose);
                      return (
                        <Badge
                          className={`text-xs font-bold ${
                            evalResult.severity === "CRITICAL"
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : evalResult.severity === "WARNING"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          {evalResult.label}
                        </Badge>
                      );
                    })()
                  ) : (
                    <Badge variant="outline" className="text-xs">No reading</Badge>
                  )}
                </div>
                <div className="mt-4 flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-slate-900">
                    {latestVital?.bloodGlucose ?? "--"}
                  </span>
                  <span className="text-xs font-bold text-slate-500">mg/dL</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Target: 70 - 140 mg/dL</span>
                  <span>{latestVital ? new Date(latestVital.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              </div>

              {/* Blood Pressure */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Blood Pressure
                  </span>
                  {latestVital?.systolic && latestVital?.diastolic ? (
                    (() => {
                      const evalResult = evaluateBloodPressure(latestVital.systolic, latestVital.diastolic);
                      return (
                        <Badge
                          className={`text-xs font-bold ${
                            evalResult.severity === "CRITICAL"
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : evalResult.severity === "WARNING"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          {evalResult.label}
                        </Badge>
                      );
                    })()
                  ) : (
                    <Badge variant="outline" className="text-xs">No reading</Badge>
                  )}
                </div>
                <div className="mt-4 flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-slate-900">
                    {latestVital?.bloodPressure ||
                      (latestVital?.systolic && latestVital?.diastolic
                        ? `${latestVital.systolic}/${latestVital.diastolic}`
                        : "--")}
                  </span>
                  <span className="text-xs font-bold text-slate-500">mmHg</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Target: 90-120 / 60-80 mmHg</span>
                  <span>{latestVital ? new Date(latestVital.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              </div>
            </div>

            {/* Vitals History Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Vitals History Log
                  </h4>
                  <p className="text-xs text-slate-500">Sequential clinical records for blood sugar and blood pressure.</p>
                </div>
                <span className="text-xs text-slate-400">
                  {vitalsHistory.length} entries
                </span>
              </div>

              {vitalsHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No health measurements recorded yet for this profile.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                        <th className="py-2.5 font-bold">Timestamp</th>
                        <th className="py-2.5 font-bold">Blood Glucose</th>
                        <th className="py-2.5 font-bold">Blood Pressure</th>
                        <th className="py-2.5 font-bold">Clinical Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {vitalsHistory.map((item) => {
                        const sugarEval = evaluateBloodSugar(item.bloodGlucose);
                        const bpEval = evaluateBloodPressure(item.systolic, item.diastolic);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60">
                            <td className="py-3 text-slate-700 font-mono text-[11px]">
                              {new Date(item.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3">
                              {item.bloodGlucose !== null && item.bloodGlucose !== undefined ? (
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-900">{item.bloodGlucose} mg/dL</span>
                                  {sugarEval.isAbnormal && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                      {sugarEval.label}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">--</span>
                              )}
                            </td>
                            <td className="py-3">
                              {item.bloodPressure || (item.systolic && item.diastolic) ? (
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-900">
                                    {item.bloodPressure || `${item.systolic}/${item.diastolic} mmHg`}
                                  </span>
                                  {bpEval.isAbnormal && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                      {bpEval.label}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">--</span>
                              )}
                            </td>
                            <td className="py-3 text-slate-600 max-w-xs truncate">
                              {item.notes || "Self-reported measurement"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PRESCRIBED MEDICATIONS (READ ONLY FOR FAMILY)      */}
        {/* ======================================================== */}
        {activeTab === "medications" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Active Prescriptions & Regimens
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Comprehensive prescription schedules, dosage instructions, and pharmacy inventory for {profile.name}.
                </p>
              </div>

              {/* Informational Read-Only Badge */}
              <Badge variant="outline" className="text-xs font-bold bg-teal-50 text-teal-900 border-teal-300 self-start sm:self-auto px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5 mr-1 text-teal-700" />
                Prescriptions Managed by Licensed Caretakers
              </Badge>
            </div>

            {/* Read-Only Notice Banner */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-950 flex items-start space-x-3">
              <ShieldCheck className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-sm text-teal-900">
                  Read-Only Family View
                </strong>
                <span>
                  Medication management (prescribing, dosage modifications, and discontinuations) is strictly reserved for authorized licensed Caretakers. Family Administrators have read-only access to medication schedules, inventory countdowns, and adherence logs.
                </span>
              </div>
            </div>

            {/* Medications Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {medications.length === 0 ? (
                <div className="col-span-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
                  No active medications registered. Prescriptions will be added by the assigned licensed Caretaker.
                </div>
              ) : (
                medications.map((med: any) => (
                  <Card key={med.id} className="relative overflow-hidden">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-black text-slate-900">
                            {med.name}
                          </CardTitle>
                          <span className="text-xs font-bold text-teal-800 block">
                            {med.strength} • {med.form}
                          </span>
                        </div>
                        <Badge variant="success" className="text-[10px] font-bold">
                          Active Prescription
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 space-y-3">
                      <div className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-500 block">Dosage Instructions:</span>
                        <p className="mt-0.5 font-medium">{med.dosageInstructions}</p>
                      </div>

                      {med.purpose && (
                        <div className="text-xs">
                          <span className="font-semibold text-slate-500 block">Purpose:</span>
                          <span className="text-slate-700">{med.purpose}</span>
                        </div>
                      )}

                      {/* Scheduled Intake Times */}
                      {med.schedules && med.schedules.length > 0 && med.schedules[0].timesOfDay && (
                        <div className="text-xs">
                          <span className="font-semibold text-slate-500 block">Scheduled Intake Times:</span>
                          <span className="font-bold text-teal-800">
                            {med.schedules[0].timesOfDay.join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Assigned By Caretaker and When */}
                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-800 block">Clinical Assignment:</span>
                        <span>
                          {med.assignedBy?.name
                            ? `Assigned by ${med.assignedBy.name} on ${new Date(med.assignedAt || med.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                            : `Registered on ${new Date(med.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 text-slate-500">
                        <div>
                          <span>Prescribed by:</span>
                          <p className="font-bold text-slate-800">{med.prescribingDoctor || "Attending Physician"}</p>
                        </div>
                        <div>
                          <span>Rx Number:</span>
                          <p className="font-bold text-slate-800 font-mono">{med.rxNumber || "RX-CONFIDENTIAL"}</p>
                        </div>
                      </div>

                      {med.stock && (
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                          <span className="text-slate-500 font-medium">Inventory Stock:</span>
                          <span className={`font-black ${med.stock.currentStock < (med.stock.refillThreshold || 10) ? "text-rose-700" : "text-emerald-700"}`}>
                            {med.stock.currentStock} {med.stock.unit || "tablets"} remaining
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: DOCTOR APPOINTMENTS                               */}
        {/* ======================================================== */}
        {activeTab === "appointments" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Doctor Consultations & Appointments
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Scheduled clinic appointments, hospital checkups, and preparation instructions for {profile.name}.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddApptModal(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
              >
                + Schedule Visit
              </Button>
            </div>

            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
                  No appointments scheduled. Tap &quot;+ Schedule Visit&quot; to coordinate a doctor consultation.
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
                              <Badge variant={isUpcoming ? "default" : "secondary"} className="text-[10px] font-bold">
                                {appt.status}
                              </Badge>
                              <span className="text-xs font-bold text-teal-800 font-mono">
                                {new Date(appt.appointmentDate).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-slate-900 pt-1">
                              {appt.title}
                            </h4>
                            <p className="text-xs text-slate-600">
                              {appt.doctorName} {appt.specialty ? `(${appt.specialty})` : ""} • {appt.clinicName}
                            </p>
                            {appt.locationAddress && (
                              <p className="text-[11px] text-slate-400">{appt.locationAddress}</p>
                            )}
                            {appt.notes && (
                              <p className="text-xs text-slate-600 mt-2 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                Preparation: {appt.notes}
                              </p>
                            )}
                            {appt.outcomeSummary && (
                              <p className="text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 mt-2 font-medium">
                                Outcome: {appt.outcomeSummary}
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
        {/* TAB 5: CARE CIRCLE MEMBERS & CONTACTS                    */}
        {/* ======================================================== */}
        {activeTab === "circle" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Care Circle Members & Permissions
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Authorized family guardians and licensed caretakers for {profile.name}.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowInviteModal(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
              >
                + Invite Family Member
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m: any) => (
                <Card key={m.id}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 font-bold text-xs text-teal-800">
                          {m.user?.name?.[0] || "U"}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-900">
                            {m.user?.name}
                          </CardTitle>
                          <span className="text-[11px] text-slate-400 block">{m.user?.email}</span>
                          {m.user?.phoneNumber && (
                            <span className="text-[11px] font-semibold text-teal-800 font-mono block">
                              📞 {m.user.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={m.role === "ADMIN" ? "default" : m.role === "CARETAKER" ? "info" : "secondary"} className="text-[10px] font-bold">
                        {m.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Active Role Capabilities
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {m.permissions?.map((p: string) => (
                          <span
                            key={p}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700"
                          >
                            {p.replace("CAN_", "").toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {m.userId !== currentUserId && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
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
        {/* TAB 5B: CARETAKER REQUESTS & ACCESS MANAGEMENT            */}
        {/* ======================================================== */}
        {activeTab === "caretakers" && (
          <div className="space-y-8">
            {requestSuccessNotice && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{requestSuccessNotice}</span>
                </div>
                <button
                  onClick={() => setRequestSuccessNotice(null)}
                  className="text-xs font-bold underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Part 1: Incoming Access Requests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-5 w-5 text-teal-700" />
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Incoming Caretaker Access Requests
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Certified healthcare staff requesting monitoring and care authority for {profile.name}. Review credentials and license details before approving.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {caretakerRequests.filter((r) => r.status === "PENDING" && (!profile || r.elderlyProfileId === profile.id)).length} Pending
                </Badge>
              </div>

              {loadingRequests ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200">
                  Loading caretaker requests...
                </div>
              ) : caretakerRequests.filter((r) => r.status === "PENDING" && (!profile || r.elderlyProfileId === profile.id)).length === 0 ? (
                <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
                  <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">
                    No pending caretaker requests
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    When licensed nurses or caretakers discover {profile.name} and submit a monitoring request, their credentials will appear here for your review and approval.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {caretakerRequests
                    .filter((r) => r.status === "PENDING" && (!profile || r.elderlyProfileId === profile.id))
                    .map((req) => {
                      const cp = req.caretaker?.caretakerProfile;
                      const isProcessing = requestActionLoading === req.id;

                      return (
                        <Card
                          key={req.id}
                          className="rounded-3xl border-2 border-teal-200/80 bg-white p-6 shadow-xs hover:shadow-sm transition-all"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                            <div className="space-y-3 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-black text-slate-900">
                                  {req.caretaker?.name || "Licensed Care Staff"}
                                </h4>
                                {cp?.professionalCategory && (
                                  <Badge className="bg-teal-700 text-white font-bold text-xs">
                                    {cp.professionalCategory}
                                  </Badge>
                                )}
                                <Badge className="bg-amber-600 text-white font-bold text-[10px]">
                                  Awaiting Your Review
                                </Badge>
                              </div>

                              <p className="text-xs text-slate-500">
                                Email: <strong>{req.caretaker?.email}</strong>
                                {req.caretaker?.phoneNumber && ` • Phone: ${req.caretaker.phoneNumber}`}
                                {` • Requested on: ${new Date(req.requestedAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}`}
                              </p>

                              {/* Caretaker Credentials Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1 text-xs">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                    Qualification
                                  </span>
                                  <span className="font-bold text-slate-900 mt-0.5 block">
                                    {cp?.qualification || "Healthcare Credential"}
                                  </span>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                    License / Registration #
                                  </span>
                                  <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                                    {cp?.registrationNumber || "Verified Staff"}
                                  </span>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                    Issuing Authority & State
                                  </span>
                                  <span className="font-bold text-slate-900 mt-0.5 block">
                                    {cp?.issuingAuthority
                                      ? `${cp.issuingAuthority} (${cp.state})`
                                      : cp?.state || "State Council"}
                                  </span>
                                </div>
                              </div>

                              {/* Caretaker optional note */}
                              {req.notes && (
                                <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-xs text-slate-700">
                                  <span className="font-bold text-teal-900 block mb-0.5">
                                    Message from Caretaker:
                                  </span>
                                  <p className="italic">&quot;{req.notes}&quot;</p>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-row lg:flex-col items-center justify-end gap-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 shrink-0">
                              <Button
                                size="sm"
                                onClick={() => handleRespondCaretakerRequest(req.id, "APPROVE")}
                                disabled={isProcessing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs w-full"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                {isProcessing ? "Processing..." : "Accept Request"}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRespondCaretakerRequest(req.id, "REJECT")}
                                disabled={isProcessing}
                                className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs w-full"
                              >
                                <X className="h-3.5 w-3.5 mr-1 text-rose-600" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Part 2: Active Assigned Caretakers */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Active Caretakers for {profile.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Licensed caretakers currently linked to this care circle. Revoking access immediately cuts medical records and telemetry access.
                </p>
              </div>

              {members.filter((m: any) => m.role === "CARETAKER").length === 0 ? (
                <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
                  <p className="text-xs text-slate-500">
                    No licensed caretakers are currently active on {profile.name}&apos;s care circle.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {members
                    .filter((m: any) => m.role === "CARETAKER")
                    .map((m: any) => {
                      const matchedReq = caretakerRequests.find(
                        (r) => r.caretakerId === m.userId && r.elderlyProfileId === profile.id
                      );

                      return (
                        <Card
                          key={m.id}
                          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 font-bold text-sm text-teal-800">
                                {m.user?.name?.[0] || "C"}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">
                                  {m.user?.name}
                                </h4>
                                <span className="text-[11px] text-slate-400 block">
                                  {m.user?.email}
                                </span>
                                {m.user?.phoneNumber && (
                                  <span className="text-[11px] font-semibold text-teal-800 block">
                                    📞 {m.user.phoneNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                              Active Monitoring
                            </Badge>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Access Scope
                            </span>
                            <span className="text-slate-700 font-semibold block">
                              Medication administration, vital telemetry logging, and shift handovers.
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">
                              Immediate Access Revocation
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (matchedReq) {
                                  handleRevokeCaretaker(matchedReq.id, m.user?.name || "Caretaker");
                                } else {
                                  handleRevokeMember(m.id);
                                }
                              }}
                              className="text-xs font-bold shadow-xs"
                            >
                              Revoke Access
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: HEALTHCARE TIMELINE                               */}
        {/* ======================================================== */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Chronological Healthcare Timeline
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Audited history of dose confirmations, doctor visits, caretaker notes, and health alerts.
              </p>
            </div>

            <div className="space-y-4">
              {timeline.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  No timeline events recorded yet.
                </div>
              ) : (
                timeline.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start space-x-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shrink-0 text-xs font-bold">
                      {event.type === "DOSE" ? <Pill className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{event.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{event.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: ADHERENCE ANALYTICS                               */}
        {/* ======================================================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                14-Day Medication Adherence Analytics
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Clinical compliance charts computed from authentic scheduled doses for {profile.name}.
              </p>
            </div>

            <AnalyticsCharts
              trendData={analytics?.trendData || []}
              distributionData={analytics?.distributionData || []}
              adherencePercentage={analytics?.adherencePercentage || 100}
            />
          </div>
        )}
      </main>
      )}

      {/* Modals */}
      {profile && (
        <>
          <AddAppointmentModal
            open={showAddApptModal}
            onOpenChange={setShowAddApptModal}
            elderlyProfileId={profile.id}
            onSuccess={() => window.location.reload()}
          />

          <InviteMemberModal
            open={showInviteModal}
            onOpenChange={setShowInviteModal}
            careCircleId={profile.careCircles?.[0]?.id}
            onSuccess={() => window.location.reload()}
          />
        </>
      )}

      <AddElderlyProfileModal
        open={showAddProfileModal}
        onOpenChange={setShowAddProfileModal}
        onSuccess={(newProfileId) => {
          if (newProfileId) {
            router.push(`/dashboard/family?profileId=${newProfileId}`);
          } else {
            window.location.reload();
          }
        }}
      />
    </div>
  );
}

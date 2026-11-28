"use client";

import * as React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  Clock,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Sliders,
  History,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export interface VerificationApplication {
  id: string;
  userId: string;
  fullName: string;
  professionalCategory: string;
  qualification: string;
  registrationNumber?: string | null;
  issuingAuthority: string;
  state?: string | null;
  documentFileName: string;
  documentMimeType: string;
  documentFileSize: number;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "AUTO_APPROVED" | "AUTO_REJECTED" | "EXPIRED" | string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string | null;
    createdAt: string;
  };
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface VerificationCaseItem {
  id: string;
  caretakerProfileId: string;
  status: "SUBMITTED" | "PROCESSING" | "AUTO_APPROVED" | "AUTO_REJECTED" | "MANUAL_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED";
  decisionSource: "SYSTEM" | "ADMIN";
  reasonCodes: string[];
  scores: any;
  documentHash?: string | null;
  normalizedRegNumber?: string | null;
  normalizedAuthority?: string | null;
  submittedAt: string;
  decidedAt?: string | null;
  caretakerProfile: {
    id: string;
    fullName: string;
    professionalCategory: string;
    qualification: string;
    registrationNumber?: string | null;
    issuingAuthority: string;
    state?: string | null;
    documentFileName: string;
    user: {
      id: string;
      name: string;
      email: string;
      phoneNumber?: string | null;
    };
  };
  events: Array<{
    id: string;
    stage: string;
    outcome: string;
    actor: string;
    reasonCodes: string[];
    timestamp: string;
    details?: any;
  }>;
}

export interface VerificationMetrics {
  totalCases: number;
  autoApproved: number;
  adminApproved: number;
  manualReview: number;
  rejected: number;
  averageTimeToDecisionMs: number;
}

export function VerificationsPortal({
  initialApplications,
  adminUser,
}: {
  initialApplications: VerificationApplication[];
  adminUser: { id: string; name: string; email: string };
}) {
  const [activeTab, setActiveTab] = React.useState<"automated" | "manual">("automated");

  // Manual Review Applications State (Existing fallback)
  const [applications, setApplications] = React.useState<VerificationApplication[]>(initialApplications);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Rejection modal state for manual applications
  const [rejectingApp, setRejectingApp] = React.useState<VerificationApplication | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Automated Pipeline Cases State
  const [pipelineCases, setPipelineCases] = React.useState<VerificationCaseItem[]>([]);
  const [metrics, setMetrics] = React.useState<VerificationMetrics | null>(null);
  const [pipelineLoading, setPipelineLoading] = React.useState(false);
  const [pipelineStatusFilter, setPipelineStatusFilter] = React.useState<string>("ALL");
  const [selectedCaseForAudit, setSelectedCaseForAudit] = React.useState<VerificationCaseItem | null>(null);

  // Administrative Override Modal State
  const [overrideCase, setOverrideCase] = React.useState<{ case: VerificationCaseItem; action: "APPROVE" | "REJECT" } | null>(null);
  const [overrideReason, setOverrideReason] = React.useState("");
  const [overrideSubmitting, setOverrideSubmitting] = React.useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/verifications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch {
      // quiet fail
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelineCases = React.useCallback(async () => {
    setPipelineLoading(true);
    try {
      const res = await fetch(`/api/admin/verifications/cases?status=${pipelineStatusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setPipelineCases(data.cases || []);
        setMetrics(data.metrics || null);
      }
    } catch {
      // quiet fail
    } finally {
      setPipelineLoading(false);
    }
  }, [pipelineStatusFilter]);

  React.useEffect(() => {
    fetchPipelineCases();
  }, [fetchPipelineCases]);

  const handleReview = async (
    profileId: string,
    action: "APPROVE" | "REJECT" | "SET_UNDER_REVIEW",
    reason?: string
  ) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/verifications/${profileId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to process review action");
        return;
      }

      setActionSuccess(data.message || `Application successfully updated`);
      setTimeout(() => setActionSuccess(null), 4000);

      // Update in local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === profileId
            ? {
                ...app,
                status:
                  action === "APPROVE"
                    ? "APPROVED"
                    : action === "REJECT"
                    ? "REJECTED"
                    : "UNDER_REVIEW",
                rejectionReason: action === "REJECT" ? reason : null,
                reviewedAt: new Date().toISOString(),
                reviewedBy: {
                  id: adminUser.id,
                  name: adminUser.name,
                  email: adminUser.email,
                },
              }
            : app
        )
      );

      setRejectingApp(null);
      setRejectionReason("");
    } catch {
      setActionError("Network error while submitting review decision");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideCase || overrideReason.trim().length < 5) return;

    setOverrideSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/verifications/cases/${overrideCase.case.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: overrideCase.action,
          reason: overrideReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit decision override");

      setActionSuccess(`Case successfully updated to ${overrideCase.action === "APPROVE" ? "APPROVED" : "REJECTED"}.`);
      setTimeout(() => setActionSuccess(null), 4000);

      setOverrideCase(null);
      setOverrideReason("");
      fetchPipelineCases();
      fetchApplications();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const getCaseStatusBadge = (status: VerificationCaseItem["status"]) => {
    switch (status) {
      case "AUTO_APPROVED":
        return <Badge className="bg-emerald-600 text-white font-bold text-xs">✓ Auto-Approved</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-700 text-white font-bold text-xs">✓ Admin Approved</Badge>;
      case "AUTO_REJECTED":
        return <Badge className="bg-rose-600 text-white font-bold text-xs">✕ Auto-Rejected</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-700 text-white font-bold text-xs">✕ Admin Rejected</Badge>;
      case "MANUAL_REVIEW":
        return <Badge className="bg-amber-600 text-white font-bold text-xs">⚠ Manual Review</Badge>;
      case "PROCESSING":
        return <Badge className="bg-teal-600 text-white font-bold text-xs">⟳ Processing</Badge>;
      case "EXPIRED":
        return <Badge className="bg-slate-700 text-white font-bold text-xs">⊘ Expired</Badge>;
      default:
        return <Badge className="bg-blue-600 text-white font-bold text-xs">Submitted</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Banner / Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center rounded-lg bg-teal-100 px-3 py-1 text-xs font-black text-teal-800 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-teal-700" />
                  Platform Administration Portal
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Compliance & Clinical Credentialing
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
                Caretaker License & Document Verifications
              </h1>
              <p className="text-xs font-medium text-slate-600 mt-1">
                Logged in as <strong>{adminUser.name}</strong> ({adminUser.email}) • Inspect automated verification cases, registry lookups, risk flags, and audit trails.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchPipelineCases();
                  fetchApplications();
                }}
                disabled={pipelineLoading || loading}
                className="text-xs font-semibold"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${pipelineLoading || loading ? "animate-spin" : ""}`} />
                Refresh All
              </Button>
            </div>
          </div>

          {/* Feedback messages */}
          {actionSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
              <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
                Dismiss
              </button>
            </div>
          )}

          {actionError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900 text-xs font-bold">
                Dismiss
              </button>
            </div>
          )}

          {/* Platform Verification Metrics Header Cards */}
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Card className="p-4 bg-slate-900 text-white rounded-2xl border-slate-800">
                <p className="text-[11px] font-bold text-slate-400">Total Cases</p>
                <p className="text-2xl font-black mt-1">{metrics.totalCases}</p>
              </Card>
              <Card className="p-4 bg-emerald-50 border-emerald-200 rounded-2xl">
                <p className="text-[11px] font-bold text-emerald-800">Auto-Approved</p>
                <p className="text-2xl font-black text-emerald-950 mt-1">{metrics.autoApproved}</p>
              </Card>
              <Card className="p-4 bg-amber-50 border-amber-200 rounded-2xl">
                <p className="text-[11px] font-bold text-amber-800">Manual Review</p>
                <p className="text-2xl font-black text-amber-950 mt-1">{metrics.manualReview}</p>
              </Card>
              <Card className="p-4 bg-rose-50 border-rose-200 rounded-2xl">
                <p className="text-[11px] font-bold text-rose-800">Declined / Expired</p>
                <p className="text-2xl font-black text-rose-950 mt-1">{metrics.rejected}</p>
              </Card>
              <Card className="p-4 bg-teal-50 border-teal-200 rounded-2xl col-span-2 sm:col-span-1">
                <p className="text-[11px] font-bold text-teal-800">Avg Decision Time</p>
                <p className="text-2xl font-black text-teal-950 mt-1">
                  {metrics.averageTimeToDecisionMs > 0 ? `${(metrics.averageTimeToDecisionMs / 1000).toFixed(1)}s` : "< 10s"}
                </p>
              </Card>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex border-b border-slate-200 gap-6">
            <button
              onClick={() => setActiveTab("automated")}
              className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "automated" ? "border-teal-600 text-teal-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Activity className="h-4 w-4" />
              Automated Pipeline Cases ({pipelineCases.length})
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "manual" ? "border-teal-600 text-teal-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="h-4 w-4" />
              Manual Submissions Archive ({applications.length})
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {activeTab === "automated" ? (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                {["ALL", "MANUAL_REVIEW", "AUTO_APPROVED", "AUTO_REJECTED", "APPROVED", "REJECTED", "EXPIRED"].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={pipelineStatusFilter === status ? "default" : "outline"}
                    onClick={() => setPipelineStatusFilter(status)}
                    className="text-xs font-bold rounded-xl"
                  >
                    {status.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>

            {/* Cases Queue List */}
            {pipelineCases.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">No cases matching filter</h3>
                <p className="text-xs text-slate-500">All automated verification cases are currently up to date.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pipelineCases.map((c) => (
                  <Card key={c.id} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">{c.caretakerProfile?.fullName}</h3>
                          {getCaseStatusBadge(c.status)}
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Source: {c.decisionSource}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {c.caretakerProfile?.professionalCategory} • {c.caretakerProfile?.qualification} • License:{" "}
                          <strong>{c.caretakerProfile?.registrationNumber || "N/A"}</strong> ({c.caretakerProfile?.issuingAuthority}
                          {c.caretakerProfile?.state ? `, ${c.caretakerProfile?.state}` : ""})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCaseForAudit(c)}
                          className="text-xs font-bold gap-1.5"
                        >
                          <History className="h-3.5 w-3.5 text-teal-700" />
                          View Audit Trail ({c.events.length})
                        </Button>
                        <a
                          href={`/api/caretakers/documents/${c.caretakerProfileId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                        >
                          <FileText className="h-3.5 w-3.5 text-teal-700" />
                          View Certificate
                        </a>
                      </div>
                    </div>

                    {/* Scores & Risk Flags Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500">Name Match Score</p>
                        <p className="text-sm font-black text-slate-800">
                          {c.scores?.nameSimilarity ? `${Math.round(c.scores.nameSimilarity * 100)}%` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500">Registry Match</p>
                        <p className="text-sm font-black text-slate-800">
                          {c.scores?.regNumberMatch === 1 ? "100% Exact" : "None / Unmatched"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500">Risk Signals</p>
                        <p className="text-sm font-black text-slate-800">
                          {c.scores?.riskScore > 0 ? (
                            <span className="text-rose-600 font-bold">Detected ({c.scores.riskScore})</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">Clean (0.0)</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500">Decision Reason Codes</p>
                        <p className="text-[11px] font-mono text-slate-700 truncate">
                          {c.reasonCodes.length > 0 ? c.reasonCodes.join(", ") : "CLEAN_APPROVAL"}
                        </p>
                      </div>
                    </div>

                    {/* Admin Override Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400">
                        Submitted: {new Date(c.submittedAt).toLocaleString()}
                        {c.decidedAt ? ` • Decided: ${new Date(c.decidedAt).toLocaleString()}` : ""}
                      </span>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOverrideCase({ case: c, action: "REJECT" })}
                          className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                        >
                          Override: Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setOverrideCase({ case: c, action: "APPROVE" })}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        >
                          Override: Approve
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Manual Submissions Archive View (Existing Fallback) */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {applications.map((app) => (
                <Card key={app.id} className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">{app.fullName}</h4>
                    <Badge className="text-xs">{app.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {app.professionalCategory} • {app.qualification}
                  </p>
                  <p className="text-xs font-mono text-slate-600">License: {app.registrationNumber || "N/A"}</p>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      onClick={() => handleReview(app.id, "APPROVE")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectingApp(app)}
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                    >
                      Reject
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Audit Trail Drawer Modal */}
      {selectedCaseForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-teal-700" />
                <h3 className="text-base font-black text-slate-900">
                  Audit Trail: {selectedCaseForAudit.caretakerProfile?.fullName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCaseForAudit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-2">
              {selectedCaseForAudit.events.map((ev, idx) => (
                <div key={ev.id || idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      {ev.stage} → {ev.outcome}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">Actor: <strong>{ev.actor}</strong></p>
                  {ev.details && (
                    <pre className="p-2 rounded bg-slate-100 text-[10px] text-slate-700 font-mono overflow-x-auto">
                      {JSON.stringify(ev.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setSelectedCaseForAudit(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Administrative Override Modal */}
      {overrideCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Administrative Decision Override ({overrideCase.action})
            </h3>
            <p className="text-xs text-slate-600">
              You are manually {overrideCase.action === "APPROVE" ? "approving" : "declining"} credentials for{" "}
              <strong>{overrideCase.case.caretakerProfile?.fullName}</strong>. A mandatory administrative justification (minimum 5 characters) will be written to the append-only audit trail.
            </p>

            <form onSubmit={handleAdminOverride} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Mandatory Written Reason *</label>
                <Textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Physical license verified directly with State Council registry office."
                  className="text-xs mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOverrideCase(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={overrideSubmitting || overrideReason.trim().length < 5}
                  className={`text-xs font-bold text-white ${
                    overrideCase.action === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {overrideSubmitting ? "Submitting..." : `Confirm ${overrideCase.action}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

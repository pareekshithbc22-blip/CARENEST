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
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
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

export function VerificationsPortal({
  initialApplications,
  adminUser,
}: {
  initialApplications: VerificationApplication[];
  adminUser: { id: string; name: string; email: string };
}) {
  const [applications, setApplications] =
    React.useState<VerificationApplication[]>(initialApplications);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Rejection modal state
  const [rejectingApp, setRejectingApp] =
    React.useState<VerificationApplication | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

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

  // Stats
  const total = applications.length;
  const pendingCount = applications.filter((a) => a.status === "PENDING").length;
  const underReviewCount = applications.filter((a) => a.status === "UNDER_REVIEW").length;
  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = applications.filter((a) => a.status === "REJECTED").length;

  // Filtered applications
  const filtered = applications.filter((app) => {
    if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.fullName.toLowerCase().includes(q);
      const matchEmail = app.user.email.toLowerCase().includes(q);
      const matchReg = (app.registrationNumber || "").toLowerCase().includes(q);
      const matchCategory = app.professionalCategory.toLowerCase().includes(q);
      const matchState = (app.state || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchReg || matchCategory || matchState;
    }
    return true;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: VerificationApplication["status"]) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-600 text-white font-bold text-xs flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-rose-600 text-white font-bold text-xs flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Declined
          </Badge>
        );
      case "UNDER_REVIEW":
        return (
          <Badge className="bg-amber-600 text-white font-bold text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" /> Under Review
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-600 text-white font-bold text-xs flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Pending Review
          </Badge>
        );
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
                Logged in as <strong>{adminUser.name}</strong> ({adminUser.email}) • Inspect submitted medical licenses, verify credentials, and approve or reject access.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchApplications}
                disabled={loading}
                className="text-xs font-semibold"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
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
              <button
                onClick={() => setActionSuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {actionError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button
                onClick={() => setActionError(null)}
                className="text-rose-700 hover:text-rose-900 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div
              onClick={() => setStatusFilter("ALL")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === "ALL"
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                Total Submissions
              </span>
              <span className="text-2xl font-black mt-1 block">{total}</span>
            </div>

            <div
              onClick={() => setStatusFilter("PENDING")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === "PENDING"
                  ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Pending Review
              </span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                {pendingCount}
              </span>
            </div>

            <div
              onClick={() => setStatusFilter("UNDER_REVIEW")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === "UNDER_REVIEW"
                  ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm ring-2 ring-amber-500/20"
                  : "border-slate-200 bg-white hover:border-amber-200"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                Under Review
              </span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">
                {underReviewCount}
              </span>
            </div>

            <div
              onClick={() => setStatusFilter("APPROVED")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === "APPROVED"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20"
                  : "border-slate-200 bg-white hover:border-emerald-200"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                Approved
              </span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">
                {approvedCount}
              </span>
            </div>

            <div
              onClick={() => setStatusFilter("REJECTED")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === "REJECTED"
                  ? "border-rose-600 bg-rose-50 text-rose-900 shadow-sm ring-2 ring-rose-500/20"
                  : "border-slate-200 bg-white hover:border-rose-200"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                Declined
              </span>
              <span className="text-2xl font-black text-rose-900 mt-1 block">
                {rejectedCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, reg #, state, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filter:
            </span>
            {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === tab
                    ? "bg-teal-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        {filtered.length === 0 ? (
          <Card className="rounded-3xl border border-slate-200 p-12 text-center">
            <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              No verification records found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? "No applications match your active search filters. Try clearing your search."
                : "No caretaker license verification submissions are currently awaiting administrative review."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => (
              <Card
                key={app.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left: Applicant & Qualification Details */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">
                        {app.fullName}
                      </h3>
                      {getStatusBadge(app.status)}
                      <span className="text-xs font-semibold text-slate-500">
                        ({app.user.email})
                      </span>
                    </div>

                    {/* Metadata Badges */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Professional Category
                        </span>
                        <span className="font-bold text-teal-900 mt-0.5 block">
                          {app.professionalCategory}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Qualification / Degree
                        </span>
                        <span className="font-bold text-slate-900 mt-0.5 block">
                          {app.qualification}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Registration / License #
                        </span>
                        <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                          {app.registrationNumber}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Issuing Authority
                        </span>
                        <span className="font-bold text-slate-900 mt-0.5 block">
                          {app.issuingAuthority}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          State / Jurisdiction
                        </span>
                        <span className="font-bold text-slate-900 mt-0.5 block">
                          {app.state}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Submitted On
                        </span>
                        <span className="font-semibold text-slate-700 mt-0.5 block">
                          {new Date(app.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Document details box */}
                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {app.documentFileName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {app.documentMimeType} • {formatFileSize(app.documentFileSize)} • Protected Vault Storage
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <a
                          href={`/api/caretakers/documents/${app.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Inspect Document
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                      </div>
                    </div>

                    {/* Rejection / Review Info */}
                    {app.status === "REJECTED" && app.rejectionReason && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                        <span className="font-bold block mb-0.5">Declined Reason:</span>
                        <p>{app.rejectionReason}</p>
                        {app.reviewedBy && (
                          <span className="text-[10px] text-rose-700 mt-1 block">
                            Reviewed by {app.reviewedBy.name} on{" "}
                            {app.reviewedAt
                              ? new Date(app.reviewedAt).toLocaleDateString()
                              : "N/A"}
                          </span>
                        )}
                      </div>
                    )}

                    {app.status === "APPROVED" && app.reviewedBy && (
                      <div className="text-[11px] text-emerald-800 font-medium">
                        ✓ Verified and approved by {app.reviewedBy.name} ({app.reviewedBy.email}) on{" "}
                        {app.reviewedAt
                          ? new Date(app.reviewedAt).toLocaleDateString()
                          : "N/A"}
                      </div>
                    )}
                  </div>

                  {/* Right: Administrative Review Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-center justify-end gap-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 shrink-0">
                    {app.status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReview(app.id, "SET_UNDER_REVIEW")}
                        disabled={actionLoading}
                        className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-50 w-full"
                      >
                        <Clock className="h-3.5 w-3.5 mr-1 text-amber-600" />
                        Mark Under Review
                      </Button>
                    )}

                    {app.status !== "APPROVED" && (
                      <Button
                        size="sm"
                        onClick={() => handleReview(app.id, "APPROVE")}
                        disabled={actionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs w-full"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve License
                      </Button>
                    )}

                    {app.status !== "REJECTED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRejectingApp(app);
                          setRejectionReason("");
                        }}
                        disabled={actionLoading}
                        className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs w-full"
                      >
                        <X className="h-3.5 w-3.5 mr-1 text-rose-600" />
                        Decline Application
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-700">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-base font-black text-slate-900">
                  Decline License Application
                </h3>
              </div>
              <button
                onClick={() => setRejectingApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are declining the professional license application for{" "}
              <strong>{rejectingApp.fullName}</strong> ({rejectingApp.professionalCategory},{" "}
              {rejectingApp.registrationNumber}). A detailed explanation is mandatory so the applicant understands why their credentials could not be validated.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Mandatory Rejection Reason *
              </label>
              <Textarea
                rows={4}
                placeholder="e.g. Uploaded certificate is blurred or illegible. Registration number does not match State Nursing Council records. Please upload a clear official scan."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingApp(null)}
                disabled={actionLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    alert("A detailed rejection reason is mandatory.");
                    return;
                  }
                  handleReview(rejectingApp.id, "REJECT", rejectionReason.trim());
                }}
                disabled={actionLoading || !rejectionReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                {actionLoading ? "Declining..." : "Confirm Decline"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

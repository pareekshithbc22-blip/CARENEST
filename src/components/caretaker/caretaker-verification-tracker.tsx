"use client";

import * as React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  Search,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StageItem {
  id: string;
  label: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}

interface VerificationStatusResponse {
  hasCase: boolean;
  caseId?: string;
  status?: string;
  decisionSource?: "SYSTEM" | "ADMIN";
  isVerified: boolean;
  canResubmit: boolean;
  canRequestReview: boolean;
  submittedAt?: string;
  decidedAt?: string | null;
  reasonMessage?: string | null;
  stages?: StageItem[];
  events?: Array<{ stage: string; outcome: string; timestamp: string }>;
}

export function CaretakerVerificationTracker({
  initialStatus,
  profileId,
}: {
  initialStatus: string;
  profileId: string;
}) {
  const [data, setData] = React.useState<VerificationStatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [submittingAppeal, setSubmittingAppeal] = React.useState(false);
  const [appealSuccess, setAppealSuccess] = React.useState<string | null>(null);
  const [appealError, setAppealError] = React.useState<string | null>(null);

  // Resubmit modal state
  const [showResubmitModal, setShowResubmitModal] = React.useState(false);
  const [resubmitRegNumber, setResubmitRegNumber] = React.useState("");
  const [resubmitAuthority, setResubmitAuthority] = React.useState("");
  const [resubmitting, setResubmitting] = React.useState(false);
  const [resubmitError, setResubmitError] = React.useState<string | null>(null);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/caretakers/verification/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // quiet fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 3 seconds while in progress
  React.useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      setData((prev) => {
        if (!prev || prev.status === "SUBMITTED" || prev.status === "PROCESSING") {
          fetchStatus();
          setElapsedSeconds((s) => s + 3);
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Handle appeal for manual review
  const handleRequestManualReview = async () => {
    setSubmittingAppeal(true);
    setAppealError(null);
    setAppealSuccess(null);
    try {
      const res = await fetch("/api/caretakers/verification/request-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appealNote: "Caretaker requested manual review after auto-check." }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to request manual review");

      setAppealSuccess(json.message);
      fetchStatus();
    } catch (err: any) {
      setAppealError(err.message);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  // Handle resubmit
  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResubmitting(true);
    setResubmitError(null);
    try {
      const res = await fetch("/api/caretakers/verification/resubmit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNumber: resubmitRegNumber.trim() || undefined,
          issuingAuthority: resubmitAuthority.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to resubmit credentials");

      setShowResubmitModal(false);
      setElapsedSeconds(0);
      fetchStatus();
    } catch (err: any) {
      setResubmitError(err.message);
    } finally {
      setResubmitting(false);
    }
  };

  if (loading && !data) {
    return null;
  }

  const status = data?.status || initialStatus;
  const isVerified = data?.isVerified || status === "APPROVED" || status === "AUTO_APPROVED";

  // If already approved, return clean compact verification badge banner
  if (isVerified) {
    return (
      <div className="bg-emerald-500/10 border-b border-emerald-300/70 px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>Official Clinical License Verified & Active</span>
          </div>
          <Badge className="bg-emerald-700 text-white font-bold text-xs">
            {data?.decisionSource === "SYSTEM" ? "Auto-Verified" : "Verified"}
          </Badge>
        </div>
      </div>
    );
  }

  const isProcessing = status === "SUBMITTED" || status === "PROCESSING";
  const isRejected = status === "AUTO_REJECTED" || status === "REJECTED";
  const isManualReview = status === "MANUAL_REVIEW" || status === "UNDER_REVIEW";
  const isTakingLonger = isProcessing && elapsedSeconds > 120;

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isRejected ? "bg-rose-500/20 text-rose-400" : isProcessing ? "bg-teal-500/20 text-teal-400" : "bg-amber-500/20 text-amber-400"
              }`}
            >
              {isRejected ? (
                <XCircle className="h-5 w-5" />
              ) : isProcessing ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isProcessing
                  ? "Automated License Verification in Progress"
                  : isRejected
                  ? "Professional Credentials Declined"
                  : "Under Manual Medical Compliance Review"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isProcessing
                  ? isTakingLonger
                    ? "This is taking longer than usual. We will notify you once complete."
                    : "Verifying your clinical credentials with issuing authority records..."
                  : isRejected
                  ? data?.reasonMessage || "Automated check identified discrepancies with official registry records."
                  : "Sent for manual review by our medical compliance team (no false claims)."}
              </p>
            </div>
          </div>

          <Badge
            className={`font-mono text-xs font-bold shrink-0 self-start sm:self-auto ${
              isRejected ? "bg-rose-700 text-white" : isProcessing ? "bg-teal-600 text-white" : "bg-amber-600 text-white"
            }`}
          >
            Status: {status.replace("_", " ")}
          </Badge>
        </div>

        {/* 4-Step Progress Tracker */}
        {isProcessing && data?.stages && (
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.stages.map((stage, idx) => {
                const isCurrent = stage.status === "PROCESSING";
                const isDone = stage.status === "COMPLETED";

                return (
                  <div
                    key={stage.id}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                      isDone
                        ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-300"
                        : isCurrent
                        ? "bg-teal-950/60 border-teal-500 text-teal-200 animate-pulse"
                        : "bg-slate-900/50 border-slate-800 text-slate-500"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isDone ? "bg-emerald-600 text-white" : isCurrent ? "bg-teal-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isDone ? "✓" : idx + 1}
                    </div>
                    <span className="text-xs font-semibold truncate">{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Controls for Rejection */}
        {isRejected && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              size="sm"
              onClick={() => setShowResubmitModal(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl"
            >
              Fix Details & Resubmit
            </Button>
            {data?.canRequestReview && (
              <Button
                size="sm"
                variant="outline"
                disabled={submittingAppeal}
                onClick={handleRequestManualReview}
                className="border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                {submittingAppeal ? "Requesting..." : "Request Manual Review"}
              </Button>
            )}
            {appealSuccess && <span className="text-xs text-emerald-400 font-medium">{appealSuccess}</span>}
            {appealError && <span className="text-xs text-rose-400 font-medium">{appealError}</span>}
          </div>
        )}

        {/* Resubmit Modal */}
        {showResubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <h3 className="text-lg font-black text-slate-900">Correct Details & Resubmit</h3>
              <p className="text-xs text-slate-600">
                Update your license number or issuing authority if typos occurred during initial submission.
              </p>

              <form onSubmit={handleResubmit} className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">License / Registration Number</Label>
                  <Input
                    value={resubmitRegNumber}
                    onChange={(e) => setResubmitRegNumber(e.target.value)}
                    placeholder="e.g. KNC-123456 or TEST-OK-101"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Issuing Council / Authority</Label>
                  <Input
                    value={resubmitAuthority}
                    onChange={(e) => setResubmitAuthority(e.target.value)}
                    placeholder="e.g. Karnataka Nursing Council"
                    className="mt-1"
                  />
                </div>

                {resubmitError && <p className="text-xs text-rose-600 font-medium">{resubmitError}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowResubmitModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={resubmitting}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
                  >
                    {resubmitting ? "Resubmitting..." : "Submit for Verification"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

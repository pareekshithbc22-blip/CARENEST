"use client";

import * as React from "react";
import {
  Droplets,
  Activity,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Pill,
  CheckSquare,
  FileText,
  User,
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface PatientProfile {
  id: string;
  name: string;
  preferredName?: string | null;
  dateOfBirth?: string | Date;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string[];
  allergies?: string[];
}

export interface MetricRecord {
  id: string;
  timestamp: string;
  dateFormatted: string;
  timeFormatted: string;
  bloodGlucose: number | null;
  bloodPressure: string | null;
  systolic: number | null;
  diastolic: number | null;
  source: string;
  notes?: string | null;
  authorName?: string;
  sugarEvaluation?: {
    severity: "NORMAL" | "WARNING" | "CRITICAL";
    label: string;
    isAbnormal: boolean;
    message?: string;
  };
  bpEvaluation?: {
    severity: "NORMAL" | "WARNING" | "CRITICAL";
    label: string;
    isAbnormal: boolean;
    message?: string;
  };
}

interface CaretakerPatientMonitorProps {
  profiles: PatientProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onMedicationCreated?: () => void;
  onTaskCreated?: () => void;
}

export function CaretakerPatientMonitor({
  profiles,
  activeProfileId,
  onSelectProfile,
  onMedicationCreated,
  onTaskCreated,
}: CaretakerPatientMonitorProps) {
  const [timeframe, setTimeframe] = React.useState<"today" | "7d" | "30d" | "all">("7d");
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<MetricRecord[]>([]);
  const [latest, setLatest] = React.useState<MetricRecord | null>(null);
  const [lastSyncTime, setLastSyncTime] = React.useState<Date>(new Date());

  // Pagination cursor state
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = React.useState<string[]>([]);

  // Modals state
  const [showReadingModal, setShowReadingModal] = React.useState(false);
  const [showMedModal, setShowMedModal] = React.useState(false);
  const [showTaskModal, setShowTaskModal] = React.useState(false);

  // New Reading Form state (Blood Sugar & Blood Pressure only)
  const [sugarInput, setSugarInput] = React.useState("");
  const [systolicInput, setSystolicInput] = React.useState("");
  const [diastolicInput, setDiastolicInput] = React.useState("");
  const [readingNotes, setReadingNotes] = React.useState("");
  const [savingReading, setSavingReading] = React.useState(false);
  const [readingError, setReadingError] = React.useState<string | null>(null);

  // New Medication Form state
  const [medName, setMedName] = React.useState("");
  const [medStrength, setMedStrength] = React.useState("");
  const [medForm, setMedForm] = React.useState<string>("TABLET");
  const [medDosageInstructions, setMedDosageInstructions] = React.useState("Take 1 tablet after meals with water");
  const [medTimes, setMedTimes] = React.useState<string>("08:00, 20:00");
  const [savingMed, setSavingMed] = React.useState(false);
  const [medError, setMedError] = React.useState<string | null>(null);

  // New Task Form state
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDescription, setTaskDescription] = React.useState("");
  const [taskDueDate, setTaskDueDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [taskPriority, setTaskPriority] = React.useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [savingTask, setSavingTask] = React.useState(false);
  const [taskError, setTaskError] = React.useState<string | null>(null);

  const currentPatient = profiles.find((p) => p.id === activeProfileId) || profiles[0];
  const currentPatientId = currentPatient?.id;

  // Fetch metrics for selected profile
  const fetchMetrics = React.useCallback(
    async (targetCursor?: string | null, isBackground = false) => {
      if (!currentPatientId) return;
      if (!isBackground) setLoading(true);

      try {
        let url = `/api/health-metrics?profileId=${encodeURIComponent(currentPatientId)}&timeframe=${encodeURIComponent(timeframe)}&limit=15`;
        if (targetCursor) {
          url += `&cursor=${encodeURIComponent(targetCursor)}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.profileId === currentPatientId) {
            setHistory(data.history || []);
            setLatest(data.latest || null);
            setNextCursor(data.nextCursor || null);
            setLastSyncTime(new Date());
          }
        }
      } catch (err) {
        console.error("Failed to load metrics:", err);
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [currentPatientId, timeframe]
  );

  React.useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
    fetchMetrics(null, false);
  }, [fetchMetrics]);

  // Handle pagination
  const handleNextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, cursor || ""]);
    setCursor(nextCursor);
    fetchMetrics(nextCursor, false);
  };

  const handlePrevPage = () => {
    if (cursorHistory.length === 0) return;
    const prevHistory = [...cursorHistory];
    const prevCursor = prevHistory.pop() || null;
    setCursorHistory(prevHistory);
    setCursor(prevCursor);
    fetchMetrics(prevCursor, false);
  };

  // Submit Blood Sugar & Blood Pressure Reading
  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatientId) return;

    setSavingReading(true);
    setReadingError(null);

    const sugarVal = sugarInput ? parseFloat(sugarInput) : null;
    const sysVal = systolicInput ? parseInt(systolicInput, 10) : null;
    const diaVal = diastolicInput ? parseInt(diastolicInput, 10) : null;

    if (sugarVal === null && (sysVal === null || diaVal === null)) {
      setReadingError("Please enter Blood Sugar or both Systolic & Diastolic Blood Pressure.");
      setSavingReading(false);
      return;
    }

    try {
      const res = await fetch("/api/health-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId: currentPatientId,
          bloodGlucose: sugarVal,
          systolic: sysVal,
          diastolic: diaVal,
          notes: readingNotes.trim() || undefined,
          source: "Licensed Nurse / Caretaker Clinical Observation",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to record reading");
      }

      setSugarInput("");
      setSystolicInput("");
      setDiastolicInput("");
      setReadingNotes("");
      setShowReadingModal(false);
      fetchMetrics(cursor, false);
    } catch (err: any) {
      setReadingError(err.message || "Failed to record reading");
    } finally {
      setSavingReading(false);
    }
  };

  // Submit Medication Assignment
  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatientId) return;

    setSavingMed(true);
    setMedError(null);

    const timesArray = medTimes
      .split(",")
      .map((t) => t.trim())
      .filter((t) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t));

    if (timesArray.length === 0) {
      setMedError("Please enter valid times in 24-hour format (e.g. 08:00, 20:00)");
      setSavingMed(false);
      return;
    }

    try {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId: currentPatientId,
          name: medName.trim(),
          strength: medStrength.trim(),
          form: medForm,
          dosageInstructions: medDosageInstructions.trim(),
          frequency: "DAILY",
          timesOfDay: timesArray,
          initialStock: 30,
          unit: "tablets",
          refillThreshold: 7,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create medication");
      }

      setMedName("");
      setMedStrength("");
      setShowMedModal(false);
      if (onMedicationCreated) onMedicationCreated();
    } catch (err: any) {
      setMedError(err.message || "Failed to assign medication");
    } finally {
      setSavingMed(false);
    }
  };

  // Submit Care Task Assignment
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatientId) return;

    setSavingTask(true);
    setTaskError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId: currentPatientId,
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          dueDate: new Date(taskDueDate).toISOString(),
          priority: taskPriority,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create task");
      }

      setTaskTitle("");
      setTaskDescription("");
      setShowTaskModal(false);
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      setTaskError(err.message || "Failed to create task");
    } finally {
      setSavingTask(false);
    }
  };

  const getSeverityBadge = (severity?: "NORMAL" | "WARNING" | "CRITICAL") => {
    switch (severity) {
      case "CRITICAL":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
            Critical
          </Badge>
        );
      case "WARNING":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
            Warning
          </Badge>
        );
      case "NORMAL":
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
            Normal
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Information & Clinical Actions Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-400">
                Patient Clinical Overview
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500">
                Synced at {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {currentPatient ? (currentPatient.preferredName || currentPatient.name) : "No Patient Selected"}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-400">
              {currentPatient?.emergencyContactName && (
                <span>
                  <strong>Emergency Contact:</strong> {currentPatient.emergencyContactName} ({currentPatient.emergencyContactPhone})
                </span>
              )}
              {currentPatient?.allergies && currentPatient.allergies.length > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Allergies: {currentPatient.allergies.join(", ")}
                </span>
              )}
              {currentPatient?.medicalConditions && currentPatient.medicalConditions.length > 0 && (
                <span>
                  Conditions: {currentPatient.medicalConditions.join(", ")}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons: Record Vitals, Assign Med, Add Task */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => setShowReadingModal(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              <Activity className="h-4 w-4 mr-1.5" />
              Record Reading
            </Button>
            <Button
              type="button"
              onClick={() => setShowMedModal(true)}
              variant="outline"
              className="border-teal-700 text-teal-800 hover:bg-teal-50 font-bold text-xs rounded-xl"
            >
              <Pill className="h-4 w-4 mr-1.5" />
              Assign Medication
            </Button>
            <Button
              type="button"
              onClick={() => setShowTaskModal(true)}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl"
            >
              <CheckSquare className="h-4 w-4 mr-1.5" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Clinical Disclaimer Notice */}
        <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 italic">
          * Clinical notice: Default alert thresholds configured for monitoring, not medical advice.
        </p>
      </div>

      {/* Latest Vitals Overview: Blood Sugar & Blood Pressure Only */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blood Sugar Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Blood Sugar (Glucose)</h4>
                <p className="text-xs text-slate-500">Target: 70 - 140 mg/dL</p>
              </div>
            </div>
            {latest?.sugarEvaluation ? getSeverityBadge(latest.sugarEvaluation.severity) : (
              <Badge variant="outline" className="text-xs font-semibold">No Reading</Badge>
            )}
          </div>

          <div className="mt-5 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {latest?.bloodGlucose !== null && latest?.bloodGlucose !== undefined ? latest.bloodGlucose : "--"}
              </span>
              <span className="ml-1.5 text-xs font-bold text-slate-500">mg/dL</span>
            </div>
            {latest?.sugarEvaluation?.label && (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {latest.sugarEvaluation.label}
              </span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
            <span>Last recorded: {latest ? `${latest.dateFormatted} at ${latest.timeFormatted}` : "None"}</span>
            <span>{latest?.authorName ? `By ${latest.authorName}` : ""}</span>
          </div>
        </div>

        {/* Blood Pressure Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Blood Pressure</h4>
                <p className="text-xs text-slate-500">Target: 90-120 / 60-80 mmHg</p>
              </div>
            </div>
            {latest?.bpEvaluation ? getSeverityBadge(latest.bpEvaluation.severity) : (
              <Badge variant="outline" className="text-xs font-semibold">No Reading</Badge>
            )}
          </div>

          <div className="mt-5 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {latest?.systolic && latest?.diastolic
                  ? `${latest.systolic}/${latest.diastolic}`
                  : latest?.bloodPressure || "--/--"}
              </span>
              <span className="ml-1.5 text-xs font-bold text-slate-500">mmHg</span>
            </div>
            {latest?.bpEvaluation?.label && (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {latest.bpEvaluation.label}
              </span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
            <span>Last recorded: {latest ? `${latest.dateFormatted} at ${latest.timeFormatted}` : "None"}</span>
            <span>{latest?.authorName ? `By ${latest.authorName}` : ""}</span>
          </div>
        </div>
      </div>

      {/* Vitals History Table with Filters and Pagination */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Vitals History Table
            </h3>
            <p className="text-xs text-slate-500">
              Sequential clinical logs for blood sugar and blood pressure with status evaluations.
            </p>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTimeframe("today")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                timeframe === "today"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("7d")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                timeframe === "7d"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("30d")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                timeframe === "30d"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("all")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                timeframe === "all"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* History Table */}
        <div className="mt-4 overflow-x-auto">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Activity className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold">No vitals recorded for this timeframe</p>
              <p className="text-xs text-slate-400 mt-1">Use "Record Reading" above to log blood sugar or blood pressure.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Blood Sugar</th>
                  <th className="py-3 px-3">Blood Pressure</th>
                  <th className="py-3 px-3">Recorded By</th>
                  <th className="py-3 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {record.dateFormatted} <span className="text-slate-400">{record.timeFormatted}</span>
                    </td>
                    <td className="py-3 px-3">
                      {record.bloodGlucose !== null && record.bloodGlucose !== undefined ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">{record.bloodGlucose} mg/dL</span>
                          {record.sugarEvaluation && getSeverityBadge(record.sugarEvaluation.severity)}
                        </div>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {record.systolic && record.diastolic ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {record.systolic}/{record.diastolic} mmHg
                          </span>
                          {record.bpEvaluation && getSeverityBadge(record.bpEvaluation.severity)}
                        </div>
                      ) : record.bloodPressure ? (
                        <span className="font-bold text-slate-900 dark:text-white">{record.bloodPressure}</span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {record.authorName || record.source}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {record.notes || "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cursor Pagination Controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {history.length} records</span>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={cursorHistory.length === 0 || loading}
              className="text-xs h-8 px-2.5 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!nextCursor || loading}
              className="text-xs h-8 px-2.5 rounded-lg"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL 1: RECORD READING */}
      {showReadingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Record Patient Vitals
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter clinical observations for {currentPatient?.name}.
            </p>

            {readingError && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {readingError}
              </div>
            )}

            <form onSubmit={handleSaveReading} className="space-y-4">
              <div>
                <Label htmlFor="sugar" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Blood Sugar (Glucose, mg/dL)
                </Label>
                <Input
                  id="sugar"
                  type="number"
                  step="any"
                  placeholder="e.g. 105"
                  value={sugarInput}
                  onChange={(e) => setSugarInput(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sys" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Systolic BP (mmHg)
                  </Label>
                  <Input
                    id="sys"
                    type="number"
                    placeholder="e.g. 120"
                    value={systolicInput}
                    onChange={(e) => setSystolicInput(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="dia" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Diastolic BP (mmHg)
                  </Label>
                  <Input
                    id="dia"
                    type="number"
                    placeholder="e.g. 80"
                    value={diastolicInput}
                    onChange={(e) => setDiastolicInput(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="readingNotes" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Clinical Notes (Optional)
                </Label>
                <Textarea
                  id="readingNotes"
                  placeholder="Patient was relaxed, taken before morning dose..."
                  value={readingNotes}
                  onChange={(e) => setReadingNotes(e.target.value)}
                  className="mt-1 text-xs"
                  rows={2}
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReadingModal(false)}
                  disabled={savingReading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingReading}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold"
                >
                  {savingReading ? "Saving..." : "Save Reading"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN MEDICATION */}
      {showMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Assign Medication
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new medication and daily intake times for {currentPatient?.name}.
            </p>

            {medError && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {medError}
              </div>
            )}

            <form onSubmit={handleSaveMedication} className="space-y-4">
              <div>
                <Label htmlFor="medName" className="text-xs font-bold">
                  Medication Name *
                </Label>
                <Input
                  id="medName"
                  placeholder="e.g. Metformin or Lisinopril"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  required
                  className="mt-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="medStrength" className="text-xs font-bold">
                    Strength / Dose *
                  </Label>
                  <Input
                    id="medStrength"
                    placeholder="e.g. 500 mg"
                    value={medStrength}
                    onChange={(e) => setMedStrength(e.target.value)}
                    required
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="medForm" className="text-xs font-bold">
                    Form
                  </Label>
                  <select
                    id="medForm"
                    value={medForm}
                    onChange={(e) => setMedForm(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="TABLET">Tablet</option>
                    <option value="CAPSULE">Capsule</option>
                    <option value="SYRUP">Syrup</option>
                    <option value="INJECTION">Injection</option>
                    <option value="DROPS">Drops</option>
                    <option value="INHALER">Inhaler</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="medTimes" className="text-xs font-bold">
                  Schedule Times (comma-separated 24h format) *
                </Label>
                <Input
                  id="medTimes"
                  placeholder="08:00, 20:00"
                  value={medTimes}
                  onChange={(e) => setMedTimes(e.target.value)}
                  required
                  className="mt-1 text-sm"
                />
                <span className="text-[11px] text-slate-400">Example: 08:00, 14:00, 20:00</span>
              </div>

              <div>
                <Label htmlFor="medInst" className="text-xs font-bold">
                  Instructions
                </Label>
                <Input
                  id="medInst"
                  placeholder="Take 1 tablet after food with water"
                  value={medDosageInstructions}
                  onChange={(e) => setMedDosageInstructions(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMedModal(false)}
                  disabled={savingMed}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingMed}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold"
                >
                  {savingMed ? "Assigning..." : "Assign Medication"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN TASK */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Add Care Task
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Create a new care responsibility for {currentPatient?.name}.
            </p>

            {taskError && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {taskError}
              </div>
            )}

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <Label htmlFor="taskTitle" className="text-xs font-bold">
                  Task Title *
                </Label>
                <Input
                  id="taskTitle"
                  placeholder="e.g. Check morning blood sugar or Assist with mobility"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="taskDesc" className="text-xs font-bold">
                  Description (Optional)
                </Label>
                <Textarea
                  id="taskDesc"
                  placeholder="Clinical instructions or specific guidance..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="mt-1 text-xs"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="taskDueDate" className="text-xs font-bold">
                    Due Date
                  </Label>
                  <Input
                    id="taskDueDate"
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    required
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="taskPriority" className="text-xs font-bold">
                    Priority
                  </Label>
                  <select
                    id="taskPriority"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTaskModal(false)}
                  disabled={savingTask}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingTask}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold"
                >
                  {savingTask ? "Adding..." : "Add Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

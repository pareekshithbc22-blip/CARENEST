"use client";

import * as React from "react";
import {
  Droplets,
  Activity,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { evaluateBloodSugar, evaluateBloodPressure } from "@/lib/config";

export interface HealthMeasurement {
  id: string;
  timestamp: string;
  dateFormatted?: string;
  timeFormatted: string;
  bloodGlucose: number | null;
  bloodPressure: string | null;
  systolic: number | null;
  diastolic: number | null;
  source: string;
  notes?: string | null;
}

interface SeniorHealthMonitorProps {
  profileId: string;
  patientName: string;
  initialMeasurements: HealthMeasurement[];
  caretaker?: {
    name: string;
    phone?: string | null;
    role?: string;
  } | null;
}

export function SeniorHealthMonitor({
  profileId,
  patientName,
  initialMeasurements,
  caretaker,
}: SeniorHealthMonitorProps) {
  const [measurements, setMeasurements] = React.useState<HealthMeasurement[]>(initialMeasurements);
  const [showModal, setShowModal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form inputs: Blood Sugar & Blood Pressure ONLY
  const [bloodGlucose, setBloodGlucose] = React.useState("");
  const [systolic, setSystolic] = React.useState("");
  const [diastolic, setDiastolic] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const latest = measurements[0] || null;

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const sugarVal = bloodGlucose ? parseFloat(bloodGlucose) : null;
    const sysVal = systolic ? parseInt(systolic, 10) : null;
    const diaVal = diastolic ? parseInt(diastolic, 10) : null;

    if (sugarVal === null && (sysVal === null || diaVal === null)) {
      setFormError("Please enter Blood Sugar or both Systolic & Diastolic Blood Pressure.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/health-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId: profileId,
          bloodGlucose: sugarVal,
          systolic: sysVal,
          diastolic: diaVal,
          notes: notes.trim() || undefined,
          source: "Senior Patient (Self-Reported)",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to record reading");
      }

      const data = await res.json();
      const newMeasurement: HealthMeasurement = {
        id: data.measurement.id,
        timestamp: data.measurement.timestamp,
        timeFormatted: new Date(data.measurement.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dateFormatted: new Date(data.measurement.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        bloodGlucose: data.measurement.bloodGlucose,
        bloodPressure: data.measurement.bloodPressure,
        systolic: data.measurement.systolic,
        diastolic: data.measurement.diastolic,
        source: data.measurement.source,
        notes: data.measurement.notes,
      };

      setMeasurements((prev) => [newMeasurement, ...prev]);
      setBloodGlucose("");
      setSystolic("");
      setDiastolic("");
      setNotes("");
      setShowModal(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      setFormError(err.message || "Failed to save reading");
    } finally {
      setSaving(false);
    }
  };

  const sugarEval = latest ? evaluateBloodSugar(latest.bloodGlucose) : null;
  const bpEval = latest ? evaluateBloodPressure(latest.systolic, latest.diastolic) : null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-teal-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
                My Health Log
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              Blood Sugar & Blood Pressure
            </h2>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
              Easily record your readings here. Your caretaker and family will automatically see your updates.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setShowModal(true)}
            size="lg"
            className="h-14 px-6 text-base font-extrabold bg-teal-700 hover:bg-teal-800 text-white rounded-2xl shadow-md shrink-0"
          >
            <Plus className="h-6 w-6 mr-2" />
            Enter My Reading
          </Button>
        </div>

        {saveSuccess && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Reading saved! Your care team has been notified.</span>
          </div>
        )}
      </div>

      {/* Latest Readings Summary Cards (Large & High Contrast) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blood Sugar Card */}
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                <Droplets className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Blood Sugar</h3>
                <p className="text-xs font-semibold text-slate-500">Target: 70 - 140 mg/dL</p>
              </div>
            </div>
            {sugarEval && (
              <Badge
                className={`text-xs font-black px-3 py-1 ${
                  sugarEval.severity === "CRITICAL"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
                    : sugarEval.severity === "WARNING"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                }`}
              >
                {sugarEval.label}
              </Badge>
            )}
          </div>

          <div className="mt-6 flex items-baseline space-x-2">
            <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {latest?.bloodGlucose !== null && latest?.bloodGlucose !== undefined ? latest.bloodGlucose : "--"}
            </span>
            <span className="text-lg font-black text-slate-500">mg/dL</span>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
            {latest ? `Recorded on ${latest.dateFormatted || "Today"} at ${latest.timeFormatted}` : "No reading entered yet"}
          </p>
        </div>

        {/* Blood Pressure Card */}
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                <Activity className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Blood Pressure</h3>
                <p className="text-xs font-semibold text-slate-500">Target: 90-120 / 60-80</p>
              </div>
            </div>
            {bpEval && (
              <Badge
                className={`text-xs font-black px-3 py-1 ${
                  bpEval.severity === "CRITICAL"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
                    : bpEval.severity === "WARNING"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                }`}
              >
                {bpEval.label}
              </Badge>
            )}
          </div>

          <div className="mt-6 flex items-baseline space-x-2">
            <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {latest?.systolic && latest?.diastolic
                ? `${latest.systolic}/${latest.diastolic}`
                : latest?.bloodPressure || "--/--"}
            </span>
            <span className="text-lg font-black text-slate-500">mmHg</span>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
            {latest ? `Recorded on ${latest.dateFormatted || "Today"} at ${latest.timeFormatted}` : "No reading entered yet"}
          </p>
        </div>
      </div>

      {/* Assigned Caretaker Contact Card */}
      {caretaker && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 dark:border-teal-900 dark:bg-teal-950/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-700 text-white font-bold">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wider">
                My Assigned Nurse / Caretaker
              </p>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {caretaker.name}
              </h4>
            </div>
          </div>
          {caretaker.phone && (
            <a
              href={`tel:${caretaker.phone}`}
              className="inline-flex items-center space-x-2 bg-white text-teal-800 border border-teal-300 px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:bg-teal-50"
            >
              <Phone className="h-4 w-4 text-teal-700" />
              <span>Call Caretaker</span>
            </a>
          )}
        </div>
      )}

      {/* Recent History Table */}
      <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
          Past Readings
        </h3>

        {measurements.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <p className="text-sm font-semibold">No readings entered yet.</p>
            <p className="text-xs text-slate-400 mt-1">Tap &quot;Enter My Reading&quot; above to log your first reading.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {measurements.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {m.dateFormatted || "Today"} at {m.timeFormatted}
                  </span>
                  {m.notes && <p className="text-xs text-slate-500 mt-0.5">{m.notes}</p>}
                </div>
                <div className="flex items-center space-x-4 text-right">
                  {m.bloodGlucose !== null && m.bloodGlucose !== undefined && (
                    <div>
                      <span className="text-xs text-slate-400 block">Sugar</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{m.bloodGlucose} mg/dL</span>
                    </div>
                  )}
                  {m.systolic && m.diastolic && (
                    <div>
                      <span className="text-xs text-slate-400 block">Blood Pressure</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{m.systolic}/{m.diastolic}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enter Reading Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
              Enter Your Reading
            </h3>
            <p className="text-sm font-medium text-slate-500 mb-6">
              Enter your blood sugar or blood pressure reading below.
            </p>

            {formError && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveMeasurement} className="space-y-5">
              <div>
                <Label htmlFor="seniorSugar" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Blood Sugar (Glucose in mg/dL)
                </Label>
                <Input
                  id="seniorSugar"
                  type="number"
                  step="any"
                  placeholder="e.g. 110"
                  value={bloodGlucose}
                  onChange={(e) => setBloodGlucose(e.target.value)}
                  className="mt-1 h-12 text-base rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="seniorSys" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Systolic (Upper number)
                  </Label>
                  <Input
                    id="seniorSys"
                    type="number"
                    placeholder="e.g. 120"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="mt-1 h-12 text-base rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="seniorDia" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Diastolic (Lower number)
                  </Label>
                  <Input
                    id="seniorDia"
                    type="number"
                    placeholder="e.g. 80"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="mt-1 h-12 text-base rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="seniorNotes" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Notes (Optional)
                </Label>
                <Input
                  id="seniorNotes"
                  placeholder="e.g. Felt good, before breakfast..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 h-12 text-sm rounded-xl"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="h-12 px-5 text-sm font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-12 px-6 text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl"
                >
                  {saving ? "Saving..." : "Save My Reading"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

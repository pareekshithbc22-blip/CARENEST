"use client";

import * as React from "react";
import {
  Heart,
  Activity,
  Droplets,
  Thermometer,
  Wind,
  Weight,
  Plus,
  Clock,
  CheckCircle2,
  Phone,
  MessageCircle,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export interface HealthMeasurement {
  id: string;
  timestamp: string;
  dateFormatted?: string;
  timeFormatted: string;
  heartRate: number | null;
  bloodGlucose: number | null;
  bloodPressure: string | null;
  systolic: number | null;
  diastolic: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
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

  // Form inputs
  const [heartRate, setHeartRate] = React.useState("");
  const [bloodGlucose, setBloodGlucose] = React.useState("");
  const [systolic, setSystolic] = React.useState("");
  const [diastolic, setDiastolic] = React.useState("");
  const [temperature, setTemperature] = React.useState("");
  const [oxygenSaturation, setOxygenSaturation] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const previous = measurements.length > 1 ? measurements[measurements.length - 2] : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        elderlyProfileId: profileId,
        source: "Senior Patient (Self-Reported)",
        notes: notes || "Recorded via Senior Health Mode",
      };

      if (heartRate) payload.heartRate = Number(heartRate);
      if (bloodGlucose) payload.bloodGlucose = Number(bloodGlucose);
      if (systolic) payload.systolic = Number(systolic);
      if (diastolic) payload.diastolic = Number(diastolic);
      if (systolic && diastolic) payload.bloodPressure = `${systolic}/${diastolic}`;
      if (temperature) payload.temperature = Number(temperature);
      if (oxygenSaturation) payload.oxygenSaturation = Number(oxygenSaturation);
      if (weight) payload.weight = Number(weight);

      const res = await fetch("/api/health-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const rawDate = new Date(data.measurement.timestamp);
        const newRecord: HealthMeasurement = {
          ...data.measurement,
          dateFormatted: rawDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          timeFormatted: rawDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMeasurements((prev) => [...prev, newRecord]);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setShowModal(false);
          // reset form
          setHeartRate("");
          setBloodGlucose("");
          setSystolic("");
          setDiastolic("");
          setTemperature("");
          setOxygenSaturation("");
          setWeight("");
          setNotes("");
        }, 1500);
      } else {
        alert("Unable to save health reading. Please try again.");
      }
    } catch {
      alert("Network error while recording reading.");
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp clean link
  const caretakerPhoneRaw = caretaker?.phone || "6361963006";
  const cleanPhone = caretakerPhoneRaw.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${caretaker?.name || "Care Staff"}, this is ${patientName} from CareNest.`
  )}`;

  return (
    <section aria-labelledby="health-monitoring-heading" className="space-y-6 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-700 font-extrabold text-sm uppercase tracking-wider">
            <Activity className="h-5 w-5" />
            <span>Health & Vitals Overview</span>
          </div>
          <h2 id="health-monitoring-heading" className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            My Health Measurements
          </h2>
          <p className="text-sm font-medium text-slate-600 mt-0.5">
            Your readings are shared directly with your family and assigned caretakers.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="h-14 px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-base shadow-md flex items-center justify-center space-x-2 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-5 w-5 stroke-3" />
          <span>Record New Reading</span>
        </button>
      </div>

      {/* 6 Key Vital Measurement Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Heart Rate */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wide">Heart Rate</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Heart className="h-4 w-4 fill-rose-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {latest?.heartRate ? latest.heartRate : "--"}
            </span>
            <span className="text-xs font-bold text-slate-500">BPM</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>
              {latest?.heartRate && latest.timeFormatted
                ? `Logged at ${latest.timeFormatted}`
                : "No recent reading"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {previous?.heartRate ? `Previous: ${previous.heartRate} BPM` : "First measurement"}
          </span>
        </div>

        {/* Blood Glucose */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wide">Blood Glucose</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Droplets className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {latest?.bloodGlucose ? latest.bloodGlucose : "--"}
            </span>
            <span className="text-xs font-bold text-slate-500">mg/dL</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>
              {latest?.bloodGlucose && latest.timeFormatted
                ? `Logged at ${latest.timeFormatted}`
                : "No recent reading"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {previous?.bloodGlucose ? `Previous: ${previous.bloodGlucose} mg/dL` : "First measurement"}
          </span>
        </div>

        {/* Blood Pressure */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wide">Blood Pressure</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {latest?.bloodPressure ? latest.bloodPressure : "--"}
            </span>
            <span className="text-xs font-bold text-slate-500">mmHg</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>
              {latest?.bloodPressure && latest.timeFormatted
                ? `Logged at ${latest.timeFormatted}`
                : "No recent reading"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {previous?.bloodPressure ? `Previous: ${previous.bloodPressure}` : "First measurement"}
          </span>
        </div>

        {/* Temperature */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wide">Body Temp</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Thermometer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {latest?.temperature ? latest.temperature : "--"}
            </span>
            <span className="text-xs font-bold text-slate-500">°C</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>
              {latest?.temperature && latest.timeFormatted
                ? `Logged at ${latest.timeFormatted}`
                : "No recent reading"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {previous?.temperature ? `Previous: ${previous.temperature}°C` : "First measurement"}
          </span>
        </div>

        {/* Oxygen Saturation */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wide">Oxygen (SpO2)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Wind className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {latest?.oxygenSaturation ? `${latest.oxygenSaturation}%` : "--"}
            </span>
            <span className="text-xs font-bold text-slate-500">SpO2</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>
              {latest?.oxygenSaturation && latest.timeFormatted
                ? `Logged at ${latest.timeFormatted}`
                : "No recent reading"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {previous?.oxygenSaturation ? `Previous: ${previous.oxygenSaturation}%` : "First measurement"}
          </span>
        </div>

        {/* Body Weight */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wide">Weight</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Weight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {latest?.weight ? latest.weight : "--"}
            </span>
            <span className="text-xs font-bold text-slate-500">kg</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>
              {latest?.weight && latest.timeFormatted
                ? `Logged at ${latest.timeFormatted}`
                : "No recent reading"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {previous?.weight ? `Previous: ${previous.weight} kg` : "First measurement"}
          </span>
        </div>
      </div>

      {/* Historical Trend Chart (Clean & Friendly for Senior) */}
      {measurements.length > 0 && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-teal-700 font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="h-4 w-4" />
                <span>Health Trends</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Recent Heart Rate & Blood Glucose
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              {measurements.length} recorded reading{measurements.length > 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={measurements} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="timeFormatted"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as HealthMeasurement;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-900">{data.timeFormatted}</p>
                          {data.heartRate && (
                            <p className="text-rose-600 font-semibold">
                              Heart Rate: {data.heartRate} BPM
                            </p>
                          )}
                          {data.bloodGlucose && (
                            <p className="text-amber-600 font-semibold">
                              Glucose: {data.bloodGlucose} mg/dL
                            </p>
                          )}
                          {data.bloodPressure && (
                            <p className="text-teal-700 font-semibold">
                              BP: {data.bloodPressure} mmHg
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#e11d48"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#e11d48" }}
                  name="Heart Rate (BPM)"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="bloodGlucose"
                  stroke="#d97706"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#d97706" }}
                  name="Blood Glucose (mg/dL)"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center space-x-6 text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-rose-600" />
              <span>Heart Rate (BPM)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-amber-600" />
              <span>Blood Glucose (mg/dL)</span>
            </div>
          </div>
        </div>
      )}

      {/* Authorized Caretaker Contact & WhatsApp Section */}
      <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/70 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-teal-800 font-extrabold text-xs uppercase tracking-wider">
              <Shield className="h-4 w-4 text-teal-700" />
              <span>Assigned Healthcare Provider</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {caretaker?.name || "Marcus Reed, RN"}
            </h3>
            <p className="text-sm font-semibold text-teal-900">
              {caretaker?.role || "Licensed Caretaker & Nurse"} â€¢ On Active Shift
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`tel:${caretakerPhoneRaw}`}
              className="inline-flex h-12 items-center space-x-2 rounded-xl bg-teal-800 px-5 text-sm font-extrabold text-white hover:bg-teal-900 active:scale-95 shadow-xs transition-all"
            >
              <Phone className="h-4 w-4" />
              <span>Call Caretaker</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center space-x-2 rounded-xl bg-emerald-700 px-5 text-sm font-extrabold text-white hover:bg-emerald-800 active:scale-95 shadow-xs transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp Message</span>
            </a>
          </div>
        </div>
      </div>

      {/* Record Health Measurement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Record Health Reading
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your latest health measurements. Fill in what you have available.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                âœ•
              </button>
            </div>

            {saveSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-10 w-10 stroke-3" />
                </div>
                <h4 className="text-xl font-black text-slate-900">
                  Reading Saved Successfully!
                </h4>
                <p className="text-sm font-medium text-slate-600">
                  Your reading has been recorded and updated on your circle&apos;s live health monitors.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="sr-pulse" className="text-xs font-bold">
                      Heart Rate (BPM)
                    </Label>
                    <Input
                      id="sr-pulse"
                      type="number"
                      placeholder="e.g. 74"
                      className="h-11 font-semibold"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sr-sugar" className="text-xs font-bold">
                      Blood Glucose (mg/dL)
                    </Label>
                    <Input
                      id="sr-sugar"
                      type="number"
                      placeholder="e.g. 108"
                      className="h-11 font-semibold"
                      value={bloodGlucose}
                      onChange={(e) => setBloodGlucose(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="sr-sys" className="text-xs font-bold">
                      Systolic BP (mmHg)
                    </Label>
                    <Input
                      id="sr-sys"
                      type="number"
                      placeholder="e.g. 120"
                      className="h-11 font-semibold"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sr-dia" className="text-xs font-bold">
                      Diastolic BP (mmHg)
                    </Label>
                    <Input
                      id="sr-dia"
                      type="number"
                      placeholder="e.g. 80"
                      className="h-11 font-semibold"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="sr-temp" className="text-xs font-bold">
                      Temp (Â°C)
                    </Label>
                    <Input
                      id="sr-temp"
                      type="number"
                      step="0.1"
                      placeholder="36.8"
                      className="h-11 font-semibold"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sr-spo2" className="text-xs font-bold">
                      Oxygen (%)
                    </Label>
                    <Input
                      id="sr-spo2"
                      type="number"
                      placeholder="98"
                      className="h-11 font-semibold"
                      value={oxygenSaturation}
                      onChange={(e) => setOxygenSaturation(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sr-weight" className="text-xs font-bold">
                      Weight (kg)
                    </Label>
                    <Input
                      id="sr-weight"
                      type="number"
                      step="0.1"
                      placeholder="68.5"
                      className="h-11 font-semibold"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sr-notes" className="text-xs font-bold">
                    Personal Note / Feeling (Optional)
                  </Label>
                  <Input
                    id="sr-notes"
                    placeholder="e.g. Felt good after morning breakfast walk"
                    className="h-11"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Self-reported health measurement recorded into CareNest. Not autonomous continuous sensor monitoring.
                </p>

                <div className="flex items-center justify-end space-x-3 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="h-12 px-5 font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-12 px-8 bg-teal-700 hover:bg-teal-800 text-white font-black text-sm shadow-md"
                  >
                    {saving ? "Saving..." : "Save Measurement"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

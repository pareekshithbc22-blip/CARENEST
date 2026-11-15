"use client";

import * as React from "react";
import {
  Heart,
  Activity,
  Droplets,
  Thermometer,
  Wind,
  Weight,
  Radio,
  User,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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
  authorName?: string;
}

interface CaretakerPatientMonitorProps {
  profiles: PatientProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
}

export function CaretakerPatientMonitor({
  profiles,
  activeProfileId,
  onSelectProfile,
}: CaretakerPatientMonitorProps) {
  const [timeframe, setTimeframe] = React.useState<"today" | "7d" | "30d">("7d");
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<MetricRecord[]>([]);
  const [latest, setLatest] = React.useState<MetricRecord | null>(null);
  const [previous, setPrevious] = React.useState<MetricRecord | null>(null);
  const [lastSyncTime, setLastSyncTime] = React.useState<Date>(new Date());
  const [activeChart, setActiveChart] = React.useState<"heart" | "glucose" | "bp">("heart");

  const currentPatient = profiles.find((p) => p.id === activeProfileId) || profiles[0];
  const currentPatientId = currentPatient?.id;

  // Fetch metrics for currently selected profile & timeframe
  const fetchMetrics = React.useCallback(
    async (isBackground = false) => {
      if (!currentPatientId) return;
      if (!isBackground) setLoading(true);

      try {
        const res = await fetch(
          `/api/health-metrics?profileId=${encodeURIComponent(
            currentPatientId
          )}&timeframe=${encodeURIComponent(timeframe)}`
        );
        if (res.ok) {
          const data = await res.json();
          // Ensure data belongs strictly to the requested patient
          if (data.profileId === currentPatientId) {
            setHistory(data.history || []);
            setLatest(data.latest || null);
            setPrevious(data.previous || null);
            setLastSyncTime(new Date());
          }
        }
      } catch (err) {
        console.error("Failed to poll health metrics:", err);
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [currentPatientId, timeframe]
  );

  // Initial and profile-switch fetch
  React.useEffect(() => {
    fetchMetrics(false);
  }, [fetchMetrics]);

  // Live real-time polling (every 3.5 seconds)
  React.useEffect(() => {
    const timer = setInterval(() => {
      fetchMetrics(true);
    }, 3500);

    return () => clearInterval(timer);
  }, [fetchMetrics]);

  return (
    <div className="space-y-6">
      {/* Multi-Patient Selector Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-400">
                Live Patient Monitoring Active
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Assigned Patient Health Telemetry
            </h2>
            <p className="text-xs text-slate-500">
              Select an assigned patient to monitor their recorded vitals, trends, and clinical history in isolation.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 self-start sm:self-auto">
            <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
            <span>
              Synced: {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>

        {/* Patient Selection Tabs / Buttons */}
        <div className="pt-4 flex flex-wrap gap-2">
          {profiles.map((p) => {
            const isSelected = p.id === currentPatient?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProfile(p.id)}
                className={`flex items-center space-x-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <User className="h-4 w-4" />
                <span>{p.preferredName || p.name}</span>
                {isSelected && (
                  <Badge variant="outline" className="text-[9px] bg-teal-800 text-white border-teal-600 py-0 px-1.5">
                    Active
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Patient Health Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                Patient Health Telemetry
              </Badge>
              <span className="text-xs font-semibold text-slate-500">
                {currentPatient ? (currentPatient.preferredName || currentPatient.name) : "No Patient Selected"}
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {currentPatient?.preferredName || currentPatient?.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Isolated clinical view for {currentPatient?.name}. Health data is never blended with other patients.
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
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
              Last 7 Days
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
              Last 30 Days
            </button>
          </div>
        </div>

        {/* 6 Vital Sign Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Heart Rate */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Heart Rate</span>
              <Heart className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {latest?.heartRate ? latest.heartRate : "--"}
              </span>
              <span className="text-[11px] font-bold text-slate-500">BPM</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {previous?.heartRate && latest?.heartRate
                ? `Prev: ${previous.heartRate} BPM`
                : latest?.heartRate
                ? "First recorded"
                : "No data"}
            </div>
          </div>

          {/* Blood Glucose */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Glucose</span>
              <Droplets className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {latest?.bloodGlucose ? latest.bloodGlucose : "--"}
              </span>
              <span className="text-[11px] font-bold text-slate-500">mg/dL</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {previous?.bloodGlucose && latest?.bloodGlucose
                ? `Prev: ${previous.bloodGlucose} mg/dL`
                : latest?.bloodGlucose
                ? "First recorded"
                : "No data"}
            </div>
          </div>

          {/* Blood Pressure */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Blood Pressure</span>
              <Activity className="h-4 w-4 text-teal-600" />
            </div>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {latest?.bloodPressure ? latest.bloodPressure : "--"}
              </span>
              <span className="text-[10px] font-bold text-slate-500">mmHg</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {previous?.bloodPressure && latest?.bloodPressure
                ? `Prev: ${previous.bloodPressure}`
                : latest?.bloodPressure
                ? "First recorded"
                : "No data"}
            </div>
          </div>

          {/* Temperature */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Temp</span>
              <Thermometer className="h-4 w-4 text-orange-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {latest?.temperature ? latest.temperature : "--"}
              </span>
              <span className="text-[11px] font-bold text-slate-500">Â°C</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {previous?.temperature && latest?.temperature
                ? `Prev: ${previous.temperature}Â°C`
                : latest?.temperature
                ? "First recorded"
                : "No data"}
            </div>
          </div>

          {/* Oxygen Saturation */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">SpO2</span>
              <Wind className="h-4 w-4 text-sky-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {latest?.oxygenSaturation ? `${latest.oxygenSaturation}%` : "--"}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {previous?.oxygenSaturation && latest?.oxygenSaturation
                ? `Prev: ${previous.oxygenSaturation}%`
                : latest?.oxygenSaturation
                ? "First recorded"
                : "No data"}
            </div>
          </div>

          {/* Weight */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Weight</span>
              <Weight className="h-4 w-4 text-slate-600" />
            </div>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {latest?.weight ? latest.weight : "--"}
              </span>
              <span className="text-[11px] font-bold text-slate-500">kg</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {previous?.weight && latest?.weight
                ? `Prev: ${previous.weight} kg`
                : latest?.weight
                ? "First recorded"
                : "No data"}
            </div>
          </div>
        </div>

        {/* Separate Patient Health Graphs */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Patient Physiological Trends
              </h4>
              <p className="text-xs text-slate-500">
                Visualizing recorded measurements for {currentPatient?.name} ({timeframe})
              </p>
            </div>

            {/* Metric Chart Selector */}
            <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveChart("heart")}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  activeChart === "heart"
                    ? "bg-rose-50 text-rose-700 shadow-2xs dark:bg-rose-950 dark:text-rose-300"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Heart Rate (BPM)
              </button>
              <button
                type="button"
                onClick={() => setActiveChart("glucose")}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  activeChart === "glucose"
                    ? "bg-amber-50 text-amber-700 shadow-2xs dark:bg-amber-950 dark:text-amber-300"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Glucose (mg/dL)
              </button>
              <button
                type="button"
                onClick={() => setActiveChart("bp")}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  activeChart === "bp"
                    ? "bg-teal-50 text-teal-700 shadow-2xs dark:bg-teal-950 dark:text-teal-300"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Blood Pressure (mmHg)
              </button>
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Loading telemetry data...
            </div>
          ) : history.length === 0 ? (
            <div className="h-64 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
              <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No health measurements recorded for {currentPatient?.name} in this timeframe.
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                When the patient or an authorized caregiver logs a measurement, it will appear here instantly without refreshing the page.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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
                        const rec = payload[0].payload as MetricRecord;
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-xs space-y-1 dark:border-slate-800 dark:bg-slate-900">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {rec.dateFormatted} â€¢ {rec.timeFormatted}
                            </div>
                            <div className="text-[11px] text-slate-500">Source: {rec.source}</div>
                            {rec.heartRate && (
                              <div className="text-rose-600 font-semibold">
                                Heart Rate: {rec.heartRate} BPM
                              </div>
                            )}
                            {rec.bloodGlucose && (
                              <div className="text-amber-600 font-semibold">
                                Glucose: {rec.bloodGlucose} mg/dL
                              </div>
                            )}
                            {rec.bloodPressure && (
                              <div className="text-teal-700 font-semibold">
                                BP: {rec.bloodPressure} mmHg
                              </div>
                            )}
                            {rec.temperature && (
                              <div className="text-orange-600 font-semibold">
                                Temp: {rec.temperature}Â°C
                              </div>
                            )}
                            {rec.oxygenSaturation && (
                              <div className="text-sky-600 font-semibold">
                                SpO2: {rec.oxygenSaturation}%
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {activeChart === "heart" && (
                    <Line
                      type="monotone"
                      dataKey="heartRate"
                      stroke="#e11d48"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#e11d48" }}
                      name="Heart Rate (BPM)"
                      connectNulls
                    />
                  )}

                  {activeChart === "glucose" && (
                    <Line
                      type="monotone"
                      dataKey="bloodGlucose"
                      stroke="#d97706"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#d97706" }}
                      name="Blood Glucose (mg/dL)"
                      connectNulls
                    />
                  )}

                  {activeChart === "bp" && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="systolic"
                        stroke="#0f766e"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#0f766e" }}
                        name="Systolic (mmHg)"
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="diastolic"
                        stroke="#0284c7"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: "#0284c7" }}
                        name="Diastolic (mmHg)"
                        connectNulls
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Individual Measurement History Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <FileText className="h-4 w-4 text-teal-700" />
              <span>Historical Measurement Records ({history.length})</span>
            </h4>
            <span className="text-[11px] text-slate-400">Chronological telemetry audit</span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No historical logs available for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] dark:border-slate-800">
                    <th className="py-2 pr-3">Timestamp</th>
                    <th className="py-2 px-2">Heart Rate</th>
                    <th className="py-2 px-2">Glucose</th>
                    <th className="py-2 px-2">Blood Pressure</th>
                    <th className="py-2 px-2">Temp</th>
                    <th className="py-2 px-2">SpO2</th>
                    <th className="py-2 px-2">Weight</th>
                    <th className="py-2 pl-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[...history].reverse().map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 pr-3 font-medium text-slate-700 dark:text-slate-300">
                        {r.dateFormatted} â€¢ {r.timeFormatted}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-rose-600">
                        {r.heartRate ? `${r.heartRate} BPM` : "--"}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-amber-600">
                        {r.bloodGlucose ? `${r.bloodGlucose} mg/dL` : "--"}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-teal-700 dark:text-teal-400">
                        {r.bloodPressure ? `${r.bloodPressure} mmHg` : "--"}
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-slate-600 dark:text-slate-400">
                        {r.temperature ? `${r.temperature}Â°C` : "--"}
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-sky-600">
                        {r.oxygenSaturation ? `${r.oxygenSaturation}%` : "--"}
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-slate-600 dark:text-slate-400">
                        {r.weight ? `${r.weight} kg` : "--"}
                      </td>
                      <td className="py-2.5 pl-2">
                        <Badge variant="outline" className="text-[10px]">
                          {r.source}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Clinical Safety Notice: Measurements are logged manually via CareNest. Not continuous biometric sensor hardware. Does not formulate medical diagnoses.
          </div>
        </div>
      </div>
    </div>
  );
}

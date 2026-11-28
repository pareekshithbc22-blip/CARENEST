"use client";

import * as React from "react";
import { CLINICAL_THRESHOLDS } from "@/lib/config";
import { Activity, Clock, Table, LineChart, Info } from "lucide-react";

export interface VitalReadingItem {
  id: string;
  recordedAt: string;
  bloodGlucose?: number | null;
  bloodPressure?: string | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  sugarSeverity?: string;
  bpSeverity?: string;
  authorName?: string;
}

interface LiveVitalChartsProps {
  patientId: string;
  patientName: string;
  vitals: VitalReadingItem[];
  onRangeChange?: (range: "live" | "24h" | "7d" | "14d") => void;
  isLoading?: boolean;
}

export type TimeRange = "live" | "24h" | "7d" | "14d";

export function LiveVitalCharts({
  patientId,
  patientName,
  vitals,
  onRangeChange,
  isLoading,
}: LiveVitalChartsProps) {
  const [range, setRange] = React.useState<TimeRange>("live");
  const [viewMode, setViewMode] = React.useState<"chart" | "table">("chart");
  const [activeTooltip, setActiveTooltip] = React.useState<{
    x: number;
    y: number;
    title: string;
    value: string;
    time: string;
    severity: string;
  } | null>(null);

  const handleRangeSelect = (r: TimeRange) => {
    setRange(r);
    onRangeChange?.(r);
  };

  // Filter and sort readings based on selected time range
  const filteredReadings = React.useMemo(() => {
    const list = [...vitals].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    const now = Date.now();
    if (range === "live") {
      return list.slice(-20);
    }
    if (range === "24h") {
      const cutoff = now - 24 * 3600 * 1000;
      const res = list.filter((r) => new Date(r.recordedAt).getTime() >= cutoff);
      return res.length > 0 ? res : list.slice(-10);
    }
    if (range === "7d") {
      const cutoff = now - 7 * 24 * 3600 * 1000;
      const res = list.filter((r) => new Date(r.recordedAt).getTime() >= cutoff);
      return res.length > 0 ? res : list.slice(-14);
    }
    if (range === "14d") {
      const cutoff = now - 14 * 24 * 3600 * 1000;
      const res = list.filter((r) => new Date(r.recordedAt).getTime() >= cutoff);
      return res.length > 0 ? res : list;
    }
    return list.slice(-20);
  }, [vitals, range]);

  const latestReading = vitals[vitals.length - 1] || null;
  const lastUpdatedTime = latestReading
    ? new Date(latestReading.recordedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "No readings yet";

  // SVG Chart Dimensions
  const svgWidth = 560;
  const svgHeight = 180;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 20;
  const padBottom = 30;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Min Y: 40, Max Y: 300 for Sugar
  const sugarMinY = 40;
  const sugarMaxY = 300;
  const getSugarY = (val: number) => {
    const clamped = Math.max(sugarMinY, Math.min(sugarMaxY, val));
    return padTop + chartH - ((clamped - sugarMinY) / (sugarMaxY - sugarMinY)) * chartH;
  };

  const sugarPoints = filteredReadings
    .filter((r) => r.bloodGlucose !== null && r.bloodGlucose !== undefined)
    .map((r, idx, arr) => {
      const x = padLeft + (arr.length > 1 ? (idx / (arr.length - 1)) * chartW : chartW / 2);
      const y = getSugarY(r.bloodGlucose!);
      return { x, y, val: r.bloodGlucose!, date: r.recordedAt, severity: r.sugarSeverity || "NORMAL" };
    });

  const sugarLinePath = sugarPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");

  // Min Y: 40, Max Y: 200 for BP
  const bpMinY = 40;
  const bpMaxY = 200;
  const getBpY = (val: number) => {
    const clamped = Math.max(bpMinY, Math.min(bpMaxY, val));
    return padTop + chartH - ((clamped - bpMinY) / (bpMaxY - bpMinY)) * chartH;
  };

  const bpReadings = filteredReadings.filter((r) => {
    const sys = r.bloodPressureSystolic;
    const dia = r.bloodPressureDiastolic;
    return sys !== null && sys !== undefined && dia !== null && dia !== undefined;
  });

  const sysPoints = bpReadings.map((r, idx, arr) => {
    const x = padLeft + (arr.length > 1 ? (idx / (arr.length - 1)) * chartW : chartW / 2);
    const y = getBpY(r.bloodPressureSystolic!);
    return { x, y, val: r.bloodPressureSystolic!, date: r.recordedAt, severity: r.bpSeverity || "NORMAL" };
  });

  const diaPoints = bpReadings.map((r, idx, arr) => {
    const x = padLeft + (arr.length > 1 ? (idx / (arr.length - 1)) * chartW : chartW / 2);
    const y = getBpY(r.bloodPressureDiastolic!);
    return { x, y, val: r.bloodPressureDiastolic!, date: r.recordedAt, severity: r.bpSeverity || "NORMAL" };
  });

  const sysLinePath = sysPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  const diaLinePath = diaPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");

  return (
    <div className="bg-card text-card-foreground border rounded-xl shadow-xs p-4 space-y-4">
      {/* Header with Live Indicator, Range Selector, and Accessible Table Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm tracking-tight">Clinical Vitals Telemetry</h3>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Last updated: {lastUpdatedTime}</span>
              <span className="mx-1">•</span>
              <span>Patient: {patientName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Time Range Pills */}
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
            {(["live", "24h", "7d", "14d"] as TimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRangeSelect(r)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  range === r
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "live" ? "Live" : r === "24h" ? "24h" : r === "7d" ? "7d" : "14d"}
              </button>
            ))}
          </div>

          {/* View as Table Toggle (Accessibility) */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "chart" ? "table" : "chart")}
            title={viewMode === "chart" ? "View as accessible table" : "View as interactive charts"}
            className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-1"
            aria-label={viewMode === "chart" ? "Switch to tabular view" : "Switch to graphical view"}
          >
            {viewMode === "chart" ? (
              <>
                <Table className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[11px] font-medium">Table</span>
              </>
            ) : (
              <>
                <LineChart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[11px] font-medium">Chart</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="py-2 text-center text-xs text-muted-foreground animate-pulse">
          Loading telemetry data...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredReadings.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No telemetry readings recorded for this patient yet.
        </div>
      ) : null}

      {/* VIEW MODE: ACCESSIBLE DATA TABLE */}
      {viewMode === "table" && filteredReadings.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs border-collapse" aria-label="Clinical vitals data table">
            <caption className="sr-only">Sequential clinical measurements of blood sugar and blood pressure</caption>
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-semibold">
                <th scope="col" className="p-2.5">Date & Time</th>
                <th scope="col" className="p-2.5">Blood Sugar</th>
                <th scope="col" className="p-2.5">Sugar Status</th>
                <th scope="col" className="p-2.5">Blood Pressure</th>
                <th scope="col" className="p-2.5">BP Status</th>
                <th scope="col" className="p-2.5">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReadings.slice().reverse().map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                    {new Date(r.recordedAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-2.5 font-medium">{r.bloodGlucose ? `${r.bloodGlucose} mg/dL` : "—"}</td>
                  <td className="p-2.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.sugarSeverity === "CRITICAL"
                          ? "bg-rose-500/15 text-rose-600"
                          : r.sugarSeverity === "WARNING"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/15 text-emerald-600"
                      }`}
                    >
                      {r.sugarSeverity || "NORMAL"}
                    </span>
                  </td>
                  <td className="p-2.5 font-medium">{r.bloodPressure || (r.bloodPressureSystolic && r.bloodPressureDiastolic ? `${r.bloodPressureSystolic}/${r.bloodPressureDiastolic}` : "—")} mmHg</td>
                  <td className="p-2.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.bpSeverity === "CRITICAL"
                          ? "bg-rose-500/15 text-rose-600"
                          : r.bpSeverity === "WARNING"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/15 text-emerald-600"
                      }`}
                    >
                      {r.bpSeverity || "NORMAL"}
                    </span>
                  </td>
                  <td className="p-2.5 text-muted-foreground">{r.authorName || "Care Staff"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewMode === "chart" && filteredReadings.length > 0 ? (
        /* VIEW MODE: INTERACTIVE LIGHTWEIGHT SVG CHARTS */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1. BLOOD SUGAR (mg/dL) CHART */}
          <div className="p-3 rounded-lg border bg-card/50 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                <span className="font-semibold text-xs">Blood Sugar (mg/dL)</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Normal: 70–140 | Warning: 141–250
              </span>
            </div>

            <div className="relative w-full aspect-[28/11]">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="realSugarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Threshold Bands */}
                <rect
                  x={padLeft}
                  y={padTop}
                  width={chartW}
                  height={getSugarY(250) - padTop}
                  fill="#f43f5e"
                  fillOpacity="0.08"
                />
                <rect
                  x={padLeft}
                  y={getSugarY(250)}
                  width={chartW}
                  height={getSugarY(140) - getSugarY(250)}
                  fill="#f59e0b"
                  fillOpacity="0.08"
                />
                <rect
                  x={padLeft}
                  y={getSugarY(140)}
                  width={chartW}
                  height={getSugarY(70) - getSugarY(140)}
                  fill="#10b981"
                  fillOpacity="0.08"
                />
                <rect
                  x={padLeft}
                  y={getSugarY(70)}
                  width={chartW}
                  height={padTop + chartH - getSugarY(70)}
                  fill="#f43f5e"
                  fillOpacity="0.08"
                />

                {/* Guide lines and Labels */}
                {[70, 140, 250].map((th) => (
                  <g key={th}>
                    <line
                      x1={padLeft}
                      y1={getSugarY(th)}
                      x2={padLeft + chartW}
                      y2={getSugarY(th)}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.6"
                    />
                    <text
                      x={padLeft - 6}
                      y={getSugarY(th) + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#64748b"
                      className="font-mono font-medium"
                    >
                      {th}
                    </text>
                  </g>
                ))}

                {/* Sugar Area Fill */}
                {sugarPoints.length > 1 && (
                  <path
                    d={`${sugarLinePath} L ${sugarPoints[sugarPoints.length - 1].x} ${padTop + chartH} L ${
                      sugarPoints[0].x
                    } ${padTop + chartH} Z`}
                    fill="url(#realSugarGradient)"
                  />
                )}

                {/* Sugar Line */}
                <path d={sugarLinePath} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />

                {/* Sugar Points */}
                {sugarPoints.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={sugarPoints.length > 15 ? "3" : "4"}
                    fill={pt.severity === "CRITICAL" ? "#e11d48" : pt.severity === "WARNING" ? "#d97706" : "#0d9488"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:scale-150 transition-transform"
                    onMouseEnter={() =>
                      setActiveTooltip({
                        x: pt.x,
                        y: pt.y,
                        title: "Blood Sugar",
                        value: `${pt.val} mg/dL`,
                        time: new Date(pt.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        severity: pt.severity,
                      })
                    }
                    onMouseLeave={() => setActiveTooltip(null)}
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* 2. BLOOD PRESSURE (mmHg) CHART */}
          <div className="p-3 rounded-lg border bg-card/50 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                  <span className="font-semibold text-xs">Systolic</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                  <span className="font-semibold text-xs">Diastolic</span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Normal &lt;120/80 | Alert &gt;140/90
              </span>
            </div>

            <div className="relative w-full aspect-[28/11]">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                {/* Threshold Bands */}
                <rect
                  x={padLeft}
                  y={padTop}
                  width={chartW}
                  height={getBpY(160) - padTop}
                  fill="#f43f5e"
                  fillOpacity="0.08"
                />
                <rect
                  x={padLeft}
                  y={getBpY(160)}
                  width={chartW}
                  height={getBpY(120) - getBpY(160)}
                  fill="#f59e0b"
                  fillOpacity="0.08"
                />
                <rect
                  x={padLeft}
                  y={getBpY(120)}
                  width={chartW}
                  height={getBpY(80) - getBpY(120)}
                  fill="#10b981"
                  fillOpacity="0.08"
                />

                {/* Guide lines and Labels */}
                {[80, 120, 160].map((th) => (
                  <g key={th}>
                    <line
                      x1={padLeft}
                      y1={getBpY(th)}
                      x2={padLeft + chartW}
                      y2={getBpY(th)}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.6"
                    />
                    <text
                      x={padLeft - 6}
                      y={getBpY(th) + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#64748b"
                      className="font-mono font-medium"
                    >
                      {th}
                    </text>
                  </g>
                ))}

                {/* Systolic Line */}
                <path d={sysLinePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />

                {/* Diastolic Line */}
                <path d={diaLinePath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />

                {/* Systolic Points */}
                {sysPoints.map((pt, i) => (
                  <circle
                    key={`sys-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={sysPoints.length > 15 ? "3" : "4"}
                    fill="#6366f1"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:scale-150 transition-transform"
                    onMouseEnter={() =>
                      setActiveTooltip({
                        x: pt.x,
                        y: pt.y,
                        title: "Systolic BP",
                        value: `${pt.val} mmHg`,
                        time: new Date(pt.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        severity: pt.severity,
                      })
                    }
                    onMouseLeave={() => setActiveTooltip(null)}
                  />
                ))}

                {/* Diastolic Points */}
                {diaPoints.map((pt, i) => (
                  <circle
                    key={`dia-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={diaPoints.length > 15 ? "3" : "4"}
                    fill="#0284c7"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:scale-150 transition-transform"
                    onMouseEnter={() =>
                      setActiveTooltip({
                        x: pt.x,
                        y: pt.y,
                        title: "Diastolic BP",
                        value: `${pt.val} mmHg`,
                        time: new Date(pt.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        severity: pt.severity,
                      })
                    }
                    onMouseLeave={() => setActiveTooltip(null)}
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      ) : null}

      {/* Floating Hover Tooltip */}
      {activeTooltip && (
        <div
          className="pointer-events-none fixed z-50 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] shadow-lg border border-slate-800 -translate-x-1/2 -translate-y-12"
          style={{ left: activeTooltip.x, top: activeTooltip.y }}
        >
          <div className="font-bold flex items-center gap-1.5">
            <span>{activeTooltip.title}:</span>
            <span className="text-amber-300 font-mono">{activeTooltip.value}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-300">
            <span>{activeTooltip.time}</span>
            <span
              className={`font-semibold ${
                activeTooltip.severity === "CRITICAL"
                  ? "text-rose-400"
                  : activeTooltip.severity === "WARNING"
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {activeTooltip.severity}
            </span>
          </div>
        </div>
      )}

      {/* Disclaimer footnote matching CLINICAL_THRESHOLDS */}
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3 shrink-0" />
        <span>Clinical note: {CLINICAL_THRESHOLDS.DISCLAIMER}. Threshold bands derived from clinical configuration.</span>
      </p>
    </div>
  );
}

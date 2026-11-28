"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  RotateCcw,
  LogOut,
  UserCheck,
  Users,
  HeartHandshake,
  Activity,
  Zap,
  ZapOff,
  FastForward,
} from "lucide-react";
import {
  resetDemoState,
  getDemoState,
  setActiveCaretakerId,
  setActiveFamilyAdminId,
  setActiveSeniorPatientId,
  switchDemoRoleContext,
  setSimulationActive,
  simulateRandomReading,
  subscribeToDemoUpdates,
  getCaretakerPatientCount,
  fastForwardTime,
} from "./store";

export function DemoBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [resetting, setResetting] = React.useState(false);
  const [state, setState] = React.useState(() => getDemoState());

  React.useEffect(() => {
    const unsub = subscribeToDemoUpdates((newState) => {
      setState({ ...newState });
    });
    return unsub;
  }, []);

  // 10-Second Deterministic Telemetry Simulator
  React.useEffect(() => {
    if (!state.simulationActive) return;

    const interval = setInterval(() => {
      simulateRandomReading();
    }, 10000);

    return () => clearInterval(interval);
  }, [state.simulationActive]);

  const handleReset = () => {
    setResetting(true);
    resetDemoState();
    setTimeout(() => {
      setResetting(false);
      window.location.reload();
    }, 200);
  };

  const isCaretaker = pathname.includes("/demo/caretaker");
  const isFamily = pathname.includes("/demo/family");
  const isSenior = pathname.includes("/demo/senior");

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 border-b border-amber-600 px-3 py-2 shadow-sm font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Banner Label & Telemetry Simulation Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-amber-400 shrink-0 font-extrabold text-[10px]">
              !
            </span>
            <span>
              <strong>DEMO MODE:</strong> sample data, nothing here is real and nothing is saved.
            </span>
          </div>

          {/* Simulate Live Readings Toggle */}
          <div className="flex items-center gap-1.5 bg-amber-600/30 px-2 py-0.5 rounded-lg border border-amber-600/50">
            <button
              type="button"
              onClick={() => setSimulationActive(!state.simulationActive)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                state.simulationActive
                  ? "bg-emerald-950 text-emerald-300 shadow-xs"
                  : "bg-slate-800 text-slate-300"
              }`}
              title="Toggle simulated telemetry reading generator (every 10s)"
            >
              {state.simulationActive ? (
                <>
                  <Zap className="h-3 w-3 text-emerald-400 animate-pulse" />
                  <span>Simulate: ON</span>
                </>
              ) : (
                <>
                  <ZapOff className="h-3 w-3 text-slate-400" />
                  <span>Simulate: OFF</span>
                </>
              )}
            </button>
            <span className="text-[10px] text-slate-900 font-medium hidden sm:inline">
              (adds readings every 10s)
            </span>
          </div>
        </div>

        {/* Role Switcher, Role-Aware "Viewing as" Selectors & Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Caretaker "Viewing as" selector if on Caretaker demo */}
          {isCaretaker && (
            <div className="flex items-center gap-1 bg-amber-600/40 px-2 py-0.5 rounded-lg border border-amber-600/60">
              <span className="font-bold text-[11px] text-slate-900">Viewing as:</span>
              <select
                value={state.activeCaretakerId}
                onChange={(e) => setActiveCaretakerId(e.target.value)}
                className="bg-slate-950 text-amber-200 font-semibold text-[11px] rounded px-1.5 py-0.5 border border-amber-500/50 focus:outline-hidden"
                aria-label="Select Caretaker profile to view"
              >
                {state.caretakers.map((c) => {
                  const count = getCaretakerPatientCount(state, c.user.id);
                  return (
                    <option key={c.user.id} value={c.user.id}>
                      {c.user.name} ({count}/5)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Family Administrator "Viewing as" selector if on Family demo */}
          {isFamily && (
            <div className="flex items-center gap-1 bg-amber-600/40 px-2 py-0.5 rounded-lg border border-amber-600/60">
              <span className="font-bold text-[11px] text-slate-900">Viewing as:</span>
              <select
                value={state.activeFamilyAdminId || state.familyAdmins?.[0]?.id || state.familyUser.id}
                onChange={(e) => setActiveFamilyAdminId(e.target.value)}
                className="bg-slate-950 text-amber-200 font-semibold text-[11px] rounded px-1.5 py-0.5 border border-amber-500/50 focus:outline-hidden"
                aria-label="Select Family Administrator to view"
              >
                {(state.familyAdmins || [state.familyUser]).map((fa) => {
                  const count = state.patients.filter((p) => p.familyAdminId === fa.id).length;
                  return (
                    <option key={fa.id} value={fa.id}>
                      {fa.name} ({count} {count === 1 ? "patient" : "patients"})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Senior Patient "Viewing as" selector if on Senior demo */}
          {isSenior && (
            <div className="flex items-center gap-1 bg-amber-600/40 px-2 py-0.5 rounded-lg border border-amber-600/60">
              <span className="font-bold text-[11px] text-slate-900">Viewing as:</span>
              <select
                value={state.activeSeniorPatientId || state.patients[0]?.id}
                onChange={(e) => setActiveSeniorPatientId(e.target.value)}
                className="bg-slate-950 text-amber-200 font-semibold text-[11px] rounded px-1.5 py-0.5 border border-amber-500/50 focus:outline-hidden"
                aria-label="Select Senior Patient to view"
              >
                {state.patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.patientCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Role Navigation Pills with Context Preservation */}
          <div className="bg-amber-600/40 p-0.5 rounded-lg flex items-center gap-1 border border-amber-600/60">
            <Link
              href="/demo/caretaker"
              onClick={(e) => {
                e.preventDefault();
                const url = switchDemoRoleContext("CARETAKER");
                router.push(url);
              }}
              className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all flex items-center gap-1 ${
                isCaretaker
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-900 hover:bg-amber-400"
              }`}
            >
              <UserCheck className="h-3 w-3" />
              <span>Caretaker</span>
            </Link>

            <Link
              href="/demo/family"
              onClick={(e) => {
                e.preventDefault();
                const url = switchDemoRoleContext("FAMILY");
                router.push(url);
              }}
              className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all flex items-center gap-1 ${
                isFamily
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-900 hover:bg-amber-400"
              }`}
            >
              <Users className="h-3 w-3" />
              <span>Family Admin</span>
            </Link>

            <Link
              href="/demo/senior"
              onClick={(e) => {
                e.preventDefault();
                const url = switchDemoRoleContext("SENIOR");
                router.push(url);
              }}
              className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all flex items-center gap-1 ${
                isSenior
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-900 hover:bg-amber-400"
              }`}
            >
              <HeartHandshake className="h-3 w-3" />
              <span>Senior Patient</span>
            </Link>
          </div>

          {/* Fast-forward 30 minutes Button (Requirement 6) */}
          <button
            type="button"
            onClick={() => fastForwardTime(30)}
            title="Fast-forward the demo clock by 30 minutes to trigger missed doses and schedule alerts"
            className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg border border-amber-600/50 flex items-center gap-1 transition-colors text-[11px]"
          >
            <FastForward className="h-3 w-3" />
            <span>Fast-forward 30m</span>
            {state.timeOffsetMinutes > 0 && (
              <span className="font-mono text-[10px] text-slate-950 bg-amber-300 px-1 rounded font-extrabold">
                +{state.timeOffsetMinutes}m
              </span>
            )}
          </button>

          {/* Reset Demo Button */}
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            title="Reset demo data to initial seed"
            className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg border border-amber-600/50 flex items-center gap-1 transition-colors text-[11px]"
          >
            <RotateCcw className={`h-3 w-3 ${resetting ? "animate-spin" : ""}`} />
            <span>Reset demo</span>
          </button>

          {/* Exit Demo Button */}
          <Link
            href="/"
            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1 transition-colors text-[11px] shadow-xs"
          >
            <LogOut className="h-3 w-3 text-amber-400" />
            <span>Exit demo</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

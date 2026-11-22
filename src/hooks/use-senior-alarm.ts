"use client";

import * as React from "react";

export interface DueDose {
  id: string;
  medicationName: string;
  strength: string;
  form?: string;
  scheduledAt: string;
  status: string;
}

interface UseSeniorAlarmOptions {
  dueDoses: DueDose[];
  onConfirmDose?: (doseId: string) => Promise<void>;
  onSkipDose?: (doseId: string) => Promise<void>;
}

export function useSeniorAlarm({
  dueDoses,
  onConfirmDose,
  onSkipDose,
}: UseSeniorAlarmOptions) {
  const [audioEnabled, setAudioEnabled] = React.useState<boolean>(false);
  const [isMuted, setIsMuted] = React.useState<boolean>(false);
  const [volume, setVolume] = React.useState<number>(0.8);
  const [isRinging, setIsRinging] = React.useState<boolean>(false);
  const [activeDose, setActiveDose] = React.useState<DueDose | null>(null);

  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const gainNodeRef = React.useRef<GainNode | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const tabIdRef = React.useRef<string>(`tab_${Math.random().toString(36).substring(2, 9)}`);
  const broadcastRef = React.useRef<BroadcastChannel | null>(null);

  // Check session storage on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = sessionStorage.getItem("carenest_senior_audio_enabled");
    if (saved === "true") {
      setAudioEnabled(true);
    }

    try {
      if ("BroadcastChannel" in window) {
        broadcastRef.current = new BroadcastChannel("carenest_senior_alarm_channel");
      }
    } catch (e) {
      console.warn("[BroadcastChannel init]", e);
    }

    return () => {
      stopAlarm();
      broadcastRef.current?.close();
    };
  }, []);

  // Initialize or resume AudioContext
  const enableAudio = React.useCallback(async () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      setAudioEnabled(true);
      sessionStorage.setItem("carenest_senior_audio_enabled", "true");
    } catch (err) {
      console.error("[Web Audio init error]:", err);
    }
  }, []);

  // Sound generator tone: pulse of two harmonious tones
  const playPulse = React.useCallback(() => {
    if (!audioCtxRef.current || isMuted || volume <= 0) return;

    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.36);

      // Trigger mobile vibration if supported
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.warn("[Audio pulse error]", e);
    }
  }, [isMuted, volume]);

  const startAlarm = React.useCallback(
    (dose: DueDose) => {
      // Check multi-tab lock
      const currentMaster = localStorage.getItem("carenest_alarm_active_tab");
      const lastPing = parseInt(localStorage.getItem("carenest_alarm_last_ping") || "0", 10);
      const isLockStale = Date.now() - lastPing > 4000;

      if (currentMaster && currentMaster !== tabIdRef.current && !isLockStale) {
        // Another active tab is ringing; suppress double sound in this tab
        setActiveDose(dose);
        setIsRinging(true);
        return;
      }

      // Claim lock
      localStorage.setItem("carenest_alarm_active_tab", tabIdRef.current);
      localStorage.setItem("carenest_alarm_last_ping", Date.now().toString());

      setActiveDose(dose);
      setIsRinging(true);

      if (intervalRef.current) clearInterval(intervalRef.current);

      playPulse();
      intervalRef.current = setInterval(() => {
        localStorage.setItem("carenest_alarm_last_ping", Date.now().toString());
        playPulse();
      }, 2000);
    },
    [playPulse]
  );

  const stopAlarm = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const currentMaster = localStorage.getItem("carenest_alarm_active_tab");
    if (currentMaster === tabIdRef.current) {
      localStorage.removeItem("carenest_alarm_active_tab");
      localStorage.removeItem("carenest_alarm_last_ping");
    }
    setIsRinging(false);
    setActiveDose(null);
  }, []);

  // Monitor due doses
  React.useEffect(() => {
    // A dose is due if it is scheduled for today and status is "SCHEDULED" and scheduledAt <= now + 5 min
    const now = Date.now();
    const urgentDue = dueDoses.find((d) => {
      if (d.status !== "SCHEDULED") return false;
      const scheduledMs = new Date(d.scheduledAt).getTime();
      return scheduledMs <= now + 5 * 60 * 1000;
    });

    if (urgentDue) {
      if (!isRinging || activeDose?.id !== urgentDue.id) {
        startAlarm(urgentDue);
      }
    } else {
      if (isRinging) {
        stopAlarm();
      }
    }
  }, [dueDoses, isRinging, activeDose?.id, startAlarm, stopAlarm]);

  const confirmDoseWithAlarmStop = React.useCallback(
    async (doseId: string) => {
      stopAlarm();
      if (onConfirmDose) {
        await onConfirmDose(doseId);
      }
    },
    [onConfirmDose, stopAlarm]
  );

  const skipDoseWithAlarmStop = React.useCallback(
    async (doseId: string) => {
      stopAlarm();
      if (onSkipDose) {
        await onSkipDose(doseId);
      }
    },
    [onSkipDose, stopAlarm]
  );

  return {
    audioEnabled,
    enableAudio,
    isMuted,
    toggleMute: () => setIsMuted((m) => !m),
    volume,
    setVolume,
    isRinging,
    activeDose,
    stopAlarm,
    confirmDoseWithAlarmStop,
    skipDoseWithAlarmStop,
  };
}

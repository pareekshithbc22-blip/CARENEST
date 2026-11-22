"use client";

import * as React from "react";

export interface SnapshotData {
  changed: boolean;
  serverTime: string;
  profileIds?: string[];
  doses?: any[];
  readings?: any[];
  tasks?: any[];
  notifications?: any[];
  unreadNotificationsCount?: number;
}

interface UseDashboardPollingOptions {
  role: "caretaker" | "family" | "senior";
  onUpdate?: (data: SnapshotData) => void;
  enabled?: boolean;
}

export function useDashboardPolling({
  role,
  onUpdate,
  enabled = true,
}: UseDashboardPollingOptions) {
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorCount, setErrorCount] = React.useState(0);
  const sinceRef = React.useRef<string | null>(new Date().toISOString());
  const onUpdateRef = React.useRef(onUpdate);

  React.useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const fetchSnapshot = React.useCallback(async () => {
    if (!enabled) return;
    setIsRefreshing(true);

    try {
      const url = new URL(`/api/snapshots/${role}`, window.location.origin);
      if (sinceRef.current) {
        url.searchParams.set("since", sinceRef.current);
      }

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Snapshot fetch failed with status ${res.status}`);
      }

      const data: SnapshotData = await res.json();
      if (data.serverTime) {
        sinceRef.current = data.serverTime;
      }
      setLastUpdated(new Date());
      setErrorCount(0);

      if (data.changed && onUpdateRef.current) {
        onUpdateRef.current(data);
      }
    } catch (err) {
      console.warn("[CareNest Dashboard Polling Warn]:", err);
      setErrorCount((prev) => Math.min(prev + 1, 5));
    } finally {
      setIsRefreshing(false);
    }
  }, [enabled, role]);

  React.useEffect(() => {
    if (!enabled) return;

    let timeoutId: NodeJS.Timeout;

    const scheduleNextPoll = () => {
      // 15 seconds when visible, 60 seconds when hidden
      const isVisible = typeof document !== "undefined" && document.visibilityState === "visible";
      const baseInterval = isVisible ? 15000 : 60000;

      // Exponential backoff if consecutive errors occur
      const backoffMultiplier = Math.pow(1.5, errorCount);
      const delay = Math.min(baseInterval * backoffMultiplier, 120000);

      timeoutId = setTimeout(async () => {
        await fetchSnapshot();
        scheduleNextPoll();
      }, delay);
    };

    // Initial background tick after 15 seconds
    scheduleNextPoll();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab became visible again, immediately trigger refresh and reschedule
        clearTimeout(timeoutId);
        fetchSnapshot();
        scheduleNextPoll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, errorCount, fetchSnapshot]);

  const refreshNow = React.useCallback(async () => {
    await fetchSnapshot();
  }, [fetchSnapshot]);

  return {
    lastUpdated,
    isRefreshing,
    refreshNow,
  };
}

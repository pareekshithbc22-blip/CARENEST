"use client";

import {
  getDemoState,
  confirmDemoDose,
  skipDemoDose,
  recordDemoVital,
  assignDemoMedication,
  createDemoTask,
  markDemoNotificationRead,
  runSimulatedScheduler,
} from "./store";

let isInterceptorActive = false;
let originalFetch: typeof window.fetch | null = null;
let schedulerIntervalId: any = null;

// Whitelisted demo path prefixes
const WHITELISTED_PATHS = [
  "/api/auth/session",
  "/api/snapshots/",
  "/api/notifications",
  "/api/doses",
  "/api/health-metrics",
  "/api/medications",
  "/api/tasks",
  "/api/notes",
  "/api/appointments",
  "/api/patients/discover",
  "/api/family/caretaker-requests",
  "/api/analytics",
];

function isWhitelisted(pathname: string): boolean {
  return WHITELISTED_PATHS.some((prefix) => pathname.startsWith(prefix));
}

function getActiveDemoRole(): "CARETAKER" | "FAMILY" | "SENIOR" {
  if (typeof window === "undefined") return "CARETAKER";
  const path = window.location.pathname;
  if (path.includes("/demo/senior")) return "SENIOR";
  if (path.includes("/demo/family")) return "FAMILY";
  return "CARETAKER";
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getGlobalObject(): any {
  if (typeof window !== "undefined") return window;
  if (typeof globalThis !== "undefined") return globalThis;
  return global;
}

export function setupDemoFetchInterceptor(): () => void {
  const g = getGlobalObject();
  if (!g) return () => {};
  if (isInterceptorActive) return teardownDemoFetchInterceptor;

  originalFetch = g.fetch;
  isInterceptorActive = true;

  // Run initial scheduler check and start 10s simulated periodic scheduler
  runSimulatedScheduler();
  schedulerIntervalId = setInterval(() => {
    runSimulatedScheduler();
  }, 10000);

  g.fetch = async function demoFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    
    // Parse relative or absolute URL
    let url: URL;
    try {
      const origin = g.location?.origin || "http://localhost:3000";
      url = new URL(urlString, origin);
    } catch {
      return jsonResponse({ error: "Invalid URL in demo" }, 400);
    }

    const pathname = url.pathname;
    const method = (init?.method || "GET").toUpperCase();

    // If outside the whitelist or not an /api call, reject safely
    if (!pathname.startsWith("/api/")) {
      return originalFetch ? originalFetch(input, init) : jsonResponse({ error: "Not allowed in demo" }, 403);
    }

    if (!isWhitelisted(pathname)) {
      console.warn(`[CareNest Demo Mode] Blocked non-whitelisted call to ${pathname}`);
      return jsonResponse({ error: "Endpoint blocked in demo mode" }, 404);
    }

    const state = getDemoState();
    const currentRole = getActiveDemoRole();

    // 1. Session Endpoint
    if (pathname === "/api/auth/session") {
      let activeUser = state.caretakerUser;
      if (currentRole === "FAMILY") activeUser = state.familyUser;
      if (currentRole === "SENIOR") activeUser = state.seniorUser;

      return jsonResponse({
        user: {
          id: activeUser.id,
          name: activeUser.name,
          email: activeUser.email,
          role: activeUser.role,
          avatarUrl: activeUser.avatarUrl,
          twoFactorEnabled: true,
          twoFactorVerified: true,
          isEmailVerified: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
    }

    // 2. Snapshot Delta Endpoints
    if (pathname.startsWith("/api/snapshots/")) {
      const targetRole = pathname.split("/").pop() || "caretaker";
      const user =
        targetRole === "senior"
          ? state.seniorUser
          : targetRole === "family"
          ? state.familyUser
          : state.caretakerUser;

      const userNotifications = state.notifications.filter((n) => n.userId === user.id);
      const unreadCount = userNotifications.filter((n) => !n.isRead).length;

      return jsonResponse({
        role: targetRole,
        unreadCount,
        recentNotifications: userNotifications.slice(0, 5),
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Notifications Endpoints
    if (pathname === "/api/notifications") {
      const user =
        currentRole === "SENIOR"
          ? state.seniorUser
          : currentRole === "FAMILY"
          ? state.familyUser
          : state.caretakerUser;

      const userNotifications = state.notifications.filter((n) => n.userId === user.id);
      const unreadCount = userNotifications.filter((n) => !n.isRead).length;

      return jsonResponse({
        notifications: userNotifications,
        unreadCount,
      });
    }

    const readMatch = pathname.match(/\/api\/notifications\/([^/]+)\/read/);
    if (readMatch && (method === "POST" || method === "PATCH")) {
      const notifId = readMatch[1];
      markDemoNotificationRead(notifId);
      return jsonResponse({ success: true, id: notifId });
    }

    // 4. Doses Endpoints
    if (pathname === "/api/doses" && method === "GET") {
      const profileId = url.searchParams.get("profileId");
      let doses = state.scheduledDoses;
      if (profileId) {
        doses = doses.filter((d) => d.elderlyProfileId === profileId);
      }
      return jsonResponse({ doses });
    }

    const confirmMatch = pathname.match(/\/api\/doses\/([^/]+)\/confirm/);
    if (confirmMatch && method === "POST") {
      const doseId = confirmMatch[1];
      let body: any = {};
      try {
        if (init?.body) body = JSON.parse(init.body as string);
      } catch {}
      const updated = confirmDemoDose(doseId, body.confirmationNotes);
      if (!updated) return jsonResponse({ error: "Dose not found in demo" }, 404);
      return jsonResponse({ success: true, dose: updated });
    }

    const skipMatch = pathname.match(/\/api\/doses\/([^/]+)\/skip/);
    if (skipMatch && method === "POST") {
      const doseId = skipMatch[1];
      let body: any = {};
      try {
        if (init?.body) body = JSON.parse(init.body as string);
      } catch {}
      const updated = skipDemoDose(doseId, body.reason || "Skipped in demo");
      if (!updated) return jsonResponse({ error: "Dose not found in demo" }, 404);
      return jsonResponse({ success: true, dose: updated });
    }

    // 5. Health Metrics Endpoints
    if (pathname === "/api/health-metrics") {
      if (method === "GET") {
        const profileId = url.searchParams.get("profileId") || state.patients[0].id;
        const patientVitals = state.vitals.filter((v) => v.elderlyProfileId === profileId);
        return jsonResponse({
          profileId,
          history: patientVitals.map((v) => ({
            id: v.id,
            elderlyProfileId: v.elderlyProfileId,
            bloodGlucose: v.bloodGlucose,
            bloodPressure: v.bloodPressure,
            systolic: v.bloodPressureSystolic,
            diastolic: v.bloodPressureDiastolic,
            notes: v.notes,
            recordedAt: v.recordedAt,
            authorName: v.authorName,
            sugarEvaluation: {
              severity: v.sugarSeverity,
              label: v.sugarSeverity === "CRITICAL" ? "Critical" : v.sugarSeverity === "WARNING" ? "Warning" : "Normal",
              isAbnormal: v.sugarSeverity !== "NORMAL",
            },
            bpEvaluation: {
              severity: v.bpSeverity,
              label: v.bpSeverity === "CRITICAL" ? "Critical" : v.bpSeverity === "WARNING" ? "Warning" : "Normal",
              isAbnormal: v.bpSeverity !== "NORMAL",
            },
          })),
          latest: patientVitals[0] || null,
          nextCursor: null,
        });
      }

      if (method === "POST") {
        let body: any = {};
        try {
          if (init?.body) body = JSON.parse(init.body as string);
        } catch {}

        const profileId = body.elderlyProfileId || state.patients[0].id;
        const newReading = recordDemoVital(
          profileId,
          body.bloodGlucose ? Number(body.bloodGlucose) : null,
          body.bloodPressureSystolic ? Number(body.bloodPressureSystolic) : null,
          body.bloodPressureDiastolic ? Number(body.bloodPressureDiastolic) : null,
          body.notes
        );

        return jsonResponse({
          success: true,
          note: newReading,
        });
      }
    }

    // 6. Medications Endpoints
    if (pathname === "/api/medications") {
      if (method === "GET") {
        const profileId = url.searchParams.get("profileId");
        let meds = state.medications;
        if (profileId) {
          meds = meds.filter((m) => m.elderlyProfileId === profileId);
        }
        return jsonResponse({
          medications: meds.map((m) => ({
            ...m,
            schedules: m.times.map((t, idx) => ({ id: `s-${idx}`, timeOfDay: t, isActive: true })),
          })),
        });
      }

      if (method === "POST") {
        let body: any = {};
        try {
          if (init?.body) body = JSON.parse(init.body as string);
        } catch {}

        const newMed = assignDemoMedication(body.elderlyProfileId || state.patients[0].id, {
          name: body.name,
          dosage: body.dosage || "1 tablet",
          frequency: body.frequency || "DAILY",
          instructions: body.instructions || "Take with water",
          times: Array.isArray(body.times) ? body.times : [body.timeOfDay || "09:00"],
        });

        return jsonResponse({ success: true, medication: newMed });
      }
    }

    // 7. Tasks Endpoints
    if (pathname === "/api/tasks") {
      if (method === "GET") {
        const profileId = url.searchParams.get("profileId");
        let tasks = state.tasks;
        if (profileId) {
          tasks = tasks.filter((t) => t.elderlyProfileId === profileId);
        }
        return jsonResponse({
          tasks: tasks.map((t) => ({
            ...t,
            assignedTo: { id: "caretaker-1", name: t.assignedToName, role: "CARETAKER" },
          })),
        });
      }

      if (method === "POST") {
        let body: any = {};
        try {
          if (init?.body) body = JSON.parse(init.body as string);
        } catch {}

        const newTask = createDemoTask(
          body.elderlyProfileId || state.patients[0].id,
          body.title || "New Care Task",
          body.description,
          body.dueDate,
          body.priority
        );

        return jsonResponse({ success: true, task: newTask });
      }
    }

    // 8. Care Notes Endpoints
    if (pathname === "/api/notes") {
      if (method === "GET") {
        const profileId = url.searchParams.get("profileId");
        let notes = state.notes;
        if (profileId) {
          notes = notes.filter((n) => n.elderlyProfileId === profileId);
        }
        return jsonResponse({
          notes: notes.map((n) => ({
            ...n,
            author: { id: "caretaker-1", name: n.authorName, role: "CARETAKER" },
          })),
        });
      }
    }

    // 9. Appointments Endpoints
    if (pathname === "/api/appointments") {
      return jsonResponse({
        appointments: [
          {
            id: "appt-1",
            title: "Cardiology Review",
            appointmentDate: new Date(Date.now() + 86400000 * 3).toISOString(),
            location: "Metro Heart Institute, Suite 402",
            doctorName: "Dr. Arvind Roy, MD",
            status: "UPCOMING",
          },
        ],
      });
    }

    // 10. Patient Discovery Endpoint
    if (pathname === "/api/patients/discover") {
      return jsonResponse({
        patients: state.patients.map((p) => ({
          id: p.id,
          name: p.name,
          age: 75,
          gender: p.gender,
          bloodGroup: p.bloodGroup,
          conditions: p.medicalConditions,
        })),
      });
    }

    // 11. Family Caretaker Requests Endpoint
    if (pathname === "/api/family/caretaker-requests") {
      return jsonResponse({ requests: [] });
    }

    // 12. Analytics Endpoint
    if (pathname === "/api/analytics") {
      return jsonResponse({
        adherenceRate: 92,
        totalScheduled: state.scheduledDoses.length,
        totalTaken: state.scheduledDoses.filter((d) => d.status === "TAKEN").length,
      });
    }

    return jsonResponse({ error: "Unhandled demo path" }, 404);
  };

  return teardownDemoFetchInterceptor;
}

export function teardownDemoFetchInterceptor(): void {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
  }
  const g = getGlobalObject();
  if (originalFetch && isInterceptorActive && g) {
    g.fetch = originalFetch;
    originalFetch = null;
    isInterceptorActive = false;
  }
}

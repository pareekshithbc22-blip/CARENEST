# Real Application Parity & Architecture Guide: CARENEST

This document details the complete implementation of the 15 specification features in the real CARENEST application across all three roles (**Caretaker**, **Family Administrator**, and **Senior Patient**), powered by real PostgreSQL database models, server APIs, and server-side authorization.

---

## 1. Architecture Overview

The system strictly adheres to the Clean Domain & Service Architecture:
- **Pure Domain Functions (`src/lib/domain/**`)**: Zero external dependencies, pure business logic, 100% testable in isolation.
- **Server Services (`src/lib/services/**`)**: Database operations, row-level locking, sequence allocation, server-side role validation.
- **API Endpoints (`src/app/api/**`)**: HTTP request handling, session/token verification, status codes, input sanitation.
- **Role Dashboards**: Real React components wired via polling (`useDashboardPolling`) to live backend endpoints.
- **Strict Demo Mode Isolation**: `src/demo/**` and `src/app/demo/**` remain strictly in-memory with zero Prisma or real database imports.

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  Family Dashboard  │  Caretaker Dashboard  │ Senior Dashboard│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON & Polling
┌──────────────────────────────▼──────────────────────────────┐
│                    Next.js App Router                       │
│    /api/caretakers/*  │  /api/tasks/*  │  /api/medications  │
│    /api/notes/*       │  /api/doses/*  │  /api/health-metrics│
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   Server Service Layer                      │
│  patient-service.ts  │ caretaker-service.ts │ task-service.ts│
│  medication-service  │ care-note-service.ts │ unread-marker  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Pure Domain Layer (Zero-Dep)               │
│  patient-code.ts │ caretaker-capacity.ts │ requests.ts      │
│  dose-status.ts  │ clinical-thresholds   │ task-suggestions │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                 PostgreSQL (Neon) Database                  │
│  PatientCodeCounter │ CareTask │ DailyTaskCompletion        │
│  Medication │ ScheduledDose │ CareNote │ UnreadMarker       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Implemented Features (F1 – F15)

### F1: Sequential Patient ID (`PT-0001`, `PT-0002`...)
- **Mechanism**: Atomic counter model `PatientCodeCounter` in PostgreSQL. Allocation runs in a single transaction (`allocateNextPatientCode` in `src/lib/services/patient-service.ts`), incrementing atomically so race conditions are impossible.
- **Format**: `formatPatientCode(seq)` pads numbers to 4 digits prefixed by `PT-`.
- **Backfill Script**: `scripts/backfill-patient-codes.ts` supports `--dry-run` and safely assigns sequential IDs to legacy records.

### F2: Caretaker Professional Details
- **Fields Added to `CaretakerProfile`**: `specialization`, `yearsOfExperience`, `backgroundSummary`.
- **Discovery Endpoint**: `GET /api/caretakers/discover` surfaces verified caretakers with their specializations, experience, and live capacity counts.
- **Profile Update Endpoint**: `PATCH /api/caretakers/profile` allows caretakers to update these details.

### F3: Add Senior Patient + Choose Caretaker
- **UI Modal**: `AddElderlyProfileModal` in Family Dashboard requires caretaker selection from `/api/caretakers/discover`.
- **Capacity Display**: Caretakers are sorted with available slots first, showing badges such as `"3 of 5 patients, 2 slots free"`. Caretakers at 5/5 capacity are disabled with `"Fully booked"`.
- **Initial State**: On submission, patient is created with `"Awaiting <caretaker> approval"` status and an access request is dispatched.

### F4: Request, Accept, Reject State Machine
- **State Flow**: `PENDING` → `ACCEPTED` | `REJECTED` | `CANCELLED`.
- **Pre-Acceptance Redaction**: Before a caretaker accepts a request, sensitive patient details (notes, vitals history, full address) are redacted by `redactPatientDetailsForRequest()`. Only name, age, patient ID (`patientCode`), and family administrator name are visible.
- **Decline Tracking**: Declining appends the caretaker ID to the patient's `declinedCaretakerIds` array so they do not show up as recommendations for that patient again.
- **Family Cancellation**: Family administrators can cancel a pending request using `POST /api/family/caretaker-requests/[id]/cancel`.

### F5: Maximum 5 Patients per Caretaker
- **Header Badge**: Caretaker dashboard displays live capacity `"Patients: n / 5"`.
- **Server Enforcement**: `respondToCaretakerRequest` in `src/lib/services/access-request-service.ts` counts current active assignments inside a database transaction. If the count reaches 5, acceptance is rejected with an HTTP 409 Conflict error.

### F6: Prescribe Medicine in Medications Tab
- **Form Fields**: Caretakers can prescribe medications directly via `POST /api/medications`:
  - `name`: Medication name.
  - `strengthNumber` & `strengthUnit`: e.g. `500` `mg`.
  - `form`: Tablet, Capsule, Liquid, Injection, etc.
  - `timesOfDay`: e.g. `["08:00", "20:00"]`.
  - `durationDays`: Duration in days (1 to 365).
  - `reason`: Clinical reason for prescription.
- **Schedule Generation**: Automatically provisions `ScheduledDose` entries for the full prescription timeline.

### F7: Stock Update by Senior Patient
- **Patient Control**: Senior dashboard "All medicines" tab features an "Update stock" button with an inline counter (0–999) and Save/Cancel buttons.
- **API**: Calls `PATCH /api/medications/[id]` with `{ stockCount: number }`.
- **Real-Time Display**: Renders as `"<n> tablets left, updated by patient <time> ago"` across Caretaker and Family dashboards.
- **Low Stock Chip**: Warns when `stockCount <= 5`.

### F8: Daily Tasks with Age-Based Clinical Presets
- **Caretaker Form**: Caretakers can assign daily tasks via `POST /api/tasks` with clinical suggestion presets:
  - Ages 60–69: Brisk walking (20 min), Hydration tracking (1.5L), Blood pressure check.
  - Ages 70–79: Gentle mobility exercises (15 min), Hydration (1.2L), Blood glucose test.
  - Ages 80+: Supervised balance exercises, Assisted hydration, Vitals check.
- **Custom Tasks**: Caretakers can also enter custom titles, descriptions, and schedules.
- **7-Day History**: Caretakers and families can view the last 7 days of completion chips.

### F9: Task Completion Belongs to Senior Only
- **Server Authorization**: `POST /api/tasks/[id]/complete` strictly verifies that `session.user.role === "SENIOR"`. If a Caretaker or Family Administrator attempts to mark a task complete, the server returns **403 Forbidden**.
- **Senior UI**: Senior dashboard features a prominent "Today's Daily Tasks" section with large high-contrast touch buttons to complete daily activities. Caretaker and Family dashboards render task histories in read-only mode.

### F10: Health Condition Updates (Care Notes)
- **Clinical Condition Dropdown**: Caretaker note creation form is upgraded to "Health Condition Update" with statuses:
  - `STABLE` (Green)
  - `IMPROVING` (Blue)
  - `NEEDS_ATTENTION` (Amber)
  - `CRITICAL` (Red)
- **Quick Fields**: Appetite, Mood, Sleep Quality, Pain Level (0–10), and Mobility.
- **Condition Chips**: The latest health condition chip is rendered prominently on patient cards and header panels in both Family and Caretaker dashboards.

### F11: Family Administrator Program Tabs
- **Tabs per Senior**:
  1. **Tasks assigned by caretaker**: 7-day completion timeline.
  2. **Medicines assigned by caretaker**: Active medications, scheduled dosage times, and stock counts.
  3. **Care notes from caretaker**: Health condition chips, observations, and assessment metrics.
- **Unread Notification Badges**: Unread indicator dot appears on tabs when new notes or task assignments exist. Opening the tab invokes `POST /api/unread` with `{ tab: "notes" | "tasks" | "meds" }` to mark them as read.

### F12: Unified Dose Status for Caretaker and Family
- **Card**: "Today's medicines" displayed at the top of Caretaker and Family patient detail panels.
- **Live Status Chips**:
  - `Taken`: Scheduled time, actual taken timestamp, and attribution (`"by patient"` or `"by caretaker"`).
  - `Skipped`: Scheduled time and documented reason.
  - `Overdue`: Past scheduled time but within the 15-minute grace period.
  - `Missed`: Past the 15-minute grace period without confirmation.
  - `Pending`: Future scheduled dose.

### F13: Forgotten Tablet Scheduler & Escalation
- **Escalation Service (`src/lib/escalation/service.ts`)**:
  - Automatically evaluates scheduled doses past the 15-minute grace window.
  - Transitions dose status to `MISSED`.
  - Dispatches targeted notifications to both Caretaker and Family Administrator:
    `"<patient name> (PT-xxxx) has not taken <medicine> scheduled at <time>."`
  - Utilizes deterministic deduplication keys (`dedupKey: missed-dose-<doseId>`) to prevent duplicate alerts.

### F14: Live Health Telemetry Graphs (Caretaker)
- **Component**: `src/components/charts/live-vital-charts.tsx`.
- **Metrics**: Blood Sugar (mg/dL) and Blood Pressure (Systolic/Diastolic mmHg).
- **Time Ranges**: `Live`, `24h`, `7d`, and `14d` via `GET /api/health-metrics/ranges`.
- **Threshold Bands**: Normal, Warning, and Critical visual bands.
- **Accessibility**: Includes an accessible data table view for screen readers and tabular review.

### F15: Live Dashboard Polling
- **Hook**: `useDashboardPolling` configured with a 15-second visible interval and a 60-second background/hidden interval.
- **Endpoints**: Refreshes patient snapshots, today's doses, health metrics, and unread markers in the background without layout shift.

---

## 3. Database Schema Changes (Additive Only)

All database changes in `prisma/schema.prisma` are strictly additive and backward compatible:

```prisma
// 1. New Enum Value
enum AccessRequestStatus {
  PENDING
  ACCEPTED
  REJECTED
  CANCELLED // ADDED
}

// 2. ElderlyProfile additions
model ElderlyProfile {
  // Existing fields retained...
  patientCode          String?          @unique
  declinedCaretakerIds String[]         @default([])
  assignmentStatus     String?          @default("NONE")
  unreadMarkers        UnreadMarker[]
}

// 3. CaretakerProfile additions
model CaretakerProfile {
  // Existing fields retained...
  specialization    String?
  yearsOfExperience Int?
  backgroundSummary String?
}

// 4. PatientAccessRequest additions
model PatientAccessRequest {
  // Existing fields retained...
  actionByUserId String?
  actionByUser   User?     @relation("RequestActionBy", fields: [actionByUserId], references: [id])
  actionAt       DateTime?
}

// 5. Medication additions
model Medication {
  // Existing fields retained...
  strengthNumber Float?
  strengthUnit   String?
  durationDays   Int?
  startDate      DateTime?
  endDate        DateTime?
  reason         String?
  stockCount     Int?      @default(0)
  stockUpdatedAt DateTime?
  stockUpdatedById String?
}

// 6. CareTask additions
model CareTask {
  // Existing fields retained...
  taskType     String?
  details      String?
  startDate    DateTime?
  endDate      DateTime?
  untilStopped Boolean   @default(true)
  timesOfDay   String[]  @default([])
  assignedById String?
  assignedBy   User?     @relation("TaskAssignedBy", fields: [assignedById], references: [id])
  assignedAt   DateTime  @default(now())
  stoppedAt    DateTime?
  completions  DailyTaskCompletion[]
}

// 7. ScheduledDose additions
model ScheduledDose {
  // Existing fields retained...
  takenBy String? // "patient" | "caretaker"
}

// 8. CareNote additions
model CareNote {
  // Existing fields retained...
  condition    String? // "STABLE" | "IMPROVING" | "NEEDS_ATTENTION" | "CRITICAL"
  observations String?
  appetite     String?
  mood         String?
  sleepQuality String?
  painLevel    Int?
  mobility     String?
}

// 9. New Models
model PatientCodeCounter {
  id        Int      @id @default(1)
  lastValue Int      @default(0)
  updatedAt DateTime @updatedAt
}

model DailyTaskCompletion {
  id          String   @id @default(uuid())
  taskId      String
  task        CareTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  completedAt DateTime @default(now())
  completedBy String
  dateKey     String

  @@unique([taskId, dateKey])
  @@index([taskId])
}

model UnreadMarker {
  id        String         @id @default(uuid())
  userId    String
  patientId String
  patient   ElderlyProfile @relation(fields: [patientId], references: [id], onDelete: Cascade)
  tab       String         // "notes" | "tasks" | "meds"
  hasUnread Boolean        @default(false)
  updatedAt DateTime       @updatedAt

  @@unique([userId, patientId, tab])
  @@index([userId, patientId])
}
```

---

## 4. Migration & Backfill Instructions for the Operator

Run these commands from `hackathon-app`:

### Step 1: Push Database Schema
To apply the additive schema changes to your PostgreSQL database (locally or on Neon):
```bash
npx prisma db push
```

### Step 2: Backfill Sequential Patient Codes
To assign `PT-0001`, `PT-0002`... to existing patient profiles:

1. **Dry-Run (Safe preview, makes no database changes)**:
   ```bash
   npx tsx scripts/backfill-patient-codes.ts --dry-run
   ```

2. **Live Backfill**:
   ```bash
   npx tsx scripts/backfill-patient-codes.ts
   # Or using the package.json script:
   npm run db:backfill
   ```

---

## 5. End-to-End Verification Guide with Real Accounts

Follow these steps to verify all 15 features across three real browser sessions or incognito windows:

### 1. Register Accounts
- **Account 1**: Register as **Licensed Nurse / Caretaker** (`nurse@example.com`).
  - Complete email OTP verification.
  - Complete 2FA setup.
  - Profile setup: Set specialization to "Geriatric Care", years of experience to 8, background to "Registered nurse specializing in elderly care".
- **Account 2**: Register as **Family Guardian / Administrator** (`family@example.com`).
  - Complete email OTP and 2FA.
- **Account 3**: (Created by Family Guardian in next step) **Senior Patient**.

### 2. Family Guardian: Add Senior Patient (F1, F2, F3)
1. Log in to Family Dashboard as `family@example.com`.
2. Click **Add Senior Patient**.
3. Notice the caretaker selection dropdown showing `nurse@example.com` with specialization, experience, and the badge `"0 of 5 patients, 5 slots free"`.
4. Select `nurse@example.com`, enter senior details (e.g. John Doe, Age 74), and submit.
5. The patient card appears immediately displaying:
   - Patient ID: `PT-0001` (F1).
   - Status badge: `"Awaiting nurse@example.com approval"`.
   - A `"Cancel Request"` button is available (F4).

### 3. Caretaker: Receive, Review & Accept Request (F4, F5)
1. Log in to Caretaker Dashboard as `nurse@example.com`.
2. Notice the capacity badge in the header: `"Patients: 0 / 5"` (F5).
3. The **Incoming Requests** panel displays the request with redacted details:
   - Patient Name: "John Doe"
   - Patient ID: `PT-0001`
   - Age: 74
   - Family Admin: Family Guardian
   - All medical notes and health telemetry are securely hidden prior to acceptance.
4. Click **Accept Request**.
5. Header capacity updates to `"Patients: 1 / 5"`. The patient is now fully active.

### 4. Caretaker: Prescribe Medication & Assign Daily Tasks (F6, F8)
1. Select John Doe (`PT-0001`) from the patient list.
2. Go to the **Medications** tab:
   - Click **Prescribe Medicine**.
   - Enter: Name "Metformin", Strength "500", Unit "mg", Form "Tablet", Times `08:00, 20:00`, Duration "30", Reason "Blood glucose regulation".
   - Submit. Initial stock defaults to 60 tablets.
3. Go to the **Tasks** tab:
   - Click **Assign Daily Task**.
   - Notice the clinical preset suggestions for age 74 (Gentle mobility, Hydration, Glucose test).
   - Select "Gentle mobility exercises (15 min)" and submit.
   - 7-day completion history timeline appears with status `PENDING` for today.

### 5. Senior Patient: Log in, Update Stock & Complete Tasks (F7, F9)
1. Log in to the Senior Dashboard using the senior credentials.
2. Under **Today's Daily Tasks** (F9):
   - Notice the large high-contrast card for "Gentle mobility exercises (15 min)".
   - Click **Mark as Completed**. The button updates to `"Completed"` immediately.
3. Go to **All Medicines** tab (F7):
   - Find "Metformin 500 mg".
   - Click **Update stock**.
   - Adjust count from 60 to 58 and click **Save**.
4. Confirm Dose (F12):
   - Click **Take Dose** on the scheduled 08:00 dose.

### 6. Caretaker: Health Condition Update & Telemetry Graphs (F10, F14)
1. Switch back to Caretaker Dashboard.
2. Go to **Daily Tasks** tab:
   - Notice the task is now marked `COMPLETED` by the patient. The Caretaker cannot modify completion (read-only).
3. Go to **Health Condition & Notes** tab (F10):
   - Set Condition to `STABLE`.
   - Enter Observations: "Patient reported good energy during morning mobility session."
   - Set Quick Fields: Appetite "Good", Mood "Cheerful", Sleep "7 hours restful", Pain "0", Mobility "Assisted".
   - Submit.
4. Go to **Telemetry** tab (F14):
   - Inspect the interactive Blood Sugar and Blood Pressure line charts.
   - Toggle ranges between `Live`, `24h`, `7d`, and `14d`.
   - Verify threshold bands (Normal, Warning, Critical) and the accessible table view.

### 7. Family Administrator: View Dose Status, Stock & Care Program (F11, F12)
1. Switch back to Family Dashboard.
2. Select John Doe (`PT-0001`):
   - **Today's Medicines** card displays Metformin dose as:
     `Taken 08:00 (by patient)` (F12).
   - **Care Program** tabs show an unread dot on "Care notes" (F11).
   - Open **Medicines** tab: displays `"58 tablets left, updated by patient a few moments ago"`.
   - Open **Tasks** tab: displays 7-day completion history showing today completed.
   - Open **Care notes** tab: displays `STABLE` condition badge, observations, and vitals summary. Opening the tab clears the unread dot via `POST /api/unread`.

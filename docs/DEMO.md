# CareNest Demo Mode: Architecture & Deletion Guide

CareNest features an entirely isolated, zero-database, client-side Demo Mode designed for prospective visitors and clinicians to explore the Caretaker, Family Administrator, and Senior Patient dashboards without creating real accounts or uploading licensing credentials.

---

## 1. Architecture & Strict Isolation Guarantees

1. **Zero Database / Server Impact**:
   - Demo code strictly runs on the client.
   - It **never** connects to Prisma, PostgreSQL, server-side NextAuth credentials, or real transactional email services (Nodemailer/SMTP/Resend).
   - All mutations (confirming doses, recording vitals, assigning care plans) update a client-side store persisted purely in `sessionStorage`.
2. **Session Sharing Across Demo Roles**:
   - When a visitor confirms a dose in `/demo/senior`, the same browser tab session immediately reflects that update in `/demo/caretaker` and `/demo/family`.
   - When a caretaker records an abnormal vital or assigns a medication, the simulated scheduler and polling loop delta immediately update the other views.
3. **Simulated Background Scheduler**:
   - Evaluates overdue doses past the standard 15-minute grace window (`DOSE_GRACE_MINUTES = 15`) and generates realistic in-demo escalation alerts without hitting any external cron infrastructure.
4. **Search Engine & Crawling Protection**:
   - All `/demo/*` routes enforce `noindex, nofollow` metadata headers.

---

## 2. Instant Deactivation via Environment Flag

To instantly disable Demo Mode in staging or production **without touching code**:

Set in your environment variables (`.env`, `.env.local`, or Netlify Dashboard):
```env
NEXT_PUBLIC_DEMO_ENABLED="false"
```

**Effects**:
- The "Demo mode" button in the landing page navbar disappears automatically.
- Any direct navigation to `/demo`, `/demo/caretaker`, `/demo/family`, or `/demo/senior` returns an immediate HTTP 404 (`notFound()`).

---

## 3. How to Permanently Delete Demo Mode

If you wish to remove the Demo Mode completely from the repository, follow these two quick steps:

### Step 1: Delete the two demo folders
Delete the following two directories from the project:
1. `src/demo/`
2. `src/app/demo/`

### Step 2: Remove the single button import from Navbar
In `src/components/navbar.tsx`:
1. Remove the import line:
   ```tsx
   import { DemoNavButton } from "@/demo/demo-dialog";
   ```
2. Remove the JSX element inside the right action bar:
   ```tsx
   <DemoNavButton />
   ```

*(Optional: Remove `src/tests/demo-isolation.test.ts` and `docs/DEMO.md`)*

**Result**: The project returns to 100% pure production code with zero leftover dependencies or broken routes.

# CARENEST — Testing & Quality Assurance Suite

CareNest maintains a comprehensive testing pipeline combining unit tests, domain logic verification, authorization assertion, and Playwright end-to-end browser journeys.

---

## 1. Running Unit & Integration Tests (Vitest)

Execute the complete Vitest test suite:

```bash
# Run all unit, domain, and database tests
npm run test

# Watch mode during development
npm run test:watch
```

### Test Coverage Areas:
1. **`src/tests/refill.test.ts`**:
   - Daily consumption rate calculations across dosage schedules.
   - Remaining days of inventory countdown.
   - Refill urgency status: `HEALTHY`, `WARNING`, `CRITICAL`.
   - Threshold trigger detection when stock reaches minimum limit.
   - Graceful fallback for unrecorded inventory.
2. **`src/tests/validation.test.ts`**:
   - Zod validation for user registration, elderly profile creation, and medication regimens.
   - Mandatory clinical reasoning when recording dose skips.
   - Vital signs validation (blood pressure format, pulse, glucose, temperature).
3. **`src/tests/escalation.test.ts`**:
   - Responsive HTML healthcare email rendering.
   - Graceful development mock fallback when `RESEND_API_KEY` is not present.
4. **`src/tests/permissions.test.ts`**:
   - Server-side IDOR prevention asserting that unknown users cannot access elderly medical records.
   - Circle Admin permission verification for medication regimens.
   - Caretaker permissions verification for dose confirmations and care notes.
5. **`prisma/seed.test.ts`**:
   - Complete domain verification asserting user roles, multiple elderly profiles, and care circle relationships.

---

## 2. Running End-to-End Tests (Playwright)

Execute Playwright browser automation tests:

```bash
# Run Playwright tests headlessly against the standalone server
npx playwright test

# Run Playwright tests with UI runner
npx playwright test --ui
```

### Critical Scenarios Verified:
- **Scenario 1**: Landing page loads with brand identity, tagline, value proposition, and role switchers.
- **Scenario 2**: Authentication page supports both email/password and Senior Mode 4-digit PIN access (`1234`).
- **Scenario 3**: Autonomous background scheduler endpoint responds with `HEALTHY` status.

---

## 3. Type Checking & Code Quality

```bash
# Strict TypeScript validation
npx tsc --noEmit

# ESLint audit (0 errors, 0 warnings)
npm run lint

# Production Standalone Build
npm run build
```

# CARENEST: Automated Caretaker Certificate Verification Pipeline

This document details the automated clinical credentialing and certificate verification architecture in CARENEST. It covers pipeline stages, policy thresholds, privacy guarantees, development sandbox operations, and administrator management.

---

## 1. Architectural Overview & Rationale

Verification of licensed nurses and caretakers requires a balance between:
1. **Speed**: Caretakers expect near-instant feedback when registering.
2. **Clinical Safety & Integrity**: Preventing unverified individuals from accessing vulnerable senior patients or administering controlled medication.
3. **Resilience & Privacy**: Official licensing authorities may experience downtime, lack public APIs, or rate-limit requests.

```
┌─────────────────────────────────────────────────────────────┐
│                    Caretaker Registration                   │
│   Uploads Certificate (PDF/JPG/PNG) + Professional Details  │
└──────────────────────────────┬──────────────────────────────┘
                               │ POST /api/caretakers/upload-document
┌──────────────────────────────▼──────────────────────────────┐
│                    Intake & File Security                   │
│  - Magic bytes inspection (rejects spoofed extensions)      │
│  - SHA-256 content hashing & EXIF metadata stripping        │
│  - Private storage (Local Disk or S3-compatible bucket)     │
│  - Antivirus scan hook                                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│              Automated Pipeline Stages (Jobs)               │
│  1. FILE_CHECKS       → Verify integrity and hash           │
│  2. EXTRACTION        → Extract text & metadata from doc    │
│  3. RISK_CHECKS       → Check duplicate hashes & reg nums   │
│  4. REGISTRY_LOOKUP   → Upstream authority provider lookup   │
│  5. IDENTITY_BINDING  → Optional registry contact / ID check│
│  6. DECISION          → Pure policy engine evaluation       │
│  7. NOTIFICATIONS     → Caretaker and Admin alerts          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Decision Outcomes                        │
│   AUTO_APPROVED  │   MANUAL_REVIEW   │    AUTO_REJECTED     │
│   (Active Match) │ (Fallback/Unsure) │ (Revoked/Suspended)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Policy Thresholds & State Machine

### Core Principle
> **A registry match alone does NOT prove identity.** An applicant could theoretically enter someone else's public registration number. Therefore, automated approval (`AUTO_APPROVED`) requires matching binding evidence (extracted document content matching the registry record, or verified identity binding).

### Decision Thresholds (`src/lib/domain/verification/policy.ts`)
- **`NAME_SIMILARITY_THRESHOLD = 0.85`**: Token-based fuzzy match score required for approval.
- **`NAME_MISMATCH_REJECTION_THRESHOLD = 0.30`**: Score below which a found record is deemed to belong to a completely different licensee.
- **`REQUIRE_IDENTITY_BINDING = true`**: Default policy requiring either extracted certificate content confirmation or identity provider confirmation.
- **`MAX_SUBMISSIONS_PER_DAY = 5`**: Anti-enumeration threshold per account per 24 hours.
- **`REVERIFY_DAYS = 30`**: Periodic automated re-verification interval for approved caretakers.

### Policy Rules
1. **`AUTO_APPROVED`** requires ALL of the following:
   - Registry provider answered `FOUND` with an active license.
   - Exact registration number match (`1.0`).
   - Name similarity $\ge 0.85$.
   - License status is `ACTIVE` and validity dates are unexpired.
   - Issuing authority and category are compatible ($\ge 0.8$).
   - Zero duplicate hashes or risk flags detected.
   - Binding evidence satisfied: extracted document text matches registry record OR identity binding confirmed.
2. **`AUTO_REJECTED`** only occurs for clear negative evidence from an authoritative provider:
   - Registry returns status `REVOKED`, `SUSPENDED`, or `EXPIRED`.
   - Registration number found, but belongs to a completely different person (name similarity $< 0.30$).
3. **`MANUAL_REVIEW`** handles EVERYTHING else:
   - Registry returns `NOT_FOUND`, `UNAVAILABLE`, or `RATE_LIMITED`.
   - Name spelling differences ($0.30 \le \text{similarity} < 0.85$).
   - Low OCR extraction confidence.
   - Risk signals (duplicate files, anomalous PDF metadata).
   - No external registry provider configured (default platform behavior).

---

## 3. Environment Variables & Storage

Add these variables to `.env.local` or your hosting provider (e.g. Netlify, Vercel):

```bash
# File Storage Configuration
# 'local' saves to storage/secure_documents (default)
# 's3' uses an S3-compatible private bucket (AWS S3, Cloudflare R2, Supabase)
FILE_STORAGE_ADAPTER="local"

# S3 Configuration (Required when FILE_STORAGE_ADAPTER="s3")
S3_BUCKET="carenest-clinical-documents"
S3_REGION="us-east-1"
S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com" # Optional (for Cloudflare R2 / MinIO)
S3_ACCESS_KEY_ID="your-s3-access-key-id"
S3_SECRET_ACCESS_KEY="your-s3-secret-access-key"

# Automated Verification Development Sandbox
# Set to 'true' ONLY in local development to test deterministic responses.
# The system will refuse to start if enabled in production (NODE_ENV="production").
VERIFICATION_DEV_SANDBOX="true"

# Cloud Scheduler Secret
CRON_SECRET="your-secure-cron-secret-token"
```

---

## 4. Development Sandbox Provider

When `NODE_ENV="development"` and `VERIFICATION_DEV_SANDBOX="true"`, the pipeline registers `VerificationDevSandboxProvider` (`dev-sandbox`). It allows testing all edge cases deterministically using test registration number prefixes:

| Registration Number Prefix | Simulated Registry Outcome | Expected Decision |
|:---|:---|:---|
| `TEST-OK-101` | Active license matching entered name, valid for 2 years | **AUTO_APPROVED** |
| `TEST-EXPIRED-202` | License expired 1 year ago | **AUTO_REJECTED** |
| `TEST-REVOKED-303` | License revoked by disciplinary board | **AUTO_REJECTED** |
| `TEST-MISMATCH-404` | Number found, but belongs to "Ananya Sengupta" | **AUTO_REJECTED** |
| `TEST-NOTFOUND-505` | Registration number not located in council records | **MANUAL_REVIEW** |
| `TEST-SLOW-606` | Simulates high-latency external portal (2.5s delay) | **AUTO_APPROVED** (via worker) |

---

## 5. Promoting the Platform Administrator

There is deliberately **no public registration path** to become an administrator. To promote an existing registered account:

1. Register normally via `/register` as a Family Administrator or Caretaker.
2. Log in and configure **2-Factor Authentication (2FA)** in settings.
3. Run the CLI promotion script:

```bash
# Dry-run inspection (Safe, makes no database writes)
npx tsx scripts/create-admin.ts admin@example.com --dry-run

# Live promotion
npx tsx scripts/create-admin.ts admin@example.com
```

Once promoted, the user can access `/dashboard/admin` and `/dashboard/admin/verifications` to view cases, audit trails, and execute decision overrides.

---

## 6. Privacy & Audit Runbook

- **Append-Only Audit Trail**: Every stage outcome and administrative override is permanently recorded in `VerificationEvent`. Application code has zero update or delete methods for audit rows.
- **Pre-Acceptance Redaction**: Patient records remain protected from unverified caretakers until their license is active and an explicit patient request is accepted.
- **Re-verification Runbook**: The background worker runs every minute via `netlify/functions/process-verifications.mts`. If a caretaker's license lapses or is revoked during periodic re-checks:
  1. The case status transitions to `EXPIRED`.
  2. The caretaker is barred from accepting new patient requests.
  3. Existing patients retain access until an administrator manually reviews the case.

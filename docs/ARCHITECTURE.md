# CARENEST — System Architecture & Engineering Specifications
## Intelligent Elderly Care & Family Coordination Platform

> **Tagline:** *"One connected circle of care. Every dose. Every appointment. Everyone informed."*

---

## 1. Executive Architecture Overview

CareNest is a full-stack, production-grade healthcare management application designed to bridge the communication and adherence gaps between **Elderly Seniors**, **Family Coordinators**, and **Professional Caretakers**.

```
                           ┌───────────────────────────────┐
                           │       CareNest Platform       │
                           └───────────────┬───────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         │                                 │                                 │
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│   Senior Mode    │             │ Family Dashboard │             │ Caretaker Portal │
│  (WCAG 2.2 AA)   │             │ (Multi-profile)  │             │ (Tasks & Vitals) │
│ - 60px touch tgt │             │ - Adherence chart│             │ - Task checklist │
│ - 1-tap confirm  │             │ - Refill alerts  │             │ - BP/sugar logs  │
│ - 4-digit PIN    │             │ - Escalation mgr │             │ - Shift handover │
└────────┬─────────┘             └────────┬─────────┘             └────────┬─────────┘
         │                                │                                │
         └────────────────────────────────┼────────────────────────────────┘
                                          │
                                          ▼
                      ┌──────────────────────────────────────┐
                      │     Next.js 16 Server Layer (App)    │
                      │  - Route Handlers with Zod Validate  │
                      │  - NextAuth JWT Session Guard        │
                      │  - Strict Server-side RBAC & IDOR    │
                      └───────────────────┬──────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
┌───────────────────────────────────┐           ┌───────────────────────────────────┐
│     Autonomous Background Cron    │           │    Transactional Email Layer      │
│  - Cloud Scheduler Endpoint       │           │  - Resend Transactional Provider  │
│  - Grace Period Evaluation        │           │  - Local dev fallback & preview   │
│  - Tier 1: Caretaker Alert        │           │  - Idempotent deduplication       │
│  - Tier 2: Family Escalation      │           │  - Responsive healthcare layout   │
└─────────────────┬─────────────────┘           └─────────────────┬─────────────────┘
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          │
                                          ▼
                      ┌──────────────────────────────────────┐
                      │    PostgreSQL 18 + Prisma 7 Engine   │
                      │  - 16 Relational Tables with Indexes │
                      │  - Transactional Dose Decrements     │
                      │  - Complete Relational Audit Trail   │
                      └──────────────────────────────────────┘
```

---

## 2. Security & Authorization Architecture

### 2.1 Defense Against Insecure Direct Object References (IDOR)
CareNest enforces server-side identity verification on every protected operation. Front-end authorization is treated as a presentation convenience; all permissions are asserted by verifying the user's active membership within the relevant `CareCircle`:

- `verifyProfileAccess(userId, elderlyProfileId, requiredPermission?)`:
  Validates that the requesting user created the elderly profile or is an active member of that profile's Care Circle with the specific required permission (e.g. `CAN_MANAGE_MEDS`, `CAN_CONFIRM_DOSE`, `CAN_LOG_CARE_NOTES`).
- `verifyCircleAdmin(userId, careCircleId)`:
  Validates that only verified Circle Admins can invite new members or revoke active access.

### 2.2 Secure Single-Use Expiring Invitations
- Invitations are generated using 32 bytes of cryptographically secure random bytes (`crypto.randomBytes(32).toString('hex')`).
- Each token has an immutable 7-day expiration timestamp (`expiresAt`).
- Upon acceptance, the token status is immediately transitioned to `ACCEPTED`, preventing replay attacks.

### 2.3 Role-Based Access Control (RBAC) Matrix

| Permission | Circle Admin | Family Member | Caretaker | Senior |
|---|:---:|:---:|:---:|:---:|
| `CAN_VIEW_RECORDS` | ✅ | ✅ | ✅ | ✅ |
| `CAN_CONFIRM_DOSE` | ✅ | ✅ | ✅ | ✅ (1-tap) |
| `CAN_MANAGE_MEDS` | ✅ | ❌ | ❌ | ❌ |
| `CAN_MANAGE_APPOINTMENTS`| ✅ | ❌ | ❌ | ❌ |
| `CAN_MANAGE_CIRCLE` | ✅ | ❌ | ❌ | ❌ |
| `CAN_LOG_CARE_NOTES` | ✅ | ❌ | ✅ | ❌ |
| `CAN_COMPLETE_TASKS` | ✅ | ❌ | ✅ | ❌ |
| `CAN_RECEIVE_ESCALATIONS`| ✅ | ✅ | ✅ | ❌ |

---

## 3. Intelligent Missed-Dose Escalation Engine

The escalation workflow is completely decoupled from user browser sessions:

1. **Scheduled Dose Records**: Created in advance with status `SCHEDULED` and a configured grace window (default: 45 minutes).
2. **Grace Window Evaluation**: A background job or Cloud Scheduler endpoint (`POST /api/scheduler/process-escalations`) monitors active doses.
3. **Tier 1 Caretaker Alert**: If `now >= scheduledAt + gracePeriodMinutes` and the dose remains unconfirmed, status transitions to `UNCONFIRMED`, `escalationLevel = 1`, and instant notifications/emails are dispatched to assigned caregivers.
4. **Tier 2 Family Urgent Escalation**: If 30 minutes elapse after Tier 1 alert with no confirmation, status transitions to `MISSED`, `escalationLevel = 2`, and high-priority escalation emails and phone emergency alerts are dispatched to authorized family members.
5. **Idempotency Protection**: Every escalation records `escalationLevel`, `escalatedAt`, and audit logs, preventing duplicate alerts.

---

## 4. Medication Inventory & Refill Projection Engine

Rather than relying on inaccurate dispenser hardware assumptions, CareNest calculates mathematical depletion projections:

$$\text{Daily Units} = \sum_{\text{active schedules}} (\text{Times Per Day} \times \text{Dosage Quantity})$$

$$\text{Days Remaining} = \lfloor \frac{\text{Current Stock}}{\text{Daily Units}} \rfloor$$

$$\text{Depletion Date} = \text{Current Date} + \text{Days Remaining}$$

- When `currentStock <= refillThreshold` or $\text{Days Remaining} \le 7$, a `REFILL_ALERT` notification is triggered for family coordinators.
- Every inventory calculation includes a clear clinical disclaimer distinguishing mathematical projections from real-time dispenser sensor readings.

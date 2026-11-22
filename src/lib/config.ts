/**
 * Application URL and Environment Configuration
 * Dynamically resolves application base URL for transactional emails,
 * redirects, and server-side operations across deployment platforms (Vercel, Render, Railway, localhost).
 */
export function getAppUrl(): string {
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim().length > 0) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim().length > 0) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim().length > 0) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  if (process.env.RAILWAY_STATIC_URL && process.env.RAILWAY_STATIC_URL.trim().length > 0) {
    return `https://${process.env.RAILWAY_STATIC_URL.replace(/\/$/, "")}`;
  }
  if (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim().length > 0) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/**
 * CareNest Scheduled Dose Grace Period
 * Window in minutes after scheduled time before a dose is marked MISSED and escalated.
 */
export const DOSE_GRACE_MINUTES = 15;

/**
 * Clinical Thresholds Configuration
 * NOTE: default alert thresholds, not medical advice
 */
export const CLINICAL_THRESHOLDS = {
  DISCLAIMER: "default alert thresholds, not medical advice",
  bloodSugar: {
    unit: "mg/dL",
    normalMin: 70,
    normalMax: 140,
    warningMax: 250,
    // Critical: < 70 or > 250 mg/dL
  },
  bloodPressureSystolic: {
    unit: "mmHg",
    normalMin: 90,
    normalMax: 120,
    warningMax: 160,
    // Critical: < 90 or > 160 mmHg
  },
  bloodPressureDiastolic: {
    unit: "mmHg",
    criticalLow: 50,
    normalMin: 60,
    normalMax: 80,
    warningMax: 100,
    // Critical: < 50 or > 100 mmHg
  },
} as const;

export type VitalSeverity = "NORMAL" | "WARNING" | "CRITICAL";

export interface VitalEvaluation {
  severity: VitalSeverity;
  label: string;
  isAbnormal: boolean;
  message?: string;
}

/**
 * Evaluates Blood Sugar (glucose, mg/dL)
 * - Normal: 70 - 140 mg/dL
 * - Warning: 141 - 250 mg/dL
 * - Critical: < 70 or > 250 mg/dL
 */
export function evaluateBloodSugar(glucose: number | null | undefined): VitalEvaluation {
  if (glucose === null || glucose === undefined || isNaN(glucose)) {
    return { severity: "NORMAL", label: "No Reading", isAbnormal: false };
  }

  if (glucose < 70) {
    return {
      severity: "CRITICAL",
      label: "Hypoglycemia Risk",
      isAbnormal: true,
      message: `Critical low blood sugar: ${glucose} mg/dL (< 70 mg/dL)`,
    };
  }
  if (glucose > 250) {
    return {
      severity: "CRITICAL",
      label: "Severe Hyperglycemia",
      isAbnormal: true,
      message: `Critical high blood sugar: ${glucose} mg/dL (> 250 mg/dL)`,
    };
  }
  if (glucose > 140) {
    return {
      severity: "WARNING",
      label: "Elevated Blood Sugar",
      isAbnormal: true,
      message: `Elevated blood sugar: ${glucose} mg/dL (141-250 mg/dL)`,
    };
  }
  return {
    severity: "NORMAL",
    label: "Normal",
    isAbnormal: false,
    message: `Normal blood sugar: ${glucose} mg/dL`,
  };
}

/**
 * Evaluates Blood Pressure (systolic & diastolic, mmHg)
 * Systolic:
 *   - Normal: 90 - 120 mmHg
 *   - Warning: 121 - 160 mmHg
 *   - Critical: < 90 or > 160 mmHg
 * Diastolic:
 *   - Normal: 60 - 80 mmHg
 *   - Warning: 81 - 100 mmHg
 *   - Critical: < 50 or > 100 mmHg
 */
export function evaluateBloodPressure(
  systolic: number | null | undefined,
  diastolic: number | null | undefined
): VitalEvaluation {
  if (
    systolic === null ||
    systolic === undefined ||
    isNaN(systolic) ||
    diastolic === null ||
    diastolic === undefined ||
    isNaN(diastolic)
  ) {
    return { severity: "NORMAL", label: "No Reading", isAbnormal: false };
  }

  // Critical condition check
  const isCritical =
    systolic < 90 || systolic > 160 || diastolic < 50 || diastolic > 100;

  if (isCritical) {
    let reason = "";
    if (systolic > 160) reason = `Systolic crisis (${systolic} > 160 mmHg)`;
    else if (systolic < 90) reason = `Hypotension crisis (${systolic} < 90 mmHg)`;
    else if (diastolic > 100) reason = `Diastolic crisis (${diastolic} > 100 mmHg)`;
    else if (diastolic < 50) reason = `Severe low diastolic (${diastolic} < 50 mmHg)`;

    return {
      severity: "CRITICAL",
      label: "Hypertensive/Hypotensive Crisis",
      isAbnormal: true,
      message: `Critical blood pressure: ${systolic}/${diastolic} mmHg (${reason})`,
    };
  }

  // Warning check
  const isWarning =
    systolic > 120 || diastolic > 80 || systolic < 90 || diastolic < 60;

  if (isWarning) {
    return {
      severity: "WARNING",
      label: "Elevated / Borderline",
      isAbnormal: true,
      message: `Borderline/Elevated blood pressure: ${systolic}/${diastolic} mmHg`,
    };
  }

  return {
    severity: "NORMAL",
    label: "Normal",
    isAbnormal: false,
    message: `Normal blood pressure: ${systolic}/${diastolic} mmHg`,
  };
}

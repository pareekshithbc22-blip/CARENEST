/**
 * Clinical Thresholds and Grace Period Configuration
 * Default alert thresholds, not medical advice.
 */

export const CLINICAL_THRESHOLDS = {
  DISCLAIMER: "default alert thresholds, not medical advice",
  bloodSugar: {
    unit: "mg/dL",
    normalMin: 70,
    normalMax: 140,
    warningMax: 250,
  },
  bloodPressureSystolic: {
    unit: "mmHg",
    normalMin: 90,
    normalMax: 120,
    warningMax: 160,
  },
  bloodPressureDiastolic: {
    unit: "mmHg",
    criticalLow: 50,
    normalMin: 60,
    normalMax: 80,
    warningMax: 100,
  },
} as const;

export type VitalSeverity = "NORMAL" | "WARNING" | "CRITICAL";

export interface VitalEvaluation {
  severity: VitalSeverity;
  label: string;
  isAbnormal: boolean;
  message?: string;
}

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
      message: `Elevated blood sugar: ${glucose} mg/dL (> 140 mg/dL)`,
    };
  }

  return {
    severity: "NORMAL",
    label: "Normal Range",
    isAbnormal: false,
  };
}

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

  // Critical checks
  if (systolic > 160 || diastolic > 100) {
    return {
      severity: "CRITICAL",
      label: "Hypertensive Crisis Risk",
      isAbnormal: true,
      message: `Critical blood pressure: ${systolic}/${diastolic} mmHg (> 160/100)`,
    };
  }
  if (systolic < 90 || diastolic < 50) {
    return {
      severity: "CRITICAL",
      label: "Hypotension Risk",
      isAbnormal: true,
      message: `Critical low blood pressure: ${systolic}/${diastolic} mmHg (< 90/50)`,
    };
  }

  // Warning checks
  if (systolic > 120 || diastolic > 80) {
    return {
      severity: "WARNING",
      label: "Elevated Blood Pressure",
      isAbnormal: true,
      message: `Elevated blood pressure: ${systolic}/${diastolic} mmHg (> 120/80)`,
    };
  }

  return {
    severity: "NORMAL",
    label: "Optimal Range",
    isAbnormal: false,
  };
}

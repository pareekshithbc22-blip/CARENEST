import { prisma } from "../prisma";

export interface RefillEstimate {
  medicationId: string;
  medicationName: string;
  strength: string;
  currentStock: number;
  unit: string;
  refillThreshold: number;
  dailyConsumption: number;
  daysRemaining: number;
  estimatedDepletionDate: string | null;
  urgency: "CRITICAL" | "WARNING" | "HEALTHY" | "UNKNOWN";
  isLowStock: boolean;
  disclaimer: string;
}

const REFILL_DISCLAIMER =
  "Estimated depletion dates are calculated mathematically from recorded stock and prescribed dosage schedules. These are advisory projections and not guaranteed automated smart-dispenser inventory readings.";

/**
 * Calculates stock depletion projections and refill status for a single medication.
 */
export function calculateMedicationRefill(
  medication: {
    id: string;
    name: string;
    strength: string;
    stock: {
      currentStock: number;
      unit: string;
      refillThreshold: number;
    } | null;
    schedules: Array<{
      isActive: boolean;
      frequency: string;
      timesOfDay: string[];
      dosageQuantity: number;
    }>;
  }
): RefillEstimate {
  const stock = medication.stock;

  if (!stock) {
    return {
      medicationId: medication.id,
      medicationName: medication.name,
      strength: medication.strength,
      currentStock: 0,
      unit: "units",
      refillThreshold: 10,
      dailyConsumption: 0,
      daysRemaining: 0,
      estimatedDepletionDate: null,
      urgency: "UNKNOWN",
      isLowStock: true,
      disclaimer: REFILL_DISCLAIMER,
    };
  }

  // Calculate daily consumption rate from active schedules
  let dailyUnits = 0;
  for (const schedule of medication.schedules) {
    if (!schedule.isActive) continue;

    const timesPerDay = schedule.timesOfDay.length || 1;
    const doseQty = schedule.dosageQuantity || 1;

    if (schedule.frequency === "DAILY") {
      dailyUnits += timesPerDay * doseQty;
    } else if (schedule.frequency === "WEEKLY") {
      dailyUnits += (timesPerDay * doseQty) / 7;
    } else {
      dailyUnits += timesPerDay * doseQty;
    }
  }

  if (dailyUnits <= 0) {
    return {
      medicationId: medication.id,
      medicationName: medication.name,
      strength: medication.strength,
      currentStock: stock.currentStock,
      unit: stock.unit,
      refillThreshold: stock.refillThreshold,
      dailyConsumption: 0,
      daysRemaining: Infinity,
      estimatedDepletionDate: null,
      urgency: stock.currentStock <= stock.refillThreshold ? "WARNING" : "HEALTHY",
      isLowStock: stock.currentStock <= stock.refillThreshold,
      disclaimer: REFILL_DISCLAIMER,
    };
  }

  const daysRemaining = Math.max(0, Math.floor(stock.currentStock / dailyUnits));
  const depletionDate = new Date();
  depletionDate.setDate(depletionDate.getDate() + daysRemaining);

  const isLowStock =
    stock.currentStock <= stock.refillThreshold || daysRemaining <= 7;

  let urgency: "CRITICAL" | "WARNING" | "HEALTHY" = "HEALTHY";
  if (stock.currentStock <= 0 || daysRemaining <= 3) {
    urgency = "CRITICAL";
  } else if (isLowStock) {
    urgency = "WARNING";
  }

  return {
    medicationId: medication.id,
    medicationName: medication.name,
    strength: medication.strength,
    currentStock: stock.currentStock,
    unit: stock.unit,
    refillThreshold: stock.refillThreshold,
    dailyConsumption: parseFloat(dailyUnits.toFixed(2)),
    daysRemaining,
    estimatedDepletionDate: depletionDate.toISOString().split("T")[0],
    urgency,
    isLowStock,
    disclaimer: REFILL_DISCLAIMER,
  };
}

/**
 * Evaluates all active medications for an elderly profile to identify supplies requiring replenishment.
 */
export async function getProfileRefillEstimates(
  elderlyProfileId: string
): Promise<RefillEstimate[]> {
  const medications = await prisma.medication.findMany({
    where: {
      elderlyProfileId,
      isArchived: false,
    },
    include: {
      stock: true,
      schedules: {
        where: { isActive: true },
      },
    },
  });

  return medications.map(calculateMedicationRefill);
}

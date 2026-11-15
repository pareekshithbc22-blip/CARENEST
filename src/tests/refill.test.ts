import { describe, it, expect } from "vitest";
import { calculateMedicationRefill } from "@/lib/refill/service";

describe("Medication Refill Estimation Service", () => {
  it("calculates daily consumption and depletion date correctly for daily regimen", () => {
    const medication = {
      id: "med-1",
      name: "Metformin ER",
      strength: "500 mg",
      stock: {
        currentStock: 60,
        unit: "tablets",
        refillThreshold: 14,
      },
      schedules: [
        {
          isActive: true,
          frequency: "DAILY",
          timesOfDay: ["08:00", "20:00"], // 2 tablets per day
          dosageQuantity: 1.0,
        },
      ],
    };

    const estimate = calculateMedicationRefill(medication);

    expect(estimate.dailyConsumption).toBe(2);
    expect(estimate.daysRemaining).toBe(30);
    expect(estimate.isLowStock).toBe(false);
    expect(estimate.urgency).toBe("HEALTHY");
    expect(estimate.estimatedDepletionDate).not.toBeNull();
  });

  it("triggers WARNING and isLowStock when stock falls below refill threshold", () => {
    const medication = {
      id: "med-2",
      name: "Glipizide",
      strength: "5 mg",
      stock: {
        currentStock: 8, // below threshold of 14
        unit: "tablets",
        refillThreshold: 14,
      },
      schedules: [
        {
          isActive: true,
          frequency: "DAILY",
          timesOfDay: ["08:00"], // 1 tablet per day
          dosageQuantity: 1.0,
        },
      ],
    };

    const estimate = calculateMedicationRefill(medication);

    expect(estimate.dailyConsumption).toBe(1);
    expect(estimate.daysRemaining).toBe(8);
    expect(estimate.isLowStock).toBe(true);
    expect(estimate.urgency).toBe("WARNING");
  });

  it("triggers CRITICAL urgency when stock is 3 days or fewer remaining", () => {
    const medication = {
      id: "med-3",
      name: "Atorvastatin",
      strength: "20 mg",
      stock: {
        currentStock: 2,
        unit: "tablets",
        refillThreshold: 10,
      },
      schedules: [
        {
          isActive: true,
          frequency: "DAILY",
          timesOfDay: ["20:00"],
          dosageQuantity: 1.0,
        },
      ],
    };

    const estimate = calculateMedicationRefill(medication);

    expect(estimate.daysRemaining).toBe(2);
    expect(estimate.urgency).toBe("CRITICAL");
    expect(estimate.isLowStock).toBe(true);
  });

  it("handles empty or missing stock gracefully without exceptions", () => {
    const medication = {
      id: "med-4",
      name: "Vitamin D3",
      strength: "1000 IU",
      stock: null,
      schedules: [],
    };

    const estimate = calculateMedicationRefill(medication);

    expect(estimate.currentStock).toBe(0);
    expect(estimate.daysRemaining).toBe(0);
    expect(estimate.urgency).toBe("UNKNOWN");
    expect(estimate.disclaimer).toContain("advisory");
  });
});

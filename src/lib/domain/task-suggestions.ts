/**
 * Age-based suggested starting values for Caretaker daily tasks.
 * Pure function providing default clinical baselines.
 * Disclaimer: Suggested starting values for age <n>. The caretaker decides. Not medical advice.
 */

export interface SuggestedTaskValues {
  age: number;
  disclaimer: string;
  walking: {
    activity: "walking" | "stretching" | "chair_exercises" | "yoga" | "physiotherapy";
    durationMinutes: number;
    timesPerDay: number;
    preferredTime: string;
    intensity: "light" | "moderate";
    notes: string;
  };
  sleep: {
    targetSleepHours: number;
    bedtime: string;
    wakeupTime: string;
    napAllowed: boolean;
    napMinutes: number;
    notes: string;
  };
  bloodSugar: {
    sugarTimes: string[];
    notes: string;
  };
  bloodPressure: {
    bpTimes: string[];
    restingReminder: boolean;
    notes: string;
  };
  hydration: {
    glassesPerDay: number;
    reminderTimes: string[];
    notes: string;
  };
  meals: {
    mealTimes: string[];
    dietNote: string;
  };
}

export function getSuggestedTaskValues(age: number): SuggestedTaskValues {
  const safeAge = Math.max(1, Math.floor(age || 70));
  const disclaimer = `Suggested starting values for age ${safeAge}. The caretaker decides. Not medical advice.`;

  if (safeAge >= 80) {
    return {
      age: safeAge,
      disclaimer,
      walking: {
        activity: "chair_exercises",
        durationMinutes: 15,
        timesPerDay: 1,
        preferredTime: "10:30 AM",
        intensity: "light",
        notes: "Gentle joint mobility and assisted hallway stroll; stop if dizzy.",
      },
      sleep: {
        targetSleepHours: 8,
        bedtime: "21:30",
        wakeupTime: "06:30",
        napAllowed: true,
        napMinutes: 30,
        notes: "Keep bedroom quiet and dimly lit; assist with night toilet access.",
      },
      bloodSugar: {
        sugarTimes: ["fasting", "after_breakfast", "bedtime"],
        notes: "Use gentle lancet setting; check fingertips for soreness.",
      },
      bloodPressure: {
        bpTimes: ["morning", "evening"],
        restingReminder: true,
        notes: "Sit quietly for 5 minutes before cuff measurement; arm at heart level.",
      },
      hydration: {
        glassesPerDay: 6,
        reminderTimes: ["09:00", "11:30", "14:00", "16:30", "18:30", "20:00"],
        notes: "Offer warm water in small sips; verify no physician fluid restriction.",
      },
      meals: {
        mealTimes: ["08:30 (Breakfast)", "12:30 (Lunch)", "16:00 (Snack)", "19:30 (Dinner)"],
        dietNote: "Soft, nutrient-dense diet low in sodium; easy to chew.",
      },
    };
  }

  if (safeAge >= 70) {
    return {
      age: safeAge,
      disclaimer,
      walking: {
        activity: "walking",
        durationMinutes: 25,
        timesPerDay: 1,
        preferredTime: "08:30 AM",
        intensity: "light",
        notes: "Supported outdoor or indoor walk on flat, even terrain.",
      },
      sleep: {
        targetSleepHours: 7.5,
        bedtime: "22:00",
        wakeupTime: "06:30",
        napAllowed: true,
        napMinutes: 20,
        notes: "Comfortable bedtime routine; limit fluids 1 hour prior to sleep.",
      },
      bloodSugar: {
        sugarTimes: ["fasting", "after_lunch"],
        notes: "Standard glucose check before breakfast and 2 hours after lunch.",
      },
      bloodPressure: {
        bpTimes: ["morning", "evening"],
        restingReminder: true,
        notes: "Rest 5 minutes prior to measurement; record right arm readings.",
      },
      hydration: {
        glassesPerDay: 7,
        reminderTimes: ["08:30", "11:00", "13:30", "16:00", "18:30", "20:30"],
        notes: "Hydrate steadily throughout the day; glass size ~200ml.",
      },
      meals: {
        mealTimes: ["08:00 (Breakfast)", "12:30 (Lunch)", "16:30 (Tea)", "19:30 (Dinner)"],
        dietNote: "Balanced fiber, protein, and controlled carbohydrate intake.",
      },
    };
  }

  // 60 - 69 default
  return {
    age: safeAge,
    disclaimer,
    walking: {
      activity: "walking",
      durationMinutes: 30,
      timesPerDay: 1,
      preferredTime: "07:30 AM",
      intensity: "moderate",
      notes: "Brisk continuous walk in garden or paved track.",
    },
    sleep: {
      targetSleepHours: 7.5,
      bedtime: "22:30",
      wakeupTime: "06:00",
      napAllowed: false,
      napMinutes: 0,
      notes: "Regular sleep schedule; avoid screen use 30 minutes before bed.",
    },
    bloodSugar: {
      sugarTimes: ["fasting", "after_breakfast", "after_dinner"],
      notes: "Log fasting glucose upon waking; post-prandial 2 hours after meals.",
    },
    bloodPressure: {
      bpTimes: ["morning", "afternoon", "evening"],
      restingReminder: true,
      notes: "Take 3 sequential readings 1 minute apart; average the last two.",
    },
    hydration: {
      glassesPerDay: 8,
      reminderTimes: ["07:30", "09:30", "11:30", "13:30", "15:30", "17:30", "19:30", "21:00"],
      notes: "Target 8 full glasses (2 Liters) distributed evenly.",
    },
    meals: {
      mealTimes: ["08:00 (Breakfast)", "13:00 (Lunch)", "20:00 (Dinner)"],
      dietNote: "Heart-healthy diet with fresh vegetables, lean proteins, low sodium.",
    },
  };
}

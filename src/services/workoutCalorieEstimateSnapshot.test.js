import {
  createWorkoutCalorieEstimateSnapshot,
  workoutCalorieEstimateInputFingerprint,
  workoutCalorieEstimateNeedsRefresh,
  workoutCalorieEstimateSaveMessage,
} from "./workoutCalorieEstimateSnapshot";

function workout(overrides = {}) {
  return {
    occurredAt: "2026-08-20T18:00:00.000Z",
    activeDurationMinutes: 60,
    intensity: "moderate",
    exercises: [{
      id: "exercise-1",
      name: "Press",
      exerciseId: "trace:press",
      notes: "ignored",
      sets: [{
        id: "set-1",
        reps: 10,
        load: { mode: "external", amount: 70, unit: "lb" },
        notes: "ignored",
      }],
    }],
    ...overrides,
  };
}

const healthEntries = [
  { id: "older", occurredAt: "2026-08-01T08:00:00.000Z", measurements: { weight: { value: 200, unit: "lb" } } },
  { id: "eligible", occurredAt: "2026-08-15T08:00:00.000Z", measurements: { weight: { value: 80, unit: "kg" } } },
  { id: "future", occurredAt: "2026-08-25T08:00:00.000Z", measurements: { weight: { value: 300, unit: "kg" } } },
];

test("creates a stable versioned snapshot from historical weight and age at workout date", () => {
  const snapshot = createWorkoutCalorieEstimateSnapshot({
    workout: workout(),
    healthMeasurementEntries: healthEntries,
    dateOfBirth: "1990-08-21",
    now: new Date("2026-08-30T12:00:00.000Z"),
  });

  expect(snapshot).toMatchObject({
    schemaVersion: 1,
    estimateKind: "broad-estimate",
    status: "calculated",
    estimatorMethodName: "trace-workout-calorie-range",
    estimatorMethodVersion: 3,
    estimatedAt: "2026-08-30T12:00:00.000Z",
    bodyWeightKg: 80,
    sourceHealthWeightEntryId: "eligible",
    age: 35,
    ageBasis: "adult",
    activeDurationMinutes: 60,
    selectedIntensity: "moderate",
    lowerKcal: 300,
    upperKcal: 440,
  });
  expect(snapshot.inputFingerprint).toMatch(/^workout-calorie-input-v1:/);
  expect(JSON.stringify(snapshot)).not.toMatch(/midpoint|exactKcal|caloriesPer|afterburn/i);
});

test("future Health weight is excluded and lb is normalized when it is the newest eligible value", () => {
  const snapshot = createWorkoutCalorieEstimateSnapshot({
    workout: workout({ occurredAt: "2026-08-10T18:00:00.000Z" }),
    healthMeasurementEntries: healthEntries,
    dateOfBirth: "1990-08-21",
  });
  expect(snapshot.sourceHealthWeightEntryId).toBe("older");
  expect(snapshot.bodyWeightKg).toBeCloseTo(200 * 0.45359237);
});

test("missing optional age or intensity remains calculable with wider uncertainty", () => {
  const complete = createWorkoutCalorieEstimateSnapshot({
    workout: workout(), healthMeasurementEntries: healthEntries, dateOfBirth: "1990-01-01",
  });
  const noAge = createWorkoutCalorieEstimateSnapshot({
    workout: workout(), healthMeasurementEntries: healthEntries,
  });
  const noIntensity = createWorkoutCalorieEstimateSnapshot({
    workout: workout({ intensity: undefined }), healthMeasurementEntries: healthEntries, dateOfBirth: "1990-01-01",
  });
  expect(noAge.status).toBe("calculated");
  expect(noAge.lowerKcal).toBeLessThan(complete.lowerKcal);
  expect(noAge.optionalInputs.age).toBe("missing");
  expect(noIntensity.status).toBe("calculated");
  expect(noIntensity.upperKcal).toBeGreaterThan(complete.upperKcal);
  expect(noIntensity.optionalInputs.intensity).toBe("missing");
});

test.each([
  [[], workout(), "Add body weight to receive an estimate."],
  [healthEntries, workout({ activeDurationMinutes: undefined }), "Add workout duration to receive an estimate."],
  [[], workout({ activeDurationMinutes: undefined }), "Add body weight and workout duration to receive an estimate."],
])("records missing required inputs and produces a targeted save message", (health, entry, message) => {
  const snapshot = createWorkoutCalorieEstimateSnapshot({ workout: entry, healthMeasurementEntries: health });
  expect(snapshot.status).toBe("missing-required-inputs");
  expect(snapshot).not.toHaveProperty("lowerKcal");
  expect(snapshot).not.toHaveProperty("upperKcal");
  expect(workoutCalorieEstimateSaveMessage(snapshot)).toBe(message);
});

test("calculable save wording uses only the approved broad range", () => {
  const snapshot = createWorkoutCalorieEstimateSnapshot({
    workout: workout(), healthMeasurementEntries: healthEntries, dateOfBirth: "1990-01-01",
  });
  expect(workoutCalorieEstimateSaveMessage(snapshot)).toBe(
    "Estimated calories burned: about 300\u2013440 kcal."
  );
});

test("fingerprint ignores title, notes, photos, and timestamps but changes for estimator inputs", () => {
  const original = workout({ title: "Original", notes: "Old", photos: [{ id: "photo" }] });
  const fingerprint = workoutCalorieEstimateInputFingerprint(original);
  expect(workoutCalorieEstimateInputFingerprint({
    ...original,
    title: "Renamed",
    notes: "New",
    updatedAt: "later",
    photos: [],
  })).toBe(fingerprint);
  expect(workoutCalorieEstimateInputFingerprint({
    ...original,
    exercises: [{ ...original.exercises[0], sets: [{ ...original.exercises[0].sets[0], reps: 11 }] }],
  })).not.toBe(fingerprint);
});

test("refresh detection preserves unrelated edits and recalculates relevant or legacy edits", () => {
  const original = workout();
  const existing = {
    ...original,
    calorieEstimate: { inputFingerprint: workoutCalorieEstimateInputFingerprint(original) },
  };
  expect(workoutCalorieEstimateNeedsRefresh(existing, { ...original, title: "New title" })).toBe(false);
  expect(workoutCalorieEstimateNeedsRefresh(existing, { ...original, activeDurationMinutes: 30 })).toBe(true);
  expect(workoutCalorieEstimateNeedsRefresh(original, { ...original, title: "Legacy edit" })).toBe(true);
});

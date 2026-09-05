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
    durationSource: "entered",
    selectedIntensity: "moderate",
    lowerKcal: 300,
    upperKcal: 440,
  });
  expect(snapshot.inputFingerprint).toMatch(/^workout-calorie-input-v2:/);
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

test("entered duration wins over a much shorter recorded duration", () => {
  const entered = createWorkoutCalorieEstimateSnapshot({
    workout: workout({
      activeDurationMinutes: 60,
      startedAt: "2026-08-20T18:00:00.000Z",
      finishedAt: "2026-08-20T18:01:12.000Z",
    }),
    healthMeasurementEntries: healthEntries,
    dateOfBirth: "1990-01-01",
  });
  const recorded = createWorkoutCalorieEstimateSnapshot({
    workout: workout({
      activeDurationMinutes: undefined,
      startedAt: "2026-08-20T18:00:00.000Z",
      finishedAt: "2026-08-20T18:01:12.000Z",
    }),
    healthMeasurementEntries: healthEntries,
    dateOfBirth: "1990-01-01",
  });

  expect(entered).toMatchObject({
    status: "calculated",
    activeDurationMinutes: 60,
    durationSource: "entered",
  });
  expect(recorded).toMatchObject({
    status: "calculated",
    activeDurationMinutes: 1,
    durationSource: "recorded",
  });
  expect(entered.lowerKcal).toBeGreaterThan(recorded.lowerKcal);
  expect(entered.upperKcal).toBeGreaterThan(recorded.upperKcal);
});

test.each([undefined, "", null, 0, -5, Number.NaN, Number.NEGATIVE_INFINITY, "60"])(
  "invalid entered duration %p cannot override recorded elapsed time",
  (activeDurationMinutes) => {
    const snapshot = createWorkoutCalorieEstimateSnapshot({
      workout: workout({
        activeDurationMinutes,
        startedAt: "2026-08-20T18:00:00.000Z",
        finishedAt: "2026-08-20T18:01:12.000Z",
      }),
      healthMeasurementEntries: healthEntries,
    });
    expect(snapshot).toMatchObject({
      status: "calculated",
      activeDurationMinutes: 1,
      durationSource: "recorded",
    });
  }
);

test("a valid fractional entered duration is retained as the estimate basis", () => {
  const snapshot = createWorkoutCalorieEstimateSnapshot({
    workout: workout({
      activeDurationMinutes: 12.5,
      startedAt: "2026-08-20T18:00:00.000Z",
      finishedAt: "2026-08-20T18:01:12.000Z",
    }),
    healthMeasurementEntries: healthEntries,
  });
  expect(snapshot).toMatchObject({
    status: "calculated",
    activeDurationMinutes: 12.5,
    durationSource: "entered",
  });
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
  const recordedOnly = { ...original, activeDurationMinutes: undefined };
  expect(workoutCalorieEstimateInputFingerprint({
    ...recordedOnly,
    startedAt: "2026-08-20T18:00:00.000Z",
    finishedAt: "2026-08-20T18:30:00.000Z",
  })).not.toBe(workoutCalorieEstimateInputFingerprint({
    ...recordedOnly,
    startedAt: "2026-08-20T18:00:00.000Z",
    finishedAt: "2026-08-20T18:45:00.000Z",
  }));
});

test("refresh detection preserves unrelated edits and recalculates relevant or legacy edits", () => {
  const original = workout();
  const existing = {
    ...original,
    calorieEstimate: {
      estimatorMethodName: "trace-workout-calorie-range",
      estimatorMethodVersion: 3,
      inputFingerprint: workoutCalorieEstimateInputFingerprint(original),
    },
  };
  expect(workoutCalorieEstimateNeedsRefresh(existing, { ...original, title: "New title" })).toBe(false);
  expect(workoutCalorieEstimateNeedsRefresh(existing, { ...original, activeDurationMinutes: 30 })).toBe(true);
  expect(workoutCalorieEstimateNeedsRefresh(original, { ...original, title: "Legacy edit" })).toBe(true);
  expect(workoutCalorieEstimateNeedsRefresh({
    ...existing,
    calorieEstimate: { ...existing.calorieEstimate, estimatorMethodVersion: 2 },
  }, { ...original, title: "Edit old automatic snapshot" })).toBe(true);
});

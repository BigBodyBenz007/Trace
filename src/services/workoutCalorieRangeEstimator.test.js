import {
  buildWorkoutEffortSegments,
  estimateWorkoutCalorieRange,
  WORKOUT_CALORIE_ESTIMATOR_METHOD,
  WORKOUT_CALORIE_REP_WEIGHT_POLICY,
} from "./workoutCalorieRangeEstimator";
import {
  deriveAgeOnDate,
  resolveHistoricalBodyWeight,
} from "./workoutEstimateInputs";

function workingSet(overrides = {}) {
  return {
    id: "set-1",
    reps: 10,
    load: { mode: "external", amount: 70, unit: "lb" },
    notes: "",
    ...overrides,
  };
}

function exercise(overrides = {}) {
  return {
    id: "exercise-1",
    exerciseId: "trace:exercise-1",
    name: "Press",
    sets: [workingSet()],
    ...overrides,
  };
}

function workout(overrides = {}) {
  return {
    schemaVersion: 1,
    type: "strength",
    id: "workout-1",
    occurredAt: "2026-08-30T18:00:00.000Z",
    activeDurationMinutes: 60,
    intensity: "moderate",
    exercises: [exercise()],
    ...overrides,
  };
}

const normalizedWeight = Object.freeze({ value: 80, unit: "kg", sourceEntryId: "health-1" });

function estimate(overrides = {}) {
  return estimateWorkoutCalorieRange({
    workout: workout(),
    bodyWeight: normalizedWeight,
    age: 35,
    ...overrides,
  });
}

function metRange(result) {
  return result.metadata.effortProfile.combinedMetRange;
}

test("exports version 2 of the broad bounded-rep set-mixture method", () => {
  expect(WORKOUT_CALORIE_ESTIMATOR_METHOD).toEqual({
    id: "trace-workout-calorie-range",
    version: 2,
    estimateKind: "broad-estimate",
    mixturePolicy: "bounded-rep-set-mixture",
  });
  expect(WORKOUT_CALORIE_REP_WEIGHT_POLICY).toEqual({ minimum: 1, maximum: 20 });
});

test.each([
  ["light", { lowerKcal: 230, upperKcal: 320 }, { lowerMet: 2.8, upperMet: 3.8 }],
  ["moderate", { lowerKcal: 290, upperKcal: 420 }, { lowerMet: 3.5, upperMet: 5 }],
  ["high", { lowerKcal: 420, upperKcal: 550 }, { lowerMet: 5, upperMet: 6.5 }],
  [undefined, { lowerKcal: 230, upperKcal: 550 }, { lowerMet: 2.8, upperMet: 6.5 }],
])("uses the adult %s working-set band", (intensity, expectedCalories, expectedMet) => {
  const result = estimate({ workout: workout({ intensity }) });
  expect(result.status).toBe("calculated");
  expect(result.result).toEqual(expectedCalories);
  expect(metRange(result)).toEqual(expectedMet);
});

test("builds one segment for each of four warm-up sets across four exercises", () => {
  const warmUps = workout({
    exercises: Array.from({ length: 4 }, (_, index) => exercise({
      id: `exercise-${index + 1}`,
      exerciseId: `trace:exercise-${index + 1}`,
      sets: [workingSet({ id: `warm-up-${index + 1}`, setType: "warm-up", reps: 5 })],
    })),
  });
  const result = estimate({ workout: warmUps });

  expect(result.result).toEqual({ lowerKcal: 210, upperKcal: 320 });
  expect(metRange(result)).toEqual({ lowerMet: 2.5, upperMet: 3.8 });
  expect(result.metadata.workoutStructure).toMatchObject({
    completedExercises: 4,
    completedSegments: 4,
    warmUpSets: 4,
    totalRecordedReps: 20,
    totalRepWeight: 20,
  });
  expect(result.metadata.effortProfile.segments).toHaveLength(4);
  expect(result.metadata.effortProfile.segments.map(({ exerciseIndex }) => exerciseIndex)).toEqual([0, 1, 2, 3]);
  expect(result.metadata.effortProfile.segments.every(({ effortBand }) => effortBand === "warm-up")).toBe(true);
});

test("adding normal working sets raises the combined effort profile above warm-ups alone", () => {
  const fourExercises = Array.from({ length: 4 }, (_, index) => exercise({
    id: `exercise-${index}`,
    exerciseId: `trace:exercise-${index}`,
    sets: [workingSet({ id: `warm-${index}`, setType: "warm-up", reps: 5 })],
  }));
  const warmUpsOnly = estimate({ workout: workout({ exercises: fourExercises }) });
  const withWorkingSets = estimate({
    workout: workout({
      exercises: fourExercises.map((item, index) => ({
        ...item,
        sets: [...item.sets, workingSet({ id: `work-${index}`, reps: 10 })],
      })),
    }),
  });

  expect(metRange(withWorkingSets).lowerMet).toBeGreaterThan(metRange(warmUpsOnly).lowerMet);
  expect(metRange(withWorkingSets).upperMet).toBeGreaterThan(metRange(warmUpsOnly).upperMet);
  expect(withWorkingSets.metadata.workoutStructure).toMatchObject({
    warmUpSets: 4,
    completedWorkingSets: 4,
    completedSegments: 8,
  });
});

test("otherwise identical failure sets use the high-effort band", () => {
  const normal = estimate();
  const failure = estimate({
    workout: workout({
      exercises: [exercise({
        sets: [workingSet({ toFailure: true, actualRepsAtFailure: 10 })],
      })],
    }),
  });

  expect(metRange(normal)).toEqual({ lowerMet: 3.5, upperMet: 5 });
  expect(metRange(failure)).toEqual({ lowerMet: 5, upperMet: 6.5 });
  expect(failure.result.lowerKcal).toBeGreaterThan(normal.result.lowerKcal);
  expect(failure.metadata.workoutStructure.failureSegments).toBe(1);
});

test("drop segments are counted and weighted separately using their own failure status", () => {
  const result = estimate({
    workout: workout({
      exercises: [exercise({
        sets: [workingSet({
          id: "parent",
          drops: [
            { id: "drop-normal", reps: 5, load: { mode: "external", amount: 50, unit: "lb" } },
            { id: "drop-failure", reps: 5, toFailure: true, actualRepsAtFailure: 5, load: { mode: "bodyweight" } },
          ],
        })],
      })],
    }),
  });

  expect(result.metadata.workoutStructure).toMatchObject({
    completedSegments: 3,
    completedWorkingSets: 1,
    dropSegments: 2,
    failureSegments: 1,
    totalRepWeight: 20,
  });
  expect(result.metadata.effortProfile.segments).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "drop-normal", source: "drop", parentSetId: "parent", effortBand: "working-moderate" }),
    expect.objectContaining({ id: "drop-failure", source: "drop", parentSetId: "parent", effortBand: "high-effort-failure" }),
  ]));
  expect(metRange(result)).toEqual({ lowerMet: 3.875, upperMet: 5.375 });
});

test("rep weighting caps large entries so one set cannot dominate the mixture", () => {
  function mixedWorkout(warmUpReps) {
    return workout({
      exercises: [exercise({
        sets: [
          workingSet({ id: "warm", setType: "warm-up", reps: warmUpReps }),
          workingSet({ id: "work", reps: 10 }),
        ],
      })],
    });
  }
  const atCap = estimate({ workout: mixedWorkout(20) });
  const aboveCap = estimate({ workout: mixedWorkout(1000) });

  expect(aboveCap.result).toEqual(atCap.result);
  expect(metRange(aboveCap)).toEqual(metRange(atCap));
  expect(aboveCap.metadata.effortProfile.segments[0]).toMatchObject({
    recordedReps: 1000,
    repWeight: 20,
    repWeightCapped: true,
  });
});

test("missing reps use neutral minimum weight and widen uncertainty", () => {
  const complete = estimate({
    workout: workout({ exercises: [exercise({ sets: [workingSet(), workingSet({ id: "set-2" })] })] }),
  });
  const missing = estimate({
    workout: workout({ exercises: [exercise({ sets: [workingSet(), workingSet({ id: "set-2", reps: undefined })] })] }),
  });
  const missingSegment = missing.metadata.effortProfile.segments[1];

  expect(missingSegment).toMatchObject({
    recordedReps: null,
    repsStatus: "missing",
    repWeight: 1,
    uncertaintyWidened: true,
  });
  expect(metRange(missing).lowerMet).toBeLessThan(metRange(complete).lowerMet);
  expect(metRange(missing).upperMet).toBeGreaterThan(metRange(complete).upperMet);
  expect(missing.metadata.confidence.reasons).toContain("missing-reps");
});

test("active duration is applied exactly once to the combined session range", () => {
  const sixtyMinutes = estimate();
  const oneHundredTwentyMinutes = estimate({
    workout: workout({ activeDurationMinutes: 120 }),
  });

  expect(sixtyMinutes.result).toEqual({ lowerKcal: 290, upperKcal: 420 });
  expect(oneHundredTwentyMinutes.result).toEqual({ lowerKcal: 580, upperKcal: 840 });
});

test("adding identical sets does not create additive per-set calorie totals", () => {
  const oneSet = estimate();
  const sixSets = estimate({
    workout: workout({
      exercises: [exercise({
        sets: Array.from({ length: 6 }, (_, index) => workingSet({ id: `set-${index}` })),
      })],
    }),
  });

  expect(sixSets.metadata.workoutStructure.completedSegments).toBe(6);
  expect(sixSets.result).toEqual(oneSet.result);
  expect(metRange(sixSets)).toEqual(metRange(oneSet));
});

test.each([
  ["empty", []],
  ["all skipped", [exercise({ roadmapStatus: "skipped", sets: [] })]],
])("%s workouts return no-completed-work", (_label, exercises) => {
  const result = estimate({ workout: workout({ exercises }) });
  expect(result).toMatchObject({
    status: "no-completed-work",
    code: "no-completed-work",
    result: null,
    metadata: { workoutStructure: { completedSegments: 0 } },
  });
  expect(result.metadata.effortProfile.segments).toEqual([]);
});

test("warm-up and working sets combine into one weighted session-average range", () => {
  const result = estimate({
    workout: workout({
      exercises: [exercise({
        sets: [
          workingSet({ id: "warm", setType: "warm-up", reps: 10 }),
          workingSet({ id: "work", reps: 10 }),
        ],
      })],
    }),
  });

  expect(metRange(result)).toEqual({ lowerMet: 3, upperMet: 4.4 });
  expect(result.result).toEqual({ lowerKcal: 250, upperKcal: 370 });
});

test("adult and MET60+ segment mixtures use separate method bases", () => {
  const adult = estimate({ age: 59 });
  const olderAdult = estimate({ age: 60 });

  expect(adult.metadata.calculationInputs.ageBasis).toBe("adult");
  expect(olderAdult.metadata.calculationInputs.ageBasis).toBe("older-adult");
  expect(metRange(adult)).toEqual({ lowerMet: 3.5, upperMet: 5 });
  expect(metRange(olderAdult)).toEqual({ lowerMet: 3.5, upperMet: 4.5 });
  expect(adult.result).toEqual({ lowerKcal: 290, upperKcal: 420 });
  expect(olderAdult.result).toEqual({ lowerKcal: 220, upperKcal: 300 });
});

test("missing age envelopes the separately evaluated adult and older-adult mixtures", () => {
  const result = estimate({ age: null });
  expect(result.result).toEqual({ lowerKcal: 220, upperKcal: 420 });
  expect(result.metadata.inputCompleteness.optional.age).toBe("missing");
  expect(result.metadata.calculationInputs.ageBasis).toBe("age-unknown");
  expect(result.metadata.confidence.reasons).toContain("age-not-provided");
});

test("known age under 19 remains unsupported", () => {
  expect(estimate({ age: 18 })).toMatchObject({
    status: "unsupported-age",
    code: "unsupported-age",
    result: null,
    metadata: { inputCompleteness: { optional: { age: "unsupported" } } },
  });
});

test.each([
  [undefined, "missing-required-inputs", "missing"],
  [{ value: 0, unit: "kg" }, "invalid-inputs", "invalid"],
  [{ value: 80, unit: "lb" }, "invalid-inputs", "invalid"],
  [{ value: "80", unit: "kg" }, "invalid-inputs", "invalid"],
])("defensively rejects missing or invalid normalized weight", (bodyWeight, status, state) => {
  const result = estimate({ bodyWeight });
  expect(result.status).toBe(status);
  expect(result.result).toBeNull();
  expect(result.metadata.inputCompleteness.required.bodyWeight).toBe(state);
});

test.each([
  [undefined, "missing-required-inputs", "missing"],
  [0, "invalid-inputs", "invalid"],
  [30.5, "invalid-inputs", "invalid"],
  ["30", "invalid-inputs", "invalid"],
])("defensively rejects missing or invalid active duration", (activeDurationMinutes, status, state) => {
  const result = estimate({ workout: workout({ activeDurationMinutes }) });
  expect(result.status).toBe(status);
  expect(result.result).toBeNull();
  expect(result.metadata.inputCompleteness.required.activeDuration).toBe(state);
});

test("historical lb and kg resolver results feed the estimator identically", () => {
  const workoutDate = "2026-08-30T18:00:00.000Z";
  const fromPounds = resolveHistoricalBodyWeight([{
    id: "lb",
    occurredAt: "2026-08-20T08:00:00.000Z",
    measurements: { weight: { value: 220, unit: "lb" } },
  }], workoutDate);
  const fromKilograms = resolveHistoricalBodyWeight([{
    id: "kg",
    occurredAt: "2026-08-20T08:00:00.000Z",
    measurements: { weight: { value: 220 * 0.45359237, unit: "kg" } },
  }], workoutDate);

  expect(estimate({ bodyWeight: fromPounds }).result).toEqual({ lowerKcal: 360, upperKcal: 530 });
  expect(estimate({ bodyWeight: fromKilograms }).result).toEqual({ lowerKcal: 360, upperKcal: 530 });
});

test("birthday boundaries select the age basis on the workout date", () => {
  const dateOfBirth = "1966-08-30";
  const ageBefore = deriveAgeOnDate(dateOfBirth, "2026-08-29");
  const ageOnBirthday = deriveAgeOnDate(dateOfBirth, "2026-08-30");
  expect(ageBefore).toBe(59);
  expect(ageOnBirthday).toBe(60);
  expect(estimate({ age: ageBefore }).metadata.calculationInputs.ageBasis).toBe("adult");
  expect(estimate({ age: ageOnBirthday }).metadata.calculationInputs.ageBasis).toBe("older-adult");
});

test("external load amount and exercise identity affect completeness, never the MET arithmetic", () => {
  const lightLoad = estimate({
    workout: workout({ exercises: [exercise({ sets: [workingSet({ load: { mode: "external", amount: 20, unit: "lb" } })] })] }),
  });
  const heavyLoadWithoutIdentity = estimate({
    workout: workout({ exercises: [exercise({ exerciseId: undefined, sets: [workingSet({ load: { mode: "external", amount: 500, unit: "lb" } })] })] }),
  });

  expect(heavyLoadWithoutIdentity.result).toEqual(lightLoad.result);
  expect(metRange(heavyLoadWithoutIdentity)).toEqual(metRange(lightLoad));
  expect(lightLoad.metadata.confidence.level).toBe("moderate");
  expect(heavyLoadWithoutIdentity.metadata.confidence.reasons).toContain("exercise-identity-incomplete");
});

test("public output contains calorie values only as outward-rounded lower and upper bounds", () => {
  const result = estimate({
    bodyWeight: { value: 81.3, unit: "kg" },
    workout: workout({ activeDurationMinutes: 47 }),
  });
  const kcalKeys = [];
  function visit(value) {
    if (!value || typeof value !== "object") return;
    Object.entries(value).forEach(([key, nested]) => {
      if (/kcal/i.test(key)) kcalKeys.push(key);
      visit(nested);
    });
  }
  visit(result);

  expect(kcalKeys.sort()).toEqual(["lowerKcal", "upperKcal"]);
  expect(Object.keys(result.result).sort()).toEqual(["lowerKcal", "upperKcal"]);
  expect(result.result.lowerKcal % 10).toBe(0);
  expect(result.result.upperKcal % 10).toBe(0);
  expect(JSON.stringify(result)).not.toMatch(/midpoint|exactKcal|caloriesPer|afterburn/i);
});

test("identical inputs are deterministic and neither workout nor resolver input is mutated", () => {
  const inputs = {
    workout: workout({
      exercises: [exercise({
        exerciseReference: { source: "user-saved", sourceId: "saved:press" },
        exerciseId: undefined,
        sets: [workingSet({ drops: [{ id: "drop", reps: 5, load: { mode: "bodyweight" } }] })],
      })],
    }),
    bodyWeight: { value: 80, unit: "kg", sourceEntryId: "health-immutable" },
    age: 35,
  };
  const before = JSON.parse(JSON.stringify(inputs));
  const first = estimateWorkoutCalorieRange(inputs);
  const second = estimateWorkoutCalorieRange(inputs);

  expect(first).toEqual(second);
  expect(inputs).toEqual(before);
  expect(buildWorkoutEffortSegments(inputs.workout)).toEqual(buildWorkoutEffortSegments(inputs.workout));
});

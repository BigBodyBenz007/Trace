import {
  buildWorkoutEffortSegments,
  estimateWorkoutCalorieRange,
  WORKOUT_CALORIE_DENSITY_POLICY,
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

test("exports version 3 of the broad bounded-rep density-mixture method", () => {
  expect(WORKOUT_CALORIE_ESTIMATOR_METHOD).toEqual({
    id: "trace-workout-calorie-range",
    version: 3,
    estimateKind: "broad-estimate",
    mixturePolicy: "bounded-rep-density-mixture",
  });
  expect(WORKOUT_CALORIE_REP_WEIGHT_POLICY).toEqual({ minimum: 1, maximum: 20 });
  expect(WORKOUT_CALORIE_DENSITY_POLICY).toEqual({
    effortRepWeightPerMinuteCap: 4,
    highEffortRepWeightPerMinuteCap: 1,
    maximumDensityShiftBandFraction: 0.5,
    maximumHighEffortShiftBandFraction: 0.5,
    missingDataUncertaintyBandFraction: 0.25,
    effortFactorMinimum: 0.5,
    effortFactorMaximum: 1.5,
  });
});

test.each([
  ["light", { lowerKcal: 240, upperKcal: 330 }, { lowerMet: 2.8, upperMet: 3.8 }, { lowerMet: 2.902, upperMet: 3.902 }],
  ["moderate", { lowerKcal: 300, upperKcal: 440 }, { lowerMet: 3.5, upperMet: 5 }, { lowerMet: 3.653, upperMet: 5.153 }],
  ["high", { lowerKcal: 430, upperKcal: 550 }, { lowerMet: 5, upperMet: 6.5 }, { lowerMet: 5.153, upperMet: 6.5 }],
  [undefined, { lowerKcal: 260, upperKcal: 550 }, { lowerMet: 2.8, upperMet: 6.5 }, { lowerMet: 3.178, upperMet: 6.5 }],
])("keeps the adult %s intensity band primary while applying bounded density", (
  intensity,
  expectedCalories,
  expectedBaseline,
  expectedMet
) => {
  const result = estimate({ workout: workout({ intensity }) });
  expect(result.status).toBe("calculated");
  expect(result.result).toEqual(expectedCalories);
  expect(metRange(result)).toEqual(expectedMet);
  expect(result.metadata.effortProfile.density.baselineMetRange).toEqual(expectedBaseline);
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

  expect(result.result).toEqual({ lowerKcal: 220, upperKcal: 340 });
  expect(result.metadata.effortProfile.density.baselineMetRange).toEqual({
    lowerMet: 2.5,
    upperMet: 3.8,
  });
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

test("failure sets influence the profile more than otherwise identical working sets", () => {
  const baseline = estimate({ workout: workout({ activeDurationMinutes: 45 }) });
  const normal = estimate({
    workout: workout({
      activeDurationMinutes: 45,
      exercises: [exercise({
        sets: [workingSet(), workingSet({ id: "added-normal" })],
      })],
    }),
  });
  const failure = estimate({
    workout: workout({
      activeDurationMinutes: 45,
      exercises: [exercise({
        sets: [
          workingSet(),
          workingSet({
            id: "added-failure",
            toFailure: true,
            actualRepsAtFailure: 10,
          }),
        ],
      })],
    }),
  });

  expect(
    metRange(failure).lowerMet - metRange(baseline).lowerMet
  ).toBeGreaterThan(
    metRange(normal).lowerMet - metRange(baseline).lowerMet
  );
  expect(
    metRange(failure).upperMet - metRange(baseline).upperMet
  ).toBeGreaterThan(
    metRange(normal).upperMet - metRange(baseline).upperMet
  );
  expect(failure.result.lowerKcal).toBeGreaterThan(normal.result.lowerKcal);
  expect(failure.metadata.workoutStructure.failureSegments).toBe(1);
  expect(failure.metadata.effortProfile.segments[1]).toMatchObject({
    effortBand: "high-effort-failure",
    highEffortFactor: 1,
  });
});

test("drop segments affect density and are weighted separately using their own failure status", () => {
  const withoutDrops = estimate();
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
  expect(result.metadata.effortProfile.density.effortRepWeight).toBeGreaterThan(
    withoutDrops.metadata.effortProfile.density.effortRepWeight
  );
  expect(metRange(result).lowerMet).toBeGreaterThan(metRange(withoutDrops).lowerMet);
  expect(metRange(result).upperMet).toBeGreaterThan(metRange(withoutDrops).upperMet);
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

test("approximate workout duration is applied exactly once to the combined session range", () => {
  const sixtyMinutes = estimate();
  const oneHundredTwentyMinutes = estimate({
    workout: workout({
      activeDurationMinutes: 120,
      exercises: [exercise({
        sets: [workingSet(), workingSet({ id: "set-2" })],
      })],
    }),
  });

  expect(metRange(oneHundredTwentyMinutes)).toEqual(metRange(sixtyMinutes));
  expect(sixtyMinutes.result).toEqual({ lowerKcal: 300, upperKcal: 440 });
  expect(oneHundredTwentyMinutes.result).toEqual({ lowerKcal: 610, upperKcal: 870 });
});

test("six identical sets at the same duration raise the range sublinearly without assumed set minutes", () => {
  const oneSet = estimate({ workout: workout({ activeDurationMinutes: 45 }) });
  const sixSets = estimate({
    workout: workout({
      activeDurationMinutes: 45,
      exercises: [exercise({
        sets: Array.from({ length: 6 }, (_, index) => workingSet({ id: `set-${index}` })),
      })],
    }),
  });

  expect(sixSets.metadata.workoutStructure.completedSegments).toBe(6);
  expect(sixSets.result.lowerKcal).toBeGreaterThan(oneSet.result.lowerKcal);
  expect(sixSets.result.upperKcal).toBeGreaterThan(oneSet.result.upperKcal);
  expect(sixSets.result.lowerKcal).toBeLessThan(oneSet.result.lowerKcal * 6);
  expect(sixSets.result.upperKcal).toBeLessThan(oneSet.result.upperKcal * 6);
  expect(oneSet.result).toEqual({ lowerKcal: 230, upperKcal: 330 });
  expect(sixSets.result).toEqual({ lowerKcal: 240, upperKcal: 350 });
});

test("adding otherwise identical completed working segments never lowers either MET bound", () => {
  const profiles = Array.from({ length: 30 }, (_, setIndex) => estimate({
    workout: workout({
      activeDurationMinutes: 45,
      exercises: [exercise({
        sets: Array.from({ length: setIndex + 1 }, (_, index) => workingSet({
          id: `set-${index}`,
        })),
      })],
    }),
  }));

  profiles.slice(1).forEach((profile, index) => {
    const previous = metRange(profiles[index]);
    const current = metRange(profile);
    expect(current.lowerMet).toBeGreaterThanOrEqual(previous.lowerMet);
    expect(current.upperMet).toBeGreaterThanOrEqual(previous.upperMet);
  });
});

test("a warm-up adds less density influence than an otherwise identical working set", () => {
  const baseline = workout({ activeDurationMinutes: 45 });
  const oneSet = estimate({ workout: baseline });
  const withWarmUp = estimate({
    workout: {
      ...baseline,
      exercises: [exercise({
        sets: [
          workingSet(),
          workingSet({ id: "added", setType: "warm-up" }),
        ],
      })],
    },
  });
  const withWorking = estimate({
    workout: {
      ...baseline,
      exercises: [exercise({
        sets: [workingSet(), workingSet({ id: "added" })],
      })],
    },
  });

  const warmUpIncrease = metRange(withWarmUp).lowerMet - metRange(oneSet).lowerMet;
  const workingIncrease = metRange(withWorking).lowerMet - metRange(oneSet).lowerMet;
  expect(warmUpIncrease).toBeGreaterThan(0);
  expect(workingIncrease).toBeGreaterThan(warmUpIncrease);
  expect(withWarmUp.metadata.effortProfile.segments[1].densityEffortFactor).toBeLessThan(
    withWorking.metadata.effortProfile.segments[1].densityEffortFactor
  );
});

test("rep and total density effects are independently clamped", () => {
  const saturatedSets = Array.from({ length: 18 }, (_, index) => workingSet({
    id: `set-${index}`,
    reps: 20,
  }));
  const extremeSets = Array.from({ length: 180 }, (_, index) => workingSet({
    id: `extreme-${index}`,
    reps: 1000,
  }));
  const saturated = estimate({
    workout: workout({ activeDurationMinutes: 45, exercises: [exercise({ sets: saturatedSets })] }),
  });
  const extreme = estimate({
    workout: workout({ activeDurationMinutes: 45, exercises: [exercise({ sets: extremeSets })] }),
  });

  expect(extreme.result).toEqual(saturated.result);
  expect(metRange(extreme)).toEqual(metRange(saturated));
  expect(extreme.metadata.effortProfile.density).toMatchObject({
    boundedEffortRepWeightPerMinute: 4,
    densityClamped: true,
  });
  expect(extreme.metadata.effortProfile.segments.every(({ repWeight }) => repWeight === 20)).toBe(true);
});

function calibratedWorkout({ warmUps = 0, working = 0, failure = 0 }) {
  return workout({
    activeDurationMinutes: 45,
    intensity: "moderate",
    exercises: [exercise({
      sets: [
        ...Array.from({ length: warmUps }, (_, index) => workingSet({
          id: `warm-${index}`,
          setType: "warm-up",
        })),
        ...Array.from({ length: working }, (_, index) => workingSet({
          id: `work-${index}`,
          ...(index < failure
            ? { toFailure: true, actualRepsAtFailure: 10 }
            : {}),
        })),
      ],
    })],
  });
}

test.each([
  ["1 working", { working: 1 }, { lowerKcal: 230, upperKcal: 330 }],
  ["6 working", { working: 6 }, { lowerKcal: 240, upperKcal: 350 }],
  ["12 working", { working: 12 }, { lowerKcal: 250, upperKcal: 360 }],
  ["4 warm-up plus 8 working", { warmUps: 4, working: 8 }, { lowerKcal: 250, upperKcal: 360 }],
  ["4 warm-up plus 8 working with 2 failures", { warmUps: 4, working: 8, failure: 2 }, { lowerKcal: 290, upperKcal: 390 }],
])("calibrates the 80 kg, 45-minute moderate scenario: %s", (_label, sets, expected) => {
  expect(estimate({ workout: calibratedWorkout(sets) }).result).toEqual(expected);
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

test("warm-up and working sets combine into one density-refined session-average range", () => {
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

  expect(metRange(result)).toEqual({ lowerMet: 3.702, upperMet: 5.202 });
  expect(result.result).toEqual({ lowerKcal: 310, upperKcal: 440 });
});

test("adult and MET60+ segment mixtures use separate method bases", () => {
  const adult = estimate({ age: 59 });
  const olderAdult = estimate({ age: 60 });

  expect(adult.metadata.calculationInputs.ageBasis).toBe("adult");
  expect(olderAdult.metadata.calculationInputs.ageBasis).toBe("older-adult");
  expect(metRange(adult)).toEqual({ lowerMet: 3.653, upperMet: 5.153 });
  expect(metRange(olderAdult)).toEqual({ lowerMet: 3.602, upperMet: 4.602 });
  expect(adult.result).toEqual({ lowerKcal: 300, upperKcal: 440 });
  expect(olderAdult.result).toEqual({ lowerKcal: 230, upperKcal: 300 });
});

test("dense and high-effort profiles remain inside each approved overall boundary", () => {
  const denseFailureWorkout = workout({
    activeDurationMinutes: 10,
    exercises: [exercise({
      sets: Array.from({ length: 50 }, (_, index) => workingSet({
        id: `failure-${index}`,
        reps: 1000,
        toFailure: true,
        actualRepsAtFailure: 1000,
      })),
    })],
  });
  const adult = estimate({ workout: denseFailureWorkout, age: 35 });
  const olderAdult = estimate({ workout: denseFailureWorkout, age: 60 });

  expect(metRange(adult).lowerMet).toBeGreaterThanOrEqual(2.5);
  expect(metRange(adult).upperMet).toBeLessThanOrEqual(6.5);
  expect(metRange(olderAdult).lowerMet).toBeGreaterThanOrEqual(2.3);
  expect(metRange(olderAdult).upperMet).toBeLessThanOrEqual(5);
  expect(adult.metadata.effortProfile.density).toMatchObject({
    densityClamped: true,
    highEffortDensityClamped: true,
  });
});

test("missing age envelopes the separately evaluated adult and older-adult mixtures", () => {
  const result = estimate({ age: null });
  expect(result.result).toEqual({ lowerKcal: 230, upperKcal: 440 });
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
])("defensively rejects missing or invalid approximate workout duration", (activeDurationMinutes, status, state) => {
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

  expect(estimate({ bodyWeight: fromPounds }).result).toEqual({ lowerKcal: 380, upperKcal: 540 });
  expect(estimate({ bodyWeight: fromKilograms }).result).toEqual({ lowerKcal: 380, upperKcal: 540 });
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
  expect(JSON.stringify(result)).not.toMatch(
    /midpoint|exactKcal|caloriesPer|perSet|assumed.*minutes|afterburn/i
  );
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

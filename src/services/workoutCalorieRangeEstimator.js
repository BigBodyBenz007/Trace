/**
 * Trace Workout Calorie Range Estimator
 *
 * Scientific basis:
 * - Ages 19-59 use 2024 Compendium of Physical Activities resistance-training
 *   MET bands and the standard 3.5 mL O2/kg/min MET equation.
 * - Ages 60+ use the Older Adult Compendium MET60+ bands and its
 *   2.7 mL O2/kg/min equation basis.
 *
 * Trace set-mixture policy:
 * Every completed main set and drop is one effort segment. Recorded reps are a
 * bounded proxy for relative time under effort: each segment has a minimum
 * weight of 1 and a maximum weight of 20. A missing rep count uses weight 1 and
 * widens that segment to the full supported MET boundary. Segment MET bands are
 * averaged first; body weight and the full active duration are then applied
 * exactly once to that session-average range.
 *
 * This transparent mixture is a Trace estimation policy operating within the
 * published MET boundaries, not a clinically validated per-set calorie model.
 * It never converts reps, sets, exercise identity, or external load into fixed
 * calories, never adds set calories, and excludes post-workout "afterburn."
 */

export const WORKOUT_CALORIE_ESTIMATOR_METHOD = Object.freeze({
  id: "trace-workout-calorie-range",
  version: 2,
  estimateKind: "broad-estimate",
  mixturePolicy: "bounded-rep-set-mixture",
});

export const WORKOUT_CALORIE_REP_WEIGHT_POLICY = Object.freeze({
  minimum: 1,
  maximum: 20,
});

const INTENSITIES = new Set(["light", "moderate", "high"]);

const ADULT_BASIS = Object.freeze({
  id: "adult",
  oxygenFactor: 3.5,
  overall: Object.freeze([2.5, 6.5]),
  ranges: Object.freeze({
    warmUp: Object.freeze([2.5, 3.8]),
    light: Object.freeze([2.8, 3.8]),
    moderate: Object.freeze([3.5, 5.0]),
    high: Object.freeze([5.0, 6.5]),
    unspecified: Object.freeze([2.8, 6.5]),
  }),
});

const OLDER_ADULT_BASIS = Object.freeze({
  id: "older-adult",
  oxygenFactor: 2.7,
  overall: Object.freeze([2.3, 5.0]),
  ranges: Object.freeze({
    warmUp: Object.freeze([2.3, 3.0]),
    light: Object.freeze([2.3, 3.0]),
    moderate: Object.freeze([3.5, 4.5]),
    high: Object.freeze([4.3, 5.0]),
    unspecified: Object.freeze([2.3, 5.0]),
  }),
});

function inputState(value, validate) {
  if (value === undefined || value === null || value === "") return "missing";
  return validate(value) ? "provided" : "invalid";
}

function validNormalizedWeight(value) {
  return value
    && typeof value === "object"
    && value.unit === "kg"
    && typeof value.value === "number"
    && Number.isFinite(value.value)
    && value.value > 0;
}

function validActiveDuration(value) {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value > 0;
}

function validAge(value) {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0;
}

function validIntensity(value) {
  return INTENSITIES.has(value);
}

function recordedReps(segment) {
  if (segment?.toFailure === true) {
    if (
      Number.isSafeInteger(segment.actualRepsAtFailure)
      && segment.actualRepsAtFailure >= 0
    ) {
      return segment.actualRepsAtFailure;
    }
    if (
      (segment.actualRepsAtFailure === null || segment.actualRepsAtFailure === undefined)
      && segment.reps === 0
    ) {
      return null;
    }
  }
  return Number.isSafeInteger(segment?.reps) && segment.reps >= 0
    ? segment.reps
    : null;
}

function segmentLoad(segment) {
  if (segment?.load?.mode === "bodyweight") {
    return { mode: "bodyweight", complete: true };
  }
  if (segment?.load?.mode === "external") {
    const complete = typeof segment.load.amount === "number"
      && Number.isFinite(segment.load.amount)
      && segment.load.amount > 0
      && ["lb", "kg"].includes(segment.load.unit);
    return { mode: "external", complete };
  }
  return { mode: "unknown", complete: false };
}

function exerciseIdentity(exercise) {
  if (typeof exercise?.exerciseId === "string" && exercise.exerciseId.trim()) {
    return { source: "built-in", id: exercise.exerciseId };
  }
  if (
    typeof exercise?.exerciseReference?.sourceId === "string"
    && exercise.exerciseReference.sourceId.trim()
  ) {
    return {
      source: exercise.exerciseReference.source || "user-saved",
      id: exercise.exerciseReference.sourceId,
    };
  }
  return null;
}

function effortSegment(segment, context) {
  if (!segment || typeof segment !== "object" || Array.isArray(segment)) return null;
  const reps = recordedReps(segment);
  const load = segmentLoad(segment);
  const repWeight = reps === null
    ? WORKOUT_CALORIE_REP_WEIGHT_POLICY.minimum
    : Math.max(
      WORKOUT_CALORIE_REP_WEIGHT_POLICY.minimum,
      Math.min(reps, WORKOUT_CALORIE_REP_WEIGHT_POLICY.maximum)
    );

  return {
    id: segment.id ?? null,
    source: context.source,
    parentSetId: context.parentSetId ?? null,
    setType: context.setType,
    recordedReps: reps,
    repsStatus: reps === null ? "missing" : "recorded",
    repWeight,
    repWeightCapped: reps !== null && reps > WORKOUT_CALORIE_REP_WEIGHT_POLICY.maximum,
    toFailure: segment.toFailure === true,
    loadMode: load.mode,
    loadComplete: load.complete,
    exerciseIdentity: context.exerciseIdentity,
  };
}

export function buildWorkoutEffortSegments(workout) {
  const segments = [];
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];

  exercises.forEach((exercise, exerciseIndex) => {
    if (
      !exercise
      || typeof exercise !== "object"
      || Array.isArray(exercise)
      || exercise.roadmapStatus === "skipped"
      || !Array.isArray(exercise.sets)
    ) return;

    const identity = exerciseIdentity(exercise);
    exercise.sets.forEach((set, setIndex) => {
      const mainSetType = set?.setType === "warm-up"
        ? "warm-up"
        : set?.setType === undefined || set?.setType === "working"
          ? "working"
          : "unknown";
      const main = effortSegment(set, {
        source: "main-set",
        setType: mainSetType,
        exerciseIdentity: identity,
      });
      if (main) {
        segments.push({ ...main, exerciseIndex, setIndex, dropIndex: null });
      }

      if (!Array.isArray(set?.drops)) return;
      set.drops.forEach((drop, dropIndex) => {
        const dropSegment = effortSegment(drop, {
          source: "drop",
          parentSetId: set?.id ?? null,
          setType: "drop",
          exerciseIdentity: identity,
        });
        if (dropSegment) {
          segments.push({ ...dropSegment, exerciseIndex, setIndex, dropIndex });
        }
      });
    });
  });

  return segments;
}

function workoutStructure(workout, segments) {
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const skippedExercises = exercises.filter(
    (exercise) => exercise?.roadmapStatus === "skipped"
  ).length;
  const completedExerciseIndexes = new Set(segments.map(({ exerciseIndex }) => exerciseIndex));
  const missingRepSegments = segments.filter(({ repsStatus }) => repsStatus === "missing").length;
  const incompleteLoadSegments = segments.filter(({ loadComplete }) => !loadComplete).length;
  const unidentifiedExerciseSegments = segments.filter(
    ({ exerciseIdentity: identity }) => identity === null
  ).length;
  const unknownSetTypeSegments = segments.filter(({ setType }) => setType === "unknown").length;

  return {
    completedExercises: completedExerciseIndexes.size,
    skippedExercises,
    completedSegments: segments.length,
    completedWorkingSets: segments.filter(
      ({ source, setType }) => source === "main-set" && setType === "working"
    ).length,
    warmUpSets: segments.filter(({ setType }) => setType === "warm-up").length,
    dropSegments: segments.filter(({ source }) => source === "drop").length,
    totalRecordedReps: segments.reduce(
      (sum, segment) => sum + (segment.recordedReps ?? 0),
      0
    ),
    totalRepWeight: segments.reduce((sum, segment) => sum + segment.repWeight, 0),
    externalLoadSegments: segments.filter(({ loadMode }) => loadMode === "external").length,
    bodyweightSegments: segments.filter(({ loadMode }) => loadMode === "bodyweight").length,
    failureSegments: segments.filter(({ toFailure }) => toFailure).length,
    missingRepSegments,
    incompleteLoadSegments,
    unidentifiedExerciseSegments,
    unknownSetTypeSegments,
  };
}

function inputCompleteness({ bodyWeight, activeDuration, age, intensity }) {
  const required = {
    bodyWeight: inputState(bodyWeight, validNormalizedWeight),
    activeDuration: inputState(activeDuration, validActiveDuration),
  };
  const optional = {
    age: inputState(age, validAge),
    intensity: inputState(intensity, validIntensity),
  };
  const missingInputs = [];
  const invalidInputs = [];

  Object.entries({ ...required, ...optional }).forEach(([name, state]) => {
    if (state === "missing") missingInputs.push(name);
    if (state === "invalid") invalidInputs.push(name);
  });

  return { required, optional, missingInputs, invalidInputs };
}

function assignedBand(segment, basis, intensity) {
  if (segment.repsStatus === "missing" || segment.setType === "unknown") {
    return basis.overall;
  }
  if (segment.toFailure) return basis.ranges.high;
  if (segment.setType === "warm-up") return basis.ranges.warmUp;
  return basis.ranges[intensity || "unspecified"];
}

function effortBandLabel(segment, intensity) {
  if (segment.setType === "unknown") return "full-boundary-unknown-set-type";
  if (segment.toFailure) return "high-effort-failure";
  if (segment.setType === "warm-up") return "warm-up";
  return intensity ? `working-${intensity}` : "working-unspecified";
}

function combinedMetRange(segments, basis, intensity) {
  const totalWeight = segments.reduce((sum, segment) => sum + segment.repWeight, 0);
  let weightedLower = 0;
  let weightedUpper = 0;

  segments.forEach((segment) => {
    const band = assignedBand(segment, basis, intensity);
    weightedLower += band[0] * segment.repWeight;
    weightedUpper += band[1] * segment.repWeight;
  });

  return [
    Math.max(basis.overall[0], Math.min(weightedLower / totalWeight, basis.overall[1])),
    Math.max(basis.overall[0], Math.min(weightedUpper / totalWeight, basis.overall[1])),
  ];
}

function rawCalorieRange(basis, metRange, bodyWeightKg, activeDurationMinutes) {
  const durationWeightScale = basis.oxygenFactor
    * bodyWeightKg
    / 200
    * activeDurationMinutes;
  return [metRange[0] * durationWeightScale, metRange[1] * durationWeightScale];
}

function outwardRoundedRange(rawLower, rawUpper) {
  return {
    lowerKcal: Math.floor(rawLower / 10) * 10,
    upperKcal: Math.ceil(rawUpper / 10) * 10,
  };
}

function roundedMet(value) {
  return Math.round(value * 1000) / 1000;
}

function confidenceMetadata(status, completeness, structure) {
  if (status !== "calculated") {
    return { level: "not-calculable", reasons: [] };
  }

  const reasons = [];
  if (completeness.optional.age === "missing") reasons.push("age-not-provided");
  if (completeness.optional.intensity === "missing") reasons.push("intensity-not-specified");
  if (structure.missingRepSegments > 0) reasons.push("missing-reps");
  if (structure.incompleteLoadSegments > 0) reasons.push("incomplete-load-data");
  if (structure.unidentifiedExerciseSegments > 0) reasons.push("exercise-identity-incomplete");
  if (structure.unknownSetTypeSegments > 0) reasons.push("unknown-set-type");

  return { level: reasons.length === 0 ? "moderate" : "low", reasons };
}

function response(status, code, result, completeness, structure, segments, profile = null) {
  return {
    status,
    code,
    result,
    metadata: {
      method: WORKOUT_CALORIE_ESTIMATOR_METHOD,
      confidence: confidenceMetadata(status, completeness, structure),
      inputCompleteness: completeness,
      calculationInputs: {
        ageBasis: completeness.optional.age === "missing"
          ? "age-unknown"
          : completeness.optional.age === "unsupported"
            ? "unsupported"
            : profile?.ageBasis ?? null,
        intensity: completeness.optional.intensity === "provided"
          ? profile?.intensity ?? null
          : "unspecified",
        bodyWeight: completeness.required.bodyWeight,
        activeDuration: completeness.required.activeDuration,
      },
      workoutStructure: structure,
      effortProfile: {
        policy: WORKOUT_CALORIE_REP_WEIGHT_POLICY,
        segments: segments.map((segment) => ({
          ...segment,
          effortBand: effortBandLabel(segment, profile?.intensity),
          uncertaintyWidened: segment.repsStatus === "missing" || segment.setType === "unknown",
        })),
        combinedMetRange: profile?.metRange
          ? {
              lowerMet: roundedMet(profile.metRange[0]),
              upperMet: roundedMet(profile.metRange[1]),
            }
          : null,
      },
    },
  };
}

export function estimateWorkoutCalorieRange({ workout, bodyWeight, age } = {}) {
  const segments = buildWorkoutEffortSegments(workout);
  const structure = workoutStructure(workout, segments);
  const activeDuration = workout?.activeDurationMinutes;
  const intensity = workout?.intensity;
  const completeness = inputCompleteness({ bodyWeight, activeDuration, age, intensity });

  if (completeness.invalidInputs.length > 0) {
    return response("invalid-inputs", "invalid-inputs", null, completeness, structure, segments);
  }
  if (
    completeness.required.bodyWeight === "missing"
    || completeness.required.activeDuration === "missing"
  ) {
    return response(
      "missing-required-inputs",
      "missing-required-inputs",
      null,
      completeness,
      structure,
      segments
    );
  }
  if (completeness.optional.age === "provided" && age < 19) {
    const unsupportedCompleteness = {
      ...completeness,
      optional: { ...completeness.optional, age: "unsupported" },
    };
    return response(
      "unsupported-age",
      "unsupported-age",
      null,
      unsupportedCompleteness,
      structure,
      segments
    );
  }
  if (segments.length === 0) {
    return response(
      "no-completed-work",
      "no-completed-work",
      null,
      completeness,
      structure,
      segments
    );
  }

  const selectedIntensity = intensity || "";
  const bodyWeightKg = bodyWeight.value;
  let rawLower;
  let rawUpper;
  let profile;

  if (completeness.optional.age === "missing") {
    const adultMetRange = combinedMetRange(segments, ADULT_BASIS, selectedIntensity);
    const olderMetRange = combinedMetRange(segments, OLDER_ADULT_BASIS, selectedIntensity);
    const adultCalories = rawCalorieRange(
      ADULT_BASIS,
      adultMetRange,
      bodyWeightKg,
      activeDuration
    );
    const olderCalories = rawCalorieRange(
      OLDER_ADULT_BASIS,
      olderMetRange,
      bodyWeightKg,
      activeDuration
    );
    rawLower = Math.min(adultCalories[0], olderCalories[0]);
    rawUpper = Math.max(adultCalories[1], olderCalories[1]);
    profile = {
      ageBasis: "age-unknown-envelope",
      intensity: selectedIntensity,
      metRange: [
        Math.min(adultMetRange[0], olderMetRange[0]),
        Math.max(adultMetRange[1], olderMetRange[1]),
      ],
    };
  } else {
    const basis = age >= 60 ? OLDER_ADULT_BASIS : ADULT_BASIS;
    const metRange = combinedMetRange(segments, basis, selectedIntensity);
    [rawLower, rawUpper] = rawCalorieRange(
      basis,
      metRange,
      bodyWeightKg,
      activeDuration
    );
    profile = {
      ageBasis: basis.id,
      intensity: selectedIntensity,
      metRange,
    };
  }

  if (!Number.isFinite(rawLower) || !Number.isFinite(rawUpper)) {
    const overflowCompleteness = {
      ...completeness,
      invalidInputs: [...completeness.invalidInputs, "calculation"],
    };
    return response(
      "invalid-inputs",
      "invalid-inputs",
      null,
      overflowCompleteness,
      structure,
      segments
    );
  }

  return response(
    "calculated",
    null,
    outwardRoundedRange(rawLower, rawUpper),
    completeness,
    structure,
    segments,
    profile
  );
}

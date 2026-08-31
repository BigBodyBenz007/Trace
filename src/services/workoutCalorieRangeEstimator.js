/**
 * Trace Workout Calorie Range Estimator
 *
 * Scientific basis:
 * - Ages 19-59 use 2024 Compendium of Physical Activities resistance-training
 *   MET bands and the standard 3.5 mL O2/kg/min MET equation.
 * - Ages 60+ use the Older Adult Compendium MET60+ bands and its
 *   2.7 mL O2/kg/min equation basis.
 *
 * Trace set-mixture and density policy:
 * Every completed main set and drop is one effort segment. Recorded reps are a
 * bounded proxy for relative work: each segment has a minimum weight of 1 and a
 * maximum weight of 20. Segment weights and their published MET bands form a
 * clamped, square-root density signal per user-entered workout minute. The
 * selected intensity band remains the session baseline; warm-ups contribute a
 * smaller density factor, while published high-effort bands add a separately
 * clamped signal. Missing reps use the neutral minimum weight and widen the
 * range. Body weight and the full approximate workout duration are applied
 * exactly once after the session-average MET range is established.
 *
 * This transparent mixture is a Trace estimation policy operating within the
 * published MET boundaries, not a clinically validated per-set calorie or
 * assumed-minutes equation. It never converts reps, sets, exercise identity, or
 * external load into fixed calories, never adds set calories, and excludes
 * post-workout "afterburn."
 */

export const WORKOUT_CALORIE_ESTIMATOR_METHOD = Object.freeze({
  id: "trace-workout-calorie-range",
  version: 3,
  estimateKind: "broad-estimate",
  mixturePolicy: "bounded-rep-density-mixture",
});

export const WORKOUT_CALORIE_REP_WEIGHT_POLICY = Object.freeze({
  minimum: 1,
  maximum: 20,
});

export const WORKOUT_CALORIE_DENSITY_POLICY = Object.freeze({
  effortRepWeightPerMinuteCap: 4,
  highEffortRepWeightPerMinuteCap: 1,
  maximumDensityShiftBandFraction: 0.5,
  maximumHighEffortShiftBandFraction: 0.5,
  missingDataUncertaintyBandFraction: 0.25,
  effortFactorMinimum: 0.5,
  effortFactorMaximum: 1.5,
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

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, maximum));
}

function midpoint([lower, upper]) {
  return (lower + upper) / 2;
}

function sessionBaselineBand(segments, basis, intensity) {
  const warmUpOnly = segments.every(
    (segment) => segment.setType === "warm-up" && !segment.toFailure
  );
  return warmUpOnly
    ? basis.ranges.warmUp
    : basis.ranges[intensity || "unspecified"];
}

/*
 * Exact Trace density refinement, where T is entered workout duration and W is
 * the selected baseline band's width:
 *   effortFactor_i = clamp(mid(segmentBand_i) / mid(baselineBand), 0.5, 1.5)
 *   density = min(sum(repWeight_i * effortFactor_i) / T, 4)
 *   densityShift = 0.5 * W * sqrt(density / 4)
 *   highFactor_i = clamp((mid(segmentBand_i) - mid(baselineBand)) / W, 0, 1)
 *   highDensity = min(sum(repWeight_i * highFactor_i) / T, 1)
 *   highShift = 0.5 * W * sqrt(highDensity)
 *   uncertainty = 0.25 * W * uncertainSegmentCount / completedSegmentCount
 * The two shifts move both bounds upward; uncertainty expands them outward;
 * final bounds are clamped to the applicable adult or MET60+ overall boundary.
 * Missing/unknown segments use effortFactor 1 and highFactor 0.
 */
function combinedMetProfile(segments, basis, intensity, activeDurationMinutes) {
  const baselineBand = sessionBaselineBand(segments, basis, intensity);
  const baselineMidpoint = midpoint(baselineBand);
  const baselineWidth = baselineBand[1] - baselineBand[0];
  let effortRepWeight = 0;
  let highEffortRepWeight = 0;

  const segmentDensity = segments.map((segment) => {
    const band = assignedBand(segment, basis, intensity);
    const uncertain = segment.repsStatus === "missing" || segment.setType === "unknown";
    const effortFactor = uncertain
      ? 1
      : clamp(
        midpoint(band) / baselineMidpoint,
        WORKOUT_CALORIE_DENSITY_POLICY.effortFactorMinimum,
        WORKOUT_CALORIE_DENSITY_POLICY.effortFactorMaximum
      );
    const highEffortFactor = uncertain || baselineWidth <= 0
      ? 0
      : clamp((midpoint(band) - baselineMidpoint) / baselineWidth, 0, 1);
    effortRepWeight += segment.repWeight * effortFactor;
    highEffortRepWeight += segment.repWeight * highEffortFactor;
    return { effortFactor, highEffortFactor };
  });

  const rawDensity = effortRepWeight / activeDurationMinutes;
  const boundedDensity = Math.min(
    rawDensity,
    WORKOUT_CALORIE_DENSITY_POLICY.effortRepWeightPerMinuteCap
  );
  const densityScore = Math.sqrt(
    boundedDensity / WORKOUT_CALORIE_DENSITY_POLICY.effortRepWeightPerMinuteCap
  );
  const densityShift = densityScore
    * baselineWidth
    * WORKOUT_CALORIE_DENSITY_POLICY.maximumDensityShiftBandFraction;

  const rawHighEffortDensity = highEffortRepWeight / activeDurationMinutes;
  const boundedHighEffortDensity = Math.min(
    rawHighEffortDensity,
    WORKOUT_CALORIE_DENSITY_POLICY.highEffortRepWeightPerMinuteCap
  );
  const highEffortScore = Math.sqrt(
    boundedHighEffortDensity
      / WORKOUT_CALORIE_DENSITY_POLICY.highEffortRepWeightPerMinuteCap
  );
  const highEffortShift = highEffortScore
    * baselineWidth
    * WORKOUT_CALORIE_DENSITY_POLICY.maximumHighEffortShiftBandFraction;

  const uncertainSegments = segments.filter(
    (segment) => segment.repsStatus === "missing" || segment.setType === "unknown"
  ).length;
  const uncertaintyExpansion = uncertainSegments / segments.length
    * baselineWidth
    * WORKOUT_CALORIE_DENSITY_POLICY.missingDataUncertaintyBandFraction;
  const totalShift = densityShift + highEffortShift;
  const metRange = [
    clamp(
      baselineBand[0] + totalShift - uncertaintyExpansion,
      basis.overall[0],
      basis.overall[1]
    ),
    clamp(
      baselineBand[1] + totalShift + uncertaintyExpansion,
      basis.overall[0],
      basis.overall[1]
    ),
  ];

  return {
    metRange,
    density: {
      baselineBand,
      effortRepWeight,
      rawDensity,
      boundedDensity,
      densityScore,
      densityShift,
      densityClamped: rawDensity > boundedDensity,
      highEffortRepWeight,
      rawHighEffortDensity,
      boundedHighEffortDensity,
      highEffortScore,
      highEffortShift,
      highEffortDensityClamped: rawHighEffortDensity > boundedHighEffortDensity,
      uncertainSegments,
      uncertaintyExpansion,
      segmentDensity,
    },
  };
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
        policy: {
          repWeight: WORKOUT_CALORIE_REP_WEIGHT_POLICY,
          density: WORKOUT_CALORIE_DENSITY_POLICY,
        },
        segments: segments.map((segment, index) => ({
          ...segment,
          effortBand: effortBandLabel(segment, profile?.intensity),
          uncertaintyWidened: segment.repsStatus === "missing" || segment.setType === "unknown",
          densityEffortFactor: profile?.density?.segmentDensity[index]
            ? roundedMet(profile.density.segmentDensity[index].effortFactor)
            : null,
          highEffortFactor: profile?.density?.segmentDensity[index]
            ? roundedMet(profile.density.segmentDensity[index].highEffortFactor)
            : null,
        })),
        combinedMetRange: profile?.metRange
          ? {
              lowerMet: roundedMet(profile.metRange[0]),
              upperMet: roundedMet(profile.metRange[1]),
            }
          : null,
        density: profile?.density
          ? {
              baselineMetRange: {
                lowerMet: roundedMet(profile.density.baselineBand[0]),
                upperMet: roundedMet(profile.density.baselineBand[1]),
              },
              effortRepWeight: roundedMet(profile.density.effortRepWeight),
              rawEffortRepWeightPerMinute: roundedMet(profile.density.rawDensity),
              boundedEffortRepWeightPerMinute: roundedMet(profile.density.boundedDensity),
              densityScore: roundedMet(profile.density.densityScore),
              densityShiftMet: roundedMet(profile.density.densityShift),
              densityClamped: profile.density.densityClamped,
              highEffortRepWeight: roundedMet(profile.density.highEffortRepWeight),
              rawHighEffortRepWeightPerMinute: roundedMet(
                profile.density.rawHighEffortDensity
              ),
              boundedHighEffortRepWeightPerMinute: roundedMet(
                profile.density.boundedHighEffortDensity
              ),
              highEffortShiftMet: roundedMet(profile.density.highEffortShift),
              highEffortDensityClamped: profile.density.highEffortDensityClamped,
              uncertainSegments: profile.density.uncertainSegments,
              uncertaintyExpansionMet: roundedMet(profile.density.uncertaintyExpansion),
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
    const adultProfile = combinedMetProfile(
      segments,
      ADULT_BASIS,
      selectedIntensity,
      activeDuration
    );
    const olderProfile = combinedMetProfile(
      segments,
      OLDER_ADULT_BASIS,
      selectedIntensity,
      activeDuration
    );
    const adultMetRange = adultProfile.metRange;
    const olderMetRange = olderProfile.metRange;
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
      density: adultProfile.density,
    };
  } else {
    const basis = age >= 60 ? OLDER_ADULT_BASIS : ADULT_BASIS;
    const metProfile = combinedMetProfile(
      segments,
      basis,
      selectedIntensity,
      activeDuration
    );
    const metRange = metProfile.metRange;
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
      density: metProfile.density,
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

import {
  estimateWorkoutCalorieRange,
  WORKOUT_CALORIE_ESTIMATOR_METHOD,
} from "./workoutCalorieRangeEstimator";
import {
  deriveAgeOnDate,
  resolveHistoricalBodyWeight,
} from "./workoutEstimateInputs";

export const WORKOUT_CALORIE_ESTIMATE_SNAPSHOT_SCHEMA_VERSION = 1;

function relevantLoad(load) {
  return {
    mode: load?.mode ?? null,
    amount: load?.amount ?? null,
    unit: load?.unit ?? null,
  };
}

function relevantSegment(segment, includeSetType = false) {
  return {
    ...(includeSetType ? { setType: segment?.setType ?? null } : {}),
    reps: segment?.reps ?? null,
    toFailure: segment?.toFailure === true,
    actualRepsAtFailure: segment?.actualRepsAtFailure ?? null,
    load: relevantLoad(segment?.load),
    drops: includeSetType && Array.isArray(segment?.drops)
      ? segment.drops.map((drop) => relevantSegment(drop))
      : [],
  };
}

export function workoutCalorieEstimateRelevantInput(workout) {
  return {
    occurredAt: workout?.occurredAt ?? null,
    activeDurationMinutes: workout?.activeDurationMinutes ?? null,
    intensity: workout?.intensity ?? null,
    exercises: Array.isArray(workout?.exercises)
      ? workout.exercises.map((exercise) => ({
          name: exercise?.name ?? null,
          exerciseId: exercise?.exerciseId ?? null,
          exerciseReference: exercise?.exerciseReference
            ? {
                source: exercise.exerciseReference.source ?? null,
                sourceId: exercise.exerciseReference.sourceId ?? null,
                modified: exercise.exerciseReference.modified === true,
              }
            : null,
          roadmapStatus: exercise?.roadmapStatus ?? null,
          sets: Array.isArray(exercise?.sets)
            ? exercise.sets.map((set) => relevantSegment(set, true))
            : null,
        }))
      : null,
  };
}

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function workoutCalorieEstimateInputFingerprint(workout) {
  const serialized = JSON.stringify(workoutCalorieEstimateRelevantInput(workout));
  return `workout-calorie-input-v1:${fnv1a(serialized)}`;
}

function ageBasis(age) {
  if (age === null) return "age-unknown";
  if (age < 19) return "unsupported";
  return age >= 60 ? "older-adult" : "adult";
}

function validEstimatedAt(now) {
  const date = now instanceof Date ? now : new Date(now);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function snapshotBase({ workout, bodyWeight, age, estimate, now }) {
  const required = estimate.metadata.inputCompleteness.required;
  return {
    schemaVersion: WORKOUT_CALORIE_ESTIMATE_SNAPSHOT_SCHEMA_VERSION,
    estimateKind: "broad-estimate",
    status: estimate.status,
    code: estimate.code,
    estimatorMethodName: WORKOUT_CALORIE_ESTIMATOR_METHOD.id,
    estimatorMethodVersion: WORKOUT_CALORIE_ESTIMATOR_METHOD.version,
    estimatedAt: validEstimatedAt(now),
    bodyWeightKg: bodyWeight?.value ?? null,
    sourceHealthWeightEntryId: bodyWeight?.sourceEntryId ?? null,
    age,
    ageBasis: ageBasis(age),
    activeDurationMinutes:
      Number.isSafeInteger(workout?.activeDurationMinutes)
      && workout.activeDurationMinutes > 0
        ? workout.activeDurationMinutes
        : null,
    selectedIntensity: workout?.intensity || null,
    confidence: {
      level: estimate.metadata.confidence.level,
      uncertaintyReasons: [...estimate.metadata.confidence.reasons],
    },
    requiredInputs: {
      bodyWeight: required.bodyWeight,
      activeDuration: required.activeDuration,
    },
    optionalInputs: {
      age: estimate.metadata.inputCompleteness.optional.age,
      intensity: estimate.metadata.inputCompleteness.optional.intensity,
    },
    inputFingerprint: workoutCalorieEstimateInputFingerprint(workout),
    inputSummary: { ...estimate.metadata.workoutStructure },
  };
}

export function createWorkoutCalorieEstimateSnapshot({
  workout,
  healthMeasurementEntries = [],
  dateOfBirth = "",
  now = new Date(),
}) {
  const bodyWeight = resolveHistoricalBodyWeight(
    healthMeasurementEntries,
    workout?.occurredAt
  );
  const age = deriveAgeOnDate(dateOfBirth, workout?.occurredAt);
  const estimate = estimateWorkoutCalorieRange({ workout, bodyWeight, age });
  const base = snapshotBase({ workout, bodyWeight, age, estimate, now });

  return estimate.status === "calculated"
    ? {
        ...base,
        lowerKcal: estimate.result.lowerKcal,
        upperKcal: estimate.result.upperKcal,
      }
    : base;
}

export function workoutCalorieEstimateNeedsRefresh(existingWorkout, nextWorkout) {
  const fingerprint = existingWorkout?.calorieEstimate?.inputFingerprint;
  return !fingerprint || fingerprint !== workoutCalorieEstimateInputFingerprint(nextWorkout);
}

export function workoutCalorieEstimateSaveMessage(snapshot) {
  if (
    snapshot?.status === "calculated"
    && Number.isFinite(snapshot.lowerKcal)
    && Number.isFinite(snapshot.upperKcal)
  ) {
    return `Estimated calories burned: about ${snapshot.lowerKcal}\u2013${snapshot.upperKcal} kcal.`;
  }

  const missingWeight = snapshot?.requiredInputs?.bodyWeight !== "provided";
  const missingDuration = snapshot?.requiredInputs?.activeDuration !== "provided";
  if (missingWeight || missingDuration) {
    const missing = [
      ...(missingWeight ? ["body weight"] : []),
      ...(missingDuration ? ["workout duration"] : []),
    ];
    return `Add ${missing.join(" and ")} to receive an estimate.`;
  }
  if (snapshot?.code === "unsupported-age") {
    return "A calorie estimate is not available for this age.";
  }
  if (snapshot?.code === "no-completed-work") {
    return "A calorie estimate is not available because no completed work was recorded.";
  }
  if (snapshot && snapshot.status !== "calculated") {
    return "A calorie estimate is not available for this workout.";
  }
  return "";
}

import { normalizeBuiltInExerciseName } from "./exerciseIdentity";

function identityForExercise(exercise) {
  if (exercise?.exerciseId) {
    return {
      identityKey: `trace|${exercise.exerciseId}`,
      source: "trace",
      exerciseId: exercise.exerciseId,
      exerciseReference: null,
    };
  }
  if (exercise?.exerciseReference?.sourceId) {
    const reference = { ...exercise.exerciseReference };
    return {
      identityKey: `saved|${reference.sourceId}`,
      source: "saved",
      exerciseId: null,
      exerciseReference: reference,
    };
  }

  const normalizedName = normalizeBuiltInExerciseName(exercise?.name);
  return {
    identityKey: `legacy|${normalizedName || "unnamed"}`,
    source: "legacy",
    exerciseId: null,
    exerciseReference: null,
  };
}

function timestampValue(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function comparePerformances(first, second) {
  const timeDifference =
    timestampValue(second.performedAt) - timestampValue(first.performedAt);
  if (timeDifference !== 0) return timeDifference;
  const workoutComparison = String(first.workoutId).localeCompare(
    String(second.workoutId)
  );
  if (workoutComparison !== 0) return workoutComparison;
  return first.exerciseIndex - second.exerciseIndex;
}

function copySet(set) {
  return {
    ...set,
    load: set?.load ? { ...set.load } : set?.load,
  };
}

export function deriveExerciseHistory(workouts = []) {
  const groups = new Map();

  workouts.forEach((workout, workoutIndex) => {
    const exercises = Array.isArray(workout?.exercises)
      ? workout.exercises
      : [];
    exercises.forEach((exercise, exerciseIndex) => {
      const identity = identityForExercise(exercise);
      const workoutId = workout.id || `legacy-workout-${workoutIndex}`;
      const performance = {
        performanceId: `${workoutId}|${exercise.id || exerciseIndex}|${exerciseIndex}`,
        workoutId,
        workoutTitle: workout.title || "Untitled Workout",
        performedAt: workout.occurredAt,
        exerciseInstanceId: exercise.id || null,
        exerciseIndex,
        exerciseNameSnapshot: exercise.name || "Unnamed Exercise",
        sets: (Array.isArray(exercise.sets) ? exercise.sets : []).map(copySet),
      };
      const existing = groups.get(identity.identityKey);
      if (existing) {
        existing.performances.push(performance);
      } else {
        groups.set(identity.identityKey, {
          identityKey: identity.identityKey,
          source: identity.source,
          exerciseId: identity.exerciseId,
          exerciseReference: identity.exerciseReference,
          displayName: performance.exerciseNameSnapshot,
          performances: [performance],
        });
      }
    });
  });

  return [...groups.values()]
    .map((group) => {
      const performances = [...group.performances].sort(comparePerformances);
      return {
        ...group,
        displayName: performances[0]?.exerciseNameSnapshot || group.displayName,
        performanceCount: performances.length,
        lastPerformedAt: performances[0]?.performedAt || null,
        performances,
      };
    })
    .sort((first, second) => {
      const timeDifference =
        timestampValue(second.lastPerformedAt) -
        timestampValue(first.lastPerformedAt);
      if (timeDifference !== 0) return timeDifference;
      const nameComparison = first.displayName.localeCompare(second.displayName);
      if (nameComparison !== 0) return nameComparison;
      return first.identityKey.localeCompare(second.identityKey);
    });
}

export { identityForExercise as getExerciseHistoryIdentity };

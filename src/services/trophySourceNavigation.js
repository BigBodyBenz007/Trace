import { deriveExerciseHistory, getExerciseHistoryIdentity } from "./exerciseHistory";

export function resolveMemoryTrophySource(entry, memories = []) {
  if (entry?.sourceType !== "memory" || !entry.sourceId) return null;
  return memories.some(({ id }) => id === entry.sourceId)
    ? { memoryId: entry.sourceId }
    : null;
}

export function resolveWorkoutTrophySource(entry, workouts = []) {
  if (entry?.sourceType !== "workout-pr" || !entry.sourceId) return null;
  const workout = workouts.find(({ id }) => id === entry.sourceId);
  if (!workout) return null;
  const snapshot = entry.sourceSnapshot || {};
  const history = deriveExerciseHistory(workouts);

  if (snapshot.setId) {
    const exerciseIndex = (workout.exercises || []).findIndex((exercise) =>
      (exercise.sets || []).some(({ id }) => id === snapshot.setId)
    );
    if (exerciseIndex >= 0) {
      const exercise = workout.exercises[exerciseIndex];
      const identityKey = getExerciseHistoryIdentity(exercise).identityKey;
      const performance = history.find(({ identityKey: key }) => key === identityKey)
        ?.performances.find(({ workoutId }) => workoutId === workout.id);
      if (performance) return { workoutId: workout.id, exerciseIdentityKey: identityKey, performanceId: performance.performanceId, setId: snapshot.setId };
    }
    return null;
  }

  if (snapshot.performanceId) {
    for (const exercise of history) {
      const performance = exercise.performances.find(({ performanceId }) => performanceId === snapshot.performanceId);
      if (performance) return { workoutId: workout.id, exerciseIdentityKey: exercise.identityKey, performanceId: performance.performanceId, setId: null };
    }
  }

  if (snapshot.exerciseIdentityKey) {
    const exercise = history.find(({ identityKey }) => identityKey === snapshot.exerciseIdentityKey);
    const performance = exercise?.performances.find(({ workoutId }) => workoutId === workout.id);
    if (performance) return { workoutId: workout.id, exerciseIdentityKey: exercise.identityKey, performanceId: performance.performanceId, setId: null };
  }
  return null;
}

export function resolveTrophySource(entry, { memories = [], workouts = [] } = {}) {
  return entry?.sourceType === "memory"
    ? resolveMemoryTrophySource(entry, memories)
    : resolveWorkoutTrophySource(entry, workouts);
}

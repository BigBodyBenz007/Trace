import { deriveExerciseHistory } from "./exerciseHistory";

export const ESTIMATED_ONE_REP_MAX_MAX_REPS = 12;

const SUPPORTED_WEIGHT_UNITS = new Set(["lb", "kg"]);

export function calculateEstimatedOneRepMax(weightValue, repsValue) {
  const weight = Number(weightValue);
  const reps = Number(repsValue);
  if (
    !Number.isFinite(weight) ||
    weight <= 0 ||
    !Number.isInteger(reps) ||
    reps < 1 ||
    reps > ESTIMATED_ONE_REP_MAX_MAX_REPS
  ) {
    return null;
  }

  // Epley formula. A performed single remains equal to its actual weight.
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export function formatEstimatedOneRepMax(estimate) {
  if (!estimate || !Number.isFinite(estimate.estimatedWeight) || !SUPPORTED_WEIGHT_UNITS.has(estimate.unit)) {
    return null;
  }
  return `~${Math.round(estimate.estimatedWeight)} ${estimate.unit}`;
}

function candidateFrom(exercise, performance, set, setIndex) {
  if (set?.load?.mode !== "external" || !SUPPORTED_WEIGHT_UNITS.has(set?.load?.unit)) return null;
  const estimatedWeight = calculateEstimatedOneRepMax(set.load.amount, set.reps);
  if (estimatedWeight === null) return null;
  return {
    identityKey: exercise.identityKey,
    estimatedWeight,
    unit: set.load.unit,
    performedWeight: Number(set.load.amount),
    reps: Number(set.reps),
    workoutId: performance.workoutId,
    workoutTitle: performance.workoutTitle,
    performedAt: performance.performedAt,
    performanceId: performance.performanceId,
    setId: set.id || null,
    setIndex,
  };
}

function timestampValue(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isBetterCandidate(candidate, current) {
  if (!current || candidate.estimatedWeight > current.estimatedWeight) return true;
  if (candidate.estimatedWeight < current.estimatedWeight) return false;
  return timestampValue(candidate.performedAt) > timestampValue(current.performedAt);
}

export function deriveEstimatedOneRepMaxes(workoutEntries = []) {
  return deriveExerciseHistory(workoutEntries)
    .map((exercise) => {
      const bestByUnit = new Map();
      exercise.performances.forEach((performance) => {
        performance.sets.forEach((set, setIndex) => {
          const candidate = candidateFrom(exercise, performance, set, setIndex);
          if (!candidate) return;
          const current = bestByUnit.get(candidate.unit);
          if (isBetterCandidate(candidate, current)) bestByUnit.set(candidate.unit, candidate);
        });
      });
      return {
        identityKey: exercise.identityKey,
        estimates: [...bestByUnit.values()].sort((first, second) => first.unit.localeCompare(second.unit)),
      };
    })
    .filter(({ estimates }) => estimates.length > 0);
}

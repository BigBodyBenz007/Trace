import { deriveExerciseHistory } from "./exerciseHistory";

const SUPPORTED_WEIGHT_UNITS = new Set(["lb", "kg"]);

function timestampValue(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareCandidates(first, second) {
  const timeDifference =
    timestampValue(first.performedAt) - timestampValue(second.performedAt);
  if (timeDifference !== 0) return timeDifference;
  const workoutComparison = String(first.workoutId).localeCompare(
    String(second.workoutId)
  );
  if (workoutComparison !== 0) return workoutComparison;
  const exerciseDifference = first.exerciseIndex - second.exerciseIndex;
  if (exerciseDifference !== 0) return exerciseDifference;
  return first.setIndex - second.setIndex;
}

function validPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function validReps(value) {
  const reps = Number(value);
  return Number.isFinite(reps) && Number.isInteger(reps) && reps > 0
    ? reps
    : null;
}

function effectiveReps(set) {
  if (!set?.toFailure) return validReps(set?.reps);
  return validReps(set?.actualRepsAtFailure);
}

function sourceFrom(exerciseHistory, performance, set, setIndex) {
  return {
    identityKey: exerciseHistory.identityKey,
    workoutId: performance.workoutId,
    workoutTitle: performance.workoutTitle,
    performedAt: performance.performedAt,
    performanceId: performance.performanceId,
    exerciseInstanceId: performance.exerciseInstanceId,
    exerciseIndex: performance.exerciseIndex,
    exerciseNameSnapshot: performance.exerciseNameSnapshot,
    setId: set.id || null,
    setIndex,
  };
}

function candidatesForExercise(exerciseHistory) {
  const candidates = [];

  exerciseHistory.performances.forEach((performance) => {
    performance.sets.forEach((set, setIndex) => {
      const reps = effectiveReps(set);
      if (reps === null) return;

      const source = sourceFrom(
        exerciseHistory,
        performance,
        set,
        setIndex
      );
      if (set?.load?.mode === "bodyweight") {
        candidates.push({ ...source, loadMode: "bodyweight", reps });
        return;
      }

      const unit = set?.load?.unit;
      const weight = validPositiveNumber(set?.load?.amount);
      if (
        set?.load?.mode === "external" &&
        SUPPORTED_WEIGHT_UNITS.has(unit) &&
        weight !== null
      ) {
        candidates.push({
          ...source,
          loadMode: "external",
          reps,
          unit,
          weight,
        });
      }
    });
  });

  return candidates.sort(compareCandidates);
}

function eventFrom(candidate, recordType, achievement) {
  return {
    recordType,
    achievement,
    ...(candidate.loadMode === "external"
      ? { unit: candidate.unit, weight: candidate.weight }
      : {}),
    reps: candidate.reps,
    identityKey: candidate.identityKey,
    workoutId: candidate.workoutId,
    workoutTitle: candidate.workoutTitle,
    performedAt: candidate.performedAt,
    performanceId: candidate.performanceId,
    exerciseInstanceId: candidate.exerciseInstanceId,
    exerciseIndex: candidate.exerciseIndex,
    exerciseNameSnapshot: candidate.exerciseNameSnapshot,
    setId: candidate.setId,
    setIndex: candidate.setIndex,
  };
}

function currentRecord(recordType, winner, matchingEvents) {
  if (!winner) return null;
  return {
    ...eventFrom(winner, recordType, "new"),
    firstAchievedAt: winner.performedAt,
    matches: matchingEvents,
  };
}

function deriveIncreasingRecord(candidates, recordType, valueFor) {
  let bestValue = null;
  let winner = null;
  const progression = [];

  [...candidates].sort(compareCandidates).forEach((candidate) => {
    const value = valueFor(candidate);
    if (bestValue === null || value > bestValue) {
      bestValue = value;
      winner = candidate;
      progression.push(eventFrom(candidate, recordType, "new"));
    } else if (value === bestValue) {
      progression.push(eventFrom(candidate, recordType, "matched"));
    }
  });

  const matches = progression.filter(
    (event) =>
      event.achievement === "matched" && valueFor(event) === bestValue
  );
  return {
    current: currentRecord(recordType, winner, matches),
    progression,
  };
}

function deriveExternalRecords(candidates) {
  const external = candidates.filter(
    ({ loadMode }) => loadMode === "external"
  );
  const byUnit = new Map();
  const byWeight = new Map();

  external.forEach((candidate) => {
    if (!byUnit.has(candidate.unit)) byUnit.set(candidate.unit, []);
    byUnit.get(candidate.unit).push(candidate);

    const key = `${candidate.unit}|${candidate.weight}`;
    if (!byWeight.has(key)) byWeight.set(key, []);
    byWeight.get(key).push(candidate);
  });

  const heaviestWeight = [...byUnit.entries()]
    .map(([unit, unitCandidates]) => ({
      unit,
      ...deriveIncreasingRecord(
        unitCandidates,
        "heaviest-weight",
        ({ weight }) => weight
      ),
    }))
    .sort((first, second) => first.unit.localeCompare(second.unit));

  const repsAtWeight = [...byWeight.values()]
    .map((weightCandidates) => ({
      unit: weightCandidates[0].unit,
      weight: weightCandidates[0].weight,
      ...deriveIncreasingRecord(
        weightCandidates,
        "reps-at-weight",
        ({ reps }) => reps
      ),
    }))
    .sort((first, second) => {
      const unitComparison = first.unit.localeCompare(second.unit);
      return unitComparison || first.weight - second.weight;
    });

  return { heaviestWeight, repsAtWeight };
}

function deriveExerciseRecords(exerciseHistory) {
  const candidates = candidatesForExercise(exerciseHistory);
  const external = deriveExternalRecords(candidates);
  const bodyweight = deriveIncreasingRecord(
    candidates.filter(({ loadMode }) => loadMode === "bodyweight"),
    "bodyweight-reps",
    ({ reps }) => reps
  );

  return {
    identityKey: exerciseHistory.identityKey,
    source: exerciseHistory.source,
    exerciseId: exerciseHistory.exerciseId,
    exerciseReference: exerciseHistory.exerciseReference,
    displayName: exerciseHistory.displayName,
    records: {
      heaviestWeight: external.heaviestWeight.map(({ current }) => current),
      repsAtWeight: external.repsAtWeight.map(({ current }) => current),
      bodyweightReps: bodyweight.current,
    },
    progression: {
      heaviestWeight: external.heaviestWeight.flatMap(
        ({ progression }) => progression
      ).sort(compareCandidates),
      repsAtWeight: external.repsAtWeight.flatMap(
        ({ progression }) => progression
      ).sort(compareCandidates),
      bodyweightReps: bodyweight.progression,
    },
  };
}

export function deriveExercisePrs(workoutEntries = []) {
  return deriveExerciseHistory(workoutEntries)
    .map(deriveExerciseRecords)
    .filter(
      ({ records }) =>
        records.heaviestWeight.length > 0 ||
        records.repsAtWeight.length > 0 ||
        records.bodyweightReps
    );
}

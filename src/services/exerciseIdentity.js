import { BUILT_IN_EXERCISES } from "../data/builtInExercises";

export function normalizeBuiltInExerciseName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function uniqueExercises(exercises) {
  return [...new Map(exercises.map((exercise) => [exercise.id, exercise])).values()];
}

export function resolveBuiltInExerciseName(
  value,
  catalog = BUILT_IN_EXERCISES
) {
  const normalizedName = normalizeBuiltInExerciseName(value);
  if (!normalizedName) {
    return { status: "unknown", exercise: null, candidates: [] };
  }

  const canonicalMatches = catalog.filter(
    (exercise) => normalizeBuiltInExerciseName(exercise.name) === normalizedName
  );
  if (canonicalMatches.length === 1) {
    return {
      status: "canonical",
      exercise: canonicalMatches[0],
      candidates: canonicalMatches,
    };
  }
  if (canonicalMatches.length > 1) {
    return {
      status: "ambiguous",
      exercise: null,
      candidates: uniqueExercises(canonicalMatches),
    };
  }

  const aliasMatches = catalog.filter((exercise) =>
    (exercise.aliases || []).some(
      (alias) => normalizeBuiltInExerciseName(alias) === normalizedName
    )
  );
  const ambiguousMatches = catalog.filter((exercise) =>
    (exercise.ambiguousAliases || []).some(
      (alias) => normalizeBuiltInExerciseName(alias) === normalizedName
    )
  );
  const candidates = uniqueExercises([...aliasMatches, ...ambiguousMatches]);
  if (aliasMatches.length === 1 && candidates.length === 1) {
    return { status: "alias", exercise: aliasMatches[0], candidates };
  }
  if (candidates.length > 0) {
    return { status: "ambiguous", exercise: null, candidates };
  }
  return { status: "unknown", exercise: null, candidates: [] };
}

export function getBuiltInExerciseById(id, catalog = BUILT_IN_EXERCISES) {
  return catalog.find((exercise) => exercise.id === id) || null;
}

export function getWorkoutExerciseIdentity(exercise) {
  if (exercise?.exerciseReference?.sourceId) {
    return {
      source: exercise.exerciseReference.source || "user-saved",
      id: exercise.exerciseReference.sourceId,
      name: exercise.name,
    };
  }
  if (exercise?.exerciseId) {
    return { source: "trace", id: exercise.exerciseId, name: exercise.name };
  }
  return null;
}

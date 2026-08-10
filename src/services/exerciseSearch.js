import { normalizeExerciseName } from "./exerciseCatalog";
import { BUILT_IN_EXERCISES } from "../data/builtInExercises";
import { normalizeBuiltInExerciseName } from "./exerciseIdentity";

export const DEFAULT_EXERCISE_RESULT_LIMIT = 6;

export function searchExercises(
  query,
  exercises = [],
  limit = DEFAULT_EXERCISE_RESULT_LIMIT
) {
  const normalizedQuery = normalizeExerciseName(query);
  if (!normalizedQuery || !/[a-z0-9]/i.test(normalizedQuery)) return [];

  return exercises
    .filter((exercise) =>
      normalizeExerciseName(exercise.name).includes(normalizedQuery)
    )
    .sort((first, second) => {
      const firstName = normalizeExerciseName(first.name);
      const secondName = normalizeExerciseName(second.name);
      const firstPrefix = firstName.startsWith(normalizedQuery);
      const secondPrefix = secondName.startsWith(normalizedQuery);
      if (firstPrefix !== secondPrefix) return firstPrefix ? -1 : 1;
      return firstName.localeCompare(secondName);
    })
    .slice(0, Math.max(0, limit));
}

function matchRank(query, exercise, includeAliases) {
  const canonicalName = normalizeBuiltInExerciseName(exercise.name);
  const safeAliases = includeAliases
    ? (exercise.aliases || []).map(normalizeBuiltInExerciseName)
    : [];
  const displayOnlyAmbiguousAliases = includeAliases
    ? (exercise.ambiguousAliases || []).map(normalizeBuiltInExerciseName)
    : [];
  const aliases = [...safeAliases, ...displayOnlyAmbiguousAliases];

  if (canonicalName === query) return 0;
  if (safeAliases.includes(query)) return 1;
  if (canonicalName.startsWith(query)) return 2;
  if (aliases.some((alias) => alias.startsWith(query))) return 3;
  if (canonicalName.includes(query)) return 4;
  if (aliases.some((alias) => alias.includes(query))) return 5;
  return null;
}

export function searchUnifiedExercises(
  query,
  savedExercises = [],
  builtInExercises = BUILT_IN_EXERCISES,
  limit = DEFAULT_EXERCISE_RESULT_LIMIT
) {
  const normalizedQuery = normalizeBuiltInExerciseName(query);
  if (!normalizedQuery || !/[a-z0-9]/i.test(normalizedQuery)) return [];

  const results = [
    ...builtInExercises.map((exercise) => ({
      source: "trace",
      exercise,
      rank: matchRank(normalizedQuery, exercise, true),
    })),
    ...savedExercises.map((exercise) => ({
      source: "saved",
      exercise,
      rank: matchRank(normalizedQuery, exercise, false),
    })),
  ];

  const sortedResults = results
    .filter(({ rank }) => rank !== null)
    .sort((first, second) => {
      if (first.rank !== second.rank) return first.rank - second.rank;
      const nameComparison = first.exercise.name.localeCompare(
        second.exercise.name
      );
      if (nameComparison !== 0) return nameComparison;
      return first.source.localeCompare(second.source);
    });
  const resultLimit = Math.max(0, limit);
  const savedResults = sortedResults
    .filter(({ source }) => source === "saved")
    .slice(0, resultLimit);
  const traceResults = sortedResults
    .filter(({ source }) => source === "trace")
    .slice(0, Math.max(0, resultLimit - savedResults.length));

  return [...savedResults, ...traceResults].sort((first, second) => {
    if (first.source !== second.source) {
      return first.source === "saved" ? -1 : 1;
    }
    if (first.rank !== second.rank) return first.rank - second.rank;
    const nameComparison = first.exercise.name.localeCompare(
      second.exercise.name
    );
    if (nameComparison !== 0) return nameComparison;
    return first.source.localeCompare(second.source);
  });
}

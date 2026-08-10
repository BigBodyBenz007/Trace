import { normalizeExerciseName } from "./exerciseCatalog";

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

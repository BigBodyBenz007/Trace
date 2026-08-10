import { BUILT_IN_EXERCISES } from "../data/builtInExercises";
import {
  getBuiltInExerciseById,
  getWorkoutExerciseIdentity,
  normalizeBuiltInExerciseName,
  resolveBuiltInExerciseName,
} from "./exerciseIdentity";

test("starter catalog has stable unique IDs and broad category/equipment coverage", () => {
  expect(BUILT_IN_EXERCISES).toHaveLength(56);
  expect(new Set(BUILT_IN_EXERCISES.map(({ id }) => id)).size).toBe(56);
  expect(BUILT_IN_EXERCISES.every(({ id }) => id.startsWith("trace:"))).toBe(true);
  expect(new Set(BUILT_IN_EXERCISES.map(({ category }) => category))).toEqual(
    new Set(["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Glutes", "Calves", "Core"])
  );
  for (const equipment of ["Barbell", "Dumbbell", "Cable", "Machine", "Smith machine", "Bodyweight"]) {
    expect(BUILT_IN_EXERCISES.some((exercise) => exercise.equipment === equipment)).toBe(true);
  }
});

test("resolves an exact canonical exercise", () => {
  const result = resolveBuiltInExerciseName("Dumbbell Bench Press");
  expect(result.status).toBe("canonical");
  expect(result.exercise.id).toBe("trace:chest-db-bench-002");
});

test.each(["DB Bench Press", "db bench press", "  DB   Bench   Press ", "DB Bench-Press!"])(
  "resolves a safe known alias with case, whitespace, and punctuation normalization: %s",
  (name) => {
    const result = resolveBuiltInExerciseName(name);
    expect(result.status).toBe("alias");
    expect(result.exercise.name).toBe("Dumbbell Bench Press");
  }
);

test("does not auto-resolve an explicitly ambiguous exercise name", () => {
  const result = resolveBuiltInExerciseName("Incline Press");
  expect(result.status).toBe("ambiguous");
  expect(result.exercise).toBeNull();
  expect(result.candidates.map(({ name }) => name)).toEqual(
    expect.arrayContaining([
      "Incline Barbell Bench Press",
      "Incline Dumbbell Press",
      "Smith Machine Incline Press",
    ])
  );
});

test("leaves unknown names unknown instead of fuzzy matching", () => {
  const result = resolveBuiltInExerciseName("My Odd Garage Press");
  expect(result).toEqual({ status: "unknown", exercise: null, candidates: [] });
});

test("looks up stable built-in IDs directly", () => {
  expect(getBuiltInExerciseById("trace:back-lat-pulldown-014").name).toBe(
    "Lat Pulldown"
  );
  expect(getBuiltInExerciseById("missing")).toBeNull();
});

test("preserves custom saved identity instead of replacing it with a built-in", () => {
  const exercise = {
    name: "DB Bench Press",
    exerciseReference: {
      source: "user-saved",
      sourceId: "user-saved:custom-bench",
      modified: false,
    },
  };
  expect(getWorkoutExerciseIdentity(exercise)).toEqual({
    source: "user-saved",
    id: "user-saved:custom-bench",
    name: "DB Bench Press",
  });
});

test("normalization does not invent semantic similarity", () => {
  expect(normalizeBuiltInExerciseName("  Incline--Press!! ")).toBe(
    "incline press"
  );
  expect(normalizeBuiltInExerciseName("Press Incline")).not.toBe(
    normalizeBuiltInExerciseName("Incline Press")
  );
});

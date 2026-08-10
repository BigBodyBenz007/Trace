import { createExerciseDefinition } from "./exerciseCatalog";
import { searchExercises, searchUnifiedExercises } from "./exerciseSearch";

function exercise(name) {
  return createExerciseDefinition({
    name,
    defaultLoadMode: "external",
    defaultWeightUnit: "lb",
  });
}

test("searches case-insensitively with normalized whitespace", () => {
  const saved = exercise("Incline Dumbbell Press");
  expect(searchExercises("  INCLINE   dumbbell ", [saved])).toEqual([saved]);
});

test("ranks prefixes before substrings and alphabetically within rank", () => {
  const saved = [
    exercise("Wide Cable Row"),
    exercise("Row Machine"),
    exercise("Row Barbell"),
    exercise("Seated Row"),
  ];
  expect(searchExercises("row", saved).map(({ name }) => name)).toEqual([
    "Row Barbell",
    "Row Machine",
    "Seated Row",
    "Wide Cable Row",
  ]);
});

test("limits visible results to six", () => {
  const saved = Array.from({ length: 8 }, (_, index) => exercise(`Press ${index}`));
  expect(searchExercises("press", saved)).toHaveLength(6);
});

test("does not return results for a non-meaningful query", () => {
  expect(searchExercises("---", [exercise("Dips")])).toEqual([]);
});

test("unified search returns built-in aliases as explicit Trace results", () => {
  const results = searchUnifiedExercises("db bench", []);
  expect(results[0]).toMatchObject({
    source: "trace",
    exercise: {
      id: "trace:chest-db-bench-002",
      name: "Dumbbell Bench Press",
    },
  });
});

test("partial search displays several legitimate built-in choices", () => {
  const names = searchUnifiedExercises("incline", [], undefined, 10).map(
    ({ exercise: result }) => result.name
  );
  expect(names).toEqual(
    expect.arrayContaining([
      "Incline Barbell Bench Press",
      "Incline Dumbbell Press",
      "Smith Machine Incline Press",
    ])
  );
});

test("unified search retains saved and Trace identities with identical names", () => {
  const saved = exercise("Dumbbell Bench Press");
  const results = searchUnifiedExercises("Dumbbell Bench Press", [saved]);
  expect(results.filter(({ exercise: result }) => result.name === saved.name)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ source: "saved", exercise: saved }),
      expect.objectContaining({ source: "trace" }),
    ])
  );
});

test("unified search normalizes capitalization, whitespace, and punctuation", () => {
  expect(
    searchUnifiedExercises("  DB--BENCH!! ", [exercise("Other")])[0].exercise.name
  ).toBe("Dumbbell Bench Press");
});

test("saved squat names remain discoverable when Trace squat results fill the limit", () => {
  const saved = [
    exercise("squat"),
    exercise("Barbell Back Squat one leg"),
    exercise("Barbell Back Squat one legged"),
  ];
  const results = searchUnifiedExercises("squ", saved);
  expect(results).toHaveLength(6);
  expect(results.map(({ source, exercise: item }) => `${source}:${item.name}`)).toEqual([
    "saved:squat",
    "saved:Barbell Back Squat one leg",
    "saved:Barbell Back Squat one legged",
    "trace:Barbell Back Squat",
    "trace:Barbell Front Squat",
    "trace:Bodyweight Squat",
  ]);
  expect(
    results.some(
      ({ source, exercise: item }) =>
        source === "trace" && item.name === "Barbell Back Squat"
    )
  ).toBe(true);
});

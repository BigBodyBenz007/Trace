import { createExerciseDefinition } from "./exerciseCatalog";
import { searchExercises } from "./exerciseSearch";

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

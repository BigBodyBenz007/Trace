import {
  addExerciseDefinition,
  createExerciseDefinition,
  normalizeExerciseName,
  readSavedExercises,
  updateExerciseDefinition,
  writeSavedExercises,
} from "./exerciseCatalog";

function definition(overrides = {}, now = new Date("2025-01-01T00:00:00.000Z")) {
  return createExerciseDefinition(
    {
      name: "Incline Dumbbell Press",
      defaultLoadMode: "external",
      defaultWeightUnit: "lb",
      ...overrides,
    },
    now
  );
}

test("creates stable namespaced definitions without weight or reps", () => {
  const saved = definition();
  expect(saved).toMatchObject({
    id: expect.stringMatching(/^user-saved:/),
    schemaVersion: 1,
    name: "Incline Dumbbell Press",
    defaults: { load: { mode: "external", unit: "lb" } },
  });
  expect(saved.defaults.load).not.toHaveProperty("amount");
  expect(saved).not.toHaveProperty("reps");
});

test("stores bodyweight without a unit", () => {
  expect(
    definition({ defaultLoadMode: "bodyweight", defaultWeightUnit: "kg" })
      .defaults.load
  ).toEqual({ mode: "bodyweight" });
});

test("normalizes case and whitespace for first-write-wins duplicates", () => {
  const saved = definition();
  const duplicate = definition({ name: "  INCLINE   dumbbell press  " });
  const result = addExerciseDefinition([saved], duplicate);
  expect(normalizeExerciseName(duplicate.name)).toBe(
    normalizeExerciseName(saved.name)
  );
  expect(result.added).toBe(false);
  expect(result.matchesDefinition).toBe(true);
  expect(result.existingExercise).toBe(saved);
});

test("detects conflicting duplicate defaults without overwriting", () => {
  const saved = definition();
  const conflict = definition({ defaultWeightUnit: "kg" });
  const result = addExerciseDefinition([saved], conflict);
  expect(result.added).toBe(false);
  expect(result.matchesDefinition).toBe(false);
  expect(result.exercises).toEqual([saved]);
});

test("edits name and defaults while preserving identity and creation time", () => {
  const saved = definition();
  const result = updateExerciseDefinition(
    [saved],
    saved.id,
    {
      name: "Incline Press",
      defaultLoadMode: "bodyweight",
      defaultWeightUnit: "lb",
    },
    new Date("2026-01-01T00:00:00.000Z")
  );
  expect(result.updatedExercise).toMatchObject({
    id: saved.id,
    createdAt: saved.createdAt,
    updatedAt: "2026-01-01T00:00:00.000Z",
    name: "Incline Press",
    defaults: { load: { mode: "bodyweight" } },
  });
});

test("prevents normalized-name collisions during editing", () => {
  const first = definition();
  const second = definition({ name: "Dips", defaultLoadMode: "bodyweight" });
  const result = updateExerciseDefinition([first, second], second.id, {
    name: " incline  DUMBBELL press ",
    defaultLoadMode: "external",
    defaultWeightUnit: "kg",
  });
  expect(result.error).toBe("Another saved exercise already uses that name.");
  expect(result.exercises).toEqual([first, second]);
});

test("persists and reloads definitions", () => {
  const storage = { getItem: jest.fn(), setItem: jest.fn() };
  const saved = definition();
  writeSavedExercises(storage, [saved]);
  const serialized = storage.setItem.mock.calls[0][1];
  storage.getItem.mockReturnValue(serialized);
  expect(readSavedExercises(storage)).toEqual([saved]);
});

test("related but distinct saved exercise names coexist without canonical merging", () => {
  const squat = definition({ name: "squat" });
  const oneLegged = definition({ name: "Barbell Back Squat one legged" });
  const first = addExerciseDefinition([], squat);
  const second = addExerciseDefinition(first.exercises, oneLegged);

  expect(first.added).toBe(true);
  expect(second.added).toBe(true);
  expect(second.exercises).toHaveLength(2);
  expect(second.exercises.map(({ id }) => id)).toEqual([squat.id, oneLegged.id]);
  expect(second.exercises.map(({ name }) => name)).toEqual([
    "squat",
    "Barbell Back Squat one legged",
  ]);
});

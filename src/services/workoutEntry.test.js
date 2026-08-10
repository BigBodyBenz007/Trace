import {
  createWorkoutEntry,
  getWorkoutEntryError,
  workoutLocalDateTimeToIso,
} from "./workoutEntry";

function validDraft(overrides = {}) {
  return {
    title: "Chest Day",
    date: "2026-08-09",
    time: "18:30",
    notes: "  Strong session.\nKept form steady.  ",
    exercises: [
      {
        id: "exercise-1",
        name: " Incline Dumbbell Press ",
        sets: [
          {
            id: "set-1",
            reps: "10",
            loadMode: "external",
            weightAmount: "70.5",
            weightUnit: "lb",
            notes: "  controlled reps  ",
          },
        ],
      },
    ],
    ...overrides,
  };
}

test("creates a complete strength workout snapshot with decimal external load", () => {
  const entry = createWorkoutEntry(
    validDraft(),
    null,
    new Date("2026-08-10T00:00:00.000Z")
  );

  expect(entry).toEqual({
    schemaVersion: 1,
    type: "strength",
    title: "Chest Day",
    occurredAt: workoutLocalDateTimeToIso("2026-08-09", "18:30"),
    notes: "Strong session.\nKept form steady.",
    exercises: [
      {
        id: "exercise-1",
        name: "Incline Dumbbell Press",
        exerciseId: "trace:chest-db-incline-004",
        sets: [
          {
            id: "set-1",
            reps: 10,
            load: { mode: "external", amount: 70.5, unit: "lb" },
            notes: "controlled reps",
          },
        ],
      },
    ],
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
  });
});

test("stores bodyweight explicitly without external amount or unit", () => {
  const draft = validDraft();
  draft.exercises[0].sets[0] = {
    id: "set-1",
    reps: "6",
    loadMode: "bodyweight",
    weightAmount: "not used",
    weightUnit: "kg",
    notes: "",
  };

  expect(createWorkoutEntry(draft).exercises[0].sets[0]).toEqual({
    id: "set-1",
    reps: 6,
    load: { mode: "bodyweight" },
    notes: "",
  });
});

test.each([
  ["blank title", { title: " " }, "Enter a workout title."],
  ["invalid date", { date: "2026-02-30" }, "Enter a valid date and time."],
  ["no exercises", { exercises: [] }, "Add at least one exercise."],
])("rejects %s", (_label, overrides, message) => {
  expect(getWorkoutEntryError(validDraft(overrides))).toBe(message);
});

test("requires meaningful exercise names and at least one set", () => {
  const unnamed = validDraft();
  unnamed.exercises[0].name = "--";
  expect(getWorkoutEntryError(unnamed)).toBe("Enter a name for exercise 1.");

  const noSets = validDraft();
  noSets.exercises[0].sets = [];
  expect(getWorkoutEntryError(noSets)).toBe("Add at least one set to exercise 1.");
});

test.each(["", "0", "-1", "1.5", "Infinity"])(
  "requires positive integer reps: %s",
  (reps) => {
    const draft = validDraft();
    draft.exercises[0].sets[0].reps = reps;
    expect(getWorkoutEntryError(draft)).toMatch(/positive whole-number reps/);
  }
);

test("validates external load amount, controlled unit, and load mode", () => {
  const zeroWeight = validDraft();
  zeroWeight.exercises[0].sets[0].weightAmount = "0";
  expect(getWorkoutEntryError(zeroWeight)).toMatch(/greater than zero/);

  const invalidUnit = validDraft();
  invalidUnit.exercises[0].sets[0].weightUnit = "stone";
  expect(getWorkoutEntryError(invalidUnit)).toMatch(/lb or kg/);

  const invalidMode = validDraft();
  invalidMode.exercises[0].sets[0].loadMode = "assisted";
  expect(getWorkoutEntryError(invalidMode)).toMatch(/valid load mode/);
});

test("preserves nested order, ids, and createdAt during editing", () => {
  const draft = validDraft({
    exercises: [
      validDraft().exercises[0],
      {
        id: "exercise-2",
        name: "Dips",
        sets: [
          {
            id: "set-2",
            reps: "6",
            loadMode: "bodyweight",
            notes: "",
          },
        ],
      },
    ],
  });
  const existing = { createdAt: "2025-01-01T00:00:00.000Z" };
  const entry = createWorkoutEntry(
    draft,
    existing,
    new Date("2026-01-01T00:00:00.000Z")
  );

  expect(entry.exercises.map(({ id }) => id)).toEqual(["exercise-1", "exercise-2"]);
  expect(entry.createdAt).toBe(existing.createdAt);
  expect(entry.updatedAt).toBe("2026-01-01T00:00:00.000Z");
});

test("accepts valid future local timestamps without scheduling behavior", () => {
  expect(getWorkoutEntryError(validDraft({ date: "2099-12-31" }))).toBe("");
});

test("snapshots optional exercise references without requiring a catalog", () => {
  const draft = validDraft();
  draft.exercises[0].exerciseReference = {
    source: "user-saved",
    sourceId: "user-saved:press",
    modified: false,
  };
  const entry = createWorkoutEntry(draft);
  expect(entry.exercises[0].exerciseReference).toEqual(
    draft.exercises[0].exerciseReference
  );

  delete draft.exercises[0].exerciseReference;
  expect(createWorkoutEntry(draft).exercises[0]).not.toHaveProperty(
    "exerciseReference"
  );
});

test("stores stable built-in IDs for exact canonical and safe alias matches", () => {
  const canonicalDraft = validDraft();
  canonicalDraft.exercises[0].name = "Dumbbell Bench Press";
  expect(createWorkoutEntry(canonicalDraft).exercises[0]).toMatchObject({
    name: "Dumbbell Bench Press",
    exerciseId: "trace:chest-db-bench-002",
  });

  const aliasDraft = validDraft();
  aliasDraft.exercises[0].name = "DB Bench-Press!";
  expect(createWorkoutEntry(aliasDraft).exercises[0]).toMatchObject({
    name: "DB Bench-Press!",
    exerciseId: "trace:chest-db-bench-002",
  });
});

test("does not assign IDs to ambiguous or unknown exercise names", () => {
  for (const name of ["Incline Press", "My Garage Press"]) {
    const draft = validDraft();
    draft.exercises[0].name = name;
    expect(createWorkoutEntry(draft).exercises[0]).not.toHaveProperty(
      "exerciseId"
    );
  }
});

test("custom saved references take precedence over matching built-in aliases", () => {
  const draft = validDraft();
  draft.exercises[0].name = "DB Bench Press";
  draft.exercises[0].exerciseReference = {
    source: "user-saved",
    sourceId: "user-saved:custom-bench",
    modified: false,
  };
  const saved = createWorkoutEntry(draft).exercises[0];
  expect(saved.exerciseReference.sourceId).toBe("user-saved:custom-bench");
  expect(saved).not.toHaveProperty("exerciseId");
});

test("legacy exercise snapshots without identity fields remain valid", () => {
  const legacyExercise = {
    id: "legacy-exercise",
    name: "Legacy Movement",
    sets: [
      {
        id: "legacy-set",
        reps: 10,
        load: { mode: "bodyweight" },
        notes: "",
      },
    ],
  };
  expect(legacyExercise.name).toBe("Legacy Movement");
  expect(legacyExercise).not.toHaveProperty("exerciseId");
  expect(legacyExercise).not.toHaveProperty("exerciseReference");
});

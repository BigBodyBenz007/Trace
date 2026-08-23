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
    startedAt: workoutLocalDateTimeToIso("2026-08-09", "18:30"),
    finishedAt: "2026-08-10T00:00:00.000Z",
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

test("normalizes ordered drop segments without mutating the editable source", () => {
  const draft = validDraft();
  draft.exercises[0].sets[0].drops = [
    { id: "drop-1", reps: "8", loadMode: "external", weightAmount: "55.5", weightUnit: "lb", notes: " First " },
    { id: "drop-2", reps: "6", loadMode: "bodyweight", weightAmount: "ignored", weightUnit: "kg", notes: "Second" },
  ];
  const before = JSON.parse(JSON.stringify(draft));
  const set = createWorkoutEntry(draft).exercises[0].sets[0];
  expect(set.drops).toEqual([
    { id: "drop-1", reps: 8, load: { mode: "external", amount: 55.5, unit: "lb" }, notes: "First" },
    { id: "drop-2", reps: 6, load: { mode: "bodyweight" }, notes: "Second" },
  ]);
  expect(draft).toEqual(before);
});

test("omits empty or malformed drops and accepts legacy sets", () => {
  const empty = validDraft();
  empty.exercises[0].sets[0].drops = [];
  expect(createWorkoutEntry(empty).exercises[0].sets[0]).not.toHaveProperty("drops");
  const malformed = validDraft();
  malformed.exercises[0].sets[0].drops = { unexpected: true };
  expect(createWorkoutEntry(malformed).exercises[0].sets[0]).not.toHaveProperty("drops");
});

test.each([
  ["load mode", { reps: "8", loadMode: "invalid", weightAmount: "50", weightUnit: "lb" }, /valid load mode/],
  ["weight", { reps: "8", loadMode: "external", weightAmount: "0", weightUnit: "lb" }, /greater than zero/],
  ["unit", { reps: "8", loadMode: "external", weightAmount: "50", weightUnit: "stone" }, /lb or kg/],
])("validates drop %s", (_label, drop, expected) => {
  const draft = validDraft();
  draft.exercises[0].sets[0].drops = [{ id: "drop", notes: "", ...drop }];
  expect(getWorkoutEntryError(draft)).toMatch(expected);
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

test.each(["", "-1", "1.5", "Infinity"])(
  "requires non-negative integer reps: %s",
  (reps) => {
    const draft = validDraft();
    draft.exercises[0].sets[0].reps = reps;
    expect(getWorkoutEntryError(draft)).toMatch(/whole-number reps/);
  }
);

test("accepts zero reps and preserves failure fields", () => {
  const draft = validDraft();
  draft.exercises[0].sets[0] = {
    ...draft.exercises[0].sets[0],
    reps: "0",
    toFailure: true,
    actualRepsAtFailure: "0",
  };
  expect(createWorkoutEntry(draft).exercises[0].sets[0]).toMatchObject({
    reps: 0,
    toFailure: true,
    actualRepsAtFailure: 0,
  });
});

test("adds a planned-workout backlink without changing normal completion fields", () => {
  const now = new Date("2026-08-10T00:00:00.000Z");
  const entry = createWorkoutEntry(
    validDraft({
      plannedWorkoutId: "planned-workout:execution",
      startedAt: "2026-08-09T23:15:00.000Z",
    }),
    null,
    now
  );

  expect(entry).toMatchObject({
    plannedWorkoutId: "planned-workout:execution",
    startedAt: "2026-08-09T23:15:00.000Z",
    finishedAt: now.toISOString(),
  });
});

test("preserves an existing planned-workout backlink while editing history", () => {
  const entry = createWorkoutEntry(
    validDraft({ plannedWorkoutId: "planned-workout:wrong" }),
    {
      plannedWorkoutId: "planned-workout:original",
      createdAt: "2026-08-09T20:00:00.000Z",
      startedAt: "2026-08-09T18:30:00.000Z",
      finishedAt: "2026-08-09T19:30:00.000Z",
    },
    new Date("2026-08-10T00:00:00.000Z")
  );

  expect(entry.plannedWorkoutId).toBe("planned-workout:original");
});

test("allows an unknown actual failure count", () => {
  const draft = validDraft();
  draft.exercises[0].sets[0].toFailure = true;
  draft.exercises[0].sets[0].actualRepsAtFailure = "";
  expect(createWorkoutEntry(draft).exercises[0].sets[0]).toMatchObject({
    reps: 10,
    toFailure: true,
    actualRepsAtFailure: null,
  });
});

test("normalizes blank goal reps to zero only for a to-failure set", () => {
  const draft = validDraft();
  draft.exercises[0].sets[0].reps = "";
  draft.exercises[0].sets[0].toFailure = true;
  expect(createWorkoutEntry(draft).exercises[0].sets[0]).toMatchObject({
    reps: 0,
    toFailure: true,
    actualRepsAtFailure: null,
  });

  const normal = validDraft();
  normal.exercises[0].sets[0].reps = "";
  expect(getWorkoutEntryError(normal)).toMatch(/whole-number reps/);
});

test("persists warm-up classification while legacy and working sets remain compatible", () => {
  const warmup = validDraft();
  warmup.exercises[0].sets[0].setType = "warm-up";
  expect(createWorkoutEntry(warmup).exercises[0].sets[0]).toHaveProperty("setType", "warm-up");
  expect(createWorkoutEntry(validDraft()).exercises[0].sets[0]).not.toHaveProperty("setType");
});

test.each([
  ["known", "8", "11", { reps: 8, toFailure: true, actualRepsAtFailure: 11 }],
  ["unknown", "8", "", { reps: 8, toFailure: true, actualRepsAtFailure: null }],
  ["blank goal", "", "", { reps: 0, toFailure: true, actualRepsAtFailure: null }],
  ["explicit zero", "0", "0", { reps: 0, toFailure: true, actualRepsAtFailure: 0 }],
])("normalizes drop to-failure %s", (_label, reps, actualRepsAtFailure, expected) => {
  const draft = validDraft();
  draft.exercises[0].sets[0].drops = [{
    id: "drop-1",
    reps,
    toFailure: true,
    actualRepsAtFailure,
    loadMode: "external",
    weightAmount: "55",
    weightUnit: "lb",
    notes: "",
  }];
  expect(createWorkoutEntry(draft).exercises[0].sets[0].drops[0]).toMatchObject(expected);
});

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

test("preserves nested order, ids, createdAt, and completion timing during editing", () => {
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
  const existing = {
    createdAt: "2025-01-01T00:00:00.000Z",
    startedAt: "2025-01-01T18:00:00.000Z",
    finishedAt: "2025-01-01T19:05:00.000Z",
  };
  const entry = createWorkoutEntry(
    draft,
    existing,
    new Date("2026-01-01T00:00:00.000Z")
  );

  expect(entry.exercises.map(({ id }) => id)).toEqual(["exercise-1", "exercise-2"]);
  expect(entry.createdAt).toBe(existing.createdAt);
  expect(entry.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  expect(entry.startedAt).toBe(existing.startedAt);
  expect(entry.finishedAt).toBe(existing.finishedAt);
});

test("does not fabricate completion timing when editing a legacy workout", () => {
  const entry = createWorkoutEntry(
    validDraft(),
    { createdAt: "2025-01-01T00:00:00.000Z" },
    new Date("2026-01-01T00:00:00.000Z")
  );
  expect(entry).not.toHaveProperty("startedAt");
  expect(entry).not.toHaveProperty("finishedAt");
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

import {
  appendPlannedWorkoutExercise,
  createPlannedWorkout,
  getPlannedWorkoutError,
  getPlannedWorkoutRecordError,
  isPlannedWorkoutSkippedOnDate,
  normalizePlannedWorkout,
  normalizePlannedWorkouts,
  PLANNED_WORKOUT_SCHEMA_VERSION,
  readPlannedWorkouts,
  removePlannedWorkoutExercise,
  restorePlannedWorkoutAtIndex,
  skipPlannedWorkoutForDate,
  updatePlannedWorkout,
  writePlannedWorkouts,
} from "./plannedWorkout";

const CREATED_AT = "2026-08-22T15:00:00.000Z";

function exercise(overrides = {}) {
  return {
    id: "planned-exercise:bench",
    name: " Dumbbell   Bench Press ",
    notes: "  Controlled tempo.  ",
    targetSets: [],
    ...overrides,
  };
}

function draft(overrides = {}) {
  return {
    id: "planned-workout:today",
    scheduledDate: "2026-08-22",
    title: " Upper   Body ",
    notes: "  Intentions only.\nAdjust in the gym.  ",
    exercises: [exercise()],
    ...overrides,
  };
}

function created(overrides = {}) {
  return createPlannedWorkout(
    draft(overrides),
    new Date(CREATED_AT)
  );
}

test("creates a separate versioned strength plan with stable IDs and timestamps", () => {
  const input = draft();
  const before = JSON.parse(JSON.stringify(input));
  const plan = createPlannedWorkout(input, new Date(CREATED_AT));

  expect(plan).toMatchObject({
    id: "planned-workout:today",
    schemaVersion: 1,
    type: "strength",
    scheduledDate: "2026-08-22",
    title: "Upper Body",
    notes: "Intentions only.\nAdjust in the gym.",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
  expect(plan.exercises).toEqual([
    {
      id: "planned-exercise:bench",
      name: "Dumbbell Bench Press",
      exerciseId: "trace:chest-db-bench-002",
      notes: "Controlled tempo.",
      targetSets: [],
    },
  ]);
  expect(plan).not.toHaveProperty("occurredAt");
  expect(plan).not.toHaveProperty("startedAt");
  expect(plan).not.toHaveProperty("finishedAt");
  expect(input).toEqual(before);
  expect(PLANNED_WORKOUT_SCHEMA_VERSION).toBe(1);
});

test("generates stable record, exercise, and target-set IDs when they are omitted", () => {
  const plan = created({
    id: undefined,
    exercises: [{
      name: "Pull-Up",
      targetSets: [{ reps: "8", load: { mode: "bodyweight" } }],
    }],
  });

  expect(plan.id).toMatch(/^planned-workout:/);
  expect(plan.exercises[0].id).toMatch(/^planned-exercise:/);
  expect(plan.exercises[0].targetSets[0].id).toMatch(/^planned-set:/);
  expect(normalizePlannedWorkout(plan)).toEqual(plan);
});

test("normalizes optional intended reps and loads without making them actual performance", () => {
  const plan = created({
    exercises: [exercise({
      targetSets: [
        {
          id: "planned-set:one",
          setType: "warm-up",
          reps: "10",
          load: { mode: "external", amount: "35.5", unit: "lb" },
          notes: "  Easy  ",
        },
        {
          id: "planned-set:two",
          reps: "",
          load: { mode: "external", amount: "", unit: "kg" },
        },
        {
          id: "planned-set:three",
          reps: 0,
          load: { mode: "bodyweight", amount: 100, unit: "lb" },
        },
      ],
    })],
  });

  expect(plan.exercises[0].targetSets).toEqual([
    {
      id: "planned-set:one",
      setType: "warm-up",
      reps: 10,
      load: { mode: "external", amount: 35.5, unit: "lb" },
      notes: "Easy",
    },
    {
      id: "planned-set:two",
      setType: "working",
      load: { mode: "external", unit: "kg" },
      notes: "",
    },
    {
      id: "planned-set:three",
      setType: "working",
      reps: 0,
      load: { mode: "bodyweight" },
      notes: "",
    },
  ]);
  expect(plan.exercises[0]).not.toHaveProperty("sets");
});

test("preserves saved exercise references and future-compatible fields during normalization", () => {
  const plan = created({
    futurePlanField: { value: 2 },
    exercises: [exercise({
      exerciseId: "trace:ignored-when-saved-reference-exists",
      exerciseReference: {
        source: "user-saved",
        sourceId: "user-saved:bench",
        modified: false,
        futureReferenceField: "kept",
      },
      futureExerciseField: ["kept"],
      targetSets: [{
        id: "planned-set:one",
        reps: 8,
        futureTargetField: { kept: true },
      }],
    })],
  });
  const normalized = normalizePlannedWorkout(plan);

  expect(normalized.futurePlanField).toEqual({ value: 2 });
  expect(normalized.exercises[0].futureExerciseField).toEqual(["kept"]);
  expect(normalized.exercises[0].exerciseReference).toMatchObject({
    source: "user-saved",
    sourceId: "user-saved:bench",
    modified: false,
    futureReferenceField: "kept",
  });
  expect(normalized.exercises[0]).not.toHaveProperty("exerciseId");
  expect(normalized.exercises[0].targetSets[0].futureTargetField).toEqual({ kept: true });
  expect(normalized.futurePlanField).not.toBe(plan.futurePlanField);
});

test.each([
  "2026-02-30",
  "2026-2-03",
  "2026-13-01",
  "not-a-date",
  "",
])("rejects invalid local scheduled date %s", (scheduledDate) => {
  expect(getPlannedWorkoutError(draft({ scheduledDate }))).toBe(
    "Enter a valid scheduled date."
  );
  expect(createPlannedWorkout(draft({ scheduledDate }))).toBeNull();
});

test.each([
  ["missing exercise array", undefined],
  ["empty exercise array", []],
  ["non-object exercise", ["Bench"]],
  ["missing exercise name", [exercise({ name: "" })]],
  ["non-array target sets", [exercise({ targetSets: {} })]],
  ["non-object target set", [exercise({ targetSets: ["10 reps"] })]],
])("rejects malformed exercises: %s", (_label, exercises) => {
  expect(getPlannedWorkoutError(draft({ exercises }))).not.toBe("");
  expect(createPlannedWorkout(draft({ exercises }))).toBeNull();
});

test.each([
  [{ reps: "1.5" }, /whole-number intended reps/],
  [{ reps: "-1" }, /whole-number intended reps/],
  [{ load: { mode: "assisted" } }, /load mode/],
  [{ load: { mode: "external", amount: 50, unit: "stone" } }, /lb or kg/],
  [{ load: { mode: "external", amount: 0, unit: "lb" } }, /greater than zero/],
])("rejects malformed optional target values", (target, expected) => {
  const value = draft({
    exercises: [exercise({ targetSets: [{ id: "planned-set:bad", ...target }] })],
  });
  expect(getPlannedWorkoutError(value)).toMatch(expected);
});

test("requires exact schema and timestamps when normalizing a stored record", () => {
  const plan = created();
  expect(getPlannedWorkoutRecordError(plan)).toBe("");
  expect(normalizePlannedWorkout({ ...plan, schemaVersion: 2 })).toBeNull();
  expect(normalizePlannedWorkout({ ...plan, createdAt: "invalid" })).toBeNull();
  expect(normalizePlannedWorkout({ ...plan, id: "" })).toBeNull();
});

test("appends one exercise immutably while preserving the plan identity and original order", () => {
  const plan = created({
    exercises: [
      exercise({ id: "planned-exercise:first", name: "Squat" }),
      exercise({ id: "planned-exercise:second", name: "Pull-Up" }),
    ],
  });
  const before = JSON.parse(JSON.stringify(plan));
  const appended = appendPlannedWorkoutExercise(
    plan,
    exercise({
      id: "planned-exercise:third",
      name: "Cable Curl",
      targetSets: [{ id: "planned-set:curl", reps: "12" }],
    }),
    new Date("2026-08-22T16:00:00.000Z")
  );

  expect(appended.id).toBe(plan.id);
  expect(appended.createdAt).toBe(plan.createdAt);
  expect(appended.updatedAt).toBe("2026-08-22T16:00:00.000Z");
  expect(appended.exercises.map(({ id }) => id)).toEqual([
    "planned-exercise:first",
    "planned-exercise:second",
    "planned-exercise:third",
  ]);
  expect(appended.exercises[2].targetSets[0].reps).toBe(12);
  expect(plan).toEqual(before);
});

test("appends an exercise with no target sets for later completion in the logger", () => {
  const appended = appendPlannedWorkoutExercise(
    created(),
    { name: "My remembered exercise", notes: "Add during the session" },
    new Date("2026-08-22T16:00:00.000Z")
  );

  expect(appended.exercises[1]).toMatchObject({
    name: "My remembered exercise",
    notes: "Add during the session",
    targetSets: [],
  });
  expect(appended.exercises[1].id).toMatch(/^planned-exercise:/);
});

test("rejects malformed appended exercises without changing the plan", () => {
  const plan = created();
  expect(appendPlannedWorkoutExercise(plan, { name: "", targetSets: [] })).toBeNull();
  expect(appendPlannedWorkoutExercise(plan, { name: "Curl", targetSets: {} })).toBeNull();
  expect(plan.exercises).toHaveLength(1);
});

test("prevents duplicate exercise IDs during creation and append", () => {
  const duplicateDraft = draft({
    exercises: [
      exercise({ id: "planned-exercise:same" }),
      exercise({ id: "planned-exercise:same", name: "Pull-Up" }),
    ],
  });
  expect(getPlannedWorkoutError(duplicateDraft)).toBe(
    "Planned exercise IDs must be unique."
  );
  expect(createPlannedWorkout(duplicateDraft)).toBeNull();

  const plan = created();
  expect(
    appendPlannedWorkoutExercise(
      plan,
      exercise({ id: plan.exercises[0].id, name: "Pull-Up" })
    )
  ).toBeNull();
});

test("updates a plan immutably while preserving its stable record identity", () => {
  const plan = created({ futurePlanField: { keep: true } });
  const before = JSON.parse(JSON.stringify(plan));
  const updated = updatePlannedWorkout(
    plan,
    {
      ...plan,
      id: "planned-workout:attempted-overwrite",
      scheduledDate: "2026-08-24",
      title: " Revised   plan ",
      exercises: [
        ...plan.exercises,
        exercise({ id: "planned-exercise:curl", name: "Cable Curl" }),
      ],
    },
    new Date("2026-08-22T17:00:00.000Z")
  );

  expect(updated).toMatchObject({
    id: plan.id,
    createdAt: plan.createdAt,
    updatedAt: "2026-08-22T17:00:00.000Z",
    scheduledDate: "2026-08-24",
    title: "Revised plan",
    futurePlanField: { keep: true },
  });
  expect(updated.exercises.map(({ id }) => id)).toEqual([
    "planned-exercise:bench",
    "planned-exercise:curl",
  ]);
  expect(plan).toEqual(before);
});

test("marks only the scheduled date skipped while preserving the planned workout", () => {
  const plan = created();
  const before = JSON.parse(JSON.stringify(plan));
  const skipped = skipPlannedWorkoutForDate(
    plan,
    "2026-08-22",
    new Date("2026-08-22T18:00:00.000Z"),
    "  Schedule conflict  "
  );

  expect(skipped).toMatchObject({
    id: plan.id,
    title: plan.title,
    scheduledDate: plan.scheduledDate,
    skippedDates: ["2026-08-22"],
    skipReasons: { "2026-08-22": "Schedule conflict" },
    updatedAt: "2026-08-22T18:00:00.000Z",
  });
  expect(skipped.exercises).toEqual(plan.exercises);
  expect(isPlannedWorkoutSkippedOnDate(skipped, "2026-08-22")).toBe(true);
  expect(isPlannedWorkoutSkippedOnDate(skipped, "2026-08-23")).toBe(false);
  expect(plan).toEqual(before);
});

test("updates or clears a skip reason without duplicating the skipped date", () => {
  const plan = created();
  const skipped = skipPlannedWorkoutForDate(
    plan,
    "2026-08-22",
    new Date("2026-08-22T18:00:00.000Z"),
    "Low energy"
  );
  const changed = skipPlannedWorkoutForDate(
    skipped,
    "2026-08-22",
    new Date("2026-08-22T19:00:00.000Z"),
    "Schedule conflict"
  );
  expect(changed).toMatchObject({
    skippedDates: ["2026-08-22"],
    skipReasons: { "2026-08-22": "Schedule conflict" },
    updatedAt: "2026-08-22T19:00:00.000Z",
  });

  const cleared = skipPlannedWorkoutForDate(
    changed,
    "2026-08-22",
    new Date("2026-08-22T20:00:00.000Z"),
    ""
  );
  expect(cleared.skippedDates).toEqual(["2026-08-22"]);
  expect(cleared).not.toHaveProperty("skipReasons");
});

test("rejects a skip outside the plan date and malformed persisted skip dates", () => {
  const plan = created();
  expect(skipPlannedWorkoutForDate(plan, "2026-08-23")).toBeNull();
  expect(skipPlannedWorkoutForDate(plan, "2026-02-30")).toBeNull();
  expect(normalizePlannedWorkout({
    ...plan,
    skippedDates: ["not-a-date"],
  })).toBeNull();
  expect(normalizePlannedWorkout({
    ...plan,
    skipReasons: { "2026-08-22": "Schedule conflict" },
  })).toBeNull();
  expect(normalizePlannedWorkout({
    ...plan,
    skippedDates: ["2026-08-22"],
    skipReasons: { "not-a-date": "Schedule conflict" },
  })).toBeNull();
});

test("rejects invalid plan updates through the existing validation path", () => {
  const plan = created();
  expect(updatePlannedWorkout(plan, { ...plan, scheduledDate: "2026-02-30" })).toBeNull();
  expect(updatePlannedWorkout(plan, { ...plan, exercises: [] })).toBeNull();
  expect(updatePlannedWorkout(null, plan)).toBeNull();
});

test("removes an exercise immutably without disturbing the remaining order", () => {
  const plan = created({
    exercises: [
      exercise({ id: "planned-exercise:first", name: "Squat" }),
      exercise({ id: "planned-exercise:second", name: "Pull-Up" }),
      exercise({ id: "planned-exercise:third", name: "Cable Curl" }),
    ],
  });
  const before = JSON.parse(JSON.stringify(plan));
  const updated = removePlannedWorkoutExercise(
    plan,
    "planned-exercise:second",
    new Date("2026-08-22T18:00:00.000Z")
  );

  expect(updated.exercises.map(({ id }) => id)).toEqual([
    "planned-exercise:first",
    "planned-exercise:third",
  ]);
  expect(updated.updatedAt).toBe("2026-08-22T18:00:00.000Z");
  expect(plan).toEqual(before);
});

test("does not remove the final required exercise or an unknown exercise", () => {
  const plan = created();
  expect(removePlannedWorkoutExercise(plan, plan.exercises[0].id)).toBeNull();
  expect(removePlannedWorkoutExercise(plan, "planned-exercise:missing")).toBeNull();
});

test("rejects duplicate target-set IDs within an exercise", () => {
  const value = draft({
    exercises: [exercise({
      targetSets: [
        { id: "planned-set:same", reps: 8 },
        { id: "planned-set:same", reps: 10 },
      ],
    })],
  });
  expect(getPlannedWorkoutError(value)).toMatch(/target set IDs must be unique/i);
});

test("reads and writes only the dedicated planned-workout collection", () => {
  const storage = { getItem: jest.fn(), setItem: jest.fn() };
  const plans = [created()];
  const written = writePlannedWorkouts(storage, plans);
  expect(storage.setItem).toHaveBeenCalledWith(
    "plannedWorkouts",
    JSON.stringify(written)
  );
  storage.getItem.mockReturnValue(JSON.stringify(written));
  expect(readPlannedWorkouts(storage)).toEqual(written);
});

test("restores an exact planned-workout record at its original array position", () => {
  const first = created({ id: "planned-workout:first", title: "First" });
  const deleted = created({
    id: "planned-workout:deleted",
    title: "Deleted",
    notes: "Distinct notes",
    futurePlanField: { preserved: true },
    exercises: [exercise({
      id: "planned-exercise:deleted",
      targetSets: [{
        id: "planned-set:deleted",
        reps: 7,
        load: { mode: "external", amount: 82.5, unit: "kg" },
        notes: "Exact target",
      }],
    })],
  });
  const last = created({ id: "planned-workout:last", title: "Last" });
  const existing = [first, last];
  const before = JSON.parse(JSON.stringify(existing));
  const deletedBefore = JSON.parse(JSON.stringify(deleted));

  const restored = restorePlannedWorkoutAtIndex(existing, deleted, 1);

  expect(restored).toEqual([first, deleted, last]);
  expect(restored[1]).toEqual(deletedBefore);
  expect(existing).toEqual(before);
  expect(deleted).toEqual(deletedBefore);
});

test("refuses to restore a planned workout when its ID is already in use", () => {
  const existing = [created({ id: "planned-workout:reused" })];
  const deleted = created({ id: "planned-workout:reused", title: "Deleted original" });

  expect(restorePlannedWorkoutAtIndex(existing, deleted, 0)).toBeNull();
  expect(restorePlannedWorkoutAtIndex([], deleted, -1)).toBeNull();
  expect(restorePlannedWorkoutAtIndex([], deleted, 1)).toBeNull();
});

test("rejects duplicate record IDs in persisted collections", () => {
  const plan = created();
  const duplicates = [plan, { ...plan }];
  const storage = {
    getItem: jest.fn(() => JSON.stringify(duplicates)),
    setItem: jest.fn(),
  };

  expect(normalizePlannedWorkouts(duplicates)).toBeNull();
  expect(() => readPlannedWorkouts(storage)).toThrow("Invalid planned workout data");
  expect(() => writePlannedWorkouts(storage, duplicates)).toThrow(
    "Invalid planned workout data"
  );
  expect(storage.setItem).not.toHaveBeenCalled();
});

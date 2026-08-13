import { deriveExerciseHistory, getExerciseHistoryIdentity } from "./exerciseHistory";

function set(id, overrides = {}) {
  return {
    id,
    reps: 10,
    load: { mode: "external", amount: 80, unit: "lb" },
    notes: "Controlled",
    ...overrides,
  };
}

function exercise(id, name, identity = {}, sets = [set(`${id}-set`)]) {
  return { id, name, ...identity, sets };
}

function workout(id, occurredAt, exercises, title = `Workout ${id}`) {
  return { id, title, occurredAt, exercises };
}

test("groups the same built-in exercise across workouts newest-first", () => {
  const identity = { exerciseId: "trace:chest-db-bench-002" };
  const history = deriveExerciseHistory([
    workout("old", "2026-08-01T12:00:00.000Z", [exercise("e1", "DB Bench Press", identity)]),
    workout("new", "2026-08-10T12:00:00.000Z", [exercise("e2", "Dumbbell Bench Press", identity)]),
  ]);
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({
    identityKey: "trace|trace:chest-db-bench-002",
    exerciseId: "trace:chest-db-bench-002",
    displayName: "Dumbbell Bench Press",
    performanceCount: 2,
  });
  expect(history[0].performances.map(({ workoutId }) => workoutId)).toEqual([
    "new",
    "old",
  ]);
});

test("groups Saved Exercise references by stable source ID", () => {
  const reference = {
    exerciseReference: {
      source: "user-saved",
      sourceId: "user-saved:custom-press",
      modified: false,
    },
  };
  const history = deriveExerciseHistory([
    workout("one", "2026-08-01T12:00:00.000Z", [exercise("e1", "My Press", reference)]),
    workout("two", "2026-08-02T12:00:00.000Z", [exercise("e2", "My Press", reference)]),
  ]);
  expect(history).toHaveLength(1);
  expect(history[0].identityKey).toBe("saved|user-saved:custom-press");
  expect(history[0].performanceCount).toBe(2);
});

test("keeps similar Saved and Trace exercises separate", () => {
  const history = deriveExerciseHistory([
    workout("w", "2026-08-10T12:00:00.000Z", [
      exercise("trace", "Barbell Back Squat", {
        exerciseId: "trace:legs-back-squat-035",
      }),
      exercise("saved", "Barbell Back Squat one leg", {
        exerciseReference: {
          source: "user-saved",
          sourceId: "user-saved:one-leg",
          modified: false,
        },
      }),
      exercise("saved-two", "squat", {
        exerciseReference: {
          source: "user-saved",
          sourceId: "user-saved:squat",
          modified: false,
        },
      }),
    ]),
  ]);
  expect(history).toHaveLength(3);
  expect(new Set(history.map(({ identityKey }) => identityKey)).size).toBe(3);
});

test("keeps different Saved Exercises with similar names separate", () => {
  const history = deriveExerciseHistory([
    workout("w", "2026-08-10T12:00:00.000Z", [
      exercise("a", "squat", {
        exerciseReference: { source: "user-saved", sourceId: "saved:a", modified: false },
      }),
      exercise("b", "Squat one leg", {
        exerciseReference: { source: "user-saved", sourceId: "saved:b", modified: false },
      }),
    ]),
  ]);
  expect(history).toHaveLength(2);
});

test("orders exercise groups by most recent performance with deterministic ties", () => {
  const history = deriveExerciseHistory([
    workout("w", "2026-08-10T12:00:00.000Z", [
      exercise("b", "B Exercise", { exerciseId: "trace:b" }),
      exercise("a", "A Exercise", { exerciseId: "trace:a" }),
    ]),
    workout("older", "2026-08-01T12:00:00.000Z", [
      exercise("c", "C Exercise", { exerciseId: "trace:c" }),
    ]),
  ]);
  expect(history.map(({ displayName }) => displayName)).toEqual([
    "A Exercise",
    "B Exercise",
    "C Exercise",
  ]);
});

test("preserves every set, note, unit, and load mode for future calculations", () => {
  const sets = [
    set("external", { load: { mode: "external", amount: 100.5, unit: "kg" }, reps: 5, notes: "Top set" }),
    set("bodyweight", { load: { mode: "bodyweight" }, reps: 12, notes: "Slow" }),
  ];
  const history = deriveExerciseHistory([
    workout("w", "2026-08-10T12:00:00.000Z", [
      exercise("e", "Pull-Up", { exerciseId: "trace:back-pullup-015" }, sets),
    ]),
  ]);
  expect(history[0].performances[0].sets).toEqual(sets);
  expect(history[0].performances[0].sets).not.toBe(sets);
});

test("deep-copies ordered drops without flattening or mutating the workout", () => {
  const drops = [
    set("drop-1", { load: { mode: "external", amount: 60, unit: "lb" }, reps: 8, notes: "First" }),
    set("drop-2", { load: { mode: "bodyweight" }, reps: 6, notes: "Second" }),
  ];
  const parent = set("parent", { drops });
  const source = workout("w", "2026-08-10T12:00:00.000Z", [exercise("e", "Press", {}, [parent])]);
  const derived = deriveExerciseHistory([source])[0].performances[0].sets;
  expect(derived).toHaveLength(1);
  expect(derived[0].drops).toEqual(drops);
  expect(derived[0].drops).not.toBe(drops);
  expect(derived[0].drops[0]).not.toBe(drops[0]);
  expect(derived[0].drops[0].load).not.toBe(drops[0].load);
  derived[0].drops[0].load.amount = 1;
  expect(source.exercises[0].sets[0].drops[0].load.amount).toBe(60);
});

test("preserves repeated occurrences of one identity in the same workout", () => {
  const history = deriveExerciseHistory([
    workout("w", "2026-08-10T12:00:00.000Z", [
      exercise("first", "Dumbbell Bench Press", { exerciseId: "trace:chest-db-bench-002" }, [set("s1")]),
      exercise("second", "Dumbbell Bench Press", { exerciseId: "trace:chest-db-bench-002" }, [set("s2"), set("s3")]),
    ]),
  ]);
  expect(history[0].performances).toHaveLength(2);
  expect(history[0].performances.flatMap(({ sets }) => sets.map(({ id }) => id))).toEqual([
    "s1",
    "s2",
    "s3",
  ]);
});

test("editing source workout data immediately changes derived history", () => {
  const original = workout("w", "2026-08-10T12:00:00.000Z", [
    exercise("e", "Press", { exerciseId: "trace:press" }, [set("s", { reps: 8 })]),
  ]);
  const edited = {
    ...original,
    exercises: [{ ...original.exercises[0], sets: [set("s", { reps: 12 })] }],
  };
  expect(deriveExerciseHistory([original])[0].performances[0].sets[0].reps).toBe(8);
  expect(deriveExerciseHistory([edited])[0].performances[0].sets[0].reps).toBe(12);
});

test("deleting a workout removes its derived performances and groups", () => {
  const first = workout("one", "2026-08-01T12:00:00.000Z", [
    exercise("a", "A", { exerciseId: "trace:a" }),
  ]);
  const second = workout("two", "2026-08-02T12:00:00.000Z", [
    exercise("b", "B", { exerciseId: "trace:b" }),
  ]);
  expect(deriveExerciseHistory([first, second])).toHaveLength(2);
  expect(deriveExerciseHistory([first]).map(({ displayName }) => displayName)).toEqual(["A"]);
});

test("legacy exercises use a legacy-only exact normalized-name fallback", () => {
  const history = deriveExerciseHistory([
    workout("one", "2026-08-01T12:00:00.000Z", [exercise("a", "Legacy Press")]),
    workout("two", "2026-08-02T12:00:00.000Z", [exercise("b", " legacy--press ")]),
    workout("three", "2026-08-03T12:00:00.000Z", [
      exercise("c", "Legacy Press", { exerciseId: "trace:some-press" }),
    ]),
  ]);
  expect(history).toHaveLength(2);
  expect(history.find(({ source }) => source === "legacy").performanceCount).toBe(2);
  expect(history.find(({ source }) => source === "trace").performanceCount).toBe(1);
});

test("identity precedence is Trace ID, Saved reference, then legacy fallback", () => {
  expect(getExerciseHistoryIdentity({ name: "Press", exerciseId: "trace:press" }).source).toBe("trace");
  expect(
    getExerciseHistoryIdentity({
      name: "Press",
      exerciseReference: { sourceId: "saved:press" },
    }).source
  ).toBe("saved");
  expect(getExerciseHistoryIdentity({ name: "Press" })).toMatchObject({
    source: "legacy",
    identityKey: "legacy|press",
  });
});

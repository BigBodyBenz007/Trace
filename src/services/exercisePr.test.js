import { deriveExercisePrs } from "./exercisePr";

function external(id, weight, reps, unit = "lb", extra = {}) {
  return {
    id,
    reps,
    load: { mode: "external", amount: weight, unit },
    notes: "",
    ...extra,
  };
}

function bodyweight(id, reps) {
  return { id, reps, load: { mode: "bodyweight" }, notes: "" };
}

function exercise(id, name, identity, sets) {
  return { id, name, ...identity, sets };
}

function workout(id, occurredAt, exercises, title = `Workout ${id}`) {
  return { id, title, occurredAt, exercises };
}

function traceExercise(instanceId, sets, name = "Bench Press") {
  return exercise(instanceId, name, { exerciseId: "trace:bench" }, sets);
}

test("derives heaviest external weight with reps and complete source traceability", () => {
  const prs = deriveExercisePrs([
    workout("one", "2026-08-01T10:00:00.000Z", [traceExercise("e1", [external("s1", 100, 8)])], "First Day"),
    workout("two", "2026-08-02T10:00:00.000Z", [traceExercise("e2", [external("s2", 110, 6)])], "Heavy Day"),
  ]);
  expect(prs[0].records.heaviestWeight[0]).toMatchObject({
    recordType: "heaviest-weight",
    weight: 110,
    unit: "lb",
    reps: 6,
    workoutId: "two",
    workoutTitle: "Heavy Day",
    performedAt: "2026-08-02T10:00:00.000Z",
    exerciseInstanceId: "e2",
    exerciseIndex: 0,
    setId: "s2",
    setIndex: 0,
    identityKey: "trace|trace:bench",
  });
});

test("uses known to-failure actual reps for rep PRs and excludes unknown or zero actuals", () => {
  const prs = deriveExercisePrs([
    { id: "known", title: "Known", occurredAt: "2026-08-01", exercises: [{ id: "e", name: "Bench", exerciseId: "bench", sets: [{ id: "s1", reps: 10, toFailure: true, actualRepsAtFailure: 13, load: { mode: "external", amount: 100, unit: "lb" } }] }] },
    { id: "unknown", title: "Unknown", occurredAt: "2026-08-02", exercises: [{ id: "e", name: "Bench", exerciseId: "bench", sets: [{ id: "s2", reps: 20, toFailure: true, actualRepsAtFailure: null, load: { mode: "external", amount: 100, unit: "lb" } }] }] },
    { id: "zero", title: "Zero", occurredAt: "2026-08-03", exercises: [{ id: "e", name: "Bench", exerciseId: "bench", sets: [{ id: "s3", reps: 0, toFailure: true, actualRepsAtFailure: 0, load: { mode: "external", amount: 110, unit: "lb" } }] }] },
  ])[0];
  expect(prs.records.repsAtWeight[0]).toMatchObject({ weight: 100, reps: 13, setId: "s1" });
  expect(prs.records.heaviestWeight[0]).toMatchObject({ weight: 100, reps: 13, setId: "s1" });
  expect(prs.records.repsAtWeight).toHaveLength(1);
});

test("does not create a positive rep PR for a blank-goal failed attempt normalized to zero", () => {
  const prs = deriveExercisePrs([
    { id: "failed", title: "Failed", occurredAt: "2026-08-01", exercises: [{ id: "e", name: "Bench", exerciseId: "bench", sets: [{ id: "s1", reps: 0, toFailure: true, actualRepsAtFailure: null, load: { mode: "external", amount: 225, unit: "lb" } }] }] },
  ]);
  expect(prs).toEqual([]);
});

test("derives a rep record for every distinct external weight", () => {
  const records = deriveExercisePrs([
    workout("w", "2026-08-01T10:00:00.000Z", [
      traceExercise("e", [
        external("a", 100, 8),
        external("b", 100, 10),
        external("c", 110, 6),
      ]),
    ]),
  ])[0].records.repsAtWeight;
  expect(records.map(({ weight, reps }) => [weight, reps])).toEqual([
    [100, 10],
    [110, 6],
  ]);
});

test("derives the greatest bodyweight reps with its source", () => {
  const record = deriveExercisePrs([
    workout("old", "2026-08-01T10:00:00.000Z", [traceExercise("a", [bodyweight("s1", 8)], "Pull-Up")]),
    workout("new", "2026-08-02T10:00:00.000Z", [traceExercise("b", [bodyweight("s2", 12)], "Pull-Up")]),
  ])[0].records.bodyweightReps;
  expect(record).toMatchObject({
    recordType: "bodyweight-reps",
    reps: 12,
    workoutId: "new",
    setId: "s2",
  });
});

test("keeps lb and kg in separate heaviest and weight-specific tracks", () => {
  const records = deriveExercisePrs([
    workout("w", "2026-08-01T10:00:00.000Z", [
      traceExercise("e", [external("lb", 100, 5), external("kg", 90, 6, "kg")]),
    ]),
  ])[0].records;
  expect(records.heaviestWeight.map(({ unit, weight }) => [unit, weight])).toEqual([
    ["kg", 90],
    ["lb", 100],
  ]);
  expect(records.repsAtWeight).toHaveLength(2);
});

test("evaluates the same identity across workouts and repeated workout occurrences", () => {
  const prs = deriveExercisePrs([
    workout("one", "2026-08-01T10:00:00.000Z", [traceExercise("a", [external("s1", 90, 8)])]),
    workout("two", "2026-08-02T10:00:00.000Z", [
      traceExercise("b", [external("s2", 100, 7)]),
      traceExercise("c", [external("s3", 110, 5)]),
    ]),
  ]);
  expect(prs).toHaveLength(1);
  expect(prs[0].records.heaviestWeight[0].weight).toBe(110);
  expect(prs[0].records.heaviestWeight[0]).toMatchObject({ exerciseIndex: 1, setId: "s3" });
});

test("keeps Trace, Saved, and separate similar Saved identities apart", () => {
  const saved = (sourceId, id, name, weight) =>
    exercise(id, name, {
      exerciseReference: { source: "user-saved", sourceId, modified: false },
    }, [external(`${id}-set`, weight, 5)]);
  const prs = deriveExercisePrs([
    workout("w", "2026-08-01T10:00:00.000Z", [
      exercise("trace", "Barbell Back Squat", { exerciseId: "trace:squat" }, [external("t", 200, 5)]),
      saved("saved:one", "one", "Barbell Back Squat one leg", 50),
      saved("saved:two", "two", "Barbell Back Squat one legged", 55),
    ]),
  ]);
  expect(prs.map(({ identityKey }) => identityKey)).toEqual(expect.arrayContaining([
    "trace|trace:squat",
    "saved|saved:one",
    "saved|saved:two",
  ]));
  expect(prs).toHaveLength(3);
});

test("legacy exercises derive conservatively without crashing", () => {
  const prs = deriveExercisePrs([
    workout("w", "2026-08-01T10:00:00.000Z", [
      exercise("legacy", " Legacy Press ", {}, [external("s", 40, 10)]),
    ]),
  ]);
  expect(prs[0]).toMatchObject({ identityKey: "legacy|legacy press", source: "legacy" });
});

test("ignores invalid, incomplete, zero, negative, and unsupported-unit sets", () => {
  const prs = deriveExercisePrs([
    workout("w", "2026-08-01T10:00:00.000Z", [
      traceExercise("e", [
        external("missing-reps", 100, undefined),
        external("text-reps", 100, "many"),
        external("fraction-reps", 100, 2.5),
        external("zero-reps", 100, 0),
        external("missing-weight", undefined, 5),
        external("text-weight", "heavy", 5),
        external("zero-weight", 0, 5),
        external("negative-weight", -10, 5),
        external("unsupported", 100, 5, "stone"),
        { id: "incomplete", reps: 5 },
      ]),
    ]),
  ]);
  expect(prs).toEqual([]);
});

test("ties retain the earliest achievement and expose later matches", () => {
  const prs = deriveExercisePrs([
    workout("later", "2026-08-10T10:00:00.000Z", [traceExercise("b", [external("later-set", 100, 8)])]),
    workout("first", "2026-08-01T10:00:00.000Z", [traceExercise("a", [external("first-set", 100, 8)])]),
  ]);
  const heaviest = prs[0].records.heaviestWeight[0];
  expect(heaviest.setId).toBe("first-set");
  expect(heaviest.firstAchievedAt).toBe("2026-08-01T10:00:00.000Z");
  expect(heaviest.matches).toHaveLength(1);
  expect(heaviest.matches[0]).toMatchObject({ achievement: "matched", setId: "later-set" });
});

test("uses source IDs and set positions for deterministic same-time ties", () => {
  const occurredAt = "2026-08-01T10:00:00.000Z";
  const prs = deriveExercisePrs([
    workout("z-workout", occurredAt, [traceExercise("z", [external("z", 100, 5)])]),
    workout("a-workout", occurredAt, [traceExercise("a", [external("a", 100, 5)])]),
  ]);
  expect(prs[0].records.heaviestWeight[0].workoutId).toBe("a-workout");
});

test("exposes chronological new and matched heaviest-weight progression", () => {
  const prs = deriveExercisePrs([
    workout("four", "2026-08-10T10:00:00.000Z", [traceExercise("d", [external("80-match", 80, 6)])]),
    workout("two", "2026-07-15T10:00:00.000Z", [traceExercise("b", [external("75", 75, 8)])]),
    workout("one", "2026-07-01T10:00:00.000Z", [traceExercise("a", [external("70", 70, 10)])]),
    workout("three", "2026-08-03T10:00:00.000Z", [traceExercise("c", [external("80", 80, 7)])]),
  ]);
  expect(prs[0].progression.heaviestWeight.map(({ weight, achievement }) => [weight, achievement])).toEqual([
    [70, "new"],
    [75, "new"],
    [80, "new"],
    [80, "matched"],
  ]);
});

test("exposes chronological progression independently for each rep-at-weight record", () => {
  const prs = deriveExercisePrs([
    workout("one", "2026-08-01T10:00:00.000Z", [traceExercise("a", [external("a", 100, 8), external("b", 110, 5)])]),
    workout("two", "2026-08-02T10:00:00.000Z", [traceExercise("b", [external("c", 100, 10), external("d", 110, 5)])]),
  ]);
  expect(prs[0].progression.repsAtWeight.map(({ weight, reps, achievement }) => [weight, reps, achievement])).toEqual([
    [100, 8, "new"],
    [110, 5, "new"],
    [100, 10, "new"],
    [110, 5, "matched"],
  ]);
});

test("editing a PR-producing workout downward restores the previous record", () => {
  const previous = workout("old", "2026-08-01T10:00:00.000Z", [traceExercise("a", [external("old", 100, 8)])]);
  const current = workout("new", "2026-08-02T10:00:00.000Z", [traceExercise("b", [external("new", 110, 5)])]);
  expect(deriveExercisePrs([previous, current])[0].records.heaviestWeight[0].weight).toBe(110);
  const edited = { ...current, exercises: [traceExercise("b", [external("new", 90, 5)])] };
  expect(deriveExercisePrs([previous, edited])[0].records.heaviestWeight[0].weight).toBe(100);
});

test("deleting the PR workout restores a prior record and deleting all removes PRs", () => {
  const previous = workout("old", "2026-08-01T10:00:00.000Z", [traceExercise("a", [external("old", 100, 8)])]);
  const current = workout("new", "2026-08-02T10:00:00.000Z", [traceExercise("b", [external("new", 110, 5)])]);
  expect(deriveExercisePrs([previous, current])[0].records.heaviestWeight[0].weight).toBe(110);
  expect(deriveExercisePrs([previous])[0].records.heaviestWeight[0].weight).toBe(100);
  expect(deriveExercisePrs([])).toEqual([]);
});

test("does not mutate workout entries or nested sets", () => {
  const entries = [
    workout("w", "2026-08-01T10:00:00.000Z", [traceExercise("e", [external("s", 100, 8)])]),
  ];
  const snapshot = JSON.parse(JSON.stringify(entries));
  deriveExercisePrs(entries);
  expect(entries).toEqual(snapshot);
});

test("excludes nested drops from every PR type while keeping the parent eligible", () => {
  const parent = external("parent", 100, 8, "lb", {
    drops: [
      external("heavy-drop", 200, 20),
      external("rep-drop", 50, 99),
      bodyweight("bodyweight-drop", 100),
    ],
  });
  const prs = deriveExercisePrs([
    workout("w", "2026-08-01T10:00:00.000Z", [traceExercise("e", [parent])]),
  ])[0];
  expect(prs.records.heaviestWeight[0]).toMatchObject({ setId: "parent", weight: 100, reps: 8 });
  expect(prs.records.repsAtWeight).toEqual([
    expect.objectContaining({ setId: "parent", weight: 100, reps: 8 }),
  ]);
  expect(prs.records.bodyweightReps).toBeNull();
  expect(JSON.stringify(prs)).not.toMatch(/heavy-drop|rep-drop|bodyweight-drop/);
});

test("recalculates independent progressions by workout chronology rather than insertion order", () => {
  const prs = deriveExercisePrs([
    workout("created-first", "2026-08-10T10:00:00.000Z", [
      traceExercise("later", [external("later-100", 100, 10), external("later-120", 120, 5)]),
    ]),
    workout("backdated", "2026-08-01T10:00:00.000Z", [
      traceExercise("earlier", [external("earlier-100", 100, 8), external("earlier-130", 130, 4)]),
    ]),
  ])[0];

  expect(prs.progression.repsAtWeight
    .filter(({ weight }) => weight === 100)
    .map(({ setId, reps, achievement }) => [setId, reps, achievement]))
    .toEqual([
      ["earlier-100", 8, "new"],
      ["later-100", 10, "new"],
    ]);
  expect(prs.progression.heaviestWeight.map(({ setId, weight }) => [setId, weight]))
    .toEqual([["earlier-100", 100], ["earlier-130", 130]]);
  expect(prs.progression.heaviestWeight).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ setId: "later-120" })])
  );
});

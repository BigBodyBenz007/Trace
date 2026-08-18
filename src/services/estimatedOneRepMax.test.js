import {
  ESTIMATED_ONE_REP_MAX_MAX_REPS,
  calculateEstimatedOneRepMax,
  deriveEstimatedOneRepMaxes,
  formatEstimatedOneRepMax,
} from "./estimatedOneRepMax";
import { deriveExercisePrs } from "./exercisePr";
import { createWorkoutPrCandidate } from "./trophyCase";

function workout(sets) {
  return {
    id: "workout",
    title: "Strength Day",
    occurredAt: "2026-08-10T12:00:00.000Z",
    exercises: [{ id: "exercise", exerciseId: "trace:bench", name: "Bench Press", sets }],
  };
}

function external(id, weight, reps, unit = "lb", extra = {}) {
  return { id, reps, load: { mode: "external", amount: weight, unit }, notes: "", ...extra };
}

test("uses the Epley formula while keeping a performed single equal to its weight", () => {
  expect(calculateEstimatedOneRepMax(225, 8)).toBe(285);
  expect(calculateEstimatedOneRepMax(100, 9)).toBe(130);
  expect(calculateEstimatedOneRepMax(287, 1)).toBe(287);
});

test("rounds only the user-facing value to the nearest whole unit", () => {
  const estimate = { estimatedWeight: calculateEstimatedOneRepMax(215, 8), unit: "lb" };
  expect(estimate.estimatedWeight).toBeCloseTo(272.333333);
  expect(formatEstimatedOneRepMax(estimate)).toBe("~272 lb");
});

test("includes 12 reps and excludes 13 reps through a named limit", () => {
  expect(ESTIMATED_ONE_REP_MAX_MAX_REPS).toBe(12);
  expect(calculateEstimatedOneRepMax(100, 12)).toBe(140);
  expect(calculateEstimatedOneRepMax(100, 13)).toBeNull();
});

test.each([
  [0, 8], [-10, 8], ["bad", 8], [100, 0], [100, -1], [100, 1.5], [100, "bad"],
])("excludes malformed weight %p or reps %p", (weight, reps) => {
  expect(calculateEstimatedOneRepMax(weight, reps)).toBeNull();
});

test("excludes bodyweight and nested drops while keeping their eligible parent set", () => {
  const result = deriveEstimatedOneRepMaxes([workout([
    { id: "bodyweight", reps: 12, load: { mode: "bodyweight" } },
    external("parent", 100, 8, "lb", {
      drops: [external("drop", 200, 8)],
    }),
  ])])[0];
  expect(result.estimates).toHaveLength(1);
  expect(result.estimates[0]).toMatchObject({ setId: "parent", performedWeight: 100, reps: 8 });
  expect(result.estimates[0].estimatedWeight).toBeCloseTo(126.666667);
});

test("selects the highest estimate independently within lb and kg", () => {
  const result = deriveEstimatedOneRepMaxes([workout([
    external("lower-lb", 200, 5),
    external("best-lb", 185, 10),
    external("kg", 100, 9, "kg"),
  ])])[0];
  expect(result.estimates).toEqual([
    expect.objectContaining({ unit: "kg", setId: "kg", estimatedWeight: 130 }),
    expect.objectContaining({ unit: "lb", setId: "best-lb" }),
  ]);
});

test("ignores unsupported and malformed legacy sets without crashing", () => {
  expect(deriveEstimatedOneRepMaxes([workout([
    null,
    {},
    { id: "missing-load", reps: 8 },
    external("unsupported", 100, 8, "stone"),
  ])])).toEqual([]);
});

test("deriving Estimated 1RM neither changes PR records nor creates Trophy candidates", () => {
  const entries = [workout([external("performed", 225, 8)])];
  const before = deriveExercisePrs(entries);
  const estimates = deriveEstimatedOneRepMaxes(entries);
  const after = deriveExercisePrs(entries);
  expect(after).toEqual(before);
  expect(after[0].records.heaviestWeight[0]).toMatchObject({ setId: "performed", weight: 225, reps: 8 });
  expect(createWorkoutPrCandidate(after[0], after[0].records.heaviestWeight[0]).sourceSnapshot).toMatchObject({
    setId: "performed",
    weight: 225,
  });
  expect(JSON.stringify(after)).not.toContain(String(estimates[0].estimates[0].estimatedWeight));
  expect(estimates[0].estimates[0]).not.toHaveProperty("recordType");
  expect(estimates[0].estimates[0]).not.toHaveProperty("achievement");
});

test("excludes warm-up sets from estimated 1RM", () => {
  const result = deriveEstimatedOneRepMaxes([
    { id: "w1", occurredAt: "2026-08-01", exercises: [{ id: "e", name: "Bench", exerciseId: "bench", sets: [{ id: "warm", setType: "warm-up", reps: 5, load: { mode: "external", amount: 300, unit: "lb" } }, { id: "work", reps: 5, load: { mode: "external", amount: 100, unit: "lb" } }] }] },
  ]);
  expect(result[0].estimates[0]).toMatchObject({ setId: "work", performedWeight: 100 });
});

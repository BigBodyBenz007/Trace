import { createPlannedWorkout } from "./plannedWorkout";
import {
  createWorkoutDraftFromPlannedWorkout,
  normalizeWorkoutDraft,
  readWorkoutDraft,
  WORKOUT_DRAFT_SCHEMA_VERSION,
  WORKOUT_DRAFT_STORAGE_KEY,
} from "./workoutDraft";

function plannedWorkout(overrides = {}) {
  return createPlannedWorkout({
    id: "planned-workout:execution",
    scheduledDate: "2026-08-30",
    title: "Planned Strength",
    notes: "Plan notes",
    exercises: [
      {
        id: "planned-exercise:bench",
        name: "Dumbbell Bench Press",
        exerciseId: "trace:chest-db-bench-002",
        notes: "Exercise notes",
        targetSets: [{
          id: "planned-set:bench",
          setType: "warm-up",
          reps: 8,
          load: { mode: "external", amount: 67.5, unit: "kg" },
          notes: "Target notes",
        }],
      },
      {
        id: "planned-exercise:pull-up",
        name: "My Pull-Up",
        exerciseReference: {
          source: "user-saved",
          sourceId: "user-saved:pull-up",
          modified: false,
        },
        notes: "",
        targetSets: [{
          id: "planned-set:pull-up",
          reps: 6,
          load: { mode: "bodyweight" },
          notes: "Smooth",
        }],
      },
      {
        id: "planned-exercise:row",
        name: "Cable Row",
        notes: "Add sets in the gym",
        targetSets: [],
      },
    ],
    ...overrides,
  }, new Date("2026-08-20T12:00:00.000Z"));
}

beforeEach(() => localStorage.clear());

test("creates a fresh actual workout draft from planned intentions", () => {
  const plan = plannedWorkout();
  const before = JSON.parse(JSON.stringify(plan));
  const now = new Date(2026, 7, 22, 14, 37, 45);
  const draft = createWorkoutDraftFromPlannedWorkout(plan, now);

  expect(draft).toMatchObject({
    schemaVersion: WORKOUT_DRAFT_SCHEMA_VERSION,
    plannedWorkoutId: plan.id,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    form: {
      title: "Planned Strength",
      date: "2026-08-22",
      time: "14:37",
      notes: "Plan notes",
    },
  });
  expect(draft.form.date).not.toBe(plan.scheduledDate);
  expect(draft.form.exercises.map(({ name }) => name)).toEqual([
    "Dumbbell Bench Press",
    "My Pull-Up",
    "Cable Row",
  ]);
  expect(draft.form.exercises[0]).toMatchObject({
    exerciseId: "trace:chest-db-bench-002",
    notes: "Exercise notes",
    sets: [expect.objectContaining({
      reps: "8",
      setType: "warm-up",
      loadMode: "external",
      weightAmount: "67.5",
      weightUnit: "kg",
      notes: "Target notes",
    })],
  });
  expect(draft.form.exercises[1]).toMatchObject({
    exerciseReference: plan.exercises[1].exerciseReference,
    sets: [expect.objectContaining({
      reps: "6",
      loadMode: "bodyweight",
      notes: "Smooth",
    })],
  });
  expect(plan).toEqual(before);
});

test("generates fresh actual IDs and gives an untargeted exercise one editable empty set", () => {
  const plan = plannedWorkout();
  const draft = createWorkoutDraftFromPlannedWorkout(
    plan,
    new Date(2026, 7, 22, 9, 5)
  );

  expect(draft.form.exercises.map(({ id }) => id)).not.toEqual(
    plan.exercises.map(({ id }) => id)
  );
  draft.form.exercises.forEach((exercise, index) => {
    expect(exercise.id).toMatch(/^exercise:/);
    exercise.sets.forEach((set) => {
      expect(set.id).toMatch(/^set:/);
      expect(plan.exercises[index].targetSets.map(({ id }) => id)).not.toContain(set.id);
    });
  });
  expect(draft.form.exercises[2].sets).toEqual([
    expect.objectContaining({
      reps: "",
      loadMode: "external",
      weightAmount: "",
      weightUnit: "lb",
      isUntouched: true,
    }),
  ]);
});

test("reads and normalizes an optional planned-workout backlink", () => {
  const draft = createWorkoutDraftFromPlannedWorkout(
    plannedWorkout(),
    new Date(2026, 7, 22, 9, 5)
  );
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify({
    ...draft,
    plannedWorkoutId: `  ${draft.plannedWorkoutId}  `,
  }));
  expect(readWorkoutDraft()).toMatchObject({
    plannedWorkoutId: "planned-workout:execution",
  });

  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify({
    ...draft,
    plannedWorkoutId: " ",
  }));
  expect(readWorkoutDraft()).toBeNull();
});

test("normalizes every nested active-draft field while preserving entered set values", () => {
  const draft = createWorkoutDraftFromPlannedWorkout(
    plannedWorkout(),
    new Date(2026, 7, 22, 9, 5)
  );
  draft.plannedWorkoutId = "  planned-workout:orphaned  ";
  draft.form.exercises[0].sets[0] = {
    ...draft.form.exercises[0].sets[0],
    reps: "11",
    weightAmount: "72.5",
    drops: [{
      id: "drop:restored",
      reps: "7",
      toFailure: true,
      actualRepsAtFailure: "8",
      loadMode: "external",
      weightAmount: "55",
      weightUnit: "kg",
      notes: "Preserve this drop",
      isUntouched: false,
    }],
  };

  const normalized = normalizeWorkoutDraft(draft);
  expect(normalized.plannedWorkoutId).toBe("planned-workout:orphaned");
  expect(normalized.form.exercises[0].sets[0]).toMatchObject({
    reps: "11",
    weightAmount: "72.5",
    drops: [expect.objectContaining({
      reps: "7",
      actualRepsAtFailure: "8",
      weightAmount: "55",
    })],
  });
});

test("rejects malformed nested active-draft data", () => {
  const draft = createWorkoutDraftFromPlannedWorkout(
    plannedWorkout(),
    new Date(2026, 7, 22, 9, 5)
  );
  draft.form.exercises[0].sets[0].drops = [{
    id: "drop:invalid",
    reps: 7,
    loadMode: "external",
    weightAmount: "55",
    weightUnit: "kg",
  }];

  expect(normalizeWorkoutDraft(draft)).toBeNull();
  localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  expect(readWorkoutDraft()).toBeNull();

  const invalidReference = createWorkoutDraftFromPlannedWorkout(
    plannedWorkout(),
    new Date(2026, 7, 22, 9, 5)
  );
  invalidReference.form.exercises[0].exerciseReference = "";
  expect(normalizeWorkoutDraft(invalidReference)).toBeNull();
});

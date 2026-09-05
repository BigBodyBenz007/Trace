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
      timingMode: "live",
      activeDurationMinutes: "",
      caloriesBurned: "",
      intensity: "",
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
    roadmapStatus: "pending",
    roadmapSkipReason: "",
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
  expect(draft.context).toEqual({
    activeSearchExerciseId: null,
    roadmapEditingExerciseId: null,
  });
});

test("normalizes planned Roadmap status, reason, and single-exercise editing context", () => {
  const draft = createWorkoutDraftFromPlannedWorkout(
    plannedWorkout(),
    new Date(2026, 7, 22, 9, 5)
  );
  draft.form.exercises[0].roadmapStatus = "skipped";
  draft.form.exercises[0].roadmapSkipReason = "Equipment unavailable";
  draft.context.roadmapEditingExerciseId = draft.form.exercises[0].id;

  const normalized = normalizeWorkoutDraft(draft);
  expect(normalized.form.exercises[0]).toMatchObject({
    roadmapStatus: "skipped",
    roadmapSkipReason: "Equipment unavailable",
  });
  expect(normalized.context).toMatchObject({
    roadmapEditingExerciseId: draft.form.exercises[0].id,
  });
});

test("normalizes collapsed exercise IDs in the existing draft context", () => {
  const draft = createWorkoutDraftFromPlannedWorkout(
    plannedWorkout(),
    new Date(2026, 7, 22, 9, 5)
  );
  const firstId = draft.form.exercises[0].id;
  draft.context.collapsedExerciseIds = [firstId, firstId, "exercise:stale"];

  expect(normalizeWorkoutDraft(draft).context.collapsedExerciseIds).toEqual([firstId]);
  draft.context.collapsedExerciseIds = [];
  expect(normalizeWorkoutDraft(draft).context).toHaveProperty("collapsedExerciseIds", []);
  draft.context.collapsedExerciseIds = "not-an-array";
  expect(normalizeWorkoutDraft(draft)).toBeNull();
});

test("preserves explicit Today, Calendar, and Workout Templates origins without adding them to legacy drafts", () => {
  const todayDraft = createWorkoutDraftFromPlannedWorkout(
    plannedWorkout(),
    new Date(2026, 7, 22, 9, 5),
    { originPage: "today" }
  );
  expect(normalizeWorkoutDraft(todayDraft).context).toHaveProperty(
    "originPage",
    "today"
  );

  delete todayDraft.context.originPage;
  expect(normalizeWorkoutDraft(todayDraft).context).not.toHaveProperty("originPage");
  const calendarDraft = normalizeWorkoutDraft({
    ...todayDraft,
    context: {
      ...todayDraft.context,
      originPage: "calendar",
      selectedDate: "2026-09-12",
      visibleMonth: "2026-09",
    },
  });
  expect(calendarDraft.context).toMatchObject({
    originPage: "calendar",
    selectedDate: "2026-09-12",
    visibleMonth: "2026-09",
  });
  expect(normalizeWorkoutDraft({
    ...todayDraft,
    context: { ...todayDraft.context, originPage: "calendar" },
  })).toBeNull();
  const templateDraft = normalizeWorkoutDraft({
    ...todayDraft,
    context: {
      ...todayDraft.context,
      originPage: "workout-templates",
      originTemplateId: "workout-template:source",
    },
  });
  expect(templateDraft.context).toMatchObject({
    originPage: "workout-templates",
    originTemplateId: "workout-template:source",
  });
  expect(normalizeWorkoutDraft({
    ...todayDraft,
    context: { ...todayDraft.context, originPage: "workout-templates" },
  })).toBeNull();
});

test("keeps legacy generic drafts free of Roadmap-only fields", () => {
  const draft = createWorkoutDraftFromPlannedWorkout(
    plannedWorkout(),
    new Date(2026, 7, 22, 9, 5)
  );
  delete draft.plannedWorkoutId;
  delete draft.form.exercises[0].roadmapStatus;
  delete draft.form.exercises[0].roadmapSkipReason;
  delete draft.context.roadmapEditingExerciseId;

  const normalized = normalizeWorkoutDraft(draft);
  expect(normalized.form.exercises[0]).not.toHaveProperty("roadmapStatus");
  expect(normalized.form.exercises[0]).not.toHaveProperty("roadmapSkipReason");
  expect(normalized.context).not.toHaveProperty("roadmapEditingExerciseId");
});

test("populates every planned set with its intended reps and weight", () => {
  const plan = plannedWorkout({
    exercises: [{
      id: "planned-exercise:multi-set",
      name: "Barbell Bench Press",
      notes: "",
      targetSets: [
        {
          id: "planned-set:first",
          setType: "warm-up",
          reps: 10,
          load: { mode: "external", amount: 95, unit: "lb" },
          notes: "Easy",
        },
        {
          id: "planned-set:second",
          setType: "working",
          reps: 6,
          load: { mode: "external", amount: 155, unit: "lb" },
          notes: "Working set",
        },
      ],
    }],
  });

  const draft = createWorkoutDraftFromPlannedWorkout(
    plan,
    new Date(2026, 7, 22, 14, 37)
  );

  expect(draft.form.exercises[0].sets).toEqual([
    expect.objectContaining({
      setType: "warm-up",
      reps: "10",
      weightAmount: "95",
      weightUnit: "lb",
      notes: "Easy",
    }),
    expect.objectContaining({
      setType: "working",
      reps: "6",
      weightAmount: "155",
      weightUnit: "lb",
      notes: "Working set",
    }),
  ]);
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
  draft.form.activeDurationMinutes = "52";
  draft.form.caloriesBurned = "410";
  draft.form.intensity = "moderate";
  draft.context.completionReview = true;
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
  expect(normalized.form).toMatchObject({
    activeDurationMinutes: "52",
    caloriesBurned: "410",
    intensity: "moderate",
  });
  expect(normalized.context.completionReview).toBe(true);
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

test("normalizes legacy readiness fields as optional and rejects malformed new values", () => {
  const legacy = createWorkoutDraftFromPlannedWorkout(
    plannedWorkout(),
    new Date(2026, 7, 22, 9, 5)
  );
  delete legacy.form.activeDurationMinutes;
  delete legacy.form.caloriesBurned;
  delete legacy.form.timingMode;
  delete legacy.form.intensity;
  expect(normalizeWorkoutDraft(legacy).form).toMatchObject({
    timingMode: "live",
    activeDurationMinutes: "",
    caloriesBurned: "",
    intensity: "",
  });

  const invalidDuration = { ...legacy, form: { ...legacy.form, activeDurationMinutes: 45 } };
  expect(normalizeWorkoutDraft(invalidDuration)).toBeNull();
  const invalidIntensity = { ...legacy, form: { ...legacy.form, intensity: "extreme" } };
  expect(normalizeWorkoutDraft(invalidIntensity)).toBeNull();
  const invalidTimingMode = { ...legacy, form: { ...legacy.form, timingMode: "estimated" } };
  expect(normalizeWorkoutDraft(invalidTimingMode)).toBeNull();
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

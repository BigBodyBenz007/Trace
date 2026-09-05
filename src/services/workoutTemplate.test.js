import {
  createWorkoutDraftFromTemplate,
  normalizeWorkoutDraft,
} from "./workoutDraft";
import {
  createWorkoutTemplate,
  normalizeWorkoutTemplates,
  readWorkoutTemplates,
  updateWorkoutTemplate,
  workoutTemplateDraftFromWorkoutEntry,
  workoutTemplateNameExists,
  workoutTemplateToPlannedWorkoutDraft,
  writeWorkoutTemplates,
} from "./workoutTemplate";

function completedWorkout() {
  return {
    id: "workout:armegddon",
    title: "ARMegddon",
    exercises: [
      {
        id: "completed-exercise:curls",
        name: "Cable Curl",
        notes: "Strict",
        sets: [
          { id: "completed-set:1", setType: "warm-up", reps: 12, load: { mode: "external", amount: 25, unit: "lb" }, notes: "Easy" },
          { id: "completed-set:2", reps: 8, load: { mode: "external", amount: 40, unit: "lb" }, notes: "" },
        ],
      },
      {
        id: "completed-exercise:dips",
        name: "Dips",
        exerciseId: "trace:arms-dip-001",
        sets: [{ id: "completed-set:3", reps: 10, load: { mode: "bodyweight" }, notes: "" }],
      },
    ],
  };
}

function template(now = new Date("2026-09-04T12:00:00.000Z")) {
  return createWorkoutTemplate(workoutTemplateDraftFromWorkoutEntry(completedWorkout()), now);
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test("copies a completed ARMegddon workout into ordered editable target guidance", () => {
  const source = completedWorkout();
  const draft = workoutTemplateDraftFromWorkoutEntry(source);

  expect(draft.name).toBe("ARMegddon");
  expect(draft.exercises.map(({ name }) => name)).toEqual(["Cable Curl", "Dips"]);
  expect(draft.exercises.map(({ targetSets }) => targetSets.length)).toEqual([2, 1]);
  expect(draft.exercises[0].targetSets).toEqual([
    expect.objectContaining({ setType: "warm-up", reps: 12, load: { mode: "external", amount: 25, unit: "lb" } }),
    expect.objectContaining({ setType: "working", reps: 8, load: { mode: "external", amount: 40, unit: "lb" } }),
  ]);
  expect(draft.exercises[1].targetSets[0]).toEqual(expect.objectContaining({
    reps: 10,
    load: { mode: "bodyweight" },
  }));
  expect(source.exercises[0].sets[0]).toHaveProperty("id", "completed-set:1");
});

test("uses recorded failure reps as guidance without copying completion state", () => {
  const source = completedWorkout();
  source.exercises[0].sets[0] = {
    ...source.exercises[0].sets[0],
    reps: 0,
    toFailure: true,
    actualRepsAtFailure: 14,
  };
  const draft = workoutTemplateDraftFromWorkoutEntry(source);
  expect(draft.exercises[0].targetSets[0].reps).toBe(14);
  expect(draft.exercises[0].targetSets[0]).not.toHaveProperty("toFailure");
  expect(draft.exercises[0].targetSets[0]).not.toHaveProperty("actualRepsAtFailure");
});

test("creates independent active sessions whose targets are guidance, not completed performance", () => {
  const saved = template();
  const first = createWorkoutDraftFromTemplate(saved, new Date("2026-09-04T13:00:00.000Z"));
  const second = createWorkoutDraftFromTemplate(saved, new Date("2026-09-04T14:00:00.000Z"));

  expect(first).not.toHaveProperty("plannedWorkoutId");
  expect(first.form.title).toBe("ARMegddon");
  expect(first.form.exercises.map(({ name }) => name)).toEqual(["Cable Curl", "Dips"]);
  expect(first.form.exercises[0].sets).toHaveLength(2);
  expect(first.form.exercises[0].sets[0]).toMatchObject({
    reps: "12",
    weightAmount: "25",
    isUntouched: true,
  });
  expect(first.form.exercises[0].id).not.toBe(second.form.exercises[0].id);
  expect(first.form.exercises[0].sets[0].id).not.toBe(second.form.exercises[0].sets[0].id);

  first.form.exercises[0].sets[0].reps = "99";
  expect(saved.exercises[0].targetSets[0].reps).toBe(12);
});

test("persists a template-focused origin without changing the reusable template", () => {
  const saved = template();
  const before = JSON.parse(JSON.stringify(saved));
  const draft = createWorkoutDraftFromTemplate(
    saved,
    new Date("2026-09-04T13:00:00.000Z"),
    { originPage: "workout-templates", originTemplateId: saved.id }
  );

  expect(draft.context).toMatchObject({
    originPage: "workout-templates",
    originTemplateId: saved.id,
    collapsedExerciseIds: draft.form.exercises.map(({ id }) => id),
  });
  expect(normalizeWorkoutDraft(draft).context).toMatchObject({
    originPage: "workout-templates",
    originTemplateId: saved.id,
    collapsedExerciseIds: draft.form.exercises.map(({ id }) => id),
  });
  expect(createWorkoutDraftFromTemplate(saved, new Date(), {
    originPage: "workout-templates",
  })).toBeNull();
  expect(saved).toEqual(before);
});

test("scheduling takes an independent snapshot for the existing planned-workout editor", () => {
  const saved = template();
  const scheduled = workoutTemplateToPlannedWorkoutDraft(saved, "2026-09-10");

  expect(scheduled).toMatchObject({
    scheduledDate: "2026-09-10",
    title: "ARMegddon",
  });
  expect(scheduled.exercises[0].targetSets[0]).toMatchObject({
    reps: 12,
    load: { mode: "external", amount: 25, unit: "lb" },
  });
  scheduled.exercises[0].name = "Changed plan only";
  scheduled.exercises[0].targetSets[0].load.amount = 100;
  expect(saved.exercises[0].name).toBe("Cable Curl");
  expect(saved.exercises[0].targetSets[0].load.amount).toBe(25);
});

test("editing and persistence retain valid templates without mutating the prior record", () => {
  const original = template();
  const updated = updateWorkoutTemplate(original, {
    name: "ARMegddon II",
    notes: original.notes,
    exercises: [...original.exercises].reverse(),
  }, new Date("2026-09-05T12:00:00.000Z"));
  const storage = memoryStorage();
  writeWorkoutTemplates(storage, [updated]);

  expect(readWorkoutTemplates(storage)).toEqual([updated]);
  expect(updated.id).toBe(original.id);
  expect(updated.createdAt).toBe(original.createdAt);
  expect(updated.exercises.map(({ name }) => name)).toEqual(["Dips", "Cable Curl"]);
  expect(original.name).toBe("ARMegddon");
  expect(workoutTemplateNameExists([updated], "  armeGDDon   II ")).toBe(true);
});

test("strict collection validation rejects duplicate IDs, duplicate names, and malformed targets", () => {
  const first = template();
  expect(normalizeWorkoutTemplates([first, { ...first }])).toBeNull();
  expect(normalizeWorkoutTemplates([first, { ...first, id: "workout-template:two", name: "armegddon" }])).toBeNull();
  expect(normalizeWorkoutTemplates([{
    ...first,
    exercises: [{
      ...first.exercises[0],
      targetSets: [{ ...first.exercises[0].targetSets[0], reps: -1 }],
    }],
  }])).toBeNull();
});

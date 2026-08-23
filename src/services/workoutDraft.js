import { normalizePlannedWorkout } from "./plannedWorkout";
import { createWorkoutItemId } from "./workoutEntry";

export const WORKOUT_DRAFT_STORAGE_KEY = "workoutDraft";
export const WORKOUT_DRAFT_SCHEMA_VERSION = 1;

function localDateTime(value) {
  return {
    date: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
    time: `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`,
  };
}

function emptyActualSet(defaultLoadMode = "external", defaultWeightUnit = "lb") {
  return {
    id: createWorkoutItemId("set"),
    reps: "",
    setType: "working",
    toFailure: false,
    actualRepsAtFailure: "",
    loadMode: defaultLoadMode,
    weightAmount: "",
    weightUnit: defaultWeightUnit,
    notes: "",
    isUntouched: true,
    drops: [],
  };
}

function actualSetFromTarget(target) {
  const loadMode = target.load?.mode || "external";
  const weightUnit = target.load?.mode === "external"
    ? target.load.unit
    : "lb";
  return {
    ...emptyActualSet(loadMode, weightUnit),
    reps: target.reps === undefined ? "" : String(target.reps),
    setType: target.setType === "warm-up" ? "warm-up" : "working",
    weightAmount:
      target.load?.mode === "external" && target.load.amount !== undefined
        ? String(target.load.amount)
        : "",
    notes: target.notes || "",
    isUntouched: false,
  };
}

export function createWorkoutDraftFromPlannedWorkout(
  plannedWorkout,
  now = new Date()
) {
  const plan = normalizePlannedWorkout(plannedWorkout);
  if (!plan || !Number.isFinite(now.getTime())) return null;
  const current = localDateTime(now);
  return {
    schemaVersion: WORKOUT_DRAFT_SCHEMA_VERSION,
    plannedWorkoutId: plan.id,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    form: {
      title: plan.title,
      date: current.date,
      time: current.time,
      notes: plan.notes || "",
      exercises: plan.exercises.map((exercise) => {
        const firstTarget = exercise.targetSets[0];
        const defaultLoadMode = firstTarget?.load?.mode || "external";
        const defaultWeightUnit = firstTarget?.load?.mode === "external"
          ? firstTarget.load.unit
          : "lb";
        return {
          id: createWorkoutItemId("exercise"),
          name: exercise.name,
          ...(exercise.exerciseId ? { exerciseId: exercise.exerciseId } : {}),
          ...(exercise.exerciseReference
            ? { exerciseReference: { ...exercise.exerciseReference } }
            : {}),
          saveAsReusable: false,
          defaultLoadMode,
          defaultWeightUnit,
          notes: exercise.notes || "",
          sets: exercise.targetSets.length > 0
            ? exercise.targetSets.map(actualSetFromTarget)
            : [emptyActualSet(defaultLoadMode, defaultWeightUnit)],
        };
      }),
    },
    context: { activeSearchExerciseId: null },
  };
}

export function readWorkoutDraft(storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
    if (
      value?.schemaVersion !== WORKOUT_DRAFT_SCHEMA_VERSION ||
      !value.form ||
      !Array.isArray(value.form.exercises) ||
      typeof value.startedAt !== "string" ||
      (
        value.plannedWorkoutId !== undefined &&
        (
          typeof value.plannedWorkoutId !== "string" ||
          value.plannedWorkoutId.trim() === ""
        )
      )
    ) {
      return null;
    }
    return value.plannedWorkoutId === undefined
      ? value
      : { ...value, plannedWorkoutId: value.plannedWorkoutId.trim() };
  } catch (error) {
    return null;
  }
}

export function writeWorkoutDraft(storage = localStorage, draft) {
  storage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearWorkoutDraft(storage = localStorage) {
  storage.removeItem(WORKOUT_DRAFT_STORAGE_KEY);
}

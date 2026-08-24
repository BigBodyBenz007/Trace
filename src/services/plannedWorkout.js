import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { parseDateOnlyLocal } from "./dateOnly";
import { resolveBuiltInExerciseName } from "./exerciseIdentity";
import { createWorkoutItemId } from "./workoutEntry";

export const PLANNED_WORKOUTS_STORAGE_KEY = "plannedWorkouts";
export const PLANNED_WORKOUT_SCHEMA_VERSION = 1;

const LOAD_MODES = new Set(WORKOUT_LOAD_MODES.map(({ value }) => value));
const WEIGHT_UNITS = new Set(WORKOUT_WEIGHT_UNITS.map(({ value }) => value));
const SET_TYPES = new Set(["working", "warm-up"]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)])
    );
  }
  return value;
}

function meaningfulText(value) {
  return /[a-z0-9]/i.test(String(value || "").trim());
}

function compactText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function cleanNotes(value) {
  return String(value || "").trim();
}

function validId(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function validTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function optionalNumber(value) {
  return String(value ?? "").trim() === "" ? null : Number(value);
}

function getTargetSetError(target, exerciseIndex, targetIndex, requireIds) {
  const location = `exercise ${exerciseIndex + 1}, target set ${targetIndex + 1}`;
  if (!isObject(target)) return `Enter a valid ${location}.`;
  if ((requireIds || hasOwn(target, "id")) && !validId(target.id)) {
    return `Enter a valid ID for ${location}.`;
  }
  if (target.setType !== undefined && !SET_TYPES.has(target.setType)) {
    return `Choose a valid set type for ${location}.`;
  }

  const reps = optionalNumber(target.reps);
  if (
    reps !== null &&
    (!Number.isFinite(reps) || !Number.isInteger(reps) || reps < 0)
  ) {
    return `Enter non-negative whole-number intended reps for ${location}.`;
  }

  if (target.load === undefined || target.load === null) return "";
  if (!isObject(target.load) || !LOAD_MODES.has(target.load.mode)) {
    return `Choose a valid intended load mode for ${location}.`;
  }
  if (target.load.mode === "bodyweight") return "";
  if (!WEIGHT_UNITS.has(target.load.unit)) {
    return `Choose lb or kg for ${location}.`;
  }
  const amount = optionalNumber(target.load.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
    return `Enter an intended external weight greater than zero for ${location}.`;
  }
  return "";
}

function getExerciseError(exercise, exerciseIndex, requireIds = false) {
  if (!isObject(exercise)) {
    return `Enter a valid exercise ${exerciseIndex + 1}.`;
  }
  if ((requireIds || hasOwn(exercise, "id")) && !validId(exercise.id)) {
    return `Enter a valid ID for exercise ${exerciseIndex + 1}.`;
  }
  if (!meaningfulText(exercise.name)) {
    return `Enter a name for exercise ${exerciseIndex + 1}.`;
  }
  if (
    exercise.exerciseId !== undefined &&
    exercise.exerciseId !== null &&
    !validId(exercise.exerciseId)
  ) {
    return `Enter a valid built-in exercise ID for exercise ${exerciseIndex + 1}.`;
  }
  if (exercise.exerciseReference !== undefined && exercise.exerciseReference !== null) {
    const reference = exercise.exerciseReference;
    if (!isObject(reference) || !validId(reference.sourceId)) {
      return `Enter a valid saved exercise reference for exercise ${exerciseIndex + 1}.`;
    }
    if (reference.source !== undefined && !validId(reference.source)) {
      return `Enter a valid saved exercise source for exercise ${exerciseIndex + 1}.`;
    }
    if (reference.modified !== undefined && typeof reference.modified !== "boolean") {
      return `Enter a valid saved exercise modification state for exercise ${exerciseIndex + 1}.`;
    }
  }
  if (exercise.targetSets !== undefined && !Array.isArray(exercise.targetSets)) {
    return `Enter valid target sets for exercise ${exerciseIndex + 1}.`;
  }

  const targetIds = new Set();
  const targets = exercise.targetSets || [];
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    const target = targets[targetIndex];
    const error = getTargetSetError(
      target,
      exerciseIndex,
      targetIndex,
      requireIds
    );
    if (error) return error;
    if (target.id !== undefined) {
      const id = target.id.trim();
      if (targetIds.has(id)) {
        return `Target set IDs must be unique within exercise ${exerciseIndex + 1}.`;
      }
      targetIds.add(id);
    }
  }
  return "";
}

function getStructureError(value, requireRecordFields = false) {
  if (!isObject(value)) return "Enter a valid planned workout.";
  if (
    value.schemaVersion !== undefined &&
    value.schemaVersion !== PLANNED_WORKOUT_SCHEMA_VERSION
  ) {
    return "Choose a supported planned workout schema version.";
  }
  if (value.type !== undefined && value.type !== "strength") {
    return "Choose a supported planned workout type.";
  }
  if (requireRecordFields && !validId(value.id)) {
    return "Enter a valid planned workout ID.";
  }
  if (!parseDateOnlyLocal(value.scheduledDate)) {
    return "Enter a valid scheduled date.";
  }
  if (!meaningfulText(value.title)) return "Enter a planned workout title.";
  if (!Array.isArray(value.exercises) || value.exercises.length === 0) {
    return "Add at least one exercise to the planned workout.";
  }

  const exerciseIds = new Set();
  for (let exerciseIndex = 0; exerciseIndex < value.exercises.length; exerciseIndex += 1) {
    const exercise = value.exercises[exerciseIndex];
    const error = getExerciseError(exercise, exerciseIndex, requireRecordFields);
    if (error) return error;
    if (exercise.id !== undefined) {
      const id = exercise.id.trim();
      if (exerciseIds.has(id)) return "Planned exercise IDs must be unique.";
      exerciseIds.add(id);
    }
  }

  if (requireRecordFields) {
    if (value.schemaVersion !== PLANNED_WORKOUT_SCHEMA_VERSION) {
      return "Choose a supported planned workout schema version.";
    }
    if (value.type !== "strength") {
      return "Choose a supported planned workout type.";
    }
    if (!validTimestamp(value.createdAt) || !validTimestamp(value.updatedAt)) {
      return "Enter valid planned workout timestamps.";
    }
  }
  return "";
}

export function getPlannedWorkoutError(draft) {
  return getStructureError(draft, false);
}

export function getPlannedWorkoutRecordError(record) {
  return getStructureError(record, true);
}

function unusedId(prefix, usedIds) {
  let id;
  do {
    id = createWorkoutItemId(prefix);
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

function normalizeReference(reference) {
  return {
    ...cloneValue(reference),
    source: compactText(reference.source || "user-saved"),
    sourceId: reference.sourceId.trim(),
  };
}

function normalizeLoad(load) {
  if (!load) return null;
  const normalized = { ...cloneValue(load), mode: load.mode };
  if (load.mode === "bodyweight") {
    delete normalized.amount;
    delete normalized.unit;
    return normalized;
  }
  normalized.unit = load.unit;
  const amount = optionalNumber(load.amount);
  if (amount === null) delete normalized.amount;
  else normalized.amount = amount;
  return normalized;
}

function normalizeTargetSet(target, usedIds) {
  const normalized = {
    ...cloneValue(target),
    id: validId(target.id)
      ? target.id.trim()
      : unusedId("planned-set", usedIds),
    setType: target.setType || "working",
    notes: cleanNotes(target.notes),
  };
  const reps = optionalNumber(target.reps);
  if (reps === null) delete normalized.reps;
  else normalized.reps = reps;
  const load = normalizeLoad(target.load);
  if (load) normalized.load = load;
  else delete normalized.load;
  usedIds.add(normalized.id);
  return normalized;
}

function inferredBuiltInId(exercise) {
  if (exercise.exerciseReference) return null;
  if (validId(exercise.exerciseId)) return exercise.exerciseId.trim();
  const resolution = resolveBuiltInExerciseName(exercise.name);
  return resolution.status === "canonical" || resolution.status === "alias"
    ? resolution.exercise.id
    : null;
}

function normalizeExercise(exercise, usedExerciseIds) {
  const targetIds = new Set();
  const normalized = {
    ...cloneValue(exercise),
    id: validId(exercise.id)
      ? exercise.id.trim()
      : unusedId("planned-exercise", usedExerciseIds),
    name: compactText(exercise.name),
    notes: cleanNotes(exercise.notes),
    targetSets: (exercise.targetSets || []).map((target) =>
      normalizeTargetSet(target, targetIds)
    ),
  };
  usedExerciseIds.add(normalized.id);

  if (exercise.exerciseReference) {
    normalized.exerciseReference = normalizeReference(exercise.exerciseReference);
    delete normalized.exerciseId;
  } else {
    delete normalized.exerciseReference;
    const exerciseId = inferredBuiltInId(exercise);
    if (exerciseId) normalized.exerciseId = exerciseId;
    else delete normalized.exerciseId;
  }
  return normalized;
}

function normalizedExercises(exercises) {
  const usedExerciseIds = new Set();
  return exercises.map((exercise) =>
    normalizeExercise(exercise, usedExerciseIds)
  );
}

export function createPlannedWorkout(draft, now = new Date()) {
  if (getPlannedWorkoutError(draft)) return null;
  const timestamp = now.toISOString();
  return {
    ...cloneValue(draft),
    id: validId(draft.id)
      ? draft.id.trim()
      : createWorkoutItemId("planned-workout"),
    schemaVersion: PLANNED_WORKOUT_SCHEMA_VERSION,
    type: "strength",
    scheduledDate: draft.scheduledDate,
    title: compactText(draft.title),
    notes: cleanNotes(draft.notes),
    exercises: normalizedExercises(draft.exercises),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizePlannedWorkout(record) {
  if (getPlannedWorkoutRecordError(record)) return null;
  return {
    ...cloneValue(record),
    id: record.id.trim(),
    schemaVersion: PLANNED_WORKOUT_SCHEMA_VERSION,
    type: "strength",
    scheduledDate: record.scheduledDate,
    title: compactText(record.title),
    notes: cleanNotes(record.notes),
    exercises: normalizedExercises(record.exercises),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function appendPlannedWorkoutExercise(
  plannedWorkout,
  exerciseDraft,
  now = new Date()
) {
  const normalizedWorkout = normalizePlannedWorkout(plannedWorkout);
  if (!normalizedWorkout || getExerciseError(exerciseDraft, 0, false)) return null;

  const usedExerciseIds = new Set(
    normalizedWorkout.exercises.map(({ id }) => id)
  );
  if (validId(exerciseDraft.id) && usedExerciseIds.has(exerciseDraft.id.trim())) {
    return null;
  }
  const exercise = normalizeExercise(exerciseDraft, usedExerciseIds);
  return {
    ...normalizedWorkout,
    exercises: [...normalizedWorkout.exercises, exercise],
    updatedAt: now.toISOString(),
  };
}

export function updatePlannedWorkout(
  plannedWorkout,
  draft,
  now = new Date()
) {
  const normalizedWorkout = normalizePlannedWorkout(plannedWorkout);
  if (!normalizedWorkout || !isObject(draft)) return null;

  const updated = {
    ...normalizedWorkout,
    ...cloneValue(draft),
    id: normalizedWorkout.id,
    schemaVersion: PLANNED_WORKOUT_SCHEMA_VERSION,
    type: "strength",
    createdAt: normalizedWorkout.createdAt,
    updatedAt: now.toISOString(),
  };
  if (getPlannedWorkoutRecordError(updated)) return null;
  return normalizePlannedWorkout(updated);
}

export function removePlannedWorkoutExercise(
  plannedWorkout,
  exerciseId,
  now = new Date()
) {
  const normalizedWorkout = normalizePlannedWorkout(plannedWorkout);
  if (!normalizedWorkout || !validId(exerciseId)) return null;
  if (normalizedWorkout.exercises.length <= 1) return null;
  if (!normalizedWorkout.exercises.some(({ id }) => id === exerciseId.trim())) {
    return null;
  }

  return {
    ...normalizedWorkout,
    exercises: normalizedWorkout.exercises.filter(
      ({ id }) => id !== exerciseId.trim()
    ),
    updatedAt: now.toISOString(),
  };
}

export function normalizePlannedWorkouts(records) {
  if (!Array.isArray(records)) return null;
  const ids = new Set();
  const normalized = [];
  for (const record of records) {
    const value = normalizePlannedWorkout(record);
    if (!value || ids.has(value.id)) return null;
    ids.add(value.id);
    normalized.push(value);
  }
  return normalized;
}

export function restorePlannedWorkoutAtIndex(
  plannedWorkouts,
  plannedWorkout,
  originalIndex
) {
  const normalized = normalizePlannedWorkouts(plannedWorkouts);
  const restored = normalizePlannedWorkout(plannedWorkout);
  if (
    !normalized ||
    !restored ||
    !Number.isInteger(originalIndex) ||
    originalIndex < 0 ||
    originalIndex > normalized.length ||
    normalized.some(({ id }) => id === restored.id)
  ) {
    return null;
  }

  const updated = [...normalized];
  updated.splice(originalIndex, 0, restored);
  return updated;
}

export function readPlannedWorkouts(storage = localStorage) {
  const saved = storage.getItem(PLANNED_WORKOUTS_STORAGE_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  const normalized = normalizePlannedWorkouts(parsed);
  if (!normalized) throw new Error("Invalid planned workout data.");
  return normalized;
}

export function writePlannedWorkouts(storage, plannedWorkouts) {
  const normalized = normalizePlannedWorkouts(plannedWorkouts);
  if (!normalized) throw new Error("Invalid planned workout data.");
  storage.setItem(PLANNED_WORKOUTS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

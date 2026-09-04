import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { resolveBuiltInExerciseName } from "./exerciseIdentity";
import { createWorkoutItemId } from "./workoutEntry";

export const WORKOUT_TEMPLATES_STORAGE_KEY = "workoutTemplates";
export const WORKOUT_TEMPLATE_SCHEMA_VERSION = 1;

const LOAD_MODES = new Set(WORKOUT_LOAD_MODES.map(({ value }) => value));
const WEIGHT_UNITS = new Set(WORKOUT_WEIGHT_UNITS.map(({ value }) => value));
const SET_TYPES = new Set(["working", "warm-up"]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function notes(value) {
  return String(value || "").trim();
}

function meaningful(value) {
  return /[a-z0-9]/i.test(text(value));
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

function cloneReference(reference) {
  if (!reference) return null;
  return {
    ...(reference.source ? { source: reference.source.trim() } : {}),
    sourceId: reference.sourceId.trim(),
    ...(reference.modified === undefined ? {} : { modified: reference.modified }),
  };
}

function cloneLoad(load) {
  if (!load) return null;
  if (load.mode === "bodyweight") return { mode: "bodyweight" };
  const amount = optionalNumber(load.amount);
  return {
    mode: "external",
    unit: load.unit,
    ...(amount === null ? {} : { amount }),
  };
}

function getTargetError(target, exerciseIndex, targetIndex, requireIds) {
  const location = `exercise ${exerciseIndex + 1}, target set ${targetIndex + 1}`;
  if (!isObject(target)) return `Enter a valid ${location}.`;
  if ((requireIds || target.id !== undefined) && !validId(target.id)) {
    return `Enter a valid ID for ${location}.`;
  }
  if (target.setType !== undefined && !SET_TYPES.has(target.setType)) {
    return `Choose a valid set type for ${location}.`;
  }
  const reps = optionalNumber(target.reps);
  if (reps !== null && (!Number.isInteger(reps) || reps < 0)) {
    return `Enter non-negative whole-number target reps for ${location}.`;
  }
  if (target.load === undefined || target.load === null) return "";
  if (!isObject(target.load) || !LOAD_MODES.has(target.load.mode)) {
    return `Choose a valid target load for ${location}.`;
  }
  if (target.load.mode === "bodyweight") return "";
  if (!WEIGHT_UNITS.has(target.load.unit)) {
    return `Choose lb or kg for ${location}.`;
  }
  const amount = optionalNumber(target.load.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
    return `Enter a target weight greater than zero for ${location}.`;
  }
  return "";
}

function getExerciseError(exercise, exerciseIndex, requireIds) {
  if (!isObject(exercise)) return `Enter a valid exercise ${exerciseIndex + 1}.`;
  if ((requireIds || exercise.id !== undefined) && !validId(exercise.id)) {
    return `Enter a valid ID for exercise ${exerciseIndex + 1}.`;
  }
  if (!meaningful(exercise.name)) return `Enter a name for exercise ${exerciseIndex + 1}.`;
  if (exercise.exerciseId != null && !validId(exercise.exerciseId)) {
    return `Enter a valid built-in exercise ID for exercise ${exerciseIndex + 1}.`;
  }
  if (exercise.exerciseReference != null) {
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
  if (!Array.isArray(exercise.targetSets)) {
    return `Enter valid target sets for exercise ${exerciseIndex + 1}.`;
  }
  const targetIds = new Set();
  for (let targetIndex = 0; targetIndex < exercise.targetSets.length; targetIndex += 1) {
    const target = exercise.targetSets[targetIndex];
    const error = getTargetError(target, exerciseIndex, targetIndex, requireIds);
    if (error) return error;
    if (target.id !== undefined) {
      const id = target.id.trim();
      if (targetIds.has(id)) return `Target set IDs must be unique within exercise ${exerciseIndex + 1}.`;
      targetIds.add(id);
    }
  }
  return "";
}

function getStructureError(value, requireRecordFields = false) {
  if (!isObject(value)) return "Enter a valid workout template.";
  if (value.schemaVersion !== undefined && value.schemaVersion !== WORKOUT_TEMPLATE_SCHEMA_VERSION) {
    return "Choose a supported workout template schema version.";
  }
  if (value.type !== undefined && value.type !== "strength") {
    return "Choose a supported workout template type.";
  }
  if (requireRecordFields && !validId(value.id)) return "Enter a valid workout template ID.";
  if (!meaningful(value.name)) return "Enter a workout template name.";
  if (!Array.isArray(value.exercises) || value.exercises.length === 0) {
    return "Add at least one exercise to the workout template.";
  }
  const exerciseIds = new Set();
  for (let index = 0; index < value.exercises.length; index += 1) {
    const exercise = value.exercises[index];
    const error = getExerciseError(exercise, index, requireRecordFields);
    if (error) return error;
    if (exercise.id !== undefined) {
      const id = exercise.id.trim();
      if (exerciseIds.has(id)) return "Workout template exercise IDs must be unique.";
      exerciseIds.add(id);
    }
  }
  if (requireRecordFields && (
    value.schemaVersion !== WORKOUT_TEMPLATE_SCHEMA_VERSION
    || value.type !== "strength"
    || !validTimestamp(value.createdAt)
    || !validTimestamp(value.updatedAt)
  )) return "Enter valid workout template record details.";
  return "";
}

export function getWorkoutTemplateError(value) {
  return getStructureError(value, false);
}

export function getWorkoutTemplateRecordError(value) {
  return getStructureError(value, true);
}

function inferredBuiltInId(exercise) {
  if (exercise.exerciseReference) return null;
  if (validId(exercise.exerciseId)) return exercise.exerciseId.trim();
  const resolution = resolveBuiltInExerciseName(exercise.name);
  return resolution.status === "canonical" || resolution.status === "alias"
    ? resolution.exercise.id
    : null;
}

function normalizedTarget(target) {
  const reps = optionalNumber(target.reps);
  const load = cloneLoad(target.load);
  return {
    id: validId(target.id) ? target.id.trim() : createWorkoutItemId("template-set"),
    setType: target.setType === "warm-up" ? "warm-up" : "working",
    ...(reps === null ? {} : { reps }),
    ...(load ? { load } : {}),
    notes: notes(target.notes),
  };
}

function normalizedExercise(exercise) {
  const exerciseId = inferredBuiltInId(exercise);
  return {
    id: validId(exercise.id) ? exercise.id.trim() : createWorkoutItemId("template-exercise"),
    name: text(exercise.name),
    ...(exerciseId ? { exerciseId } : {}),
    ...(exercise.exerciseReference
      ? { exerciseReference: cloneReference(exercise.exerciseReference) }
      : {}),
    notes: notes(exercise.notes),
    targetSets: exercise.targetSets.map(normalizedTarget),
  };
}

function normalizedTemplate(value) {
  return {
    id: validId(value.id) ? value.id.trim() : createWorkoutItemId("workout-template"),
    schemaVersion: WORKOUT_TEMPLATE_SCHEMA_VERSION,
    type: "strength",
    name: text(value.name),
    notes: notes(value.notes),
    exercises: value.exercises.map(normalizedExercise),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function createWorkoutTemplate(draft, now = new Date()) {
  if (getWorkoutTemplateError(draft) || !Number.isFinite(now.getTime())) return null;
  const timestamp = now.toISOString();
  return normalizedTemplate({
    ...draft,
    id: validId(draft.id) ? draft.id : createWorkoutItemId("workout-template"),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function updateWorkoutTemplate(template, draft, now = new Date()) {
  const existing = normalizeWorkoutTemplate(template);
  if (!existing || getWorkoutTemplateError(draft) || !Number.isFinite(now.getTime())) return null;
  return normalizedTemplate({
    ...draft,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  });
}

export function normalizeWorkoutTemplate(value) {
  if (getWorkoutTemplateRecordError(value)) return null;
  return normalizedTemplate(value);
}

export function normalizeWorkoutTemplates(values) {
  if (!Array.isArray(values)) return null;
  const ids = new Set();
  const names = new Set();
  const normalized = [];
  for (const value of values) {
    const template = normalizeWorkoutTemplate(value);
    const nameKey = template?.name.toLocaleLowerCase();
    if (!template || ids.has(template.id) || names.has(nameKey)) return null;
    ids.add(template.id);
    names.add(nameKey);
    normalized.push(template);
  }
  return normalized;
}

export function workoutTemplateNameExists(templates, name, excludingId = null) {
  const key = text(name).toLocaleLowerCase();
  return Boolean(key) && templates.some((template) => (
    template.id !== excludingId && text(template.name).toLocaleLowerCase() === key
  ));
}

function targetFromCompletedSet(set) {
  const completedReps = set?.toFailure
    && Number.isInteger(set.actualRepsAtFailure)
    && set.actualRepsAtFailure >= 0
    ? set.actualRepsAtFailure
    : set?.reps;
  return {
    id: createWorkoutItemId("template-set"),
    setType: set?.setType === "warm-up" ? "warm-up" : "working",
    ...(Number.isInteger(completedReps) && completedReps >= 0 ? { reps: completedReps } : {}),
    ...(set?.load?.mode === "bodyweight"
      ? { load: { mode: "bodyweight" } }
      : set?.load?.mode === "external"
        && Number.isFinite(set.load.amount)
        && set.load.amount > 0
        && WEIGHT_UNITS.has(set.load.unit)
        ? { load: { mode: "external", amount: set.load.amount, unit: set.load.unit } }
        : {}),
    notes: notes(set?.notes),
  };
}

export function workoutTemplateDraftFromWorkoutEntry(entry) {
  if (!isObject(entry) || !meaningful(entry.title) || !Array.isArray(entry.exercises) || entry.exercises.length === 0) {
    return null;
  }
  const exercises = entry.exercises.map((exercise) => ({
    id: createWorkoutItemId("template-exercise"),
    name: text(exercise?.name),
    ...(validId(exercise?.exerciseId) ? { exerciseId: exercise.exerciseId.trim() } : {}),
    ...(exercise?.exerciseReference
      ? { exerciseReference: cloneReference(exercise.exerciseReference) }
      : {}),
    notes: notes(exercise?.notes),
    targetSets: Array.isArray(exercise?.sets)
      ? exercise.sets.map(targetFromCompletedSet)
      : [],
  }));
  const draft = { name: text(entry.title), notes: "", exercises };
  return getWorkoutTemplateError(draft) ? null : draft;
}

export function workoutTemplateToPlannedWorkoutDraft(template, scheduledDate) {
  const normalized = normalizeWorkoutTemplate(template);
  if (!normalized) return null;
  return {
    scheduledDate,
    title: normalized.name,
    notes: normalized.notes,
    exercises: normalized.exercises.map((exercise) => ({
      id: createWorkoutItemId("planned-exercise"),
      name: exercise.name,
      ...(exercise.exerciseId ? { exerciseId: exercise.exerciseId } : {}),
      ...(exercise.exerciseReference
        ? { exerciseReference: { ...exercise.exerciseReference } }
        : {}),
      notes: exercise.notes,
      targetSets: exercise.targetSets.map((target) => ({
        id: createWorkoutItemId("planned-set"),
        setType: target.setType,
        ...(target.reps === undefined ? {} : { reps: target.reps }),
        ...(target.load ? { load: { ...target.load } } : {}),
        notes: target.notes,
      })),
    })),
  };
}

export function workoutTemplateDraftForEditing(template) {
  const normalized = normalizeWorkoutTemplate(template);
  if (!normalized) return null;
  return {
    name: normalized.name,
    notes: normalized.notes,
    exercises: normalized.exercises.map((exercise) => ({
      ...exercise,
      exerciseReference: exercise.exerciseReference
        ? { ...exercise.exerciseReference }
        : undefined,
      targetSets: exercise.targetSets.map((target) => ({
        ...target,
        load: target.load ? { ...target.load } : null,
      })),
    })),
  };
}

export function readWorkoutTemplates(storage = localStorage) {
  const raw = storage.getItem(WORKOUT_TEMPLATES_STORAGE_KEY);
  if (!raw) return [];
  const normalized = normalizeWorkoutTemplates(JSON.parse(raw));
  if (!normalized) throw new Error("Invalid workout template data.");
  return normalized;
}

export function writeWorkoutTemplates(storage, templates) {
  const normalized = normalizeWorkoutTemplates(templates);
  if (!normalized) throw new Error("Invalid workout template data.");
  storage.setItem(WORKOUT_TEMPLATES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

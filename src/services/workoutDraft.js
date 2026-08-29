import { normalizePlannedWorkout } from "./plannedWorkout";
import {
  createWorkoutItemId,
  workoutLocalDateTimeToIso,
} from "./workoutEntry";
import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { parseDateOnlyLocal } from "./dateOnly";

export const WORKOUT_DRAFT_STORAGE_KEY = "workoutDraft";
export const WORKOUT_DRAFT_SCHEMA_VERSION = 1;

const LOAD_MODES = new Set(WORKOUT_LOAD_MODES.map(({ value }) => value));
const WEIGHT_UNITS = new Set(WORKOUT_WEIGHT_UNITS.map(({ value }) => value));
const ROADMAP_STATUSES = new Set(["pending", "completed", "skipped"]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validId(value) {
  return typeof value === "string" && value.trim() !== "";
}

function validTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function optionalString(value, fallback = "") {
  if (value === undefined) return fallback;
  return typeof value === "string" ? value : null;
}

function normalizeExerciseReference(value) {
  if (value === undefined || value === null) return value;
  if (!isObject(value) || !validId(value.sourceId)) return null;
  if (value.source !== undefined && !validId(value.source)) return null;
  if (value.modified !== undefined && typeof value.modified !== "boolean") return null;
  return {
    ...(value.source === undefined ? {} : { source: value.source.trim() }),
    sourceId: value.sourceId.trim(),
    ...(value.modified === undefined ? {} : { modified: value.modified }),
  };
}

function normalizeDraftSegment(segment, usedIds, { includeSetFields = false } = {}) {
  if (!isObject(segment) || !validId(segment.id) || usedIds.has(segment.id.trim())) {
    return null;
  }
  if (
    typeof segment.reps !== "string" ||
    !LOAD_MODES.has(segment.loadMode) ||
    typeof segment.weightAmount !== "string" ||
    !WEIGHT_UNITS.has(segment.weightUnit) ||
    (segment.toFailure !== undefined && typeof segment.toFailure !== "boolean") ||
    (segment.isUntouched !== undefined && typeof segment.isUntouched !== "boolean")
  ) {
    return null;
  }
  const actualRepsAtFailure = optionalString(segment.actualRepsAtFailure);
  const notes = optionalString(segment.notes);
  if (actualRepsAtFailure === null || notes === null) return null;
  if (
    includeSetFields &&
    segment.setType !== undefined &&
    !["working", "warm-up"].includes(segment.setType)
  ) {
    return null;
  }

  usedIds.add(segment.id.trim());
  const normalized = {
    id: segment.id.trim(),
    reps: segment.reps,
    ...(includeSetFields ? { setType: segment.setType || "working" } : {}),
    toFailure: segment.toFailure ?? false,
    actualRepsAtFailure,
    loadMode: segment.loadMode,
    weightAmount: segment.weightAmount,
    weightUnit: segment.weightUnit,
    notes,
    isUntouched: segment.isUntouched ?? false,
  };

  if (!includeSetFields) return normalized;
  if (segment.drops !== undefined && !Array.isArray(segment.drops)) return null;
  const drops = [];
  for (const drop of segment.drops || []) {
    const normalizedDrop = normalizeDraftSegment(drop, usedIds);
    if (!normalizedDrop) return null;
    drops.push(normalizedDrop);
  }
  return { ...normalized, drops };
}

function normalizeDraftExercise(exercise, usedIds) {
  if (
    !isObject(exercise) ||
    !validId(exercise.id) ||
    usedIds.has(exercise.id.trim()) ||
    typeof exercise.name !== "string" ||
    !Array.isArray(exercise.sets) ||
    (exercise.exerciseId !== undefined && exercise.exerciseId !== null && !validId(exercise.exerciseId)) ||
    (exercise.saveAsReusable !== undefined && typeof exercise.saveAsReusable !== "boolean")
  ) {
    return null;
  }
  const notes = optionalString(exercise.notes);
  const hasRoadmapStatus = exercise.roadmapStatus !== undefined;
  const hasRoadmapSkipReason = exercise.roadmapSkipReason !== undefined;
  const roadmapSkipReason = optionalString(exercise.roadmapSkipReason);
  const roadmapStatus = exercise.roadmapStatus || "pending";
  const hasReference = exercise.exerciseReference !== undefined && exercise.exerciseReference !== null;
  const reference = normalizeExerciseReference(exercise.exerciseReference);
  if (
    notes === null ||
    roadmapSkipReason === null ||
    !ROADMAP_STATUSES.has(roadmapStatus) ||
    (hasReference && !reference)
  ) return null;

  usedIds.add(exercise.id.trim());
  const sets = [];
  for (const set of exercise.sets) {
    const normalizedSet = normalizeDraftSegment(set, usedIds, { includeSetFields: true });
    if (!normalizedSet) return null;
    sets.push(normalizedSet);
  }
  const defaultLoadMode = exercise.defaultLoadMode || sets[0]?.loadMode || "external";
  const defaultWeightUnit = exercise.defaultWeightUnit || sets[0]?.weightUnit || "lb";
  if (!LOAD_MODES.has(defaultLoadMode) || !WEIGHT_UNITS.has(defaultWeightUnit)) return null;

  return {
    id: exercise.id.trim(),
    name: exercise.name,
    ...(exercise.exerciseId === undefined || exercise.exerciseId === null
      ? {}
      : { exerciseId: exercise.exerciseId.trim() }),
    ...(reference ? { exerciseReference: reference } : {}),
    saveAsReusable: exercise.saveAsReusable ?? false,
    defaultLoadMode,
    defaultWeightUnit,
    notes,
    ...(hasRoadmapStatus ? { roadmapStatus } : {}),
    ...(hasRoadmapSkipReason ? { roadmapSkipReason } : {}),
    sets,
  };
}

export function normalizeWorkoutDraft(value) {
  if (
    !isObject(value) ||
    value.schemaVersion !== WORKOUT_DRAFT_SCHEMA_VERSION ||
    !validTimestamp(value.startedAt) ||
    !validTimestamp(value.updatedAt) ||
    !isObject(value.form) ||
    typeof value.form.title !== "string" ||
    typeof value.form.date !== "string" ||
    typeof value.form.time !== "string" ||
    typeof value.form.notes !== "string" ||
    !workoutLocalDateTimeToIso(value.form.date, value.form.time) ||
    !Array.isArray(value.form.exercises) ||
    (
      value.plannedWorkoutId !== undefined &&
      !validId(value.plannedWorkoutId)
    )
  ) {
    return null;
  }

  const usedIds = new Set();
  const exercises = [];
  for (const exercise of value.form.exercises) {
    const normalizedExercise = normalizeDraftExercise(exercise, usedIds);
    if (!normalizedExercise) return null;
    exercises.push(normalizedExercise);
  }

  const context = value.context === undefined ? {} : value.context;
  if (!isObject(context)) return null;
  const activeSearchExerciseId = context.activeSearchExerciseId ?? null;
  if (activeSearchExerciseId !== null && !validId(activeSearchExerciseId)) return null;
  const hasRoadmapEditingExerciseId = context.roadmapEditingExerciseId !== undefined;
  const roadmapEditingExerciseId = context.roadmapEditingExerciseId ?? null;
  if (roadmapEditingExerciseId !== null && !validId(roadmapEditingExerciseId)) return null;
  const collapsedExerciseIds = context.collapsedExerciseIds ?? [];
  if (
    !Array.isArray(collapsedExerciseIds)
    || collapsedExerciseIds.some((id) => !validId(id))
  ) return null;
  const exerciseIds = new Set(exercises.map(({ id }) => id));
  const normalizedCollapsedExerciseIds = Array.from(new Set(
    collapsedExerciseIds.map((id) => id.trim())
  )).filter((id) => exerciseIds.has(id));
  const hasOriginPage = context.originPage !== undefined;
  const originPage = context.originPage ?? null;
  if (originPage !== null && !["today", "calendar"].includes(originPage)) return null;
  const selectedDate = context.selectedDate ?? null;
  const visibleMonth = context.visibleMonth ?? null;
  if (originPage === "calendar" && (
    !parseDateOnlyLocal(selectedDate)
    || !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(visibleMonth || ""))
  )) return null;

  return {
    schemaVersion: WORKOUT_DRAFT_SCHEMA_VERSION,
    ...(value.plannedWorkoutId === undefined
      ? {}
      : { plannedWorkoutId: value.plannedWorkoutId.trim() }),
    startedAt: value.startedAt,
    updatedAt: value.updatedAt,
    form: {
      title: value.form.title,
      date: value.form.date,
      time: value.form.time,
      notes: value.form.notes,
      exercises,
    },
    context: {
      activeSearchExerciseId,
      ...(hasRoadmapEditingExerciseId ? { roadmapEditingExerciseId } : {}),
      ...(normalizedCollapsedExerciseIds.length > 0
        ? { collapsedExerciseIds: normalizedCollapsedExerciseIds }
        : {}),
      ...(hasOriginPage ? { originPage } : {}),
      ...(originPage === "calendar" ? { selectedDate, visibleMonth } : {}),
    },
  };
}

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
  now = new Date(),
  { originPage = null, selectedDate = null, visibleMonth = null } = {}
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
          roadmapStatus: "pending",
          roadmapSkipReason: "",
          sets: exercise.targetSets.length > 0
            ? exercise.targetSets.map(actualSetFromTarget)
            : [emptyActualSet(defaultLoadMode, defaultWeightUnit)],
        };
      }),
    },
    context: {
      activeSearchExerciseId: null,
      roadmapEditingExerciseId: null,
      ...(["today", "calendar"].includes(originPage) ? { originPage } : {}),
      ...(originPage === "calendar" ? { selectedDate, visibleMonth } : {}),
    },
  };
}

export function readWorkoutDraft(storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
    return normalizeWorkoutDraft(value);
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

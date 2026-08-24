import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { resolveBuiltInExerciseName } from "./exerciseIdentity";

const LOAD_MODES = new Set(WORKOUT_LOAD_MODES.map(({ value }) => value));
const WEIGHT_UNITS = new Set(WORKOUT_WEIGHT_UNITS.map(({ value }) => value));

function meaningfulText(value) {
  return /[a-z0-9]/i.test(String(value || "").trim());
}

function cleanText(value) {
  return String(value || "").trim();
}

function builtInExerciseId(exercise) {
  if (exercise.exerciseReference) return null;
  if (exercise.exerciseId) return exercise.exerciseId;
  const result = resolveBuiltInExerciseName(exercise.name);
  return result.status === "canonical" || result.status === "alias"
    ? result.exercise.id
    : null;
}

export function createWorkoutItemId(prefix = "item") {
  const value =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}:${value}`;
}

export function workoutLocalDateTimeToIso(date, time) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch.map(Number);
  const [, hours, minutes] = timeMatch.map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes);

  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day ||
    localDate.getHours() !== hours ||
    localDate.getMinutes() !== minutes
  ) {
    return null;
  }

  return localDate.toISOString();
}

export function getWorkoutEntryError(draft) {
  if (!meaningfulText(draft?.title)) return "Enter a workout title.";
  if (!workoutLocalDateTimeToIso(draft?.date, draft?.time)) {
    return "Enter a valid date and time.";
  }
  if (!Array.isArray(draft?.exercises) || draft.exercises.length === 0) {
    return "Add at least one exercise.";
  }

  for (let exerciseIndex = 0; exerciseIndex < draft.exercises.length; exerciseIndex += 1) {
    const exercise = draft.exercises[exerciseIndex];
    if (!meaningfulText(exercise?.name)) {
      return `Enter a name for exercise ${exerciseIndex + 1}.`;
    }
    if (exercise.roadmapStatus === "skipped") continue;
    if (!Array.isArray(exercise?.sets) || exercise.sets.length === 0) {
      return `Add at least one set to exercise ${exerciseIndex + 1}.`;
    }

    for (let setIndex = 0; setIndex < exercise.sets.length; setIndex += 1) {
      const set = exercise.sets[setIndex];
      const location = `exercise ${exerciseIndex + 1}, set ${setIndex + 1}`;
      const setError = getSetSegmentError(set, location);
      if (setError) return setError;
      const drops = Array.isArray(set?.drops) ? set.drops : [];
      for (let dropIndex = 0; dropIndex < drops.length; dropIndex += 1) {
        const dropError = getSetSegmentError(
          drops[dropIndex],
          `${location}, drop ${dropIndex + 1}`
        );
        if (dropError) return dropError;
      }
    }
  }

  return "";
}

function getSetSegmentError(segment, location) {
  const repsBlank = String(segment?.reps ?? "").trim() === "";
  if (repsBlank && !segment?.toFailure) {
    return `Enter a whole-number reps count for ${location}.`;
  }
  const reps = repsBlank ? 0 : Number(segment?.reps);
  if (!Number.isFinite(reps) || !Number.isInteger(reps) || reps < 0) {
    return `Enter a whole-number reps count for ${location}.`;
  }
  if (segment?.toFailure && String(segment.actualRepsAtFailure ?? "").trim() !== "") {
    const actualReps = Number(segment.actualRepsAtFailure);
    if (!Number.isFinite(actualReps) || !Number.isInteger(actualReps) || actualReps < 0) {
      return `Enter a whole-number actual failure count for ${location}.`;
    }
  }
  if (!LOAD_MODES.has(segment?.loadMode)) {
    return `Choose a valid load mode for ${location}.`;
  }
  if (segment.loadMode === "external") {
    const amount = Number(segment.weightAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return `Enter an external weight greater than zero for ${location}.`;
    }
    if (!WEIGHT_UNITS.has(segment.weightUnit)) {
      return `Choose lb or kg for ${location}.`;
    }
  }
  return "";
}

function completedSetSegment(segment, includeClassification = false) {
  const toFailure = Boolean(segment.toFailure);
  const actualRepsAtFailure = Number(segment.actualRepsAtFailure);
  const reps = String(segment.reps ?? "").trim() === "" && toFailure
    ? 0
    : Number(segment.reps);
  return {
    id: segment.id,
    reps,
    ...(includeClassification && segment.setType === "warm-up"
      ? { setType: "warm-up" }
      : {}),
    ...(toFailure
      ? {
          toFailure: true,
          actualRepsAtFailure:
            String(segment.actualRepsAtFailure ?? "").trim() === ""
              ? null
              : actualRepsAtFailure,
        }
      : {}),
    load:
      segment.loadMode === "bodyweight"
        ? { mode: "bodyweight" }
        : {
            mode: "external",
            amount: Number(segment.weightAmount),
            unit: segment.weightUnit,
          },
    notes: cleanText(segment.notes),
  };
}

export function createWorkoutEntry(draft, existingEntry = null, now = new Date()) {
  if (getWorkoutEntryError(draft)) return null;

  const timestamp = now.toISOString();
  const occurredAt = workoutLocalDateTimeToIso(draft.date, draft.time);
  const startedAt = existingEntry?.startedAt || draft.startedAt || occurredAt;
  const plannedWorkoutId = cleanText(
    existingEntry?.plannedWorkoutId || draft.plannedWorkoutId
  );
  return {
    schemaVersion: 1,
    type: "strength",
    title: cleanText(draft.title),
    occurredAt,
    ...(plannedWorkoutId ? { plannedWorkoutId } : {}),
    ...(!existingEntry || existingEntry.startedAt ? { startedAt } : {}),
    ...(!existingEntry
      ? { finishedAt: timestamp }
      : existingEntry.finishedAt
        ? { finishedAt: existingEntry.finishedAt }
        : {}),
    notes: cleanText(draft.notes),
    exercises: draft.exercises.map((exercise) => {
      const exerciseId = builtInExerciseId(exercise);
      return {
        id: exercise.id,
        name: cleanText(exercise.name),
        ...(exercise.roadmapStatus === "completed"
          ? { roadmapStatus: "completed" }
          : exercise.roadmapStatus === "skipped"
            ? {
                roadmapStatus: "skipped",
                roadmapSkipReason: cleanText(exercise.roadmapSkipReason),
              }
            : {}),
        ...(exerciseId ? { exerciseId } : {}),
        ...(exercise.exerciseReference
          ? { exerciseReference: { ...exercise.exerciseReference } }
          : {}),
        ...(cleanText(exercise.notes) ? { notes: cleanText(exercise.notes) } : {}),
        sets: exercise.roadmapStatus === "skipped" ? [] : exercise.sets.map((set) => {
          const completed = completedSetSegment(set, true);
          const drops = Array.isArray(set.drops) ? set.drops : [];
          return drops.length > 0
            ? { ...completed, drops: drops.map(completedSetSegment) }
            : completed;
        }),
      };
    }),
    createdAt: existingEntry?.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";

const LOAD_MODES = new Set(WORKOUT_LOAD_MODES.map(({ value }) => value));
const WEIGHT_UNITS = new Set(WORKOUT_WEIGHT_UNITS.map(({ value }) => value));

function meaningfulText(value) {
  return /[a-z0-9]/i.test(String(value || "").trim());
}

function cleanText(value) {
  return String(value || "").trim();
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
    if (!Array.isArray(exercise?.sets) || exercise.sets.length === 0) {
      return `Add at least one set to exercise ${exerciseIndex + 1}.`;
    }

    for (let setIndex = 0; setIndex < exercise.sets.length; setIndex += 1) {
      const set = exercise.sets[setIndex];
      const location = `exercise ${exerciseIndex + 1}, set ${setIndex + 1}`;
      const reps = Number(set?.reps);
      if (!Number.isFinite(reps) || !Number.isInteger(reps) || reps <= 0) {
        return `Enter positive whole-number reps for ${location}.`;
      }
      if (!LOAD_MODES.has(set?.loadMode)) {
        return `Choose a valid load mode for ${location}.`;
      }
      if (set.loadMode === "external") {
        const amount = Number(set.weightAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return `Enter an external weight greater than zero for ${location}.`;
        }
        if (!WEIGHT_UNITS.has(set.weightUnit)) {
          return `Choose lb or kg for ${location}.`;
        }
      }
    }
  }

  return "";
}

export function createWorkoutEntry(draft, existingEntry = null, now = new Date()) {
  if (getWorkoutEntryError(draft)) return null;

  const timestamp = now.toISOString();
  return {
    schemaVersion: 1,
    type: "strength",
    title: cleanText(draft.title),
    occurredAt: workoutLocalDateTimeToIso(draft.date, draft.time),
    notes: cleanText(draft.notes),
    exercises: draft.exercises.map((exercise) => ({
      id: exercise.id,
      name: cleanText(exercise.name),
      ...(exercise.exerciseReference
        ? { exerciseReference: { ...exercise.exerciseReference } }
        : {}),
      sets: exercise.sets.map((set) => ({
        id: set.id,
        reps: Number(set.reps),
        load:
          set.loadMode === "bodyweight"
            ? { mode: "bodyweight" }
            : {
                mode: "external",
                amount: Number(set.weightAmount),
                unit: set.weightUnit,
              },
        notes: cleanText(set.notes),
      })),
    })),
    createdAt: existingEntry?.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

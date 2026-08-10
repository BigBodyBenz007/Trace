import {
  WORKOUT_LOAD_MODES,
  WORKOUT_WEIGHT_UNITS,
} from "../constants/workoutOptions";
import { createWorkoutItemId } from "./workoutEntry";

export const SAVED_EXERCISES_STORAGE_KEY = "savedExercises";

const LOAD_MODES = new Set(WORKOUT_LOAD_MODES.map(({ value }) => value));
const WEIGHT_UNITS = new Set(WORKOUT_WEIGHT_UNITS.map(({ value }) => value));

function meaningfulText(value) {
  return /[a-z0-9]/i.test(String(value || "").trim());
}

export function normalizeExerciseName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function getExerciseDefinitionError(draft) {
  if (!meaningfulText(draft?.name)) return "Enter an exercise name.";
  if (!LOAD_MODES.has(draft?.defaultLoadMode)) {
    return "Choose a valid default load mode.";
  }
  if (
    draft.defaultLoadMode === "external" &&
    !WEIGHT_UNITS.has(draft.defaultWeightUnit)
  ) {
    return "Choose lb or kg as the default weight unit.";
  }
  return "";
}

export function createExerciseDefinition(draft, now = new Date()) {
  if (getExerciseDefinitionError(draft)) return null;
  const timestamp = now.toISOString();
  return {
    id: createWorkoutItemId("user-saved"),
    schemaVersion: 1,
    name: String(draft.name).trim().replace(/\s+/g, " "),
    defaults: {
      load:
        draft.defaultLoadMode === "bodyweight"
          ? { mode: "bodyweight" }
          : { mode: "external", unit: draft.defaultWeightUnit },
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function exerciseDefinitionsMatch(first, second) {
  return (
    first?.defaults?.load?.mode === second?.defaults?.load?.mode &&
    first?.defaults?.load?.unit === second?.defaults?.load?.unit
  );
}

export function addExerciseDefinition(exercises, definition) {
  if (!definition) {
    return {
      exercises,
      added: false,
      existingExercise: null,
      matchesDefinition: false,
    };
  }
  const normalizedName = normalizeExerciseName(definition.name);
  const existingExercise = exercises.find(
    (exercise) => normalizeExerciseName(exercise.name) === normalizedName
  );
  if (existingExercise) {
    return {
      exercises,
      added: false,
      existingExercise,
      matchesDefinition: exerciseDefinitionsMatch(
        existingExercise,
        definition
      ),
    };
  }
  return {
    exercises: [...exercises, definition],
    added: true,
    existingExercise: null,
    matchesDefinition: true,
  };
}

export function updateExerciseDefinition(
  exercises,
  id,
  draft,
  now = new Date()
) {
  const validationError = getExerciseDefinitionError(draft);
  if (validationError) {
    return { exercises, updatedExercise: null, error: validationError };
  }
  const existingExercise = exercises.find((exercise) => exercise.id === id);
  if (!existingExercise) {
    return {
      exercises,
      updatedExercise: null,
      error: "The saved exercise could not be found.",
    };
  }
  const normalizedName = normalizeExerciseName(draft.name);
  if (
    exercises.some(
      (exercise) =>
        exercise.id !== id &&
        normalizeExerciseName(exercise.name) === normalizedName
    )
  ) {
    return {
      exercises,
      updatedExercise: null,
      error: "Another saved exercise already uses that name.",
    };
  }

  const replacement = createExerciseDefinition(draft, now);
  const updatedExercise = {
    ...replacement,
    id: existingExercise.id,
    createdAt: existingExercise.createdAt,
    updatedAt: now.toISOString(),
  };
  return {
    exercises: exercises.map((exercise) =>
      exercise.id === id ? updatedExercise : exercise
    ),
    updatedExercise,
    error: "",
  };
}

export function readSavedExercises(storage) {
  const saved = storage.getItem(SAVED_EXERCISES_STORAGE_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed)) throw new Error("Invalid saved exercise data.");
  return parsed;
}

export function writeSavedExercises(storage, exercises) {
  storage.setItem(SAVED_EXERCISES_STORAGE_KEY, JSON.stringify(exercises));
}

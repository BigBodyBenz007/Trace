export const WORKOUT_DRAFT_STORAGE_KEY = "workoutDraft";
export const WORKOUT_DRAFT_SCHEMA_VERSION = 1;

export function readWorkoutDraft(storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem(WORKOUT_DRAFT_STORAGE_KEY));
    if (
      value?.schemaVersion !== WORKOUT_DRAFT_SCHEMA_VERSION ||
      !value.form ||
      !Array.isArray(value.form.exercises) ||
      typeof value.startedAt !== "string"
    ) {
      return null;
    }
    return value;
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

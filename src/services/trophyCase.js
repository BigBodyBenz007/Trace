import { deriveExercisePrs } from "./exercisePr";
import {
  describeExerciseRecord,
  getExerciseRecordSourceScope,
  snapshotExerciseRecord,
} from "./exerciseRecordDescriptor";

export const TROPHY_CASE_STORAGE_KEY = "trophyCaseEntries";
export const WORKOUT_PR_SOURCE_TYPE = "workout-pr";
export const MEMORY_SOURCE_TYPE = "memory";

export function createMemoryTrophyCandidate(memory) {
  const imageReferences = (Array.isArray(memory?.images) ? memory.images : [])
    .map((image) => (typeof image === "object" ? image?.id : null))
    .filter(Boolean);

  return {
    sourceType: MEMORY_SOURCE_TYPE,
    sourceKey: `${MEMORY_SOURCE_TYPE}|${memory.id}`,
    sourceId: memory.id,
    sourceRecordType: null,
    title: memory.title || "Untitled Memory",
    description: memory.description || "",
    achievedAt: memory.date ? `${memory.date}T12:00:00` : null,
    sourceSnapshot: {
      memoryId: memory.id,
      title: memory.title || "Untitled Memory",
      description: memory.description || "",
      date: memory.date || "",
      categories: Array.isArray(memory.categories) ? [...memory.categories] : [],
      imageReferences,
    },
    metadata: {
      categoryCount: Array.isArray(memory.categories) ? memory.categories.length : 0,
      photoCount: Array.isArray(memory.images) ? memory.images.length : 0,
    },
  };
}

function recordSourceKey(exercisePr, record) {
  return [
    WORKOUT_PR_SOURCE_TYPE,
    exercisePr.identityKey,
    record.recordType,
    getExerciseRecordSourceScope(record),
    record.workoutId,
    record.performanceId,
    record.setId || record.setIndex,
  ].join("|");
}

export function createWorkoutPrCandidate(exercisePr, record) {
  const { label, value } = describeExerciseRecord(record);

  return {
    sourceType: WORKOUT_PR_SOURCE_TYPE,
    sourceKey: recordSourceKey(exercisePr, record),
    sourceId: record.workoutId,
    sourceRecordType: record.recordType,
    title: exercisePr.displayName,
    description: `${label} · ${value}`,
    achievedAt: record.performedAt,
    sourceSnapshot: {
      exerciseIdentityKey: exercisePr.identityKey,
      exerciseName: exercisePr.displayName,
      recordLabel: label,
      recordValue: value,
      workoutId: record.workoutId,
      workoutTitle: record.workoutTitle,
      performanceId: record.performanceId,
      setId: record.setId,
      achievement: record.achievement || "new",
      ...snapshotExerciseRecord(record),
    },
    metadata: { exerciseSource: exercisePr.source },
  };
}

function refreshedEntry(entry, candidate) {
  return {
    ...entry,
    sourceType: candidate.sourceType,
    sourceKey: candidate.sourceKey,
    sourceId: candidate.sourceId || null,
    sourceRecordType: candidate.sourceRecordType || null,
    title: candidate.title,
    description: candidate.description || "",
    achievedAt: candidate.achievedAt || null,
    sourceSnapshot: { ...(candidate.sourceSnapshot || {}) },
    metadata: { ...(candidate.metadata || {}) },
  };
}

export function reconcileWorkoutTrophyEntries(entries, workoutEntries) {
  const candidatesBySourceKey = new Map();
  deriveExercisePrs(workoutEntries).forEach((exercisePr) => {
    Object.values(exercisePr.progression).flat().forEach((record) => {
      const candidate = createWorkoutPrCandidate(exercisePr, record);
      candidatesBySourceKey.set(candidate.sourceKey, candidate);
    });
  });

  let changed = false;
  const reconciled = entries.map((entry) => {
    if (entry.sourceType !== WORKOUT_PR_SOURCE_TYPE) return entry;
    const candidate = candidatesBySourceKey.get(entry.sourceKey);
    if (!candidate) return entry;
    const refreshed = refreshedEntry(entry, candidate);
    if (JSON.stringify(refreshed) === JSON.stringify(entry)) return entry;
    changed = true;
    return refreshed;
  });

  return changed ? reconciled : entries;
}

export function createCuratedTrophyEntry(candidate, { id, addedToTrophyCaseAt }) {
  return {
    schemaVersion: 1,
    id,
    sourceType: candidate.sourceType,
    sourceKey: candidate.sourceKey,
    sourceId: candidate.sourceId || null,
    sourceRecordType: candidate.sourceRecordType || null,
    title: candidate.title,
    description: candidate.description || "",
    achievedAt: candidate.achievedAt || null,
    addedToTrophyCaseAt,
    sourceSnapshot: { ...(candidate.sourceSnapshot || {}) },
    metadata: { ...(candidate.metadata || {}) },
  };
}

export function addCuratedTrophy(entries, candidate, options) {
  const existing = entries.find(({ sourceKey }) => sourceKey === candidate.sourceKey);
  if (existing) return { status: "duplicate", entries, entry: existing };
  const entry = createCuratedTrophyEntry(candidate, options);
  return { status: "added", entries: [...entries, entry], entry };
}

export function readTrophyCaseEntries(storage) {
  const raw = storage.getItem(TROPHY_CASE_STORAGE_KEY);
  if (!raw) return [];
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries)) throw new Error("Invalid Trophy Case data.");
  return entries.filter((entry) => entry && entry.id && entry.sourceType && entry.sourceKey);
}

export function writeTrophyCaseEntries(storage, entries) {
  storage.setItem(TROPHY_CASE_STORAGE_KEY, JSON.stringify(entries));
}

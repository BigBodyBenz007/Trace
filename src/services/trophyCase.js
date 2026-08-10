export const TROPHY_CASE_STORAGE_KEY = "trophyCaseEntries";
export const WORKOUT_PR_SOURCE_TYPE = "workout-pr";

function recordSourceKey(exercisePr, record) {
  return [
    WORKOUT_PR_SOURCE_TYPE,
    exercisePr.identityKey,
    record.recordType,
    record.unit || "bodyweight",
    record.workoutId,
    record.performanceId,
    record.setId || record.setIndex,
  ].join("|");
}

export function createWorkoutPrCandidate(exercisePr, record) {
  const isBodyweight = record.recordType === "bodyweight-reps";
  const label = isBodyweight ? "Bodyweight Rep Record" : "Heaviest Weight";
  const value = isBodyweight
    ? `${record.reps} reps`
    : `${record.weight} ${record.unit} × ${record.reps} reps`;

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
      reps: record.reps,
      ...(isBodyweight ? { loadMode: "bodyweight" } : { loadMode: "external", weight: record.weight, unit: record.unit }),
    },
    metadata: { exerciseSource: exercisePr.source },
  };
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

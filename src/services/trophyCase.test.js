import {
  TROPHY_CASE_STORAGE_KEY,
  addCuratedTrophy,
  createWorkoutPrCandidate,
  readTrophyCaseEntries,
  writeTrophyCaseEntries,
} from "./trophyCase";

function candidate(identityKey = "trace|trace:bench") {
  return createWorkoutPrCandidate(
    { identityKey, displayName: "Bench", source: identityKey.startsWith("trace|") ? "trace" : "saved" },
    {
      recordType: "heaviest-weight", workoutId: "workout", performanceId: "performance", setId: "set",
      performedAt: "2026-08-10T12:00:00.000Z", workoutTitle: "Chest Day", weight: 80, unit: "lb", reps: 8,
    }
  );
}

beforeEach(() => localStorage.clear());

test("creates a future-friendly workout PR snapshot and persists it", () => {
  const result = addCuratedTrophy([], candidate(), { id: "trophy", addedToTrophyCaseAt: "2026-08-11T12:00:00.000Z" });
  expect(result.entry).toMatchObject({
    schemaVersion: 1, sourceType: "workout-pr", sourceId: "workout", sourceRecordType: "heaviest-weight",
    title: "Bench", achievedAt: "2026-08-10T12:00:00.000Z", addedToTrophyCaseAt: "2026-08-11T12:00:00.000Z",
    sourceSnapshot: { exerciseIdentityKey: "trace|trace:bench", recordValue: "80 lb × 8 reps", workoutTitle: "Chest Day" },
  });
  writeTrophyCaseEntries(localStorage, result.entries);
  expect(readTrophyCaseEntries(localStorage)).toEqual(result.entries);
  expect(JSON.parse(localStorage.getItem(TROPHY_CASE_STORAGE_KEY))).toEqual(result.entries);
});

test("prevents the exact source achievement from being duplicated", () => {
  const first = addCuratedTrophy([], candidate(), { id: "first", addedToTrophyCaseAt: "2026-08-11T12:00:00.000Z" });
  const duplicate = addCuratedTrophy(first.entries, candidate(), { id: "second", addedToTrophyCaseAt: "2026-08-12T12:00:00.000Z" });
  expect(duplicate.status).toBe("duplicate");
  expect(duplicate.entries).toHaveLength(1);
});

test("keeps Saved and Trace identities distinct", () => {
  const trace = candidate("trace|trace:bench");
  const saved = candidate("saved|saved:bench");
  expect(trace.sourceKey).not.toBe(saved.sourceKey);
});

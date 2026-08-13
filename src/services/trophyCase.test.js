import {
  TROPHY_CASE_STORAGE_KEY,
  addCuratedTrophy,
  createWorkoutPrCandidate,
  createMemoryTrophyCandidate,
  readTrophyCaseEntries,
  reconcileWorkoutTrophyEntries,
  writeTrophyCaseEntries,
} from "./trophyCase";
import { deriveExercisePrs } from "./exercisePr";

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

test("workout drops create no Trophy candidates and leave parent source identity unchanged", () => {
  const workouts = [{
    id: "workout",
    title: "Drop Day",
    occurredAt: "2026-08-10T12:00:00.000Z",
    exercises: [{
      id: "exercise",
      name: "Bench",
      exerciseId: "trace:bench",
      sets: [{
        id: "set",
        reps: 8,
        load: { mode: "external", amount: 80, unit: "lb" },
        notes: "",
        drops: [{ id: "drop", reps: 20, load: { mode: "external", amount: 120, unit: "lb" }, notes: "" }],
      }],
    }],
  }];
  const events = Object.values(deriveExercisePrs(workouts)[0].progression).flat();
  const candidates = events.map((record) => createWorkoutPrCandidate(deriveExercisePrs(workouts)[0], record));
  expect(candidates.length).toBeGreaterThan(0);
  expect(candidates.every(({ sourceKey, sourceSnapshot }) => sourceKey.includes("|set") && sourceSnapshot.setId === "set")).toBe(true);
  expect(candidates.every(({ sourceKey }) => !sourceKey.includes("|drop|"))).toBe(true);
});

test("keeps Saved and Trace identities distinct", () => {
  const trace = candidate("trace|trace:bench");
  const saved = candidate("saved|saved:bench");
  expect(trace.sourceKey).not.toBe(saved.sourceKey);
});

test("creates a correctly labeled reps-at-weight trophy snapshot", () => {
  const repsCandidate = createWorkoutPrCandidate(
    { identityKey: "trace|trace:bench", displayName: "Bench", source: "trace" },
    {
      recordType: "reps-at-weight",
      achievement: "matched",
      workoutId: "workout-2",
      performanceId: "performance-2",
      setId: "set-2",
      performedAt: "2026-08-12T12:00:00.000Z",
      workoutTitle: "Volume Day",
      weight: 80,
      unit: "lb",
      reps: 12,
    }
  );
  const result = addCuratedTrophy([], repsCandidate, {
    id: "reps-trophy",
    addedToTrophyCaseAt: "2026-08-13T12:00:00.000Z",
  });

  expect(result.entry).toMatchObject({
    sourceRecordType: "reps-at-weight",
    description: "Reps at Weight · 80 lb × 12 reps",
    sourceSnapshot: {
      recordLabel: "Reps at Weight",
      recordValue: "80 lb × 12 reps",
      achievement: "matched",
      workoutId: "workout-2",
      performanceId: "performance-2",
      setId: "set-2",
    },
  });
});

test("refreshes only resolvable workout trophies and preserves curated membership", () => {
  const original = createWorkoutPrCandidate(
    { identityKey: "trace|trace:bench", displayName: "Bench", source: "trace" },
    {
      recordType: "heaviest-weight",
      workoutId: "workout",
      performanceId: "workout|exercise|0",
      setId: "set",
      performedAt: "2026-08-10T12:00:00.000Z",
      workoutTitle: "Chest Day",
      weight: 80,
      unit: "lb",
      reps: 8,
    }
  );
  const curated = addCuratedTrophy([], original, {
    id: "trophy",
    addedToTrophyCaseAt: "2026-08-11T12:00:00.000Z",
  }).entry;
  const memory = addCuratedTrophy([], createMemoryTrophyCandidate({
    id: "memory",
    title: "Unrelated",
  }), {
    id: "memory-trophy",
    addedToTrophyCaseAt: "2026-08-11T12:00:00.000Z",
  }).entry;
  const correctedWorkouts = [{
    id: "workout",
    title: "Corrected Chest Day",
    occurredAt: "2026-08-10T12:00:00.000Z",
    exercises: [{
      id: "exercise",
      name: "Bench",
      exerciseId: "trace:bench",
      sets: [{ id: "set", reps: 16, load: { mode: "external", amount: 80, unit: "lb" }, notes: "" }],
    }],
  }];

  const reconciled = reconcileWorkoutTrophyEntries([curated, memory], correctedWorkouts);
  expect(reconciled[0]).toMatchObject({
    id: "trophy",
    addedToTrophyCaseAt: "2026-08-11T12:00:00.000Z",
    title: "Bench",
    sourceSnapshot: {
      recordValue: "80 lb × 16 reps",
      workoutTitle: "Corrected Chest Day",
      workoutId: "workout",
      setId: "set",
    },
  });
  expect(reconciled[1]).toBe(memory);
  expect(reconcileWorkoutTrophyEntries(reconciled, [])).toBe(reconciled);
});

test("creates lightweight Memory candidates from stable identity", () => {
  const candidate = createMemoryTrophyCandidate({
    id: "memory-1",
    title: "Graduation Day",
    description: "Finally finished my degree.",
    date: "2026-05-18",
    categories: ["Achievement", "Family"],
    images: [
      { id: "photo-1", url: "blob:large-photo" },
      "data:image/jpeg;base64,very-large-legacy-photo",
    ],
  });
  expect(candidate).toMatchObject({
    sourceType: "memory",
    sourceKey: "memory|memory-1",
    sourceId: "memory-1",
    title: "Graduation Day",
    description: "Finally finished my degree.",
    sourceSnapshot: {
      memoryId: "memory-1",
      date: "2026-05-18",
      categories: ["Achievement", "Family"],
      imageReferences: ["photo-1"],
    },
    metadata: { categoryCount: 2, photoCount: 2 },
  });
  expect(JSON.stringify(candidate)).not.toContain("blob:large-photo");
  expect(JSON.stringify(candidate)).not.toContain("base64");
});

test("different Memories with identical text remain distinct", () => {
  const first = createMemoryTrophyCandidate({ id: "memory-a", title: "Graduation", description: "Done" });
  const second = createMemoryTrophyCandidate({ id: "memory-b", title: "Graduation", description: "Done" });
  expect(first.sourceKey).not.toBe(second.sourceKey);
});

import { resolveMemoryTrophySource, resolveWorkoutTrophySource } from "./trophySourceNavigation";

const workout = { id: "w1", title: "Push", occurredAt: "2026-01-01T12:00:00Z", exercises: [{ id: "e1", name: "Bench Press", exerciseId: "trace:bench-press", sets: [{ id: "s1", reps: 5, load: { mode: "external", amount: 100, unit: "lb" } }] }] };

test("resolves Memory identity and rejects missing sources", () => {
  expect(resolveMemoryTrophySource({ sourceType: "memory", sourceId: "m1" }, [{ id: "m1" }])).toEqual({ memoryId: "m1" });
  expect(resolveMemoryTrophySource({ sourceType: "memory", sourceId: "gone" }, [{ id: "m1" }])).toBeNull();
});

test("uses stable set identity across performance-position changes", () => {
  const entry = { sourceType: "workout-pr", sourceId: "w1", sourceSnapshot: { setId: "s1", performanceId: "stale", exerciseIdentityKey: "stale" } };
  expect(resolveWorkoutTrophySource(entry, [workout])).toMatchObject({ workoutId: "w1", exerciseIdentityKey: "trace|trace:bench-press", setId: "s1" });
});

test("uses safe performance and exercise fallbacks but rejects materially missing sources", () => {
  const performanceId = "w1|e1|0";
  expect(resolveWorkoutTrophySource({ sourceType: "workout-pr", sourceId: "w1", sourceSnapshot: { performanceId } }, [workout])).toMatchObject({ performanceId });
  expect(resolveWorkoutTrophySource({ sourceType: "workout-pr", sourceId: "w1", sourceSnapshot: { exerciseIdentityKey: "trace|trace:bench-press" } }, [workout])).toMatchObject({ workoutId: "w1" });
  expect(resolveWorkoutTrophySource({ sourceType: "workout-pr", sourceId: "w1", sourceSnapshot: { setId: "gone" } }, [workout])).toBeNull();
  expect(resolveWorkoutTrophySource({ sourceType: "workout-pr", sourceId: "gone", sourceSnapshot: {} }, [workout])).toBeNull();
});

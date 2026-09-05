import {
  elapsedWorkoutMinutes,
  formatWorkoutDuration,
  isValidWorkoutDurationMinutes,
  resolveWorkoutCalorieDuration,
  workoutDurationMilliseconds,
} from "./workoutDuration";

test.each([
  ["2026-08-09T18:00:00.000Z", "2026-08-09T18:45:00.000Z", "45 min"],
  ["2026-08-09T18:50:00.000Z", "2026-08-09T19:55:00.000Z", "1 hr 5 min"],
  ["2026-08-09T23:30:00.000Z", "2026-08-10T01:42:00.000Z", "2 hr 12 min"],
])("formats elapsed duration across boundaries", (start, finish, expected) => {
  expect(formatWorkoutDuration(start, finish)).toBe(expected);
});

test.each([
  [undefined, "2026-08-09T18:00:00.000Z"],
  [null, "2026-08-09T18:00:00.000Z"],
  ["invalid", "2026-08-09T18:00:00.000Z"],
  ["2026-08-09T19:00:00.000Z", "2026-08-09T18:00:00.000Z"],
])("safely rejects missing, invalid, or negative timing", (start, finish) => {
  expect(workoutDurationMilliseconds(start, finish)).toBeNull();
  expect(formatWorkoutDuration(start, finish)).toBeNull();
});

test("calculates rounded elapsed minutes without allowing a zero-minute workout", () => {
  expect(elapsedWorkoutMinutes(
    "2026-09-01T15:00:00.000Z",
    new Date("2026-09-01T15:42:29.000Z")
  )).toBe(42);
  expect(elapsedWorkoutMinutes(
    "2026-09-01T15:00:00.000Z",
    new Date("2026-09-01T15:00:10.000Z")
  )).toBe(1);
  expect(elapsedWorkoutMinutes("invalid", new Date())).toBeNull();
});

test("calorie duration prefers a valid entered duration over recorded elapsed time", () => {
  expect(resolveWorkoutCalorieDuration({
    activeDurationMinutes: 60,
    startedAt: "2026-09-04T22:39:55.000Z",
    finishedAt: "2026-09-04T22:41:07.000Z",
  })).toEqual({ minutes: 60, source: "entered" });
  expect(resolveWorkoutCalorieDuration({
    activeDurationMinutes: 42.5,
    startedAt: "2026-09-04T22:39:55.000Z",
    finishedAt: "2026-09-04T22:41:07.000Z",
  })).toEqual({ minutes: 42.5, source: "entered" });
});

test.each([undefined, "", null, 0, -5, Number.NaN, Number.POSITIVE_INFINITY, "60"])(
  "calorie duration falls back from invalid entered value %p to recorded elapsed time",
  (activeDurationMinutes) => {
    expect(resolveWorkoutCalorieDuration({
      activeDurationMinutes,
      startedAt: "2026-09-04T22:39:55.000Z",
      finishedAt: "2026-09-04T22:41:07.000Z",
    })).toEqual({ minutes: 1, source: "recorded" });
  }
);

test("calorie duration remains unknown when neither source is valid", () => {
  expect(resolveWorkoutCalorieDuration({ activeDurationMinutes: 0 }))
    .toEqual({ minutes: null, source: null });
  expect(isValidWorkoutDurationMinutes(-0)).toBe(false);
});

import {
  elapsedWorkoutMinutes,
  formatWorkoutDuration,
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

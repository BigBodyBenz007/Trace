import {
  deriveAgeOnDate,
  resolveHistoricalBodyWeight,
} from "./workoutEstimateInputs";

test.each([
  ["1990-08-30", "2026-08-29T18:00:00.000Z", 35],
  ["1990-08-30", "2026-08-30T18:00:00.000Z", 36],
  ["2000-02-29", "2025-02-28", 24],
  ["2000-02-29", "2025-03-01", 25],
])("derives age from %s on workout date %s", (dateOfBirth, workoutDate, expected) => {
  expect(deriveAgeOnDate(dateOfBirth, workoutDate)).toBe(expected);
});

test("returns no age for missing, invalid, or pre-birth workout dates", () => {
  expect(deriveAgeOnDate("", "2026-08-30")).toBeNull();
  expect(deriveAgeOnDate("2000-02-30", "2026-08-30")).toBeNull();
  expect(deriveAgeOnDate("2000-08-30", "1999-08-30")).toBeNull();
  expect(deriveAgeOnDate("2000-08-30", "not-a-date")).toBeNull();
});

test("selects the newest valid weight at or before the workout and converts lb to kg", () => {
  const result = resolveHistoricalBodyWeight([
    { id: "old", occurredAt: "2026-08-01T08:00:00.000Z", measurements: { weight: { value: 220, unit: "lb" } } },
    { id: "waist-only", occurredAt: "2026-08-20T08:00:00.000Z", measurements: { waist: { value: 40, unit: "in" } } },
    { id: "newest", occurredAt: "2026-08-25T08:00:00.000Z", measurements: { weight: { value: 97.5, unit: "kg" }, bodyFat: { value: 20, unit: "%" } } },
  ], "2026-08-30T18:00:00.000Z");

  expect(result).toEqual({ value: 97.5, unit: "kg", sourceEntryId: "newest" });
  expect(resolveHistoricalBodyWeight([
    { id: "imperial", occurredAt: "2026-08-01T08:00:00.000Z", measurements: { weight: { value: 220, unit: "lb" } } },
  ], "2026-08-30T18:00:00.000Z")).toEqual({
    value: 220 * 0.45359237,
    unit: "kg",
    sourceEntryId: "imperial",
  });
});

test("excludes future, malformed, and unsupported weight measurements", () => {
  const entries = [
    { id: "invalid", occurredAt: "2026-08-20T08:00:00.000Z", measurements: { weight: { value: -1, unit: "kg" } } },
    { id: "unsupported", occurredAt: "2026-08-21T08:00:00.000Z", measurements: { weight: { value: 14, unit: "stone" } } },
    { id: "future", occurredAt: "2026-09-01T08:00:00.000Z", measurements: { weight: { value: 90, unit: "kg" } } },
  ];
  expect(resolveHistoricalBodyWeight(entries, "2026-08-30T18:00:00.000Z")).toBeNull();
  expect(resolveHistoricalBodyWeight(entries, "not-a-workout-date")).toBeNull();
});

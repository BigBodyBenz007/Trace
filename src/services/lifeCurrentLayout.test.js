import {
  deriveLifeCurrentLayout,
  LIFE_CURRENT_LAYOUT_TUNING,
} from "./lifeCurrentLayout";

function bucket(dateKey, intensity = 0.5, rawActivity = 1) {
  return {
    dateKey,
    intensity,
    rawActivity,
    contributions: {
      memory: { count: 1, value: 1, sourceIds: [`memory-${dateKey}`] },
    },
  };
}

function layout(dateKeys) {
  return deriveLifeCurrentLayout({ days: dateKeys.map((dateKey) => bucket(dateKey)) });
}

function addUtcDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

function gapForDays(days) {
  const result = layout(["2000-01-01", addUtcDays("2000-01-01", days)]);
  return result.points[1].visualGapFromPrevious;
}

test("returns deterministic empty points and bounds", () => {
  expect(deriveLifeCurrentLayout()).toEqual({
    points: [],
    bounds: {
      earliestDateKey: null,
      latestDateKey: null,
      minX: 0,
      maxX: 0,
      span: 0,
    },
  });
  expect(deriveLifeCurrentLayout({ days: [{ dateKey: "invalid" }] })).toEqual(
    deriveLifeCurrentLayout()
  );
});

test("places a single populated day at the logical and normalized origin", () => {
  const result = layout(["2026-08-11"]);
  expect(result.points).toEqual([
    expect.objectContaining({
      dateKey: "2026-08-11",
      x: 0,
      normalizedX: 0,
      elapsedDaysFromPrevious: 0,
      visualGapFromPrevious: 0,
    }),
  ]);
  expect(result.bounds).toEqual({
    earliestDateKey: "2026-08-11",
    latestDateKey: "2026-08-11",
    minX: 0,
    maxX: 0,
    span: 0,
  });
});

test("sorts shuffled days chronologically with strictly increasing positions", () => {
  const result = layout(["2026-08-20", "2026-08-01", "2026-08-02", "2026-09-01"]);
  expect(result.points.map(({ dateKey }) => dateKey)).toEqual([
    "2026-08-01",
    "2026-08-02",
    "2026-08-20",
    "2026-09-01",
  ]);
  result.points.slice(1).forEach((point, index) => {
    expect(point.x).toBeGreaterThan(result.points[index].x);
    expect(point.visualGapFromPrevious).toBeGreaterThanOrEqual(
      LIFE_CURRENT_LAYOUT_TUNING.minimumGap
    );
  });
});

test("guarantees minimum separation for consecutive populated days", () => {
  const result = layout(["2026-08-11", "2026-08-12"]);
  expect(result.points[1]).toMatchObject({
    elapsedDaysFromPrevious: 1,
    visualGapFromPrevious: LIFE_CURRENT_LAYOUT_TUNING.minimumGap,
    x: LIFE_CURRENT_LAYOUT_TUNING.minimumGap,
  });
});

test("larger elapsed intervals expand until the bounded visual gap", () => {
  const oneDay = gapForDays(1);
  const sevenDays = gapForDays(7);
  const thirtyDays = gapForDays(30);
  const oneYear = gapForDays(365);
  const tenYears = gapForDays(3650);
  expect(oneDay).toBeLessThan(sevenDays);
  expect(sevenDays).toBeLessThan(thirtyDays);
  expect(thirtyDays).toBe(LIFE_CURRENT_LAYOUT_TUNING.maximumGap);
  expect(oneYear).toBe(LIFE_CURRENT_LAYOUT_TUNING.maximumGap);
  expect(tenYears).toBe(LIFE_CURRENT_LAYOUT_TUNING.maximumGap);
});

test("long empty periods cannot collapse the remaining activity range", () => {
  const oneYear = gapForDays(365);
  const tenYears = gapForDays(3650);
  const thirtyYears = gapForDays(10950);
  expect(oneYear).toBe(LIFE_CURRENT_LAYOUT_TUNING.maximumGap);
  expect(tenYears).toBe(oneYear);
  expect(thirtyYears).toBe(oneYear);
});

test("uses calendar-safe day arithmetic across month and year boundaries", () => {
  const result = layout([
    "2023-12-31",
    "2024-01-01",
    "2024-02-28",
    "2024-02-29",
    "2024-03-01",
  ]);
  expect(result.points.map(({ elapsedDaysFromPrevious }) => elapsedDaysFromPrevious)).toEqual([
    0,
    1,
    58,
    1,
    1,
  ]);
});

test("DST-adjacent local date keys remain exactly one calendar day apart", () => {
  const spring = layout(["2026-03-07", "2026-03-08", "2026-03-09"]);
  const autumn = layout(["2026-10-31", "2026-11-01", "2026-11-02"]);
  expect(spring.points.map(({ elapsedDaysFromPrevious }) => elapsedDaysFromPrevious)).toEqual([0, 1, 1]);
  expect(autumn.points.map(({ elapsedDaysFromPrevious }) => elapsedDaysFromPrevious)).toEqual([0, 1, 1]);
});

test("accumulates compressed intervals rather than transforming absolute epochs", () => {
  const result = layout(["1998-01-01", "2010-01-01", "2010-01-02"]);
  const firstGap = result.points[1].visualGapFromPrevious;
  const secondGap = result.points[2].visualGapFromPrevious;
  expect(result.points[0].x).toBe(0);
  expect(firstGap).toBeGreaterThan(secondGap);
  expect(result.points[2].x).toBeCloseTo(firstGap + secondGap);
});

test("adding backdated history establishes a new dynamic origin", () => {
  const original = layout(["2010-01-01", "2020-01-01"]);
  const extended = layout(["2010-01-01", "2020-01-01", "2000-01-01"]);
  expect(original.points[0]).toMatchObject({ dateKey: "2010-01-01", x: 0 });
  expect(extended.points[0]).toMatchObject({ dateKey: "2000-01-01", x: 0 });
  expect(extended.points.map(({ dateKey }) => dateKey)).toEqual([
    "2000-01-01",
    "2010-01-01",
    "2020-01-01",
  ]);
  expect(extended.points[1].x).toBeGreaterThan(0);
  expect(extended.bounds.earliestDateKey).toBe("2000-01-01");
});

test("normalizes first and last points and keeps intermediates within range", () => {
  const result = layout(["2020-01-01", "2020-01-02", "2021-01-01", "2030-01-01"]);
  expect(result.points[0].normalizedX).toBe(0);
  expect(result.points[result.points.length - 1].normalizedX).toBe(1);
  result.points.forEach(({ normalizedX }) => {
    expect(normalizedX).toBeGreaterThanOrEqual(0);
    expect(normalizedX).toBeLessThanOrEqual(1);
  });
  expect(result.points[1].normalizedX).toBeLessThan(result.points[2].normalizedX);
});

test("activity magnitude does not affect temporal coordinates", () => {
  const dates = ["2020-01-01", "2020-02-01", "2030-01-01"];
  const quiet = deriveLifeCurrentLayout({
    days: dates.map((dateKey) => bucket(dateKey, 0.01, 0.01)),
  });
  const dense = deriveLifeCurrentLayout({
    days: dates.map((dateKey) => bucket(dateKey, 0.99, 20)),
  });
  const geometry = ({ dateKey, x, normalizedX, elapsedDaysFromPrevious, visualGapFromPrevious }) => ({
    dateKey,
    x,
    normalizedX,
    elapsedDaysFromPrevious,
    visualGapFromPrevious,
  });
  expect(dense.points.map(geometry)).toEqual(quiet.points.map(geometry));
  expect(dense.points[0].intensity).not.toBe(quiet.points[0].intensity);
});

test("represents sparse empty months and decades without materializing empty dates", () => {
  const result = layout(["1960-01-01", "1960-07-01", "2020-01-01"]);
  expect(result.points).toHaveLength(3);
  expect(result.points[1].elapsedDaysFromPrevious).toBe(182);
  expect(result.points[2].elapsedDaysFromPrevious).toBeGreaterThan(20000);
  expect(result.bounds.span).toBe(result.points[2].x);
});

test("canonicalizes accidental duplicate date buckets deterministically", () => {
  const result = deriveLifeCurrentLayout({
    days: [bucket("2026-01-01", 0.2, 1), bucket("2026-01-01", 0.8, 3)],
  });
  expect(result.points).toHaveLength(1);
  expect(result.points[0]).toMatchObject({ intensity: 0.8, rawActivity: 3, x: 0 });
});

test("does not mutate Phase 1 output or nested contribution data", () => {
  const input = {
    days: [bucket("2026-01-02"), bucket("2026-01-01")],
    bounds: { earliestDateKey: "2026-01-01", latestDateKey: "2026-01-02" },
    unbucketed: { memories: [{ sourceId: "undated" }] },
  };
  const before = JSON.parse(JSON.stringify(input));
  deriveLifeCurrentLayout(input);
  expect(input).toEqual(before);
});

test("is deterministic across repeated and shuffled input", () => {
  const days = [bucket("2026-08-11"), bucket("1990-01-01"), bucket("2035-12-31")];
  const first = deriveLifeCurrentLayout({ days });
  expect(deriveLifeCurrentLayout({ days })).toEqual(first);
  expect(deriveLifeCurrentLayout({ days: [...days].reverse() })).toEqual(first);
});

test("lays out a century of populated monthly buckets without pathological complexity", () => {
  const days = [];
  for (let year = 1940; year <= 2040; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      days.push(bucket(`${year}-${String(month).padStart(2, "0")}-15`));
    }
  }
  const startedAt = Date.now();
  const result = deriveLifeCurrentLayout({ days: [...days].reverse() });
  const elapsed = Date.now() - startedAt;
  expect(result.points).toHaveLength(101 * 12);
  expect(result.points[0].dateKey).toBe("1940-01-15");
  expect(result.points[result.points.length - 1].dateKey).toBe("2040-12-15");
  expect(elapsed).toBeLessThan(5000);
});

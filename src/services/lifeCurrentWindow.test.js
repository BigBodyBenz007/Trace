import { deriveLifeCurrentLayout } from "./lifeCurrentLayout";
import { deriveLifeCurrentCameraWindow, deriveLifeCurrentWindow } from "./lifeCurrentWindow";

const layout = deriveLifeCurrentLayout({
  days: [
    { dateKey: "1996-01-01", rawActivity: 1, intensity: 0.3 },
    { dateKey: "1998-12-20", rawActivity: 1, intensity: 0.3 },
    { dateKey: "1999-04-10", rawActivity: 2, intensity: 0.5 },
    { dateKey: "1999-11-01", rawActivity: 1, intensity: 0.3 },
    { dateKey: "2005-06-01", rawActivity: 1, intensity: 0.3 },
    { dateKey: "2026-01-01", rawActivity: 1, intensity: 0.3 },
  ],
});

test("projects a calendar year from the authoritative layout without mutating it", () => {
  const before = JSON.stringify(layout);
  const window = deriveLifeCurrentWindow(layout, {
    startDateKey: "1999-01-01",
    endDateKey: "1999-12-31",
  });
  expect(window.bounds.earliestDateKey).toBe("1999-01-01");
  expect(window.bounds.latestDateKey).toBe("1999-12-31");
  expect(window.points.map(({ dateKey }) => dateKey)).toEqual([
    "1999-01-01", "1999-04-10", "1999-11-01", "1999-12-31",
  ]);
  expect(window.points[0].normalizedX).toBe(0);
  expect(window.points.at(-1).normalizedX).toBe(1);
  expect(window.bounds.span).toBeLessThan(layout.bounds.span);
  expect(JSON.stringify(layout)).toBe(before);
});

test("adds interpolated boundaries to preserve continuity", () => {
  const window = deriveLifeCurrentWindow(layout, {
    startDateKey: "1999-02-01",
    endDateKey: "1999-08-01",
  });
  expect(window.points[0]).toEqual(expect.objectContaining({ dateKey: "1999-02-01", boundary: true }));
  expect(window.points.at(-1)).toEqual(expect.objectContaining({ dateKey: "1999-08-01", boundary: true }));
  expect(window.points.some(({ dateKey }) => dateKey === "1999-04-10")).toBe(true);
});

test("expands a single-day result to a deterministic minimum window", () => {
  const window = deriveLifeCurrentWindow(layout, {
    startDateKey: "1999-04-10",
    endDateKey: "1999-04-10",
    minimumWindowDays: 90,
  });
  expect(window.bounds.earliestDateKey).toBe("1999-02-24");
  expect(window.bounds.latestDateKey).toBe("1999-05-25");
  expect(window.points[0].normalizedX).toBe(0);
  expect(window.points.at(-1).normalizedX).toBe(1);
});

test("uses padded earliest and latest bounds for multi-year matches", () => {
  const window = deriveLifeCurrentWindow(layout, {
    startDateKey: "1999-04-10",
    endDateKey: "2005-06-01",
    paddingDays: 30,
  });
  expect(window.bounds.earliestDateKey).toBe("1999-03-11");
  expect(window.bounds.latestDateKey).toBe("2005-07-01");
});

test("moves a bounded camera through one authoritative range", () => {
  const early = deriveLifeCurrentCameraWindow(layout, {
    rangeStartDateKey: "1999-01-01",
    rangeEndDateKey: "1999-12-31",
    anchorDateKey: "1999-02-01",
    windowDays: 120,
  });
  const late = deriveLifeCurrentCameraWindow(layout, {
    rangeStartDateKey: "1999-01-01",
    rangeEndDateKey: "1999-12-31",
    anchorDateKey: "1999-12-20",
    windowDays: 120,
  });
  expect(early.bounds.earliestDateKey).toBe("1999-01-01");
  expect(late.bounds.latestDateKey).toBe("1999-12-31");
  expect(early.bounds.minX).toBeLessThan(late.bounds.minX);
  expect(early.points).not.toEqual(late.points);
});

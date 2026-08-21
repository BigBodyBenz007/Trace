import {
  locateRiverSection,
  neighboringRiverSectionIndexes,
  RIVER_SECTIONS,
} from "./riverSections";

test("keeps the approved River landscape sequence fixed and independent of Memories", () => {
  expect(RIVER_SECTIONS.map(({ id }) => id)).toEqual([
    "quiet-narrow",
    "gentle-rise",
    "high-calm",
    "broad-living",
    "lively-current",
    "gradual-descent",
  ]);
  expect(RIVER_SECTIONS.every(({ sources }) =>
    sources.avif.small && sources.avif.large &&
    sources.webp.small && sources.webp.large
  )).toBe(true);
});

test("maps scroll progress through variable-width sections without gaps", () => {
  expect(locateRiverSection(-1)).toEqual({ index: 0, localProgress: 0 });
  expect(locateRiverSection(0)).toEqual({ index: 0, localProgress: 0 });
  expect(locateRiverSection(0.5).index).toBe(3);
  expect(locateRiverSection(1)).toEqual({ index: 5, localProgress: 1 });
  [0, 0.1, 0.25, 0.5, 0.75, 0.999, 1].forEach((progress) => {
    const located = locateRiverSection(progress);
    expect(located.index).toBeGreaterThanOrEqual(0);
    expect(located.index).toBeLessThan(RIVER_SECTIONS.length);
    expect(located.localProgress).toBeGreaterThanOrEqual(0);
    expect(located.localProgress).toBeLessThanOrEqual(1);
  });
});

test("returns only the current and adjacent section indexes", () => {
  expect(neighboringRiverSectionIndexes(0)).toEqual([0, 1]);
  expect(neighboringRiverSectionIndexes(3)).toEqual([2, 3, 4]);
  expect(neighboringRiverSectionIndexes(5)).toEqual([4, 5]);
});

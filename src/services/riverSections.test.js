import {
  locateRiverSection,
  nearbyRiverSectionIndexes,
  neighboringRiverSectionIndexes,
  resolveRiverSections,
  RIVER_FALLBACK_SECTIONS,
  RIVER_SECTIONS,
} from "./riverSections";
import { buildRiverSequence, selectRiverSection } from "./riverCatalog";

test("keeps the approved River landscape sequence fixed and independent of Memories", () => {
  expect(RIVER_SECTIONS.map(({ id }) => id)).toEqual([
    "mountain-headwaters",
    "narrow-calm",
    "narrow-rocky-whitewater",
    "rising-narrow-to-broad",
    "medium-calm-bend",
    "broad-calm",
    "medium-active-s-bend",
    "broad-energetic-whitewater",
    "medium-whitewater-descent",
    "descending-broad-to-rapids",
    "recovery-pool",
  ]);
  expect(RIVER_SECTIONS.every(({ sources }) => sources.png)).toBe(true);
});

test("keeps both banks in frame without oversized or vertically shifted images", () => {
  RIVER_SECTIONS.forEach(({ crop, mobileWeight, sources, weight }) => {
    const sourceAspectRatio = sources.largeWidth / sources.largeHeight;
    expect(crop.height).toBe("100%");
    expect(crop.top).toBe("0%");
    expect(weight / 260).toBeLessThanOrEqual(sourceAspectRatio);
    expect(mobileWeight / 260).toBeLessThanOrEqual(sourceAspectRatio);
  });
});

test("maps scroll progress through variable-width sections without gaps", () => {
  expect(locateRiverSection(-1)).toEqual({ index: 0, localProgress: 0 });
  expect(locateRiverSection(0)).toEqual({ index: 0, localProgress: 0 });
  expect(locateRiverSection(0.5).index).toBe(6);
  expect(locateRiverSection(1)).toEqual({ index: 10, localProgress: 1 });
  [0, 0.1, 0.25, 0.5, 0.75, 0.999, 1].forEach((progress) => {
    const located = locateRiverSection(progress);
    expect(located.index).toBeGreaterThanOrEqual(0);
    expect(located.index).toBeLessThan(RIVER_SECTIONS.length);
    expect(located.localProgress).toBeGreaterThanOrEqual(0);
    expect(located.localProgress).toBeLessThanOrEqual(1);
  });
});

test("progresses from the mountain opener into the original first River section", () => {
  const totalProgressWeight = RIVER_SECTIONS.reduce(
    (total, section) => total + (section.progressWeight ?? section.weight),
    0
  );
  const openerEnd = RIVER_SECTIONS[0].progressWeight / totalProgressWeight;

  expect(locateRiverSection(openerEnd / 2).index).toBe(0);
  expect(locateRiverSection(openerEnd)).toEqual({ index: 1, localProgress: 0 });
  expect(RIVER_SECTIONS[1].id).toBe("narrow-calm");
  expect(RIVER_SECTIONS[1].join).toEqual({ desktop: 220, mobile: 160 });
});

test("returns only the current and adjacent section indexes", () => {
  expect(neighboringRiverSectionIndexes(0)).toEqual([0, 1]);
  expect(neighboringRiverSectionIndexes(3)).toEqual([2, 3, 4]);
  expect(neighboringRiverSectionIndexes(10)).toEqual([9, 10]);
});

test("adds only the next-nearest section needed to cover a wide viewport", () => {
  expect(nearbyRiverSectionIndexes(0, 390)).toEqual([0, 1]);
  expect(nearbyRiverSectionIndexes(0, 1160)).toEqual([0, 1, 2]);
  expect(nearbyRiverSectionIndexes(5, 1160)).toEqual([4, 5, 6]);
  expect(nearbyRiverSectionIndexes(10, 1160)).toEqual([9, 10]);
});

test("keeps the original six-section River as the invalid-catalog fallback", () => {
  expect(RIVER_FALLBACK_SECTIONS.map(({ id }) => id)).toEqual([
    "quiet-narrow",
    "gentle-rise",
    "high-calm",
    "broad-living",
    "lively-current",
    "gradual-descent",
  ]);
  expect(resolveRiverSections([])).toBe(RIVER_FALLBACK_SECTIONS);
  expect(resolveRiverSections([{ id: "incomplete" }])).toBe(RIVER_FALLBACK_SECTIONS);
});

test("preserves density, activity, mood, direction, recovery, and repetition scoring", () => {
  const energetic = selectRiverSection({
    activity: "high",
    density: "high",
    direction: "rising",
    mood: "steady",
  }, RIVER_SECTIONS.find(({ id }) => id === "medium-active-s-bend"));
  expect(energetic.id).toBe("broad-energetic-whitewater");

  const recovery = selectRiverSection({
    activity: "high",
    density: "medium",
    direction: "level",
    mood: "recovery",
  });
  expect(recovery.id).toBe("recovery-pool");

  const repeatedDescent = RIVER_SECTIONS.find(
    ({ id }) => id === "medium-whitewater-descent"
  );
  expect(selectRiverSection({
    activity: "high",
    density: "medium",
    direction: "descending",
    mood: "steady",
  }, repeatedDescent).id).toBe("descending-broad-to-rapids");
});

test("uses the rehearsal order by default and selection scoring for supplied states", () => {
  expect(buildRiverSequence()).toBe(RIVER_SECTIONS);
  const selected = buildRiverSequence([
    { activity: "low", density: "low", direction: "level", mood: "steady" },
    { activity: "high", density: "high", direction: "rising", mood: "steady" },
  ]);
  expect(selected).toHaveLength(2);
  expect(selected[1]).not.toBe(selected[0]);
});

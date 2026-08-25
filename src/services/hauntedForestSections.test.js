import { HAUNTED_FOREST_SECTIONS } from "./hauntedForestSections";
import {
  getRiverStripLayout,
  locateRiverSection,
  nearbyRiverSectionIndexes,
} from "./riverSections";

test("keeps the authoritative Haunted Forest sequence fixed at ten sections", () => {
  expect(HAUNTED_FOREST_SECTIONS.map(({ id }) => id)).toEqual([
    "root-doorway",
    "first-trail",
    "crowded-tangle",
    "stone-descent",
    "hollow-clearing",
    "blackwater-marsh",
    "white-fog-crossing",
    "fallen-giant",
    "lantern-grove",
    "quiet-exit",
  ]);
  expect(HAUNTED_FOREST_SECTIONS[0].label).toBe("Root doorway");
});

test("uses the normalized 1600 by 900 PNGs without cropping the 260px scene", () => {
  HAUNTED_FOREST_SECTIONS.forEach(({ crop, mobileWeight, sources, weight }) => {
    expect(sources).toMatchObject({ largeWidth: 1600, largeHeight: 900 });
    expect(sources.png).toMatch(/haunted-forest-\d{2}-[a-z-]+\.png$/);
    expect(crop).toEqual({ height: "100%", top: "0%", x: "50%" });
    expect(weight / 260).toBeLessThanOrEqual(1600 / 900);
    expect(mobileWeight / 260).toBeLessThanOrEqual(1600 / 900);
  });
});

test("maps progress and mounts only the nearby scenes at desktop and mobile widths", () => {
  expect(locateRiverSection(0, HAUNTED_FOREST_SECTIONS)).toEqual({
    index: 0,
    localProgress: 0,
  });
  expect(locateRiverSection(0.5, HAUNTED_FOREST_SECTIONS)).toEqual({
    index: 5,
    localProgress: 0,
  });
  expect(locateRiverSection(1, HAUNTED_FOREST_SECTIONS)).toEqual({
    index: 9,
    localProgress: 1,
  });
  expect(nearbyRiverSectionIndexes(0, 390, HAUNTED_FOREST_SECTIONS)).toEqual([0, 1]);
  expect(nearbyRiverSectionIndexes(0, 1440, HAUNTED_FOREST_SECTIONS)).toEqual([
    0, 1, 2, 3,
  ]);
  expect(getRiverStripLayout(390, HAUNTED_FOREST_SECTIONS).sections[0].width).toBe(460);
  expect(getRiverStripLayout(1440, HAUNTED_FOREST_SECTIONS).sections[0].width).toBe(460);
});

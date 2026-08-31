import {
  TO_KINGDOMS_AHEAD_LOOP_SCENES,
  TO_KINGDOMS_AHEAD_NATIVE_HEIGHT,
  TO_KINGDOMS_AHEAD_NATIVE_WIDTH,
  TO_KINGDOMS_AHEAD_OPENER_OVERLAP_SOURCE_PIXELS,
  TO_KINGDOMS_AHEAD_SCENERY_WIDTH,
  getNearbyToKingdomsAheadSections,
  getToKingdomsAheadSection,
  getToKingdomsAheadSectionAtOffset,
} from "./toKingdomsAheadScenes";

const MANIFEST_IDS = [
  "01-rugged-coast",
  "02-flooded-marsh",
  "03-commoners-farmland",
  "04-alpine-basin",
  "05-dragon-battle",
  "06-grand-castle-forest-fork",
  "07-deep-winding-forest",
  "08-torch-travelers-leaving-forest",
  "09-open-farmland",
  "10-gradual-snowfield",
  "11-ice-castle",
  "12-thawing-coast-riders",
  "13-stone-bridge",
  "14-rocky-coast-loop-transition",
  "15-rugged-coast-closure",
];

test("preserves the manifest scene order, source geometry, and supplied WebP paths", () => {
  expect(TO_KINGDOMS_AHEAD_LOOP_SCENES.map(({ id }) => id)).toEqual(MANIFEST_IDS);
  expect(TO_KINGDOMS_AHEAD_LOOP_SCENES.map(({ sourceStartX }) => sourceStartX))
    .toEqual([0, 1663, 3326, 4989, 6652, 8315, 9978, 11641, 13224, 14807,
      16390, 17973, 19556, 21139, 22722]);
  TO_KINGDOMS_AHEAD_LOOP_SCENES.forEach((scene) => {
    expect(scene).toMatchObject({
      width: TO_KINGDOMS_AHEAD_NATIVE_WIDTH,
      height: TO_KINGDOMS_AHEAD_NATIVE_HEIGHT,
    });
    expect(scene.image).toBe(`${scene.id}.webp`);
  });
});

test("honors the manifest's mixed 320px and 400px handoff geometry", () => {
  expect(TO_KINGDOMS_AHEAD_OPENER_OVERLAP_SOURCE_PIXELS).toBe(320);
  expect(TO_KINGDOMS_AHEAD_LOOP_SCENES.map(({ overlapToNextSourcePixels }) =>
    overlapToNextSourcePixels
  )).toEqual([320, 320, 320, 320, 320, 320, 320, 400, 400, 400, 400, 400,
    400, 400, 400]);

  const scene07 = getToKingdomsAheadSection(7);
  const scene08 = getToKingdomsAheadSection(8);
  const scene09 = getToKingdomsAheadSection(9);
  expect(scene07.left + TO_KINGDOMS_AHEAD_SCENERY_WIDTH - scene08.left)
    .toBeCloseTo(320 * 260 / 793, 8);
  expect(scene08.left + TO_KINGDOMS_AHEAD_SCENERY_WIDTH - scene09.left)
    .toBeCloseTo(400 * 260 / 793, 8);
});

test("renders the opener only at world index zero and recycles scene 15 directly to scene 01", () => {
  const opener = getToKingdomsAheadSection(0);
  const scene15 = getToKingdomsAheadSection(15);
  const recycledScene01 = getToKingdomsAheadSection(16);

  expect(opener.id).toBe("00-royal-gate-opener");
  expect(recycledScene01).toMatchObject({
    id: "01-rugged-coast",
    cycleIndex: 1,
    loopBoundary: true,
    overlapBeforeSourcePixels: 400,
  });
  expect(scene15.left + TO_KINGDOMS_AHEAD_SCENERY_WIDTH - recycledScene01.left)
    .toBeCloseTo(400 * 260 / 793, 8);
  expect(getToKingdomsAheadSectionAtOffset(recycledScene01.left)).toMatchObject({
    id: "01-rugged-coast",
    cycleIndex: 1,
  });

  const recycledWindow = getNearbyToKingdomsAheadSections(
    recycledScene01.left,
    1000
  );
  expect(recycledWindow.map(({ id }) => id)).toContain("15-rugged-coast-closure");
  expect(recycledWindow.map(({ id }) => id)).toContain("01-rugged-coast");
  expect(recycledWindow.map(({ id }) => id)).not.toContain("00-royal-gate-opener");
});

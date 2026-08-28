import {
  OUTER_SPACE_JOURNEY_OPENER,
  OUTER_SPACE_JOURNEY_SCENES,
  OUTER_SPACE_NATIVE_HEIGHT,
  OUTER_SPACE_NATIVE_WIDTH,
  OUTER_SPACE_SCENERY_HEIGHT,
  OUTER_SPACE_SCENERY_WIDTH,
  OUTER_SPACE_SCENE_CYCLE_WIDTH,
  getNearbyOuterSpaceSections,
  getOuterSpaceSection,
} from "./outerSpaceJourneyScenes";

test("keeps every approved image at native 2:1 and exact 520 by 260 display geometry", () => {
  expect(OUTER_SPACE_NATIVE_WIDTH).toBe(1774);
  expect(OUTER_SPACE_NATIVE_HEIGHT).toBe(887);
  expect(OUTER_SPACE_SCENERY_WIDTH).toBe(520);
  expect(OUTER_SPACE_SCENERY_HEIGHT).toBe(260);
  expect(OUTER_SPACE_SCENE_CYCLE_WIDTH).toBe(5200);
  expect(OUTER_SPACE_JOURNEY_OPENER).toMatchObject({
    height: 887,
    id: "star-gate-opener",
    width: 1774,
  });
  expect(OUTER_SPACE_JOURNEY_OPENER.image).toMatch(/00-star-gate-opener\.png$/);
  OUTER_SPACE_JOURNEY_SCENES.forEach((scene) => {
    expect(scene).toMatchObject({ height: 887, width: 1774 });
  });
});

test("uses the ten locked recyclable scenes in their exact numbered order", () => {
  expect(OUTER_SPACE_JOURNEY_SCENES.map(({ id }) => id)).toEqual([
    "waystones",
    "mineral-garden",
    "ancient-ruins",
    "ringed-planet-observatory",
    "alien-oasis",
    "rock-temple",
    "basalt-pass",
    "explorers-rover",
    "ancient-city",
    "nomad-caravan",
  ]);
  expect(OUTER_SPACE_JOURNEY_SCENES.map(({ image }) => image)).toEqual([
    expect.stringContaining("01-waystones.png"),
    expect.stringContaining("02-mineral-garden.png"),
    expect.stringContaining("03-ancient-ruins.png"),
    expect.stringContaining("04-ringed-planet-observatory.png"),
    expect.stringContaining("05-alien-oasis.png"),
    expect.stringContaining("06-rock-temple.png"),
    expect.stringContaining("07-basalt-pass.png"),
    expect.stringContaining("08-explorers-rover.png"),
    expect.stringContaining("09-ancient-city.png"),
    expect.stringContaining("10-nomad-caravan.png"),
  ]);
});

test("shows the star gate once and recycles only scenes one through ten", () => {
  expect(getOuterSpaceSection(0)).toMatchObject({
    cycleIndex: -1,
    id: "star-gate-opener",
    left: 0,
    sceneIndex: -1,
  });
  expect(getOuterSpaceSection(1)).toMatchObject({
    cycleIndex: 0,
    id: "waystones",
    left: 520,
    sceneIndex: 0,
  });
  expect(getOuterSpaceSection(10)).toMatchObject({
    cycleIndex: 0,
    id: "nomad-caravan",
    left: 5200,
    sceneIndex: 9,
  });
  expect(getOuterSpaceSection(11)).toMatchObject({
    cycleIndex: 1,
    id: "waystones",
    left: 5720,
    sceneIndex: 0,
  });
  expect(getOuterSpaceSection(21)).toMatchObject({
    cycleIndex: 2,
    id: "waystones",
    left: 10920,
    sceneIndex: 0,
  });
});

test("mounts only exact adjacent 520px sections on desktop and mobile", () => {
  const mobile = getNearbyOuterSpaceSections(0, 390);
  const desktop = getNearbyOuterSpaceSections(5200, 1000);
  const distant = getNearbyOuterSpaceSections(64000, 390);

  expect(mobile.map(({ id }) => id)).toEqual([
    "star-gate-opener",
    "waystones",
  ]);
  [mobile, desktop, distant].forEach((sections) => {
    expect(sections.length).toBeLessThanOrEqual(5);
    sections.slice(1).forEach((section, index) => {
      expect(section.left - sections[index].left).toBe(520);
    });
  });
  expect(desktop.map(({ id }) => id)).toEqual([
    "ancient-city",
    "nomad-caravan",
    "waystones",
    "mineral-garden",
  ]);
  expect(distant.some(({ id }) => id === "star-gate-opener")).toBe(false);
});

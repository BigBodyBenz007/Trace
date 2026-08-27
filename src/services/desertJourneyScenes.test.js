import {
  DESERT_JOURNEY_OPENER,
  DESERT_JOURNEY_SCENES,
  DESERT_NATIVE_HEIGHT,
  DESERT_NATIVE_WIDTH,
  DESERT_SCENERY_HEIGHT,
  DESERT_SCENERY_WIDTH,
  DESERT_SCENE_CYCLE_WIDTH,
  getDesertSection,
  getNearbyDesertSections,
} from "./desertJourneyScenes";

test("keeps every baked image at the supplied 2:1 display geometry", () => {
  expect(DESERT_NATIVE_WIDTH).toBe(1774);
  expect(DESERT_NATIVE_HEIGHT).toBe(887);
  expect(DESERT_SCENERY_WIDTH).toBe(520);
  expect(DESERT_SCENERY_HEIGHT).toBe(260);
  expect(DESERT_SCENE_CYCLE_WIDTH).toBe(5200);
  expect(DESERT_JOURNEY_OPENER).toMatchObject({
    height: 887,
    id: "sphinx-opener",
    width: 1774,
  });
  expect(DESERT_JOURNEY_OPENER.image).toMatch(/00-sphinx-opener\.png$/);
  DESERT_JOURNEY_SCENES.forEach((scene) => {
    expect(scene).toMatchObject({ height: 887, width: 1774 });
  });
});

test("uses the ten finished scenes in their exact required order", () => {
  expect(DESERT_JOURNEY_SCENES.map(({ id }) => id)).toEqual([
    "oasis",
    "solo-traveler",
    "ancient-ruins",
    "pyramids",
    "desert-city",
    "rock-temple",
    "cacti",
    "family-travelers",
    "large-caravan",
    "vultures",
  ]);
  expect(DESERT_JOURNEY_SCENES.map(({ image }) => image)).toEqual([
    expect.stringContaining("01-oasis.png"),
    expect.stringContaining("02-solo-traveler.png"),
    expect.stringContaining("03-ancient-ruins.png"),
    expect.stringContaining("04-pyramids.png"),
    expect.stringContaining("05-desert-city.png"),
    expect.stringContaining("06-rock-temple.png"),
    expect.stringContaining("07-cacti.png"),
    expect.stringContaining("08-family-travelers.png"),
    expect.stringContaining("09-large-caravan.png"),
    expect.stringContaining("10-vultures.png"),
  ]);
});

test("shows the opener once and recycles only scenes one through ten", () => {
  expect(getDesertSection(0)).toMatchObject({
    cycleIndex: -1,
    id: "sphinx-opener",
    left: 0,
    sceneIndex: -1,
  });
  expect(getDesertSection(1)).toMatchObject({
    cycleIndex: 0,
    id: "oasis",
    left: 520,
    sceneIndex: 0,
  });
  expect(getDesertSection(10)).toMatchObject({
    cycleIndex: 0,
    id: "vultures",
    left: 5200,
    sceneIndex: 9,
  });
  expect(getDesertSection(11)).toMatchObject({
    cycleIndex: 1,
    id: "oasis",
    left: 5720,
    sceneIndex: 0,
  });
  expect(getDesertSection(21)).toMatchObject({
    cycleIndex: 2,
    id: "oasis",
    left: 10920,
    sceneIndex: 0,
  });
});

test("mounts only exact adjacent 520px sections near long timeline cameras", () => {
  const start = getNearbyDesertSections(0, 390);
  const middle = getNearbyDesertSections(5200, 1000);
  const distant = getNearbyDesertSections(64000, 390);

  expect(start.map(({ id }) => id)).toEqual([
    "sphinx-opener",
    "oasis",
  ]);
  [start, middle, distant].forEach((sections) => {
    expect(sections.length).toBeLessThanOrEqual(5);
    sections.slice(1).forEach((section, index) => {
      expect(section.left - sections[index].left).toBe(520);
    });
  });
  expect(middle.map(({ id }) => id)).toEqual([
    "large-caravan",
    "vultures",
    "oasis",
    "solo-traveler",
  ]);
  expect(distant.every(({ worldIndex }) => worldIndex >= 122)).toBe(true);
  expect(distant.some(({ id }) => id === "sphinx-opener")).toBe(false);
});

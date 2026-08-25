import {
  GNOME_DAYTIME_POOL,
  GNOME_DAYTIME_SECTIONS,
  GNOME_DUSK_APPROACH_SECTION,
  GNOME_EVENING_SEQUENCE,
  GNOME_OPENER_SECTION,
  GNOME_REUSABLE_SECTIONS,
  GNOME_SCENE_CYCLE,
  GNOME_SECTIONS,
} from "./gnomeSections";

test("orders one Gnome opener, a locked evening sequence, and the resumed daytime cycle", () => {
  expect(GNOME_SECTIONS.map(({ id }) => id)).toEqual([
    "book-beginning",
    "geometry-master",
    "marketplace",
    "town-center",
    "bridge",
    "waterfall",
    "treehouse-district",
    "after-book-start",
    "twilight-hills",
    "twilight-stream",
    "moonlit-stream",
    "sunrise-return",
    "geometry-master",
    "marketplace",
    "town-center",
    "bridge",
    "waterfall",
    "treehouse-district",
    "after-book-start",
  ]);
  expect(GNOME_OPENER_SECTION).toBe(GNOME_SECTIONS[0]);
  expect(GNOME_SECTIONS.filter(({ sequenceRole }) => sequenceRole === "opener"))
    .toEqual([GNOME_OPENER_SECTION]);
  expect(GNOME_DAYTIME_SECTIONS).toBe(GNOME_DAYTIME_POOL);
  expect(GNOME_REUSABLE_SECTIONS).toBe(GNOME_DAYTIME_POOL);
  expect(GNOME_REUSABLE_SECTIONS.map(({ id }) => id)).toEqual([
    "geometry-master",
    "marketplace",
    "town-center",
    "bridge",
    "waterfall",
    "treehouse-district",
  ]);
  expect(GNOME_REUSABLE_SECTIONS.every(({ sequenceRole }) => sequenceRole === "reusable"))
    .toBe(true);
  expect(GNOME_REUSABLE_SECTIONS.every(
    ({ lightingGroup }) => lightingGroup === "daylight-compatible"
  )).toBe(true);
  expect(GNOME_DUSK_APPROACH_SECTION).toMatchObject({
    id: "after-book-start",
    lightingGroup: "warm-daylight-bridge",
    sequenceRole: "dusk-approach",
  });
  expect(GNOME_DAYTIME_POOL).not.toContain(GNOME_DUSK_APPROACH_SECTION);
  expect(GNOME_EVENING_SEQUENCE.map(({ id }) => id)).toEqual([
    "twilight-hills",
    "twilight-stream",
    "moonlit-stream",
    "sunrise-return",
  ]);
  expect(GNOME_EVENING_SEQUENCE.map(({ sequenceIndex }) => sequenceIndex))
    .toEqual([0, 1, 2, 3]);
  expect(GNOME_EVENING_SEQUENCE.every((section) =>
    section.sequenceRole === "locked-evening"
      && section.lockedSequence === "dusk-night-dawn"
  )).toBe(true);
});

test("keeps transition and obsolete sunset assets out of the ordinary daytime pool", () => {
  const daytimeSources = GNOME_DAYTIME_POOL.map(({ sources }) => sources.png).join(" ");
  expect(daytimeSources).not.toContain("01-gnome-after-book-start.png");
  expect(daytimeSources).not.toContain("08-gnome-dusk.png");
  expect(daytimeSources).not.toContain("09-gnome-night.png");
  expect(daytimeSources).not.toContain("10-gnome-dawn.png");
  GNOME_EVENING_SEQUENCE.forEach((transition) => {
    expect(GNOME_SCENE_CYCLE.filter(({ id }) => id === transition.id)).toHaveLength(1);
    expect(GNOME_SECTIONS.filter(({ id }) => id === transition.id)).toHaveLength(1);
    expect(GNOME_DAYTIME_POOL).not.toContain(transition);
  });
});

test("configures only compatible lighting boundaries around the deterministic cycle", () => {
  expect(GNOME_SCENE_CYCLE.map(({ id }) => id)).toEqual([
    "geometry-master",
    "marketplace",
    "town-center",
    "bridge",
    "waterfall",
    "treehouse-district",
    "after-book-start",
    "twilight-hills",
    "twilight-stream",
    "moonlit-stream",
    "sunrise-return",
  ]);

  const allowedLightingBoundaries = new Set([
    "daylight-compatible>daylight-compatible",
    "daylight-compatible>warm-daylight-bridge",
    "warm-daylight-bridge>dusk",
    "dusk>dusk-to-night",
    "dusk-to-night>night",
    "night>dawn-to-daylight",
    "dawn-to-daylight>daylight-compatible",
  ]);
  const repeatedCycle = [...GNOME_SCENE_CYCLE, GNOME_SCENE_CYCLE[0]];
  const boundaries = repeatedCycle.slice(1).map((section, index) =>
    `${repeatedCycle[index].lightingGroup}>${section.lightingGroup}`
  );

  expect(boundaries.every((boundary) => allowedLightingBoundaries.has(boundary))).toBe(true);
  expect(GNOME_SCENE_CYCLE.at(-1)).toBe(GNOME_EVENING_SEQUENCE.at(-1));
  expect(repeatedCycle.at(-1)).toBe(GNOME_DAYTIME_POOL[0]);
});

test("excludes incompatible edge environments from daytime adjacency", () => {
  const daytimeWithDuskApproach = [
    ...GNOME_DAYTIME_POOL,
    GNOME_DUSK_APPROACH_SECTION,
  ];
  const adjacentPairs = daytimeWithDuskApproach.slice(1).map((section, index) =>
    `${daytimeWithDuskApproach[index].id}>${section.id}`
  );

  expect(adjacentPairs).toEqual([
    "geometry-master>marketplace",
    "marketplace>town-center",
    "town-center>bridge",
    "bridge>waterfall",
    "waterfall>treehouse-district",
    "treehouse-district>after-book-start",
  ]);
  expect(adjacentPairs).not.toEqual(expect.arrayContaining([
    "marketplace>treehouse-district",
    "treehouse-district>town-center",
  ]));
});

test("uses the untouched normalized package assets and source dimensions", () => {
  const catalog = [
    GNOME_OPENER_SECTION,
    ...GNOME_DAYTIME_POOL,
    GNOME_DUSK_APPROACH_SECTION,
    ...GNOME_EVENING_SEQUENCE,
  ];
  expect(catalog.map(({ sources }) => sources.png)).toEqual([
    expect.stringContaining("00-gnome-book-beginning.png"),
    expect.stringContaining("02-gnome-geometry-master.png"),
    expect.stringContaining("03-gnome-marketplace.png"),
    expect.stringContaining("07-gnome-town-center.png"),
    expect.stringContaining("05-gnome-bridge.png"),
    expect.stringContaining("04-gnome-waterfall.png"),
    expect.stringContaining("06-gnome-treehouse-district.png"),
    expect.stringContaining("01-gnome-after-book-start.png"),
    expect.stringContaining("twilight_gnome_village_in_the_hills.png"),
    expect.stringContaining("twilight_gnome_village_by_the_stream.png"),
    expect.stringContaining("moonlit_gnome_village_by_the_stream.png"),
    expect.stringContaining("twilight_to_sunrise_gnome_village.png"),
  ]);
  catalog.forEach(({ sources }) => {
    expect(sources).toMatchObject({ largeWidth: 1672, largeHeight: 941 });
  });
  expect(GNOME_DUSK_APPROACH_SECTION.crop)
    .toMatchObject({ height: "186.7%", top: "-43.3%" });
  expect(GNOME_DAYTIME_POOL[0].crop).toMatchObject({ height: "150.1%", top: "-25%" });
  expect(GNOME_DAYTIME_POOL[1].crop).toMatchObject({ height: "140.5%", top: "-20.3%" });
});

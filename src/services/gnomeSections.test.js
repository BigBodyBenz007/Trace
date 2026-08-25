import {
  GNOME_OPENER_SECTION,
  GNOME_REUSABLE_SECTIONS,
  GNOME_SECTIONS,
} from "./gnomeSections";

test("orders one Gnome opener followed by the ten reusable scenes", () => {
  expect(GNOME_SECTIONS.map(({ id }) => id)).toEqual([
    "book-beginning",
    "after-book-start",
    "geometry-master",
    "marketplace",
    "waterfall",
    "bridge",
    "treehouse-district",
    "town-center",
    "dusk",
    "night",
    "dawn",
  ]);
  expect(GNOME_OPENER_SECTION).toBe(GNOME_SECTIONS[0]);
  expect(GNOME_SECTIONS.filter(({ sequenceRole }) => sequenceRole === "opener"))
    .toEqual([GNOME_OPENER_SECTION]);
  expect(GNOME_REUSABLE_SECTIONS).toHaveLength(10);
  expect(GNOME_REUSABLE_SECTIONS.every(({ sequenceRole }) => sequenceRole === "reusable"))
    .toBe(true);
});

test("uses the untouched normalized package assets and source dimensions", () => {
  expect(GNOME_SECTIONS.map(({ sources }) => sources.png)).toEqual([
    expect.stringContaining("00-gnome-book-beginning.png"),
    expect.stringContaining("01-gnome-after-book-start.png"),
    expect.stringContaining("02-gnome-geometry-master.png"),
    expect.stringContaining("03-gnome-marketplace.png"),
    expect.stringContaining("04-gnome-waterfall.png"),
    expect.stringContaining("05-gnome-bridge.png"),
    expect.stringContaining("06-gnome-treehouse-district.png"),
    expect.stringContaining("07-gnome-town-center.png"),
    expect.stringContaining("08-gnome-dusk.png"),
    expect.stringContaining("09-gnome-night.png"),
    expect.stringContaining("10-gnome-dawn.png"),
  ]);
  GNOME_SECTIONS.forEach(({ sources }) => {
    expect(sources).toMatchObject({ largeWidth: 1672, largeHeight: 941 });
  });
  expect(GNOME_SECTIONS[2].crop).toMatchObject({ height: "150.1%", top: "-25%" });
  expect(GNOME_SECTIONS[3].crop).toMatchObject({ height: "140.5%", top: "-20.3%" });
});

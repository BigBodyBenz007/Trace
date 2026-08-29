import { createHash } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  GNOME_CYCLE_STRIDE,
  GNOME_LOOP_OVERLAP_RENDERED_PIXELS,
  GNOME_LOOP_OVERLAP_SOURCE_PIXELS,
  GNOME_NATIVE_HEIGHT,
  GNOME_NATIVE_WIDTH,
  GNOME_OPENER_SECTION,
  GNOME_PATH_SCENES,
  GNOME_SCENERY_HEIGHT,
  GNOME_SCENERY_WIDTH,
  GNOME_SECTIONS,
  getGnomeSection,
  getGnomeSectionAtOffset,
  getNearbyGnomeSections,
} from "./gnomeSections";

const EXPECTED_ASSETS = [
  ["00-gnome-king-opener.png", "21e6d043c5cd9196073300e800a1245f049b08dd34dfea939ede6dcf7537dda3"],
  ["01-gnome-path-scene.png", "e89441371ec423b8c4cfca86523e9d5ecfab1de2ed9eb81ab83cd0b6e4ebdfb8"],
  ["02-gnome-path-scene.png", "419a816dfea9d9ad726e38e938cf5c76981b2649ac3e359c53d401b741a36725"],
  ["03-gnome-path-scene.png", "8339ac322768de6ceee1cec404f38f0a8095a84b658133ee11998c5be57195db"],
  ["04-gnome-path-scene.png", "b78b59cb2c7344a9645155ee3e3373577e76039805de1a490887efff5744ecab"],
  ["05-gnome-path-scene.png", "c0df270db45e91f84580b8448f142d02f2ea8046a36a1c3838de5fd622863ec6"],
  ["06-gnome-path-scene.png", "1078b16dca87787323c2a706973fa2dd753206c9df2a0a463e771819febdde74"],
  ["07-gnome-path-scene.png", "125ecf076767a99f68c0555b45664f64acd89bc4d08a7a0c4569306d1057309b"],
  ["08-gnome-path-scene.png", "df8f462dd048f13e19a6a8f38f4d4eb1252f025ca7fac6b93f9dde3f0aab7c0e"],
  ["09-gnome-path-scene.png", "b1d03074c85777f69d99deb5e7c8620b4d7e51168c16d19aa0f272440bb42a05"],
  ["10-gnome-path-scene.png", "851c956b5a8812a8dcc17a6cef5f1bbc82de50c4a19ed66873d6444050dd0e8f"],
];

test("registers the approved opener and scenes 01-10 in exact order", () => {
  expect(GNOME_NATIVE_WIDTH).toBe(1774);
  expect(GNOME_NATIVE_HEIGHT).toBe(887);
  expect(GNOME_SCENERY_WIDTH).toBe(520);
  expect(GNOME_SCENERY_HEIGHT).toBe(260);
  expect(GNOME_NATIVE_WIDTH / GNOME_NATIVE_HEIGHT).toBe(2);
  expect(GNOME_SCENERY_WIDTH / GNOME_SCENERY_HEIGHT).toBe(2);
  expect(GNOME_SECTIONS.map(({ id }) => id)).toEqual([
    "gnome-king-opener",
    ...Array.from({ length: 10 }, (_, index) =>
      `gnome-path-scene-${String(index + 1).padStart(2, "0")}`),
  ]);
  expect(GNOME_OPENER_SECTION.image).toContain("00-gnome-king-opener.png");
  GNOME_PATH_SCENES.forEach((scene, index) => {
    expect(scene.image).toContain(`${String(index + 1).padStart(2, "0")}-gnome-path-scene.png`);
    expect(scene).toMatchObject({ height: 887, width: 1774 });
  });
});

test("approved files retain the manifest SHA-256 hashes", () => {
  EXPECTED_ASSETS.forEach(([name, expectedHash]) => {
    const bytes = readFileSync(resolve(
      __dirname,
      "../assets/life-current/gnome/golden-path",
      name
    ));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(expectedHash);
  });
});

test("renders the opener once and recycles only scenes 01-10", () => {
  const sections = Array.from({ length: 31 }, (_, index) => getGnomeSection(index));
  expect(sections.filter(({ id }) => id === "gnome-king-opener")).toHaveLength(1);
  expect(sections.slice(1, 11).map(({ id }) => id))
    .toEqual(GNOME_PATH_SCENES.map(({ id }) => id));
  expect(sections.slice(11, 21).map(({ id }) => id))
    .toEqual(GNOME_PATH_SCENES.map(({ id }) => id));
  expect(sections.slice(21, 31).map(({ id }) => id))
    .toEqual(GNOME_PATH_SCENES.map(({ id }) => id));
  expect(sections[11]).toMatchObject({ cycleIndex: 1, sceneIndex: 0 });
});

test("keeps ordinary joins exact and elides the authored loop duplicate geometrically", () => {
  expect(GNOME_LOOP_OVERLAP_SOURCE_PIXELS).toBe(96);
  expect(GNOME_LOOP_OVERLAP_RENDERED_PIXELS)
    .toBeCloseTo(96 * 520 / 1774, 10);
  expect(GNOME_CYCLE_STRIDE)
    .toBeCloseTo(10 * 520 - GNOME_LOOP_OVERLAP_RENDERED_PIXELS, 10);

  const opener = getGnomeSection(0);
  const firstCycle = Array.from({ length: 10 }, (_, index) => getGnomeSection(index + 1));
  const recycledScene01 = getGnomeSection(11);
  expect(firstCycle[0].left).toBe(opener.left + GNOME_SCENERY_WIDTH);
  firstCycle.slice(1).forEach((section, index) => {
    expect(section.left).toBe(firstCycle[index].left + GNOME_SCENERY_WIDTH);
    expect(section.overlapBefore).toBe(0);
  });
  expect(firstCycle.at(-1).left + GNOME_SCENERY_WIDTH - recycledScene01.left)
    .toBeCloseTo(GNOME_LOOP_OVERLAP_RENDERED_PIXELS, 10);
  expect(recycledScene01).toMatchObject({ loopBoundary: true, sceneIndex: 0 });
  expect(recycledScene01.overlapBefore)
    .toBeCloseTo(GNOME_LOOP_OVERLAP_RENDERED_PIXELS, 10);
});

test("locates chronology correctly across opener and recycle boundaries", () => {
  expect(getGnomeSectionAtOffset(0).id).toBe("gnome-king-opener");
  expect(getGnomeSectionAtOffset(519.99).id).toBe("gnome-king-opener");
  expect(getGnomeSectionAtOffset(520)).toMatchObject({
    cycleIndex: 0,
    id: "gnome-path-scene-01",
  });
  expect(getGnomeSectionAtOffset(520 + GNOME_CYCLE_STRIDE - 0.01))
    .toMatchObject({ cycleIndex: 0, id: "gnome-path-scene-10" });
  expect(getGnomeSectionAtOffset(520 + GNOME_CYCLE_STRIDE))
    .toMatchObject({ cycleIndex: 1, id: "gnome-path-scene-01" });
});

test("keeps nearby mounting bounded on mobile and desktop at long offsets", () => {
  expect(getNearbyGnomeSections(0, 390).length).toBeLessThanOrEqual(4);
  expect(getNearbyGnomeSections(0, 1400).length).toBeLessThanOrEqual(6);
  const mobile = getNearbyGnomeSections(520 + GNOME_CYCLE_STRIDE * 20, 390);
  const desktop = getNearbyGnomeSections(520 + GNOME_CYCLE_STRIDE * 20, 1400);
  expect(mobile.length).toBeLessThanOrEqual(4);
  expect(desktop.length).toBeLessThanOrEqual(6);
  expect([...mobile, ...desktop].some(({ id }) => id === "gnome-king-opener"))
    .toBe(false);
});

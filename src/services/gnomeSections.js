import gnomeKingOpener from "../assets/life-current/gnome/golden-path/00-gnome-king-opener.png";
import gnomePathScene01 from "../assets/life-current/gnome/golden-path/01-gnome-path-scene.png";
import gnomePathScene02 from "../assets/life-current/gnome/golden-path/02-gnome-path-scene.png";
import gnomePathScene03 from "../assets/life-current/gnome/golden-path/03-gnome-path-scene.png";
import gnomePathScene04 from "../assets/life-current/gnome/golden-path/04-gnome-path-scene.png";
import gnomePathScene05 from "../assets/life-current/gnome/golden-path/05-gnome-path-scene.png";
import gnomePathScene06 from "../assets/life-current/gnome/golden-path/06-gnome-path-scene.png";
import gnomePathScene07 from "../assets/life-current/gnome/golden-path/07-gnome-path-scene.png";
import gnomePathScene08 from "../assets/life-current/gnome/golden-path/08-gnome-path-scene.png";
import gnomePathScene09 from "../assets/life-current/gnome/golden-path/09-gnome-path-scene.png";
import gnomePathScene10 from "../assets/life-current/gnome/golden-path/10-gnome-path-scene.png";

export const GNOME_NATIVE_WIDTH = 1774;
export const GNOME_NATIVE_HEIGHT = 887;
export const GNOME_SCENERY_WIDTH = 520;
export const GNOME_SCENERY_HEIGHT = 260;
export const GNOME_SCENE_BUFFER = GNOME_SCENERY_WIDTH;
export const GNOME_LOOP_OVERLAP_SOURCE_PIXELS = 96;
export const GNOME_LOOP_OVERLAP_RENDERED_PIXELS =
  GNOME_LOOP_OVERLAP_SOURCE_PIXELS * GNOME_SCENERY_WIDTH / GNOME_NATIVE_WIDTH;

export const GNOME_OPENER_SECTION = Object.freeze({
  height: GNOME_NATIVE_HEIGHT,
  id: "gnome-king-opener",
  image: gnomeKingOpener,
  width: GNOME_NATIVE_WIDTH,
});

export const GNOME_PATH_SCENES = Object.freeze([
  gnomePathScene01,
  gnomePathScene02,
  gnomePathScene03,
  gnomePathScene04,
  gnomePathScene05,
  gnomePathScene06,
  gnomePathScene07,
  gnomePathScene08,
  gnomePathScene09,
  gnomePathScene10,
].map((image, index) => Object.freeze({
  height: GNOME_NATIVE_HEIGHT,
  id: `gnome-path-scene-${String(index + 1).padStart(2, "0")}`,
  image,
  width: GNOME_NATIVE_WIDTH,
})));

export const GNOME_CYCLE_STRIDE =
  GNOME_PATH_SCENES.length * GNOME_SCENERY_WIDTH -
  GNOME_LOOP_OVERLAP_RENDERED_PIXELS;

export const GNOME_SECTIONS = Object.freeze([
  GNOME_OPENER_SECTION,
  ...GNOME_PATH_SCENES,
]);

export function getGnomeSection(worldIndex) {
  const safeWorldIndex = Math.max(0, Math.floor(Number(worldIndex) || 0));
  if (safeWorldIndex === 0) {
    return Object.freeze({
      ...GNOME_OPENER_SECTION,
      cycleIndex: -1,
      key: "0-gnome-king-opener",
      left: 0,
      loopBoundary: false,
      overlapBefore: 0,
      sceneIndex: -1,
      worldIndex: 0,
    });
  }

  const sequenceIndex = safeWorldIndex - 1;
  const sceneIndex = sequenceIndex % GNOME_PATH_SCENES.length;
  const cycleIndex = Math.floor(sequenceIndex / GNOME_PATH_SCENES.length);
  const scene = GNOME_PATH_SCENES[sceneIndex];
  const loopBoundary = cycleIndex > 0 && sceneIndex === 0;
  return Object.freeze({
    ...scene,
    cycleIndex,
    key: `${safeWorldIndex}-${scene.id}`,
    left: GNOME_SCENERY_WIDTH +
      cycleIndex * GNOME_CYCLE_STRIDE +
      sceneIndex * GNOME_SCENERY_WIDTH,
    loopBoundary,
    overlapBefore: loopBoundary ? GNOME_LOOP_OVERLAP_RENDERED_PIXELS : 0,
    sceneIndex,
    worldIndex: safeWorldIndex,
  });
}

export function getGnomeSectionAtOffset(cameraOffset) {
  const safeOffset = Math.max(0, Number(cameraOffset) || 0);
  if (safeOffset < GNOME_SCENERY_WIDTH) return getGnomeSection(0);

  const sequenceOffset = safeOffset - GNOME_SCENERY_WIDTH;
  const cycleIndex = Math.floor(sequenceOffset / GNOME_CYCLE_STRIDE);
  const cycleOffset = sequenceOffset - cycleIndex * GNOME_CYCLE_STRIDE;
  const sceneIndex = Math.min(
    GNOME_PATH_SCENES.length - 1,
    Math.floor(cycleOffset / GNOME_SCENERY_WIDTH)
  );
  return getGnomeSection(
    1 + cycleIndex * GNOME_PATH_SCENES.length + sceneIndex
  );
}

export function getNearbyGnomeSections(
  cameraOffset,
  viewportWidth,
  buffer = GNOME_SCENE_BUFFER
) {
  const safeCameraOffset = Math.max(0, Number(cameraOffset) || 0);
  const safeViewportWidth = Math.max(1, Number(viewportWidth) || 1);
  const safeBuffer = Math.max(0, Number(buffer) || 0);
  const firstSection = getGnomeSectionAtOffset(
    Math.max(0, safeCameraOffset - safeBuffer)
  );
  const lastSection = getGnomeSectionAtOffset(
    safeCameraOffset + safeViewportWidth + safeBuffer
  );

  return Object.freeze(Array.from(
    { length: lastSection.worldIndex - firstSection.worldIndex + 1 },
    (_, index) => getGnomeSection(firstSection.worldIndex + index)
  ));
}

import royalGateOpener from "../assets/life-current/to-kingdoms-ahead/00-royal-gate-opener.webp";
import ruggedCoast from "../assets/life-current/to-kingdoms-ahead/01-rugged-coast.webp";
import floodedMarsh from "../assets/life-current/to-kingdoms-ahead/02-flooded-marsh.webp";
import commonersFarmland from "../assets/life-current/to-kingdoms-ahead/03-commoners-farmland.webp";
import alpineBasin from "../assets/life-current/to-kingdoms-ahead/04-alpine-basin.webp";
import dragonBattle from "../assets/life-current/to-kingdoms-ahead/05-dragon-battle.webp";
import grandCastleForestFork from "../assets/life-current/to-kingdoms-ahead/06-grand-castle-forest-fork.webp";
import deepWindingForest from "../assets/life-current/to-kingdoms-ahead/07-deep-winding-forest.webp";
import torchTravelersLeavingForest from "../assets/life-current/to-kingdoms-ahead/08-torch-travelers-leaving-forest.webp";
import openFarmland from "../assets/life-current/to-kingdoms-ahead/09-open-farmland.webp";
import gradualSnowfield from "../assets/life-current/to-kingdoms-ahead/10-gradual-snowfield.webp";
import iceCastle from "../assets/life-current/to-kingdoms-ahead/11-ice-castle.webp";
import thawingCoastRiders from "../assets/life-current/to-kingdoms-ahead/12-thawing-coast-riders.webp";
import stoneBridge from "../assets/life-current/to-kingdoms-ahead/13-stone-bridge.webp";
import rockyCoastLoopTransition from "../assets/life-current/to-kingdoms-ahead/14-rocky-coast-loop-transition.webp";
import ruggedCoastClosure from "../assets/life-current/to-kingdoms-ahead/15-rugged-coast-closure.webp";

export const TO_KINGDOMS_AHEAD_NATIVE_WIDTH = 1983;
export const TO_KINGDOMS_AHEAD_NATIVE_HEIGHT = 793;
export const TO_KINGDOMS_AHEAD_SCENERY_HEIGHT = 260;
export const TO_KINGDOMS_AHEAD_SCALE =
  TO_KINGDOMS_AHEAD_SCENERY_HEIGHT / TO_KINGDOMS_AHEAD_NATIVE_HEIGHT;
export const TO_KINGDOMS_AHEAD_SCENERY_WIDTH =
  TO_KINGDOMS_AHEAD_NATIVE_WIDTH * TO_KINGDOMS_AHEAD_SCALE;
export const TO_KINGDOMS_AHEAD_SCENE_BUFFER = TO_KINGDOMS_AHEAD_SCENERY_WIDTH;
export const TO_KINGDOMS_AHEAD_OPENER_OVERLAP_SOURCE_PIXELS = 320;

export const TO_KINGDOMS_AHEAD_OPENER = Object.freeze({
  height: TO_KINGDOMS_AHEAD_NATIVE_HEIGHT,
  id: "00-royal-gate-opener",
  image: royalGateOpener,
  width: TO_KINGDOMS_AHEAD_NATIVE_WIDTH,
});

const MANIFEST_SCENES = [
  ["01-rugged-coast", ruggedCoast, 0, 320],
  ["02-flooded-marsh", floodedMarsh, 1663, 320],
  ["03-commoners-farmland", commonersFarmland, 3326, 320],
  ["04-alpine-basin", alpineBasin, 4989, 320],
  ["05-dragon-battle", dragonBattle, 6652, 320],
  ["06-grand-castle-forest-fork", grandCastleForestFork, 8315, 320],
  ["07-deep-winding-forest", deepWindingForest, 9978, 320],
  ["08-torch-travelers-leaving-forest", torchTravelersLeavingForest, 11641, 400],
  ["09-open-farmland", openFarmland, 13224, 400],
  ["10-gradual-snowfield", gradualSnowfield, 14807, 400],
  ["11-ice-castle", iceCastle, 16390, 400],
  ["12-thawing-coast-riders", thawingCoastRiders, 17973, 400],
  ["13-stone-bridge", stoneBridge, 19556, 400],
  ["14-rocky-coast-loop-transition", rockyCoastLoopTransition, 21139, 400],
  ["15-rugged-coast-closure", ruggedCoastClosure, 22722, 400],
];

export const TO_KINGDOMS_AHEAD_LOOP_SCENES = Object.freeze(
  MANIFEST_SCENES.map(([id, image, sourceStartX, overlapToNextSourcePixels]) =>
    Object.freeze({
      height: TO_KINGDOMS_AHEAD_NATIVE_HEIGHT,
      id,
      image,
      overlapToNextSourcePixels,
      sourceStartX,
      width: TO_KINGDOMS_AHEAD_NATIVE_WIDTH,
    })
  )
);

const renderedOverlap = (sourcePixels) => sourcePixels * TO_KINGDOMS_AHEAD_SCALE;
const openerStride = TO_KINGDOMS_AHEAD_SCENERY_WIDTH -
  renderedOverlap(TO_KINGDOMS_AHEAD_OPENER_OVERLAP_SOURCE_PIXELS);
const loopStrides = TO_KINGDOMS_AHEAD_LOOP_SCENES.map(
  (scene) => TO_KINGDOMS_AHEAD_SCENERY_WIDTH -
    renderedOverlap(scene.overlapToNextSourcePixels)
);
const sceneStarts = loopStrides.map((_, index) =>
  loopStrides.slice(0, index).reduce((total, stride) => total + stride, 0)
);

export const TO_KINGDOMS_AHEAD_LOOP_WIDTH = loopStrides.reduce(
  (total, stride) => total + stride,
  0
);

export function getToKingdomsAheadSection(worldIndex) {
  const safeWorldIndex = Math.max(0, Math.floor(Number(worldIndex) || 0));
  if (safeWorldIndex === 0) {
    return Object.freeze({
      ...TO_KINGDOMS_AHEAD_OPENER,
      cycleIndex: -1,
      key: "0-00-royal-gate-opener",
      left: 0,
      loopBoundary: false,
      overlapBefore: 0,
      overlapBeforeSourcePixels: 0,
      overlapToNext: renderedOverlap(TO_KINGDOMS_AHEAD_OPENER_OVERLAP_SOURCE_PIXELS),
      overlapToNextSourcePixels: TO_KINGDOMS_AHEAD_OPENER_OVERLAP_SOURCE_PIXELS,
      renderedWidth: TO_KINGDOMS_AHEAD_SCENERY_WIDTH,
      sceneIndex: -1,
      worldIndex: 0,
    });
  }

  const sequenceIndex = safeWorldIndex - 1;
  const sceneIndex = sequenceIndex % TO_KINGDOMS_AHEAD_LOOP_SCENES.length;
  const cycleIndex = Math.floor(sequenceIndex / TO_KINGDOMS_AHEAD_LOOP_SCENES.length);
  const scene = TO_KINGDOMS_AHEAD_LOOP_SCENES[sceneIndex];
  const previousOverlapSourcePixels = sceneIndex === 0
    ? cycleIndex === 0
      ? TO_KINGDOMS_AHEAD_OPENER_OVERLAP_SOURCE_PIXELS
      : TO_KINGDOMS_AHEAD_LOOP_SCENES.at(-1).overlapToNextSourcePixels
    : TO_KINGDOMS_AHEAD_LOOP_SCENES[sceneIndex - 1].overlapToNextSourcePixels;

  return Object.freeze({
    ...scene,
    cycleIndex,
    key: `${safeWorldIndex}-${scene.id}`,
    left: openerStride + cycleIndex * TO_KINGDOMS_AHEAD_LOOP_WIDTH +
      sceneStarts[sceneIndex],
    loopBoundary: cycleIndex > 0 && sceneIndex === 0,
    overlapBefore: renderedOverlap(previousOverlapSourcePixels),
    overlapBeforeSourcePixels: previousOverlapSourcePixels,
    overlapToNext: renderedOverlap(scene.overlapToNextSourcePixels),
    renderedWidth: TO_KINGDOMS_AHEAD_SCENERY_WIDTH,
    sceneIndex,
    worldIndex: safeWorldIndex,
  });
}

export function getToKingdomsAheadSectionAtOffset(cameraOffset) {
  const safeOffset = Math.max(0, Number(cameraOffset) || 0);
  if (safeOffset < openerStride) return getToKingdomsAheadSection(0);

  const loopOffset = safeOffset - openerStride;
  const cycleIndex = Math.floor(loopOffset / TO_KINGDOMS_AHEAD_LOOP_WIDTH);
  const cycleOffset = loopOffset - cycleIndex * TO_KINGDOMS_AHEAD_LOOP_WIDTH;
  let sceneIndex = TO_KINGDOMS_AHEAD_LOOP_SCENES.length - 1;
  for (let index = 1; index < sceneStarts.length; index += 1) {
    if (cycleOffset < sceneStarts[index]) {
      sceneIndex = index - 1;
      break;
    }
  }
  return getToKingdomsAheadSection(
    1 + cycleIndex * TO_KINGDOMS_AHEAD_LOOP_SCENES.length + sceneIndex
  );
}

export function getNearbyToKingdomsAheadSections(
  cameraOffset,
  viewportWidth,
  buffer = TO_KINGDOMS_AHEAD_SCENE_BUFFER
) {
  const safeCameraOffset = Math.max(0, Number(cameraOffset) || 0);
  const safeViewportWidth = Math.max(1, Number(viewportWidth) || 1);
  const safeBuffer = Math.max(0, Number(buffer) || 0);
  const firstSection = getToKingdomsAheadSectionAtOffset(
    Math.max(0, safeCameraOffset - safeBuffer)
  );
  const lastSection = getToKingdomsAheadSectionAtOffset(
    safeCameraOffset + safeViewportWidth + safeBuffer
  );

  return Object.freeze(Array.from(
    { length: lastSection.worldIndex - firstSection.worldIndex + 1 },
    (_, index) => getToKingdomsAheadSection(firstSection.worldIndex + index)
  ));
}

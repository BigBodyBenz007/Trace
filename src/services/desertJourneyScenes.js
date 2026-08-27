import sphinxOpener from "../assets/life-current/desert-journey/baked-v2/00-sphinx-opener.png";
import oasis from "../assets/life-current/desert-journey/baked-v2/01-oasis.png";
import soloTraveler from "../assets/life-current/desert-journey/baked-v2/02-solo-traveler.png";
import ancientRuins from "../assets/life-current/desert-journey/baked-v2/03-ancient-ruins.png";
import pyramids from "../assets/life-current/desert-journey/baked-v2/04-pyramids.png";
import desertCity from "../assets/life-current/desert-journey/baked-v2/05-desert-city.png";
import rockTemple from "../assets/life-current/desert-journey/baked-v2/06-rock-temple.png";
import cacti from "../assets/life-current/desert-journey/baked-v2/07-cacti.png";
import familyTravelers from "../assets/life-current/desert-journey/baked-v2/08-family-travelers.png";
import largeCaravan from "../assets/life-current/desert-journey/baked-v2/09-large-caravan.png";
import vultures from "../assets/life-current/desert-journey/baked-v2/10-vultures.png";

export const DESERT_NATIVE_WIDTH = 1774;
export const DESERT_NATIVE_HEIGHT = 887;
export const DESERT_SCENERY_WIDTH = 520;
export const DESERT_SCENERY_HEIGHT = 260;
export const DESERT_SCENE_BUFFER = DESERT_SCENERY_WIDTH;

export const DESERT_JOURNEY_OPENER = Object.freeze({
  height: DESERT_NATIVE_HEIGHT,
  id: "sphinx-opener",
  image: sphinxOpener,
  width: DESERT_NATIVE_WIDTH,
});

export const DESERT_JOURNEY_SCENES = Object.freeze([
  Object.freeze({ id: "oasis", image: oasis }),
  Object.freeze({ id: "solo-traveler", image: soloTraveler }),
  Object.freeze({ id: "ancient-ruins", image: ancientRuins }),
  Object.freeze({ id: "pyramids", image: pyramids }),
  Object.freeze({ id: "desert-city", image: desertCity }),
  Object.freeze({ id: "rock-temple", image: rockTemple }),
  Object.freeze({ id: "cacti", image: cacti }),
  Object.freeze({ id: "family-travelers", image: familyTravelers }),
  Object.freeze({ id: "large-caravan", image: largeCaravan }),
  Object.freeze({ id: "vultures", image: vultures }),
].map((scene) => Object.freeze({
  ...scene,
  height: DESERT_NATIVE_HEIGHT,
  width: DESERT_NATIVE_WIDTH,
})));

export const DESERT_SCENE_CYCLE_WIDTH =
  DESERT_JOURNEY_SCENES.length * DESERT_SCENERY_WIDTH;

export function getDesertSection(worldIndex) {
  const safeWorldIndex = Math.max(0, Math.floor(Number(worldIndex) || 0));
  if (safeWorldIndex === 0) {
    return Object.freeze({
      ...DESERT_JOURNEY_OPENER,
      cycleIndex: -1,
      key: "0-sphinx-opener",
      left: 0,
      sceneIndex: -1,
      worldIndex: 0,
    });
  }

  const sceneIndex = (safeWorldIndex - 1) % DESERT_JOURNEY_SCENES.length;
  const cycleIndex = Math.floor((safeWorldIndex - 1) / DESERT_JOURNEY_SCENES.length);
  const scene = DESERT_JOURNEY_SCENES[sceneIndex];
  return Object.freeze({
    ...scene,
    cycleIndex,
    key: `${safeWorldIndex}-${scene.id}`,
    left: safeWorldIndex * DESERT_SCENERY_WIDTH,
    sceneIndex,
    worldIndex: safeWorldIndex,
  });
}

export function getNearbyDesertSections(
  cameraOffset,
  viewportWidth,
  buffer = DESERT_SCENE_BUFFER
) {
  const safeCameraOffset = Math.max(0, Number(cameraOffset) || 0);
  const safeViewportWidth = Math.max(1, Number(viewportWidth) || 1);
  const safeBuffer = Math.max(0, Number(buffer) || 0);
  const firstIndex = Math.max(
    0,
    Math.floor((safeCameraOffset - safeBuffer) / DESERT_SCENERY_WIDTH)
  );
  const lastIndex = Math.max(
    firstIndex,
    Math.floor(
      (safeCameraOffset + safeViewportWidth + safeBuffer) / DESERT_SCENERY_WIDTH
    )
  );

  return Object.freeze(Array.from(
    { length: lastIndex - firstIndex + 1 },
    (_, index) => getDesertSection(firstIndex + index)
  ));
}

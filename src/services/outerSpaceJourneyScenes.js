import starGateOpener from "../assets/life-current/outer-space-journey/00-star-gate-opener.png";
import waystones from "../assets/life-current/outer-space-journey/01-waystones.png";
import mineralGarden from "../assets/life-current/outer-space-journey/02-mineral-garden.png";
import ancientRuins from "../assets/life-current/outer-space-journey/03-ancient-ruins.png";
import ringedPlanetObservatory from "../assets/life-current/outer-space-journey/04-ringed-planet-observatory.png";
import alienOasis from "../assets/life-current/outer-space-journey/05-alien-oasis.png";
import rockTemple from "../assets/life-current/outer-space-journey/06-rock-temple.png";
import basaltPass from "../assets/life-current/outer-space-journey/07-basalt-pass.png";
import explorersRover from "../assets/life-current/outer-space-journey/08-explorers-rover.png";
import ancientCity from "../assets/life-current/outer-space-journey/09-ancient-city.png";
import nomadCaravan from "../assets/life-current/outer-space-journey/10-nomad-caravan.png";

export const OUTER_SPACE_NATIVE_WIDTH = 1774;
export const OUTER_SPACE_NATIVE_HEIGHT = 887;
export const OUTER_SPACE_SCENERY_WIDTH = 520;
export const OUTER_SPACE_SCENERY_HEIGHT = 260;
export const OUTER_SPACE_SCENE_BUFFER = OUTER_SPACE_SCENERY_WIDTH;

export const OUTER_SPACE_JOURNEY_OPENER = Object.freeze({
  height: OUTER_SPACE_NATIVE_HEIGHT,
  id: "star-gate-opener",
  image: starGateOpener,
  width: OUTER_SPACE_NATIVE_WIDTH,
});

export const OUTER_SPACE_JOURNEY_SCENES = Object.freeze([
  Object.freeze({ id: "waystones", image: waystones }),
  Object.freeze({ id: "mineral-garden", image: mineralGarden }),
  Object.freeze({ id: "ancient-ruins", image: ancientRuins }),
  Object.freeze({ id: "ringed-planet-observatory", image: ringedPlanetObservatory }),
  Object.freeze({ id: "alien-oasis", image: alienOasis }),
  Object.freeze({ id: "rock-temple", image: rockTemple }),
  Object.freeze({ id: "basalt-pass", image: basaltPass }),
  Object.freeze({ id: "explorers-rover", image: explorersRover }),
  Object.freeze({ id: "ancient-city", image: ancientCity }),
  Object.freeze({ id: "nomad-caravan", image: nomadCaravan }),
].map((scene) => Object.freeze({
  ...scene,
  height: OUTER_SPACE_NATIVE_HEIGHT,
  width: OUTER_SPACE_NATIVE_WIDTH,
})));

export const OUTER_SPACE_SCENE_CYCLE_WIDTH =
  OUTER_SPACE_JOURNEY_SCENES.length * OUTER_SPACE_SCENERY_WIDTH;

export function getOuterSpaceSection(worldIndex) {
  const safeWorldIndex = Math.max(0, Math.floor(Number(worldIndex) || 0));
  if (safeWorldIndex === 0) {
    return Object.freeze({
      ...OUTER_SPACE_JOURNEY_OPENER,
      cycleIndex: -1,
      key: "0-star-gate-opener",
      left: 0,
      sceneIndex: -1,
      worldIndex: 0,
    });
  }

  const sceneIndex = (safeWorldIndex - 1) % OUTER_SPACE_JOURNEY_SCENES.length;
  const cycleIndex = Math.floor((safeWorldIndex - 1) / OUTER_SPACE_JOURNEY_SCENES.length);
  const scene = OUTER_SPACE_JOURNEY_SCENES[sceneIndex];
  return Object.freeze({
    ...scene,
    cycleIndex,
    key: `${safeWorldIndex}-${scene.id}`,
    left: safeWorldIndex * OUTER_SPACE_SCENERY_WIDTH,
    sceneIndex,
    worldIndex: safeWorldIndex,
  });
}

export function getNearbyOuterSpaceSections(
  cameraOffset,
  viewportWidth,
  buffer = OUTER_SPACE_SCENE_BUFFER
) {
  const safeCameraOffset = Math.max(0, Number(cameraOffset) || 0);
  const safeViewportWidth = Math.max(1, Number(viewportWidth) || 1);
  const safeBuffer = Math.max(0, Number(buffer) || 0);
  const firstIndex = Math.max(
    0,
    Math.floor((safeCameraOffset - safeBuffer) / OUTER_SPACE_SCENERY_WIDTH)
  );
  const lastIndex = Math.max(
    firstIndex,
    Math.floor(
      (safeCameraOffset + safeViewportWidth + safeBuffer) /
        OUTER_SPACE_SCENERY_WIDTH
    )
  );

  return Object.freeze(Array.from(
    { length: lastIndex - firstIndex + 1 },
    (_, index) => getOuterSpaceSection(firstIndex + index)
  ));
}

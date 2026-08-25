import blackwaterMarsh from "../assets/life-current/haunted-forest/sections/haunted-forest-06-blackwater-marsh.png";
import crowdedTangle from "../assets/life-current/haunted-forest/sections/haunted-forest-03-crowded-tangle.png";
import fallenGiant from "../assets/life-current/haunted-forest/sections/haunted-forest-08-fallen-giant.png";
import firstTrail from "../assets/life-current/haunted-forest/sections/haunted-forest-02-first-trail.png";
import hollowClearing from "../assets/life-current/haunted-forest/sections/haunted-forest-05-hollow-clearing.png";
import lanternGrove from "../assets/life-current/haunted-forest/sections/haunted-forest-09-lantern-grove.png";
import quietExit from "../assets/life-current/haunted-forest/sections/haunted-forest-10-quiet-exit.png";
import rootDoorway from "../assets/life-current/haunted-forest/sections/haunted-forest-01-root-doorway.png";
import stoneDescent from "../assets/life-current/haunted-forest/sections/haunted-forest-04-stone-descent.png";
import whiteFogCrossing from "../assets/life-current/haunted-forest/sections/haunted-forest-07-white-fog-crossing.png";

const SOURCE_WIDTH = 1600;
const SOURCE_HEIGHT = 900;

function section(id, label, image, order) {
  return Object.freeze({
    crop: Object.freeze({ height: "100%", top: "0%", x: "50%" }),
    id,
    join: Object.freeze({ desktop: order === 0 ? 0 : 64, mobile: order === 0 ? 0 : 48 }),
    label,
    mobileWeight: 460,
    order,
    sources: Object.freeze({
      largeHeight: SOURCE_HEIGHT,
      largeWidth: SOURCE_WIDTH,
      png: image,
    }),
    weight: 460,
  });
}

export const HAUNTED_FOREST_SECTIONS = Object.freeze([
  section("root-doorway", "Root doorway", rootDoorway, 0),
  section("first-trail", "First trail", firstTrail, 1),
  section("crowded-tangle", "Crowded tangle", crowdedTangle, 2),
  section("stone-descent", "Stone descent", stoneDescent, 3),
  section("hollow-clearing", "Hollow clearing", hollowClearing, 4),
  section("blackwater-marsh", "Blackwater marsh", blackwaterMarsh, 5),
  section("white-fog-crossing", "White fog crossing", whiteFogCrossing, 6),
  section("fallen-giant", "Fallen giant", fallenGiant, 7),
  section("lantern-grove", "Lantern grove", lanternGrove, 8),
  section("quiet-exit", "Quiet exit", quietExit, 9),
]);

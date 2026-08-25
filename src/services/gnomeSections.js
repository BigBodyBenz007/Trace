import afterBookStart from "../assets/life-current/gnome/sections/01-gnome-after-book-start.png";
import bookBeginning from "../assets/life-current/gnome/sections/00-gnome-book-beginning.png";
import bridge from "../assets/life-current/gnome/sections/05-gnome-bridge.png";
import geometryMaster from "../assets/life-current/gnome/sections/02-gnome-geometry-master.png";
import marketplace from "../assets/life-current/gnome/sections/03-gnome-marketplace.png";
import moonlitVillageByTheStream from "../assets/life-current/gnome/sections/moonlit_gnome_village_by_the_stream.png";
import townCenter from "../assets/life-current/gnome/sections/07-gnome-town-center.png";
import treehouseDistrict from "../assets/life-current/gnome/sections/06-gnome-treehouse-district.png";
import twilightVillageByTheStream from "../assets/life-current/gnome/sections/twilight_gnome_village_by_the_stream.png";
import twilightVillageInTheHills from "../assets/life-current/gnome/sections/twilight_gnome_village_in_the_hills.png";
import twilightToSunriseVillage from "../assets/life-current/gnome/sections/twilight_to_sunrise_gnome_village.png";
import waterfall from "../assets/life-current/gnome/sections/04-gnome-waterfall.png";

const SOURCE_WIDTH = 1672;
const SOURCE_HEIGHT = 941;

function section(
  id,
  label,
  image,
  order,
  sequenceRole,
  crop = {},
  lightingGroup = "daylight-compatible"
) {
  return Object.freeze({
    crop: Object.freeze({
      height: crop.height || "100%",
      top: crop.top || "0%",
      x: crop.x || "50%",
    }),
    id,
    join: Object.freeze({ desktop: order === 0 ? 0 : 64, mobile: order === 0 ? 0 : 48 }),
    label,
    lightingGroup,
    mobileWeight: 460,
    order,
    sequenceRole,
    sources: Object.freeze({
      largeHeight: SOURCE_HEIGHT,
      largeWidth: SOURCE_WIDTH,
      png: image,
    }),
    weight: 460,
  });
}

function lockedEveningSection(
  id,
  label,
  image,
  order,
  sequenceIndex,
  lightingGroup
) {
  return Object.freeze({
    ...section(id, label, image, order, "locked-evening", {}, lightingGroup),
    lockedSequence: "dusk-night-dawn",
    sequenceIndex,
  });
}

export const GNOME_OPENER_SECTION = section(
  "book-beginning",
  "Book beginning",
  bookBeginning,
  0,
  "opener",
  {},
  "opening"
);

const geometryMasterSection = section(
  "geometry-master",
  "Geometry master",
  geometryMaster,
  1,
  "reusable",
  { height: "150.1%", top: "-25%" }
);
const marketplaceSection = section(
  "marketplace",
  "Marketplace",
  marketplace,
  2,
  "reusable",
  { height: "140.5%", top: "-20.3%" }
);
const treehouseDistrictSection = section(
  "treehouse-district",
  "Treehouse district",
  treehouseDistrict,
  6,
  "reusable"
);
const townCenterSection = section(
  "town-center",
  "Town center",
  townCenter,
  3,
  "reusable"
);
const bridgeSection = section("bridge", "Bridge", bridge, 4, "reusable");
const waterfallSection = section("waterfall", "Waterfall", waterfall, 5, "reusable");

export const GNOME_DAYTIME_POOL = Object.freeze([
  geometryMasterSection,
  marketplaceSection,
  townCenterSection,
  bridgeSection,
  waterfallSection,
  treehouseDistrictSection,
]);

export const GNOME_DAYTIME_SECTIONS = GNOME_DAYTIME_POOL;
export const GNOME_REUSABLE_SECTIONS = GNOME_DAYTIME_POOL;

export const GNOME_DUSK_APPROACH_SECTION = section(
  "after-book-start",
  "Warm woodland approach",
  afterBookStart,
  7,
  "dusk-approach",
  { height: "186.7%", top: "-43.3%" },
  "warm-daylight-bridge"
);

export const GNOME_EVENING_SEQUENCE = Object.freeze([
  lockedEveningSection(
    "twilight-hills",
    "Day fading into dusk",
    twilightVillageInTheHills,
    8,
    0,
    "dusk"
  ),
  lockedEveningSection(
    "twilight-stream",
    "Dusk deepening into night",
    twilightVillageByTheStream,
    9,
    1,
    "dusk-to-night"
  ),
  lockedEveningSection(
    "moonlit-stream",
    "Full nighttime village",
    moonlitVillageByTheStream,
    10,
    2,
    "night"
  ),
  lockedEveningSection(
    "sunrise-return",
    "Pre-dawn into sunrise",
    twilightToSunriseVillage,
    11,
    3,
    "dawn-to-daylight"
  ),
]);

export const GNOME_SCENE_CYCLE = Object.freeze([
  ...GNOME_DAYTIME_POOL,
  GNOME_DUSK_APPROACH_SECTION,
  ...GNOME_EVENING_SEQUENCE,
]);

export const GNOME_SECTIONS = Object.freeze([
  GNOME_OPENER_SECTION,
  ...GNOME_SCENE_CYCLE,
  ...GNOME_DAYTIME_POOL,
  GNOME_DUSK_APPROACH_SECTION,
]);

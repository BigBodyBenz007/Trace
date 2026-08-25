import afterBookStart from "../assets/life-current/gnome/sections/01-gnome-after-book-start.png";
import bookBeginning from "../assets/life-current/gnome/sections/00-gnome-book-beginning.png";
import bridge from "../assets/life-current/gnome/sections/05-gnome-bridge.png";
import dawn from "../assets/life-current/gnome/sections/10-gnome-dawn.png";
import dusk from "../assets/life-current/gnome/sections/08-gnome-dusk.png";
import geometryMaster from "../assets/life-current/gnome/sections/02-gnome-geometry-master.png";
import marketplace from "../assets/life-current/gnome/sections/03-gnome-marketplace.png";
import night from "../assets/life-current/gnome/sections/09-gnome-night.png";
import townCenter from "../assets/life-current/gnome/sections/07-gnome-town-center.png";
import treehouseDistrict from "../assets/life-current/gnome/sections/06-gnome-treehouse-district.png";
import waterfall from "../assets/life-current/gnome/sections/04-gnome-waterfall.png";

const SOURCE_WIDTH = 1672;
const SOURCE_HEIGHT = 941;

function section(id, label, image, order, sequenceRole, crop = {}) {
  return Object.freeze({
    crop: Object.freeze({
      height: crop.height || "100%",
      top: crop.top || "0%",
      x: crop.x || "50%",
    }),
    id,
    join: Object.freeze({ desktop: order === 0 ? 0 : 64, mobile: order === 0 ? 0 : 48 }),
    label,
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

export const GNOME_OPENER_SECTION = section(
  "book-beginning",
  "Book beginning",
  bookBeginning,
  0,
  "opener"
);

export const GNOME_REUSABLE_SECTIONS = Object.freeze([
  section("after-book-start", "After book start", afterBookStart, 1, "reusable"),
  section(
    "geometry-master",
    "Geometry master",
    geometryMaster,
    2,
    "reusable",
    { height: "150.1%", top: "-25%" }
  ),
  section(
    "marketplace",
    "Marketplace",
    marketplace,
    3,
    "reusable",
    { height: "140.5%", top: "-20.3%" }
  ),
  section("waterfall", "Waterfall", waterfall, 4, "reusable"),
  section("bridge", "Bridge", bridge, 5, "reusable"),
  section("treehouse-district", "Treehouse district", treehouseDistrict, 6, "reusable"),
  section("town-center", "Town center", townCenter, 7, "reusable"),
  section("dusk", "Dusk", dusk, 8, "reusable"),
  section("night", "Night", night, 9, "reusable"),
  section("dawn", "Dawn", dawn, 10, "reusable"),
]);

export const GNOME_SECTIONS = Object.freeze([
  GNOME_OPENER_SECTION,
  ...GNOME_REUSABLE_SECTIONS,
]);

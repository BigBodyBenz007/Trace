import broadCalm from "../assets/life-current/river/catalog/06-broad-calm.png";
import broadEnergeticWhitewater from "../assets/life-current/river/catalog/07-broad-energetic-whitewater.png";
import descendingBroadToRapids from "../assets/life-current/river/catalog/09-descending-broad-to-rapids.png";
import mediumActiveSBend from "../assets/life-current/river/catalog/04-medium-active-s-bend.png";
import mediumCalmBend from "../assets/life-current/river/catalog/03-medium-calm-bend.png";
import mediumWhitewaterDescent from "../assets/life-current/river/catalog/05-medium-whitewater-descent.png";
import narrowCalm from "../assets/life-current/river/catalog/01-narrow-calm.png";
import narrowRockyWhitewater from "../assets/life-current/river/catalog/02-narrow-rocky-whitewater.png";
import recoveryPool from "../assets/life-current/river/catalog/10-recovery-pool.png";
import risingNarrowToBroad from "../assets/life-current/river/catalog/08-rising-narrow-to-broad.png";

function pngSource(image, largeWidth, largeHeight) {
  return Object.freeze({ png: image, largeHeight, largeWidth });
}

function section({
  cropX = "50%",
  direction,
  energy,
  entryWidth,
  exitWidth,
  flipX = false,
  height,
  id,
  image,
  join,
  label,
  mobileJoin,
  mobileWeight,
  order,
  roles,
  weight,
  width,
  widthPixels,
}) {
  return Object.freeze({
    crop: Object.freeze({ height: "100%", top: "0%", x: cropX }),
    direction,
    energy,
    entryWidth,
    exitWidth,
    flipX,
    id,
    join: Object.freeze({ desktop: join, mobile: mobileJoin }),
    label,
    mobileWeight,
    order,
    roles: Object.freeze(roles),
    sources: pngSource(image, widthPixels, height),
    weight,
    width,
  });
}

// The order is the approved transition-aware rehearsal sequence. Metadata stays
// attached to each scene so a caller can use the same catalog contextually.
export const RIVER_CATALOG_SECTIONS = Object.freeze([
  section({
    id: "narrow-calm",
    label: "Narrow calm",
    image: narrowCalm,
    widthPixels: 1774,
    height: 887,
    width: "narrow",
    energy: "calm",
    direction: "level",
    roles: ["recovery"],
    entryWidth: "narrow",
    exitWidth: "narrow",
    order: 1,
    weight: 520,
    mobileWeight: 520,
    join: 0,
    mobileJoin: 0,
  }),
  section({
    id: "narrow-rocky-whitewater",
    label: "Narrow rocky whitewater",
    image: narrowRockyWhitewater,
    widthPixels: 1983,
    height: 793,
    width: "narrow",
    energy: "turbulent",
    direction: "level",
    roles: ["broad-to-rapids"],
    entryWidth: "narrow",
    exitWidth: "narrow",
    order: 2,
    weight: 650,
    mobileWeight: 600,
    join: 96,
    mobileJoin: 64,
  }),
  section({
    id: "rising-narrow-to-broad",
    label: "Rising narrow to broad",
    image: risingNarrowToBroad,
    widthPixels: 2167,
    height: 725,
    width: "broad",
    energy: "active",
    direction: "rising",
    roles: ["narrow-to-medium", "medium-to-broad"],
    entryWidth: "narrow",
    exitWidth: "broad",
    flipX: true,
    order: 3,
    weight: 776,
    mobileWeight: 600,
    join: 112,
    mobileJoin: 72,
  }),
  section({
    id: "medium-calm-bend",
    label: "Medium calm bend",
    image: mediumCalmBend,
    widthPixels: 1774,
    height: 887,
    width: "medium",
    energy: "calm",
    direction: "level",
    roles: ["narrow-to-medium", "recovery"],
    entryWidth: "narrow",
    exitWidth: "medium",
    order: 4,
    weight: 520,
    mobileWeight: 520,
    join: 104,
    mobileJoin: 68,
  }),
  section({
    id: "broad-calm",
    label: "Broad calm",
    image: broadCalm,
    widthPixels: 1824,
    height: 862,
    width: "broad",
    energy: "calm",
    direction: "level",
    roles: ["medium-to-broad", "recovery"],
    entryWidth: "medium",
    exitWidth: "broad",
    order: 5,
    weight: 550,
    mobileWeight: 520,
    join: 112,
    mobileJoin: 72,
  }),
  section({
    id: "medium-active-s-bend",
    label: "Medium active S-bend",
    image: mediumActiveSBend,
    widthPixels: 1774,
    height: 887,
    width: "medium",
    energy: "active",
    direction: "rising",
    roles: ["narrow-to-medium"],
    entryWidth: "medium",
    exitWidth: "medium",
    order: 6,
    weight: 520,
    mobileWeight: 520,
    join: 104,
    mobileJoin: 68,
  }),
  section({
    id: "broad-energetic-whitewater",
    label: "Broad energetic whitewater",
    image: broadEnergeticWhitewater,
    widthPixels: 1774,
    height: 887,
    width: "broad",
    energy: "turbulent",
    direction: "rising",
    roles: ["medium-to-broad"],
    entryWidth: "broad",
    exitWidth: "broad",
    order: 7,
    weight: 520,
    mobileWeight: 520,
    join: 104,
    mobileJoin: 68,
  }),
  section({
    id: "medium-whitewater-descent",
    label: "Medium whitewater descent",
    image: mediumWhitewaterDescent,
    widthPixels: 2172,
    height: 724,
    width: "medium",
    energy: "turbulent",
    direction: "descending",
    roles: ["broad-to-rapids"],
    entryWidth: "medium",
    exitWidth: "narrow",
    order: 8,
    weight: 780,
    mobileWeight: 600,
    join: 112,
    mobileJoin: 72,
  }),
  section({
    id: "descending-broad-to-rapids",
    label: "Descending broad to rapids",
    image: descendingBroadToRapids,
    widthPixels: 1774,
    height: 887,
    width: "medium",
    energy: "turbulent",
    direction: "descending",
    roles: ["broad-to-rapids"],
    entryWidth: "broad",
    exitWidth: "narrow",
    order: 9,
    weight: 520,
    mobileWeight: 520,
    join: 104,
    mobileJoin: 68,
  }),
  section({
    id: "recovery-pool",
    label: "Recovery pool",
    image: recoveryPool,
    widthPixels: 2172,
    height: 724,
    width: "medium",
    energy: "calm",
    direction: "level",
    roles: ["recovery"],
    entryWidth: "narrow",
    exitWidth: "medium",
    order: 10,
    weight: 780,
    mobileWeight: 600,
    join: 112,
    mobileJoin: 72,
  }),
]);

const DENSITY_WIDTH = Object.freeze({ low: "narrow", medium: "medium", high: "broad" });
const ACTIVITY_ENERGY = Object.freeze({ low: "calm", medium: "active", high: "turbulent" });

export function selectRiverSection(state = {}, previousSection = null) {
  const targetWidth = DENSITY_WIDTH[state.density] || "medium";
  const targetEnergy = state.mood === "recovery"
    ? "calm"
    : ACTIVITY_ENERGY[state.activity] || "active";
  const targetRole = state.mood === "recovery"
    ? "recovery"
    : previousSection && previousSection.exitWidth !== targetWidth
      ? `${previousSection.exitWidth}-to-${targetWidth}`
      : null;

  return RIVER_CATALOG_SECTIONS
    .map((candidate) => {
      let score = 0;
      if (candidate.width === targetWidth) score += 4;
      if (candidate.energy === targetEnergy) score += 4;
      if (candidate.direction === state.direction) score += 6;
      if (targetRole && candidate.roles.includes(targetRole)) score += 3;
      if (previousSection?.exitWidth === candidate.entryWidth) score += 3;
      if (state.mood === "recovery" && candidate.id === "recovery-pool") score += 4;
      if (candidate.id === previousSection?.id) score -= 8;
      return { candidate, score };
    })
    .sort((left, right) => right.score - left.score || left.candidate.order - right.candidate.order)[0]
    .candidate;
}

export function buildRiverSequence(states = []) {
  if (!Array.isArray(states) || states.length === 0) return RIVER_CATALOG_SECTIONS;

  const selected = [];
  states.forEach((state) => {
    selected.push(selectRiverSection(state, selected[selected.length - 1] || null));
  });
  return Object.freeze(selected);
}

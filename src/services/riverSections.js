import broadLivingAvifLarge from "../assets/life-current/river/sections/broad-living-1920w.avif";
import broadLivingAvifSmall from "../assets/life-current/river/sections/broad-living-960w.avif";
import broadLivingWebpLarge from "../assets/life-current/river/sections/broad-living-1920w.webp";
import broadLivingWebpSmall from "../assets/life-current/river/sections/broad-living-960w.webp";
import gentleRiseAvifLarge from "../assets/life-current/river/sections/gentle-rise-1920w.avif";
import gentleRiseAvifSmall from "../assets/life-current/river/sections/gentle-rise-960w.avif";
import gentleRiseWebpLarge from "../assets/life-current/river/sections/gentle-rise-1920w.webp";
import gentleRiseWebpSmall from "../assets/life-current/river/sections/gentle-rise-960w.webp";
import gradualDescentAvifLarge from "../assets/life-current/river/sections/gradual-descent-1774w.avif";
import gradualDescentAvifSmall from "../assets/life-current/river/sections/gradual-descent-960w.avif";
import gradualDescentWebpLarge from "../assets/life-current/river/sections/gradual-descent-1774w.webp";
import gradualDescentWebpSmall from "../assets/life-current/river/sections/gradual-descent-960w.webp";
import highCalmAvifLarge from "../assets/life-current/river/sections/high-calm-1920w.avif";
import highCalmAvifSmall from "../assets/life-current/river/sections/high-calm-960w.avif";
import highCalmWebpLarge from "../assets/life-current/river/sections/high-calm-1920w.webp";
import highCalmWebpSmall from "../assets/life-current/river/sections/high-calm-960w.webp";
import livelyCurrentAvifLarge from "../assets/life-current/river/sections/lively-current-1920w.avif";
import livelyCurrentAvifSmall from "../assets/life-current/river/sections/lively-current-960w.avif";
import livelyCurrentWebpLarge from "../assets/life-current/river/sections/lively-current-1920w.webp";
import livelyCurrentWebpSmall from "../assets/life-current/river/sections/lively-current-960w.webp";
import quietNarrowAvifLarge from "../assets/life-current/river/sections/quiet-narrow-1920w.avif";
import quietNarrowAvifSmall from "../assets/life-current/river/sections/quiet-narrow-960w.avif";
import quietNarrowWebpLarge from "../assets/life-current/river/sections/quiet-narrow-1920w.webp";
import quietNarrowWebpSmall from "../assets/life-current/river/sections/quiet-narrow-960w.webp";
import { RIVER_CATALOG_SECTIONS } from "./riverCatalog";

function sources(
  avifSmall,
  avifLarge,
  webpSmall,
  webpLarge,
  largeWidth = 1920,
  largeHeight = 640
) {
  return Object.freeze({
    avif: Object.freeze({ small: avifSmall, large: avifLarge }),
    webp: Object.freeze({ small: webpSmall, large: webpLarge }),
    largeHeight,
    largeWidth,
  });
}

export const RIVER_FALLBACK_SECTIONS = Object.freeze([
  Object.freeze({
    id: "quiet-narrow",
    label: "Quiet narrow",
    weight: 680,
    mobileWeight: 560,
    join: Object.freeze({ desktop: 0, mobile: 0 }),
    crop: Object.freeze({ height: "100%", top: "0%", x: "44%" }),
    sources: sources(
      quietNarrowAvifSmall,
      quietNarrowAvifLarge,
      quietNarrowWebpSmall,
      quietNarrowWebpLarge
    ),
  }),
  Object.freeze({
    id: "gentle-rise",
    label: "Gentle rise",
    weight: 780,
    mobileWeight: 600,
    join: Object.freeze({ desktop: 184, mobile: 104 }),
    crop: Object.freeze({ height: "100%", top: "0%", x: "50%" }),
    sources: sources(
      gentleRiseAvifSmall,
      gentleRiseAvifLarge,
      gentleRiseWebpSmall,
      gentleRiseWebpLarge
    ),
  }),
  Object.freeze({
    id: "high-calm",
    label: "High calm",
    weight: 760,
    mobileWeight: 600,
    join: Object.freeze({ desktop: 216, mobile: 120 }),
    crop: Object.freeze({ height: "100%", top: "0%", x: "48%" }),
    sources: sources(
      highCalmAvifSmall,
      highCalmAvifLarge,
      highCalmWebpSmall,
      highCalmWebpLarge
    ),
  }),
  Object.freeze({
    id: "broad-living",
    label: "Broad living",
    weight: 780,
    mobileWeight: 600,
    join: Object.freeze({ desktop: 248, mobile: 136 }),
    crop: Object.freeze({ height: "100%", top: "0%", x: "48%" }),
    sources: sources(
      broadLivingAvifSmall,
      broadLivingAvifLarge,
      broadLivingWebpSmall,
      broadLivingWebpLarge
    ),
  }),
  Object.freeze({
    id: "lively-current",
    label: "Lively current",
    weight: 780,
    mobileWeight: 600,
    join: Object.freeze({ desktop: 224, mobile: 124 }),
    crop: Object.freeze({ height: "100%", top: "0%", x: "52%" }),
    sources: sources(
      livelyCurrentAvifSmall,
      livelyCurrentAvifLarge,
      livelyCurrentWebpSmall,
      livelyCurrentWebpLarge
    ),
  }),
  Object.freeze({
    id: "gradual-descent",
    label: "Gradual descent",
    weight: 520,
    mobileWeight: 520,
    join: Object.freeze({ desktop: 216, mobile: 120 }),
    crop: Object.freeze({ height: "100%", top: "0%", x: "50%" }),
    sources: sources(
      gradualDescentAvifSmall,
      gradualDescentAvifLarge,
      gradualDescentWebpSmall,
      gradualDescentWebpLarge,
      1774,
      887
    ),
  }),
]);

export function resolveRiverSections(candidate = RIVER_CATALOG_SECTIONS) {
  const validCatalog = Array.isArray(candidate)
    && candidate.length === 10
    && candidate.every((section) => section?.id && section?.sources);
  return validCatalog ? candidate : RIVER_FALLBACK_SECTIONS;
}

export const RIVER_SECTIONS = resolveRiverSections();

function buildStripLayout(mobile, riverSections) {
  let start = 0;
  const sections = riverSections.map((section) => {
    const width = mobile ? section.mobileWeight : section.weight;
    const join = mobile ? section.join.mobile : section.join.desktop;
    start -= join;
    const metrics = Object.freeze({ join, start, width });
    start += width;
    return metrics;
  });
  return Object.freeze({ sections: Object.freeze(sections), totalWidth: start });
}

const DESKTOP_STRIP_LAYOUT = buildStripLayout(false, RIVER_SECTIONS);
const MOBILE_STRIP_LAYOUT = buildStripLayout(true, RIVER_SECTIONS);
const FALLBACK_DESKTOP_STRIP_LAYOUT = buildStripLayout(false, RIVER_FALLBACK_SECTIONS);
const FALLBACK_MOBILE_STRIP_LAYOUT = buildStripLayout(true, RIVER_FALLBACK_SECTIONS);

export function getRiverStripLayout(viewportWidth, riverSections = RIVER_SECTIONS) {
  const mobile = viewportWidth <= 720;
  if (riverSections === RIVER_SECTIONS) {
    return mobile ? MOBILE_STRIP_LAYOUT : DESKTOP_STRIP_LAYOUT;
  }
  if (riverSections === RIVER_FALLBACK_SECTIONS) {
    return mobile ? FALLBACK_MOBILE_STRIP_LAYOUT : FALLBACK_DESKTOP_STRIP_LAYOUT;
  }
  return buildStripLayout(mobile, riverSections);
}

export function locateRiverSection(progress, riverSections = RIVER_SECTIONS) {
  const normalizedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  if (normalizedProgress === 1) {
    return { index: riverSections.length - 1, localProgress: 1 };
  }

  const totalSectionWeight = riverSections.reduce(
    (total, section) => total + section.weight,
    0
  );
  const position = normalizedProgress * totalSectionWeight;
  let sectionStart = 0;
  for (let index = 0; index < riverSections.length; index += 1) {
    const section = riverSections[index];
    const sectionEnd = sectionStart + section.weight;
    if (position < sectionEnd) {
      return {
        index,
        localProgress: (position - sectionStart) / section.weight,
      };
    }
    sectionStart = sectionEnd;
  }

  return { index: riverSections.length - 1, localProgress: 1 };
}

export function neighboringRiverSectionIndexes(index, riverSections = RIVER_SECTIONS) {
  return [index - 1, index, index + 1]
    .filter((candidate) => candidate >= 0 && candidate < riverSections.length);
}

export function nearbyRiverSectionIndexes(
  index,
  viewportWidth,
  riverSections = RIVER_SECTIONS
) {
  const indexes = neighboringRiverSectionIndexes(index, riverSections);
  const layout = getRiverStripLayout(viewportWidth, riverSections);
  let firstIndex = indexes[0];
  let lastIndex = indexes[indexes.length - 1];
  const coveredWidth = () => {
    const first = layout.sections[firstIndex];
    const last = layout.sections[lastIndex];
    return last.start + last.width - first.start;
  };

  while (coveredWidth() < viewportWidth) {
    if (lastIndex < riverSections.length - 1) {
      lastIndex += 1;
      continue;
    }
    if (firstIndex > 0) {
      firstIndex -= 1;
      continue;
    }
    break;
  }

  return Array.from(
    { length: lastIndex - firstIndex + 1 },
    (_, offset) => firstIndex + offset
  );
}

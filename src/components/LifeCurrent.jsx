import React from "react";
import DesertJourneyCurrent from "./DesertJourneyCurrent";
import GnomeCurrent from "./GnomeCurrent";
import HauntedForestCurrent from "./HauntedForestCurrent";
import OuterSpaceJourneyCurrent from "./OuterSpaceJourneyCurrent";
import RiverCurrent from "./RiverCurrent";
import { getLifeCurrentTheme } from "../services/lifeCurrentThemes";

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 56;
const CENTER_Y = VIEWBOX_HEIGHT / 2;
const MEANDER = 8;
const MINIMUM_MEANDER = MEANDER / 2;
const EDGE_INSET = 12;

export const LIFE_CURRENT_TRAIL_TUNING = Object.freeze({
  extentPixels: 160,
  strokeWidth: 4,
  opacity: 0.24,
});

function activityMeander(point) {
  const intensity = Math.max(0, Math.min(1, Number(point?.intensity) || 0));
  return MINIMUM_MEANDER + intensity * (MEANDER - MINIMUM_MEANDER);
}

export function getLifeCurrentPointCoordinates(points, extendFinalPointToEdge = false) {
  return points.map((point, index) => ({
    x:
      EDGE_INSET +
      point.normalizedX *
        (VIEWBOX_WIDTH - EDGE_INSET - (extendFinalPointToEdge ? 0 : EDGE_INSET)),
    y: CENTER_Y + (index % 2 === 0 ? -1 : 1) * activityMeander(point),
  }));
}

export function LifeCurrentScenery({
  active = true,
  layout,
  themeId = "river",
  viewportRef,
}) {
  const theme = getLifeCurrentTheme(themeId);
  const points = Array.isArray(layout?.points) ? layout.points : [];
  if (points.length === 0) return null;

  if (theme.presentation.renderer === "forest-path") {
    return (
      <HauntedForestCurrent
        active={active}
        points={points}
        themeId={theme.id}
        viewportRef={viewportRef}
      />
    );
  }

  if (theme.presentation.renderer === "gnome-village") {
    return (
      <GnomeCurrent
        active={active}
        points={points}
        themeId={theme.id}
        viewportRef={viewportRef}
      />
    );
  }

  if (theme.presentation.renderer === "desert-journey") {
    return (
      <DesertJourneyCurrent
        active={active}
        points={points}
        themeId={theme.id}
        viewportRef={viewportRef}
      />
    );
  }

  if (theme.presentation.renderer === "outer-space-journey") {
    return (
      <OuterSpaceJourneyCurrent
        active={active}
        points={points}
        themeId={theme.id}
        viewportRef={viewportRef}
      />
    );
  }

  return (
    <RiverCurrent
      active={active}
      points={points}
      themeId={theme.id}
      viewportRef={viewportRef}
    />
  );
}

// Raster themes render from the sticky scenery slot. This retained overlay
// component keeps the Timeline API stable without duplicating scenery inside
// the card canvas.
function LifeCurrent() {
  return null;
}

export default React.memo(LifeCurrent);

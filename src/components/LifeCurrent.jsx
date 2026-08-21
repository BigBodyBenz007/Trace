import React from "react";
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

function currentPath(points, extendFinalPointToEdge = false) {
  const coordinates = getLifeCurrentPointCoordinates(points, extendFinalPointToEdge);
  if (coordinates.length === 0) return "";
  if (coordinates.length === 1) {
    const [{ x, y }] = coordinates;
    return `M ${x - 10} ${y} L ${x + 10} ${y}`;
  }

  return coordinates.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = coordinates[index - 1];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function pathBetween(first, second) {
  if (!second) return `M ${first.x - 10} ${first.y} L ${first.x + 10} ${first.y}`;
  const midpoint = (first.x + second.x) / 2;
  return `M ${first.x} ${first.y} C ${midpoint} ${first.y}, ${midpoint} ${second.y}, ${second.x} ${second.y}`;
}

function forestPathSegments(points, extendFinalPointToEdge) {
  const coordinates = getLifeCurrentPointCoordinates(points, extendFinalPointToEdge);
  if (coordinates.length === 1) {
    return [{
      d: pathBetween(coordinates[0]),
      intensity: Math.max(0, Math.min(1, Number(points[0]?.intensity) || 0)),
    }];
  }
  return coordinates.slice(1).map((coordinate, index) => ({
    d: pathBetween(coordinates[index], coordinate),
    intensity: (
      Math.max(0, Math.min(1, Number(points[index]?.intensity) || 0)) +
      Math.max(0, Math.min(1, Number(points[index + 1]?.intensity) || 0))
    ) / 2,
  }));
}

const DISTANT_TREE_POSITIONS = Object.freeze([55, 165, 285, 415, 550, 685, 820, 945]);
const FOREGROUND_TREE_POSITIONS = Object.freeze([20, 105, 345, 655, 895, 980]);
const FOREST_TREE_PATH = "M -5 0 V -22 H -22 L -9 -42 H -18 L -6 -63 H -13 L 0 -88 L 13 -63 H 6 L 18 -42 H 9 L 22 -22 H 5 V 0 Z";

const HauntedForestScenery = React.memo(function HauntedForestScenery() {
  return (
    <div
      aria-hidden="true"
      data-testid="life-current-forest-scenery-frame"
      style={{
        height: 0,
        left: 0,
        pointerEvents: "none",
        position: "sticky",
        top: 0,
        width: "100%",
        zIndex: 0,
      }}
    >
    <svg
      aria-hidden="true"
      data-testid="life-current-forest-scenery"
      preserveAspectRatio="none"
      viewBox="0 0 1000 150"
      style={{
        height: "150px",
        left: 0,
        overflow: "hidden",
        pointerEvents: "none",
        position: "absolute",
        top: 0,
        width: "100%",
      }}
    >
      <g
        aria-hidden="true"
        data-forest-layer="distant-trees"
        fill="#26392c"
        pointerEvents="none"
        transform="translate(0 140)"
      >
        {DISTANT_TREE_POSITIONS.map((x, index) => (
          <path
            d={FOREST_TREE_PATH}
            key={x}
            transform={`translate(${x} 0) scale(${index % 2 === 0 ? 0.72 : 0.58})`}
          />
        ))}
      </g>
      <g
        aria-hidden="true"
        data-forest-layer="foreground-trees"
        fill="#08110c"
        pointerEvents="none"
        transform="translate(0 150)"
      >
        {FOREGROUND_TREE_POSITIONS.map((x, index) => (
          <path
            d={FOREST_TREE_PATH}
            key={x}
            transform={`translate(${x} 0) scale(${index % 2 === 0 ? 1.18 : 0.96})`}
          />
        ))}
      </g>
    </svg>
    </div>
  );
});

export function LifeCurrentScenery({
  active = true,
  layout,
  themeId = "river",
  viewportRef,
}) {
  const theme = getLifeCurrentTheme(themeId);
  if (theme.presentation.renderer === "forest-path") {
    return <HauntedForestScenery />;
  }
  const points = Array.isArray(layout?.points) ? layout.points : [];
  return points.length > 0 ? (
    <RiverCurrent
      active={active}
      points={points}
      themeId={theme.id}
      viewportRef={viewportRef}
    />
  ) : null;
}

function HauntedForestPath({ path, points, showQuietTrail }) {
  const segments = forestPathSegments(points, showQuietTrail);
  return (
    <g data-life-current-renderer="forest-path">
      <path
        d={path}
        fill="none"
        stroke="#2c241a"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="22"
        vectorEffect="non-scaling-stroke"
      />
      {segments.map((segment, index) => {
        const engagementWidth = 7 + segment.intensity * 7;
        return (
          <path
            data-engagement-width={engagementWidth.toFixed(2)}
            data-forest-path-segment="true"
            d={segment.d}
            fill="none"
            key={index}
            stroke="#765c3b"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={engagementWidth}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}

function LifeCurrent({ layout, showQuietTrail = false, themeId = "river" }) {
  const points = Array.isArray(layout?.points) ? layout.points : [];
  if (points.length === 0) return null;
  const theme = getLifeCurrentTheme(themeId);
  const isForest = theme.presentation.renderer === "forest-path";

  if (!isForest) return null;

  const path = currentPath(points, showQuietTrail);
  return (
    <>
    <svg
      aria-hidden="true"
      data-testid="life-current"
      data-theme-id={theme.id}
      data-last-activity-date={points[points.length - 1]?.dateKey || ""}
      data-quiet-trail="false"
      data-visible-end-x={showQuietTrail ? VIEWBOX_WIDTH : VIEWBOX_WIDTH - EDGE_INSET}
      preserveAspectRatio="none"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      style={{
        height: `${VIEWBOX_HEIGHT}px`,
        left: "32px",
        overflow: "visible",
        pointerEvents: "none",
        position: "absolute",
        right: showQuietTrail
          ? `${32 + LIFE_CURRENT_TRAIL_TUNING.extentPixels}px`
          : "32px",
        top: "90px",
        width: showQuietTrail
          ? `calc(100% - ${64 + LIFE_CURRENT_TRAIL_TUNING.extentPixels}px)`
          : "calc(100% - 64px)",
        zIndex: 0,
      }}
    >
      <HauntedForestPath path={path} points={points} showQuietTrail={showQuietTrail} />
    </svg>
    {/* The Timeline keeps its end gutter for card centering, but activity must
        end at the last authoritative point rather than continue as empty waves. */}
    </>
  );
}

export default React.memo(LifeCurrent);

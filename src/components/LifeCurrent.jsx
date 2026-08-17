import React from "react";

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

function LifeCurrent({ layout, showQuietTrail = false }) {
  const points = Array.isArray(layout?.points) ? layout.points : [];
  const path = currentPath(points, showQuietTrail);
  if (!path) return null;

  return (
    <>
    <svg
      aria-hidden="true"
      data-testid="life-current"
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
      <path
        d={path}
        fill="none"
        stroke="#60a5fa"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.42"
        strokeWidth="6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
    {/* The Timeline keeps its end gutter for card centering, but activity must
        end at the last authoritative point rather than continue as empty waves. */}
    </>
  );
}

export default React.memo(LifeCurrent);

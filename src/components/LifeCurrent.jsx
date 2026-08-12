import React from "react";

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 56;
const CENTER_Y = VIEWBOX_HEIGHT / 2;
const MEANDER = 8;
const EDGE_INSET = 12;

export const LIFE_CURRENT_TRAIL_TUNING = Object.freeze({
  extentPixels: 160,
  strokeWidth: 4,
  opacity: 0.24,
});

function pointCoordinates(points, extendFinalPointToEdge = false) {
  return points.map((point, index) => ({
    x:
      EDGE_INSET +
      point.normalizedX *
        (VIEWBOX_WIDTH - EDGE_INSET - (extendFinalPointToEdge ? 0 : EDGE_INSET)),
    y:
      CENTER_Y +
      (index === 0 || index === points.length - 1
        ? 0
        : (index % 2 === 0 ? -1 : 1) * MEANDER),
  }));
}

function currentPath(points, extendFinalPointToEdge = false) {
  const coordinates = pointCoordinates(points, extendFinalPointToEdge);
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
      data-quiet-trail={showQuietTrail ? "true" : "false"}
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
    {showQuietTrail && (
      <svg
          aria-hidden="true"
          data-testid="life-current-quiet-trail"
          preserveAspectRatio="none"
          data-start-x="0"
          data-end-x={LIFE_CURRENT_TRAIL_TUNING.extentPixels}
          viewBox={`0 0 ${LIFE_CURRENT_TRAIL_TUNING.extentPixels} ${VIEWBOX_HEIGHT}`}
          style={{
            height: `${VIEWBOX_HEIGHT}px`,
            overflow: "visible",
            pointerEvents: "none",
            position: "absolute",
            right: "32px",
            top: "90px",
            width: `${LIFE_CURRENT_TRAIL_TUNING.extentPixels}px`,
            zIndex: 0,
          }}
        >
          <path
            d="M 0 28 C 42 28, 70 24, 104 27 C 126 29, 144 28, 160 28"
            data-testid="life-current-quiet-trail-path"
            fill="none"
            stroke="#60a5fa"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={LIFE_CURRENT_TRAIL_TUNING.opacity}
            strokeWidth={LIFE_CURRENT_TRAIL_TUNING.strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
      </svg>
    )}
    </>
  );
}

export default React.memo(LifeCurrent);

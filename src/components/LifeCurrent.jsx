import React from "react";

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 56;
const CENTER_Y = VIEWBOX_HEIGHT / 2;
const MEANDER = 8;
const EDGE_INSET = 12;

function pointCoordinates(points) {
  return points.map((point, index) => ({
    x: EDGE_INSET + point.normalizedX * (VIEWBOX_WIDTH - EDGE_INSET * 2),
    y:
      CENTER_Y +
      (index === 0 || index === points.length - 1
        ? 0
        : (index % 2 === 0 ? -1 : 1) * MEANDER),
  }));
}

function currentPath(points) {
  const coordinates = pointCoordinates(points);
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

function LifeCurrent({ layout }) {
  const points = Array.isArray(layout?.points) ? layout.points : [];
  const path = currentPath(points);
  if (!path) return null;

  return (
    <svg
      aria-hidden="true"
      data-testid="life-current"
      preserveAspectRatio="none"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      style={{
        height: `${VIEWBOX_HEIGHT}px`,
        left: "32px",
        overflow: "visible",
        pointerEvents: "none",
        position: "absolute",
        right: "32px",
        top: "90px",
        width: "calc(100% - 64px)",
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
  );
}

export default React.memo(LifeCurrent);

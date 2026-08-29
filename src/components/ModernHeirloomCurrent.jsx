import React from "react";

function ModernHeirloomCurrent({ points = [], themeId = "modern-heirloom" }) {
  if (points.length === 0) return null;
  const latestPoint = points[points.length - 1];

  return (
    <div
      aria-hidden="true"
      className="modern-heirloom-current-frame"
      data-last-activity-date={latestPoint?.dateKey || ""}
      data-life-current-renderer="modern-heirloom-current"
      data-quiet-trail="false"
      data-testid="life-current"
      data-theme-id={themeId}
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
      <div className="modern-heirloom-current-scene" data-testid="life-current-modern-heirloom-scenery">
        <svg
          aria-hidden="true"
          className="modern-heirloom-current-lines"
          focusable="false"
          preserveAspectRatio="none"
          viewBox="0 0 1000 260"
        >
          <path
            className="modern-heirloom-current-line modern-heirloom-current-line--companion"
            d="M-30 154 C120 176 180 90 350 112 S590 204 760 143 S940 102 1030 136"
          />
          <path
            className="modern-heirloom-current-line modern-heirloom-current-line--brass"
            d="M-30 145 C120 166 180 80 350 103 S590 194 760 134 S940 93 1030 127"
          />
        </svg>
      </div>
    </div>
  );
}

export default React.memo(ModernHeirloomCurrent);

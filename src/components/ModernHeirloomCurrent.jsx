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
    />
  );
}

export default React.memo(ModernHeirloomCurrent);

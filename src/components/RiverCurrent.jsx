import React, { useLayoutEffect, useRef, useState } from "react";
import {
  getRiverStripLayout,
  locateRiverSection,
  neighboringRiverSectionIndexes,
  RIVER_SECTIONS,
} from "../services/riverSections";

export const RIVER_SCENE_HEIGHT = 260;
const FALLBACK_VIEWPORT_WIDTH = 1000;
const DESKTOP_STRIP_LAYOUT = getRiverStripLayout(FALLBACK_VIEWPORT_WIDTH);
const MOBILE_STRIP_LAYOUT = getRiverStripLayout(390);

function sourceSet(section, format) {
  const source = section.sources[format];
  return `${source.small} 960w, ${source.large} ${section.sources.largeWidth}w`;
}

function RiverSectionPicture({ index, role, section }) {
  const desktop = DESKTOP_STRIP_LAYOUT.sections[index];
  const mobile = MOBILE_STRIP_LAYOUT.sections[index];
  return (
    <div
      aria-hidden="true"
      className={`river-current-section river-current-section--${role}`}
      data-river-section={section.id}
      data-river-section-role={role}
      style={{
        "--river-image-height": section.crop.height,
        "--river-image-top": section.crop.top,
        "--river-image-x": section.crop.x,
        "--river-section-index": index,
        "--river-section-join": `${desktop.join}px`,
        "--river-section-join-mobile": `${mobile.join}px`,
        "--river-section-left": `${desktop.start}px`,
        "--river-section-left-mobile": `${mobile.start}px`,
        "--river-section-width": `${desktop.width}px`,
        "--river-section-width-mobile": `${mobile.width}px`,
      }}
    >
      <picture className="river-current-picture">
        <source
          media="(max-width: 720px)"
          srcSet={section.sources.avif.small}
          type="image/avif"
        />
        <source
          media="(max-width: 720px)"
          srcSet={section.sources.webp.small}
          type="image/webp"
        />
        <source
          sizes="100vw"
          srcSet={sourceSet(section, "avif")}
          type="image/avif"
        />
        <source
          sizes="100vw"
          srcSet={sourceSet(section, "webp")}
          type="image/webp"
        />
        <img
          alt=""
          decoding="async"
          fetchPriority={role === "current" ? "high" : "auto"}
          height={section.sources.largeHeight}
          loading="eager"
          src={section.sources.webp.large}
          width={section.sources.largeWidth}
        />
      </picture>
    </div>
  );
}

function measuredViewportWidth(viewport) {
  const width = Math.round(
    viewport?.getBoundingClientRect?.().width || viewport?.clientWidth || 0
  );
  return width > 0 ? width : FALLBACK_VIEWPORT_WIDTH;
}

function RiverCurrent({ active = true, points = [], themeId = "river", viewportRef }) {
  const frameRef = useRef(null);
  const activeIndexRef = useRef(0);
  const animationFrameRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useLayoutEffect(() => {
    if (!active) return undefined;
    const frame = frameRef.current;
    const viewport = viewportRef?.current || frame?.closest(
      '[data-testid="memory-timeline-viewport"]'
    );
    if (!frame || !viewport) return undefined;

    const updateScene = () => {
      animationFrameRef.current = null;
      const viewportWidth = measuredViewportWidth(viewport);
      const scrollRange = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const scrollProgress = scrollRange > 0 ? viewport.scrollLeft / scrollRange : 0;
      const { index, localProgress } = locateRiverSection(scrollProgress);
      const stripLayout = getRiverStripLayout(viewportWidth);
      const stripTravel = Math.max(0, stripLayout.totalWidth - viewportWidth);
      const cameraOffset = scrollProgress * stripTravel;

      frame.style.setProperty("--river-offset", `${-cameraOffset}px`);
      frame.style.setProperty("--river-strip-width", `${stripLayout.totalWidth}px`);
      frame.dataset.currentRiverSection = RIVER_SECTIONS[index].id;
      frame.dataset.riverSectionProgress = localProgress.toFixed(4);
      frame.dataset.riverProgress = scrollProgress.toFixed(4);
      if (activeIndexRef.current !== index) {
        activeIndexRef.current = index;
        setActiveIndex(index);
      }
    };

    const scheduleSceneUpdate = () => {
      if (animationFrameRef.current !== null) return;
      animationFrameRef.current = window.requestAnimationFrame(updateScene);
    };

    updateScene();
    viewport.addEventListener("scroll", scheduleSceneUpdate, { passive: true });
    window.addEventListener("resize", scheduleSceneUpdate);
    let observer = null;
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver(scheduleSceneUpdate);
      observer.observe(viewport);
    }

    return () => {
      viewport.removeEventListener("scroll", scheduleSceneUpdate);
      window.removeEventListener("resize", scheduleSceneUpdate);
      observer?.disconnect();
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [active, viewportRef]);

  const loadedIndexes = neighboringRiverSectionIndexes(activeIndex);
  const latestPoint = points[points.length - 1];

  return (
    <div
      aria-hidden="true"
      className="river-current-frame"
      data-current-river-section={RIVER_SECTIONS[activeIndex].id}
      data-last-activity-date={latestPoint?.dateKey || ""}
      data-loaded-river-sections={loadedIndexes
        .map((index) => RIVER_SECTIONS[index].id)
        .join(" ")}
      data-life-current-renderer="river-current"
      data-quiet-trail="false"
      data-testid="life-current"
      data-theme-id={themeId}
      ref={frameRef}
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
      <div className="river-current-scene" data-testid="life-current-river-scenery">
        {loadedIndexes.map((index) => {
          const role = index < activeIndex
            ? "previous"
            : index > activeIndex ? "next" : "current";
          return (
            <RiverSectionPicture
              index={index}
              key={RIVER_SECTIONS[index].id}
              role={role}
              section={RIVER_SECTIONS[index]}
            />
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(RiverCurrent);

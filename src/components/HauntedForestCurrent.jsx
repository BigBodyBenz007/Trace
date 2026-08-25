import React, { useLayoutEffect, useRef, useState } from "react";
import { HAUNTED_FOREST_SECTIONS } from "../services/hauntedForestSections";
import {
  getRiverStripLayout,
  locateRiverSection,
  nearbyRiverSectionIndexes,
} from "../services/riverSections";
import RiverCurrent from "./RiverCurrent";

const FALLBACK_VIEWPORT_WIDTH = 1000;

function ForestSectionPicture({ index, onImageError, role, section }) {
  const [imageReady, setImageReady] = useState(false);
  const desktop = getRiverStripLayout(FALLBACK_VIEWPORT_WIDTH, HAUNTED_FOREST_SECTIONS)
    .sections[index];
  const mobile = getRiverStripLayout(390, HAUNTED_FOREST_SECTIONS).sections[index];

  const handleImageLoad = (event) => {
    const decodeResult = typeof event.currentTarget.decode === "function"
      ? event.currentTarget.decode()
      : Promise.resolve();
    Promise.resolve(decodeResult)
      .catch(() => undefined)
      .then(() => setImageReady(true));
  };

  return (
    <div
      aria-hidden="true"
      className={`river-current-section river-current-section--${role} forest-current-section`}
      data-forest-section={section.id}
      data-forest-section-role={role}
      data-image-ready={imageReady ? "true" : "false"}
      style={{
        "--river-image-height": section.crop.height,
        "--river-image-scale-x": 1,
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
      <picture className="river-current-picture forest-current-picture">
        <img
          alt=""
          decoding="async"
          fetchPriority={role === "current" ? "high" : "auto"}
          height={section.sources.largeHeight}
          loading="eager"
          onError={onImageError}
          onLoad={handleImageLoad}
          src={section.sources.png}
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

function HauntedForestCurrent({ active = true, points = [], themeId, viewportRef }) {
  const frameRef = useRef(null);
  const activeIndexRef = useRef(0);
  const animationFrameRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sceneViewportWidth, setSceneViewportWidth] = useState(FALLBACK_VIEWPORT_WIDTH);
  const [useRiverFallback, setUseRiverFallback] = useState(false);
  const safeActiveIndex = Math.min(activeIndex, HAUNTED_FOREST_SECTIONS.length - 1);

  useLayoutEffect(() => {
    if (!active || useRiverFallback) return undefined;
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
      const { index, localProgress } = locateRiverSection(
        scrollProgress,
        HAUNTED_FOREST_SECTIONS
      );
      const stripLayout = getRiverStripLayout(viewportWidth, HAUNTED_FOREST_SECTIONS);
      const stripTravel = Math.max(0, stripLayout.totalWidth - viewportWidth);
      const loadedIndexes = nearbyRiverSectionIndexes(
        index,
        viewportWidth,
        HAUNTED_FOREST_SECTIONS
      );
      const firstLoaded = stripLayout.sections[loadedIndexes[0]];
      const lastLoaded = stripLayout.sections[loadedIndexes[loadedIndexes.length - 1]];
      const minimumOffset = firstLoaded.start;
      const maximumOffset = Math.max(
        minimumOffset,
        lastLoaded.start + lastLoaded.width - viewportWidth
      );
      const cameraOffset = Math.max(
        minimumOffset,
        Math.min(maximumOffset, scrollProgress * stripTravel)
      );

      frame.style.setProperty("--river-offset", `${-cameraOffset}px`);
      frame.style.setProperty("--river-strip-width", `${stripLayout.totalWidth}px`);
      frame.dataset.currentForestSection = HAUNTED_FOREST_SECTIONS[index].id;
      frame.dataset.forestSectionProgress = localProgress.toFixed(4);
      frame.dataset.forestProgress = scrollProgress.toFixed(4);
      setSceneViewportWidth((currentWidth) =>
        currentWidth === viewportWidth ? currentWidth : viewportWidth
      );
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
  }, [active, useRiverFallback, viewportRef]);

  if (useRiverFallback) {
    return (
      <RiverCurrent
        active={active}
        points={points}
        themeId={themeId}
        viewportRef={viewportRef}
      />
    );
  }

  const loadedIndexes = nearbyRiverSectionIndexes(
    safeActiveIndex,
    sceneViewportWidth,
    HAUNTED_FOREST_SECTIONS
  );
  const latestPoint = points[points.length - 1];

  return (
    <div
      aria-hidden="true"
      className="river-current-frame forest-current-frame"
      data-current-forest-section={HAUNTED_FOREST_SECTIONS[safeActiveIndex].id}
      data-forest-catalog="ten-section"
      data-last-activity-date={latestPoint?.dateKey || ""}
      data-life-current-renderer="forest-path"
      data-loaded-forest-sections={loadedIndexes
        .map((index) => HAUNTED_FOREST_SECTIONS[index].id)
        .join(" ")}
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
      <div
        className="river-current-scene forest-current-scene"
        data-testid="life-current-forest-scenery"
      >
        {loadedIndexes.map((index) => {
          const role = index < safeActiveIndex
            ? "previous"
            : index > safeActiveIndex ? "next" : "current";
          return (
            <ForestSectionPicture
              index={index}
              key={HAUNTED_FOREST_SECTIONS[index].id}
              onImageError={() => setUseRiverFallback(true)}
              role={role}
              section={HAUNTED_FOREST_SECTIONS[index]}
            />
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(HauntedForestCurrent);

import React, { useLayoutEffect, useRef, useState } from "react";
import {
  getRiverStripLayout,
  locateRiverSection,
  nearbyRiverSectionIndexes,
} from "../services/riverSections";
import RiverCurrent from "./RiverCurrent";

const FALLBACK_VIEWPORT_WIDTH = 1000;

function RasterSectionPicture({
  classPrefix,
  dataPrefix,
  index,
  onImageError,
  role,
  section,
  sections,
}) {
  const [imageReady, setImageReady] = useState(false);
  const desktop = getRiverStripLayout(FALLBACK_VIEWPORT_WIDTH, sections).sections[index];
  const mobile = getRiverStripLayout(390, sections).sections[index];

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
      className={`river-current-section river-current-section--${role} ${classPrefix}-current-section`}
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
      {...{
        [`data-${dataPrefix}-section`]: section.id,
        [`data-${dataPrefix}-section-role`]: role,
      }}
    >
      <picture className={`river-current-picture ${classPrefix}-current-picture`}>
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

function RasterSceneCurrent({
  active = true,
  catalog,
  classPrefix,
  dataPrefix,
  points = [],
  rendererId,
  sections,
  themeId,
  viewportRef,
}) {
  const frameRef = useRef(null);
  const activeIndexRef = useRef(0);
  const animationFrameRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sceneViewportWidth, setSceneViewportWidth] = useState(FALLBACK_VIEWPORT_WIDTH);
  const [useRiverFallback, setUseRiverFallback] = useState(false);
  const safeActiveIndex = Math.min(activeIndex, sections.length - 1);

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
      const { index, localProgress } = locateRiverSection(scrollProgress, sections);
      const stripLayout = getRiverStripLayout(viewportWidth, sections);
      const stripTravel = Math.max(0, stripLayout.totalWidth - viewportWidth);
      const loadedIndexes = nearbyRiverSectionIndexes(index, viewportWidth, sections);
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
      frame.setAttribute(`data-current-${dataPrefix}-section`, sections[index].id);
      frame.setAttribute(`data-${dataPrefix}-section-progress`, localProgress.toFixed(4));
      frame.setAttribute(`data-${dataPrefix}-progress`, scrollProgress.toFixed(4));
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
  }, [active, dataPrefix, sections, useRiverFallback, viewportRef]);

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
    sections
  );
  const latestPoint = points[points.length - 1];

  return (
    <div
      aria-hidden="true"
      className={`river-current-frame ${classPrefix}-current-frame`}
      data-last-activity-date={latestPoint?.dateKey || ""}
      data-life-current-renderer={rendererId}
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
      {...{
        [`data-current-${dataPrefix}-section`]: sections[safeActiveIndex].id,
        [`data-${dataPrefix}-catalog`]: catalog,
        [`data-loaded-${dataPrefix}-sections`]: loadedIndexes
          .map((index) => sections[index].id)
          .join(" "),
      }}
    >
      <div
        className={`river-current-scene ${classPrefix}-current-scene`}
        data-testid={`life-current-${dataPrefix}-scenery`}
      >
        {loadedIndexes.map((index) => {
          const role = index < safeActiveIndex
            ? "previous"
            : index > safeActiveIndex ? "next" : "current";
          return (
            <RasterSectionPicture
              classPrefix={classPrefix}
              dataPrefix={dataPrefix}
              index={index}
              key={sections[index].id}
              onImageError={() => setUseRiverFallback(true)}
              role={role}
              section={sections[index]}
              sections={sections}
            />
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(RasterSceneCurrent);

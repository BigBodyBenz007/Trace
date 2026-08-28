import React, { useLayoutEffect, useRef, useState } from "react";
import RiverCurrent from "./RiverCurrent";

const FALLBACK_VIEWPORT_WIDTH = 1000;

function measuredViewportWidth(viewport) {
  const width = Math.round(
    viewport?.getBoundingClientRect?.().width || viewport?.clientWidth || 0
  );
  return width > 0 ? width : FALLBACK_VIEWPORT_WIDTH;
}

function sameSectionSet(current, next) {
  return current.length === next.length &&
    current.every((section, index) => section.key === next[index].key);
}

function decodeLoadedImage(event, onReady) {
  const decodeResult = typeof event.currentTarget.decode === "function"
    ? event.currentTarget.decode()
    : Promise.resolve();
  Promise.resolve(decodeResult).catch(() => undefined).then(onReady);
}

function BakedJourneySection({ classPrefix, dataPrefix, onImageError, section }) {
  const [imageReady, setImageReady] = useState(false);
  const attributes = {
    [`data-${dataPrefix}-cycle`]: section.cycleIndex,
    [`data-${dataPrefix}-scene-index`]: section.sceneIndex,
    [`data-${dataPrefix}-section`]: section.id,
    [`data-${dataPrefix}-world-index`]: section.worldIndex,
  };

  return (
    <div
      className={`baked-current-section ${classPrefix}-current-section`}
      data-image-ready={imageReady ? "true" : "false"}
      style={{
        "--baked-section-left": `${section.left}px`,
        [`--${dataPrefix}-section-left`]: `${section.left}px`,
      }}
      {...attributes}
    >
      <img
        alt=""
        decoding="async"
        fetchPriority={section.worldIndex === 0 ? "high" : undefined}
        height={section.height}
        loading="eager"
        onError={onImageError}
        onLoad={(event) => decodeLoadedImage(event, () => setImageReady(true))}
        src={section.image}
        width={section.width}
      />
    </div>
  );
}

function BakedJourneyCurrent({
  active = true,
  catalog,
  classPrefix,
  dataPrefix,
  getNearbySections,
  getSection,
  openerRegion,
  points = [],
  rendererId,
  sceneryHeight,
  sectionWidth,
  themeId,
  viewportRef,
}) {
  const frameRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mountedSectionsRef = useRef(
    getNearbySections(0, FALLBACK_VIEWPORT_WIDTH)
  );
  const [mountedSections, setMountedSections] = useState(mountedSectionsRef.current);
  const [useRiverFallback, setUseRiverFallback] = useState(false);

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
      const cameraOffset = Math.max(0, Math.min(scrollRange, viewport.scrollLeft || 0));
      const scrollProgress = scrollRange > 0 ? cameraOffset / scrollRange : 0;
      const currentSection = getSection(Math.floor(cameraOffset / sectionWidth));
      const nextSections = getNearbySections(cameraOffset, viewportWidth);
      const region = currentSection.worldIndex === 0
        ? openerRegion
        : "baked-scene-cycle";

      frame.style.setProperty("--baked-offset", `${-cameraOffset}px`);
      frame.style.setProperty(`--${dataPrefix}-offset`, `${-cameraOffset}px`);
      frame.setAttribute(`data-current-${dataPrefix}-section`, currentSection.id);
      frame.setAttribute(`data-current-${dataPrefix}-region`, region);
      frame.setAttribute(`data-${dataPrefix}-camera-offset`, cameraOffset.toFixed(2));
      frame.setAttribute(`data-${dataPrefix}-progress`, scrollProgress.toFixed(4));
      frame.setAttribute(
        `data-mounted-${dataPrefix}-sections`,
        nextSections.map(({ key }) => key).join(" ")
      );

      if (!sameSectionSet(mountedSectionsRef.current, nextSections)) {
        mountedSectionsRef.current = nextSections;
        setMountedSections(nextSections);
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
  }, [active, dataPrefix, getNearbySections, getSection, openerRegion, sectionWidth, useRiverFallback, viewportRef]);

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

  const latestPoint = points[points.length - 1];
  const frameAttributes = {
    [`data-current-${dataPrefix}-region`]: openerRegion,
    [`data-current-${dataPrefix}-section`]: openerRegion,
    [`data-${dataPrefix}-camera-offset`]: "0.00",
    [`data-${dataPrefix}-catalog`]: catalog,
    [`data-${dataPrefix}-opener-count`]: "1",
    [`data-${dataPrefix}-progress`]: "0.0000",
    [`data-mounted-${dataPrefix}-sections`]: mountedSections.map(({ key }) => key).join(" "),
  };

  return (
    <div
      aria-hidden="true"
      className={`river-current-frame baked-current-frame ${classPrefix}-current-frame`}
      data-last-activity-date={latestPoint?.dateKey || ""}
      data-life-current-renderer={rendererId}
      data-quiet-trail="false"
      data-testid="life-current"
      data-theme-id={themeId}
      ref={frameRef}
      style={{
        "--baked-offset": "0px",
        "--baked-scenery-height": `${sceneryHeight}px`,
        "--baked-section-width": `${sectionWidth}px`,
        [`--${dataPrefix}-offset`]: "0px",
        [`--${dataPrefix}-scenery-height`]: `${sceneryHeight}px`,
        [`--${dataPrefix}-section-width`]: `${sectionWidth}px`,
        height: 0,
        left: 0,
        pointerEvents: "none",
        position: "sticky",
        top: 0,
        width: "100%",
        zIndex: 0,
      }}
      {...frameAttributes}
    >
      <div
        className={`river-current-scene baked-current-scene ${classPrefix}-current-scene`}
        data-testid={`life-current-${dataPrefix}-scenery`}
      >
        <div className={`baked-current-track ${classPrefix}-current-track`}>
          {mountedSections.map((section) => (
            <BakedJourneySection
              classPrefix={classPrefix}
              dataPrefix={dataPrefix}
              key={section.key}
              onImageError={() => setUseRiverFallback(true)}
              section={section}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(BakedJourneyCurrent);

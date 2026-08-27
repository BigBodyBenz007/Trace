import React, { useLayoutEffect, useRef, useState } from "react";
import {
  DESERT_SCENERY_HEIGHT,
  DESERT_SCENERY_WIDTH,
  getDesertSection,
  getNearbyDesertSections,
} from "../services/desertJourneyScenes";
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

function DesertJourneySection({ onImageError, section }) {
  const [imageReady, setImageReady] = useState(false);

  return (
    <div
      className="desert-current-section"
      data-desert-cycle={section.cycleIndex}
      data-desert-scene-index={section.sceneIndex}
      data-desert-section={section.id}
      data-desert-world-index={section.worldIndex}
      data-image-ready={imageReady ? "true" : "false"}
      style={{ "--desert-section-left": `${section.left}px` }}
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

function DesertJourneyCurrent({
  active = true,
  points = [],
  themeId,
  viewportRef,
}) {
  const frameRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mountedSectionsRef = useRef(
    getNearbyDesertSections(0, FALLBACK_VIEWPORT_WIDTH)
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
      const currentSection = getDesertSection(
        Math.floor(cameraOffset / DESERT_SCENERY_WIDTH)
      );
      const nextSections = getNearbyDesertSections(cameraOffset, viewportWidth);

      frame.style.setProperty("--desert-offset", `${-cameraOffset}px`);
      frame.setAttribute("data-current-desert-section", currentSection.id);
      frame.setAttribute(
        "data-current-desert-region",
        currentSection.worldIndex === 0 ? "sphinx-opener" : "baked-scene-cycle"
      );
      frame.setAttribute("data-desert-camera-offset", cameraOffset.toFixed(2));
      frame.setAttribute("data-desert-progress", scrollProgress.toFixed(4));
      frame.setAttribute(
        "data-mounted-desert-sections",
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

  const latestPoint = points[points.length - 1];

  return (
    <div
      aria-hidden="true"
      className="river-current-frame desert-current-frame"
      data-current-desert-region="sphinx-opener"
      data-current-desert-section="sphinx-opener"
      data-desert-camera-offset="0.00"
      data-desert-catalog="baked-continuous-v2"
      data-desert-opener-count="1"
      data-desert-progress="0.0000"
      data-last-activity-date={latestPoint?.dateKey || ""}
      data-life-current-renderer="desert-journey"
      data-mounted-desert-sections={mountedSections.map(({ key }) => key).join(" ")}
      data-quiet-trail="false"
      data-testid="life-current"
      data-theme-id={themeId}
      ref={frameRef}
      style={{
        "--desert-offset": "0px",
        "--desert-scenery-height": `${DESERT_SCENERY_HEIGHT}px`,
        "--desert-section-width": `${DESERT_SCENERY_WIDTH}px`,
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
        className="river-current-scene desert-current-scene"
        data-testid="life-current-desert-scenery"
      >
        <div className="desert-current-track">
          {mountedSections.map((section) => (
            <DesertJourneySection
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

export default React.memo(DesertJourneyCurrent);

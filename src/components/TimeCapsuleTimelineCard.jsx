import { useCallback, useLayoutEffect, useRef } from "react";
import { formatDateOnly } from "../services/dateOnly";
import { TIMELINE_FOCUS_TUNING } from "../services/timelineFocus";
import { localDateKey, timeCapsuleState, TIME_CAPSULE_STATE } from "../services/timeCapsule";
import TimeCapsuleVault from "./TimeCapsuleVault";
import "./TimeCapsuleTimelineCard.css";

const CONTAINMENT_WIDTH = Math.ceil(TIMELINE_FOCUS_TUNING.baseCardWidth * TIMELINE_FOCUS_TUNING.maximumScale);
const CONTAINMENT_GUTTER = (CONTAINMENT_WIDTH - TIMELINE_FOCUS_TUNING.baseCardWidth) / 2;
const FOCUS_RING_SPACE = 12;

export default function TimeCapsuleTimelineCard({ capsule, colors, onView, today, registerCard, reducedMotion = false }) {
  const positionRef = useRef(null);
  const visualRef = useRef(null);
  const sealedAt = new Date(capsule.sealedAt);
  const sealedDateKey = localDateKey(Number.isNaN(sealedAt.getTime()) ? new Date() : sealedAt);
  const state = timeCapsuleState(capsule, today);
  const visualState = state === TIME_CAPSULE_STATE.AVAILABLE ? "ready" : state === TIME_CAPSULE_STATE.OPENED ? "opened" : "sealed";
  const label = state === TIME_CAPSULE_STATE.AVAILABLE ? "Ready to open" : state === TIME_CAPSULE_STATE.OPENED ? "Opened" : "Sealed";

  const retainPosition = useCallback((element) => {
    positionRef.current = element;
    registerCard?.(element);
  }, [registerCard]);

  const reserveScaledHeight = useCallback(() => {
    const height = visualRef.current?.offsetHeight;
    if (!height || !positionRef.current) return;
    // Transforms do not reserve layout space. Size the capsule's positioning
    // box for maximum focus so wrapped titles and dates remain in the viewport.
    const maximumScale = reducedMotion ? 1 : TIMELINE_FOCUS_TUNING.maximumScale;
    const reservedHeight = Math.ceil(height * maximumScale) + FOCUS_RING_SPACE;
    positionRef.current.style.setProperty("--trace-capsule-scaled-height", `${reservedHeight}px`);
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const visual = visualRef.current;
    reserveScaledHeight();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(reserveScaledHeight) : null;
    if (visual) observer?.observe(visual);
    // Also covers older browsers and page zoom without an observer.
    window.addEventListener("resize", reserveScaledHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", reserveScaledHeight);
    };
  }, [capsule.name, capsule.openOn, state, reserveScaledHeight]);

  return <button
    aria-label={`View Time Capsule ${capsule.name}`}
    className="trace-timeline-card-position trace-timeline-capsule-card"
    data-capsule-id={capsule.id}
    data-memory-date={sealedDateKey}
    data-timeline-card-position="true"
    data-containment-width={CONTAINMENT_WIDTH}
    data-testid={`timeline-time-capsule-${capsule.id}`}
    onClick={() => onView(capsule.id)}
    ref={retainPosition}
    type="button"
    style={{
      contain: "layout style",
      flexShrink: 0,
      marginLeft: `-${CONTAINMENT_GUTTER}px`,
      marginRight: `-${CONTAINMENT_GUTTER}px`,
      marginTop: "var(--life-current-card-lowering)",
      minHeight: "max(var(--life-current-card-space), var(--trace-capsule-scaled-height, 0px))",
      overflow: "visible",
      position: "relative",
      width: CONTAINMENT_WIDTH,
    }}>
    <span
      className="trace-timeline-card-visual trace-timeline-capsule-card__visual"
      data-timeline-card-visual="true"
      onLoad={reserveScaledHeight}
      ref={visualRef}
      style={{
        background: colors.card,
        borderRadius: "14px",
        boxSizing: "border-box",
        margin: "0 auto",
        minHeight: "164px",
        overflowWrap: "anywhere",
        padding: "12px",
        textAlign: "left",
        transform: reducedMotion ? "scale(1)" : `scale(var(--timeline-focus-scale, ${TIMELINE_FOCUS_TUNING.minimumScale}))`,
        transformOrigin: "center top",
        transition: reducedMotion ? "none" : `transform ${TIMELINE_FOCUS_TUNING.transitionMilliseconds}ms ease-out, box-shadow 160ms ease`,
        width: TIMELINE_FOCUS_TUNING.baseCardWidth,
      }}>
      <span className="trace-timeline-capsule-card__header">
        <TimeCapsuleVault state={visualState} variant="timeline" />
        <span className="trace-timeline-capsule-card__summary">
          <span className="trace-timeline-capsule-card__type">Time Capsule</span>
          <strong>{label}</strong>
        </span>
      </span>
      <strong className="trace-timeline-capsule-card__name">{capsule.name}</strong>
      <span className="trace-timeline-capsule-card__date">Opening date: {formatDateOnly(capsule.openOn)}</span>
      <span className="trace-timeline-capsule-card__action">View Time Capsule</span>
    </span>
  </button>;
}

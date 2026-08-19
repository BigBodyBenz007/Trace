import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { acquireDocumentScrollLock } from "../services/documentScrollLock";
import { getTrophyVariant, TrophyAwardGraphic } from "./TrophyCase";
import "./TrophyPlacementCeremony.css";

const NOOP = () => {};
const OPEN_DELAY = 350;
const PLACE_DELAY = 1750;
const SETTLE_DELAY = 2850;
const PLAQUE_DELAY = 3000;
const COMPLETE_DELAY = 3800;

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false
  );

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

function formatCeremonyDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function TrophyPlacementCeremony({
  entry,
  onClose,
  onCeremonyStart = NOOP,
  onTrophySettle = NOOP,
}) {
  const closeRef = useRef(null);
  const settledEntryRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState(reducedMotion ? "complete" : "closed");

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const focusFallback = previouslyFocused?.closest?.('[role="dialog"]')
      ?.querySelector?.('[data-testid="memory-detail-panel"]');
    const releaseLock = acquireDocumentScrollLock();
    closeRef.current?.focus();
    onCeremonyStart(entry);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      releaseLock();
      if (previouslyFocused?.isConnected && !previouslyFocused.disabled) {
        previouslyFocused.focus?.();
      } else {
        focusFallback?.focus?.();
      }
    };
  }, [entry, onCeremonyStart, onClose]);

  useEffect(() => {
    const announceSettle = () => {
      if (settledEntryRef.current === entry.id) return;
      settledEntryRef.current = entry.id;
      onTrophySettle(entry);
    };

    if (reducedMotion) {
      setPhase("complete");
      announceSettle();
      return undefined;
    }

    setPhase("closed");
    const timers = [
      window.setTimeout(() => setPhase("opening"), OPEN_DELAY),
      window.setTimeout(() => setPhase("placing"), PLACE_DELAY),
      window.setTimeout(() => {
        setPhase("settled");
        announceSettle();
      }, SETTLE_DELAY),
      window.setTimeout(() => setPhase("plaque"), PLAQUE_DELAY),
      window.setTimeout(() => setPhase("complete"), COMPLETE_DELAY),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [entry, onTrophySettle, reducedMotion]);

  const snapshot = entry.sourceSnapshot || {};
  const isWorkoutAchievement = entry.sourceType === "workout-pr";
  const achievementDate = formatCeremonyDate(entry.achievedAt);
  const recordValue = snapshot.recordValue || entry.description || "Personal record";
  const sourceLabel = isWorkoutAchievement
    ? snapshot.recordLabel || "Workout Achievement"
    : "Life Achievement";
  const trophyVariant = getTrophyVariant(entry);
  const accessibleDescription = isWorkoutAchievement
    ? `${entry.title}, ${recordValue}${achievementDate ? `, achieved ${achievementDate}` : ""}.`
    : `${entry.title}${achievementDate ? `, achieved ${achievementDate}` : ""}.`;

  return createPortal((
    <div className="trophy-ceremony-overlay" role="presentation">
      <section
        aria-describedby="trophy-ceremony-description"
        aria-labelledby="trophy-ceremony-title"
        aria-modal="true"
        className={`trophy-ceremony trophy-ceremony--${phase}${reducedMotion ? " trophy-ceremony--reduced" : ""}`}
        data-overflow-policy="viewport-fit"
        data-phase={phase}
        role="dialog"
      >
        <header className="trophy-ceremony__header">
          <div>
            <p className="trophy-ceremony__eyebrow">{sourceLabel}</p>
            <h2 id="trophy-ceremony-title">Added to Trophy Case</h2>
          </div>
          <button
            ref={closeRef}
            className="trophy-ceremony__close"
            type="button"
            onClick={onClose}
            aria-label="Close Trophy Case ceremony"
          >
            Close
          </button>
        </header>

        <p className="trophy-ceremony__accessible-description" id="trophy-ceremony-description">
          {accessibleDescription}
        </p>

        <div className="trophy-ceremony__cabinet" data-testid="ceremony-cabinet" aria-hidden="true">
          <div className="trophy-ceremony__crown">
            <span>Trace</span>
            <strong>Collection of Distinction</strong>
          </div>
          <div className="trophy-ceremony__bay">
            <div className="trophy-ceremony__backing">
              <div className="trophy-ceremony__award" data-award-variant={trophyVariant}>
                <TrophyAwardGraphic entry={entry} variant={trophyVariant} />
                <div className="trophy-ceremony__plaque">
                  <strong>{entry.title}</strong>
                  {isWorkoutAchievement && <span>{recordValue}</span>}
                  {achievementDate && <time dateTime={entry.achievedAt}>{achievementDate}</time>}
                </div>
              </div>
              <div className="trophy-ceremony__shelf" />
            </div>
            <div className="trophy-ceremony__door trophy-ceremony__door--left" />
            <div className="trophy-ceremony__door trophy-ceremony__door--right" />
          </div>
        </div>
      </section>
    </div>
  ), document.body);
}

export default TrophyPlacementCeremony;

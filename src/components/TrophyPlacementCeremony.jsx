import { useEffect, useRef, useState } from "react";
import "./TrophyPlacementCeremony.css";

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

function TrophyPlacementCeremony({
  entry,
  onClose,
  onCeremonyStart = () => {},
  onTrophySettle = () => {},
}) {
  const closeRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();
    onCeremonyStart(entry);
    const settleTimer = window.setTimeout(
      () => onTrophySettle(entry),
      reducedMotion ? 0 : 3600
    );
    const closeTimer = window.setTimeout(onClose, reducedMotion ? 2600 : 5800);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(closeTimer);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [entry, onCeremonyStart, onClose, onTrophySettle, reducedMotion]);

  const snapshot = entry.sourceSnapshot || {};
  const achievementValue = snapshot.recordValue || entry.description || "Achievement";

  return (
    <div className="trophy-ceremony-overlay" role="presentation">
      <section
        aria-describedby="trophy-ceremony-description"
        aria-labelledby="trophy-ceremony-title"
        aria-modal="true"
        className={`trophy-ceremony${reducedMotion ? " trophy-ceremony--reduced" : ""}`}
        role="dialog"
      >
        <button ref={closeRef} className="trophy-ceremony__close" type="button" onClick={onClose} aria-label="Close Trophy Case ceremony">
          Close
        </button>
        <p className="trophy-ceremony__confirmation" id="trophy-ceremony-title">Added to Trophy Case</p>
        <p className="trophy-ceremony__accessible-description" id="trophy-ceremony-description">
          {entry.title}: {achievementValue}
        </p>
        <div className="trophy-ceremony__case" aria-hidden="true">
          <div className="trophy-ceremony__interior">
            <span className="trophy-ceremony__streak trophy-ceremony__streak--one" />
            <span className="trophy-ceremony__streak trophy-ceremony__streak--two" />
            <span className="trophy-ceremony__streak trophy-ceremony__streak--three" />
            <div className="trophy-ceremony__trophy">
              <span className="trophy-ceremony__icon">🏆</span>
              <strong>{entry.title}</strong>
              <span>{achievementValue}</span>
              <i className="trophy-ceremony__glint" />
            </div>
          </div>
          <div className="trophy-ceremony__door trophy-ceremony__door--left" />
          <div className="trophy-ceremony__door trophy-ceremony__door--right" />
        </div>
      </section>
    </div>
  );
}

export default TrophyPlacementCeremony;

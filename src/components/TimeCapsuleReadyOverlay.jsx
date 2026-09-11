import { useEffect, useRef, useState } from "react";
import { formatDateOnly } from "../services/dateOnly";
import { addCalendarDays, localDateKey } from "../services/timeCapsule";

export default function TimeCapsuleReadyOverlay({ capsule, onOpenNow, onDismiss, onPostpone }) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const [choosingDate, setChoosingDate] = useState(false);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!returnFocusRef.current) returnFocusRef.current = document.activeElement;
    dialog?.querySelector("button")?.focus();
    function keydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (choosingDate) {
          setChoosingDate(false);
          setError("");
        } else onDismiss();
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled)")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      returnFocusRef.current?.focus?.();
    };
  }, [choosingDate, onDismiss]);

  async function confirmPostpone() {
    if (!date || date <= localDateKey()) {
      setError("Choose a future reminder date.");
      return;
    }
    setError(""); setBusy(true);
    try {
      const result = await onPostpone(date);
      if (result === false) setError("Trace could not save that reminder date. Your previous reminder is unchanged; try again.");
    } catch (reason) {
      setError("Trace could not save that reminder date. Your previous reminder is unchanged; try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="trace-capsule-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !choosingDate) onDismiss();
    }}>
      <section aria-describedby="capsule-ready-description" aria-labelledby="capsule-ready-title" aria-modal="true" className="trace-capsule-overlay__dialog" ref={dialogRef} role="dialog">
        <p className="trace-feature-page__kicker">A moment has arrived</p>
        <h2 id="capsule-ready-title">Your Time Capsule is ready</h2>
        <p><strong>{capsule.name}</strong></p>
        <p id="capsule-ready-description">Opening date: {formatDateOnly(capsule.openOn)} · Ready to open</p>
        {choosingDate ? (
          <div>
            <p>Remind me again on this date. Your capsule stays available to open.</p>
            <label>Reminder date<input type="date" min={addCalendarDays(localDateKey(), 1)} value={date} disabled={busy} onChange={(event) => setDate(event.target.value)} /></label>
            {error && <p role="alert">{error}</p>}
            <div className="trace-capsule-actions">
              <button type="button" disabled={busy} onClick={confirmPostpone}>Confirm</button>
              <button type="button" disabled={busy} onClick={() => { setChoosingDate(false); setError(""); }}>Back</button>
            </div>
          </div>
        ) : (
          <div className="trace-capsule-actions">
            <button type="button" onClick={onOpenNow}>Open now</button>
            <button type="button" onClick={() => { setChoosingDate(true); setDate(""); }}>Postpone</button>
            <button type="button" onClick={onDismiss}>Dismiss</button>
          </div>
        )}
      </section>
    </div>
  );
}

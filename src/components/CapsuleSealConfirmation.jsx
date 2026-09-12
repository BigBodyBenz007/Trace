import { useEffect, useRef } from "react";

export default function CapsuleSealConfirmation({ name, onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    return () => { if (previous?.isConnected) previous.focus?.({ preventScroll: true }); };
  }, []);
  return (
    <div className="trace-capsule-overlay trace-capsule-seal-confirmation">
      <section ref={dialogRef} className="trace-capsule-overlay__dialog" role="dialog" aria-modal="true"
        aria-labelledby="capsule-seal-title" aria-describedby="capsule-seal-description"
        onKeyDown={event => {
          if (event.key === "Escape") { event.preventDefault(); onCancel(); }
          if (event.key !== "Tab") return;
          const buttons = [...dialogRef.current.querySelectorAll("button")];
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}>
        <h2 id="capsule-seal-title">Seal this Time Capsule?</h2>
        <p><strong>{name || "Time Capsule"}</strong></p>
        <p id="capsule-seal-description">Its contents cannot be edited afterward. Trace hides sealed contents in the app, but this is not encryption or a tamper-proof time lock. Device-date changes can affect availability, and backups are not encrypted by this feature.</p>
        <div className="trace-capsule-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={onConfirm}>Confirm seal Time Capsule</button>
        </div>
      </section>
    </div>
  );
}

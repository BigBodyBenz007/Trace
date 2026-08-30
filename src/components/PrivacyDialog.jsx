import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function PrivacyDialog({ title, description, onCancel, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector(FOCUSABLE);
    first?.focus();

    function keyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = [...(dialog?.querySelectorAll(FOCUSABLE) || [])];
      if (!controls.length) return;
      const firstControl = controls[0];
      const lastControl = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    }

    dialog?.addEventListener("keydown", keyDown);
    return () => {
      dialog?.removeEventListener("keydown", keyDown);
      previousFocus?.focus?.();
    };
  }, [onCancel]);

  return (
    <div className="journal-privacy-dialog-backdrop">
      <section
        aria-describedby="journal-privacy-dialog-description"
        aria-labelledby="journal-privacy-dialog-title"
        aria-modal="true"
        className="journal-privacy-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <h2 id="journal-privacy-dialog-title">{title}</h2>
        <p id="journal-privacy-dialog-description">{description}</p>
        {children}
      </section>
    </div>
  );
}

export default function ConfirmationMessage({ message }) {
  if (!message) return null;
  return <p aria-live="polite" data-testid="save-confirmation" style={{ background: "#14532d", borderRadius: "10px", boxSizing: "border-box", color: "white", left: "50%", margin: 0, maxWidth: "min(700px, calc(100vw - 24px))", padding: "10px 12px", position: "fixed", textAlign: "center", top: "calc(12px + env(safe-area-inset-top))", transform: "translateX(-50%)", width: "max-content", zIndex: 10000, animation: "trace-save-confirmation 3.2s ease-out forwards" }}>{message}</p>;
}

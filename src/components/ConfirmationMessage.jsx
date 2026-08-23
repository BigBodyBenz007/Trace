import "../App.css";

export default function ConfirmationMessage({ message, placement = "center-top" }) {
  if (!message) return null;
  const usesViewportEdge = placement === "viewport-edge";
  return <p aria-live="polite" className={usesViewportEdge ? "trace-save-confirmation" : undefined} data-placement={placement} data-testid="save-confirmation" style={{ background: "#14532d", borderRadius: "10px", boxSizing: "border-box", color: "white", left: usesViewportEdge ? undefined : "50%", margin: 0, maxWidth: "min(700px, calc(100vw - 24px))", padding: "10px 12px", position: "fixed", textAlign: "center", top: usesViewportEdge ? undefined : "calc(12px + env(safe-area-inset-top))", transform: usesViewportEdge ? undefined : "translateX(-50%)", width: "max-content", zIndex: 10000, animation: "trace-save-confirmation 3.2s ease-out forwards" }}>{message}</p>;
}

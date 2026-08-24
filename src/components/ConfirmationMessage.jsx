import "../App.css";

export default function ConfirmationMessage({ message, placement = "viewport-edge" }) {
  if (!message) return null;
  return <p aria-live="polite" className="trace-save-confirmation" data-placement={placement} data-testid="save-confirmation" role="status" style={{ background: "#14532d", borderRadius: "10px", boxSizing: "border-box", color: "white", margin: 0, maxWidth: "min(700px, calc(100vw - 24px))", padding: "10px 12px", position: "fixed", textAlign: "center", width: "max-content", zIndex: 10000, animation: "trace-save-confirmation 3.2s ease-out forwards" }}>{message}</p>;
}

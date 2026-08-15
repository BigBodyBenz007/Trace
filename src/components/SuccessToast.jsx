import { useEffect } from "react";

export default function SuccessToast({ notification, onDismiss }) {
  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(onDismiss, 2600);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);
  if (!notification) return null;
  return <div role="status" aria-live="polite" aria-atomic="true" style={{ background: "#14532d", border: "1px solid #4ade80", borderRadius: "12px", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", color: "white", left: "50%", maxWidth: "calc(100% - 32px)", padding: "12px 18px", pointerEvents: "none", position: "fixed", transform: "translateX(-50%)", zIndex: 3000 }}>{notification.message}</div>;
}

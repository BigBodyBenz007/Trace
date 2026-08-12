export function registerTraceServiceWorker({
  environment = process.env.NODE_ENV,
  publicUrl = process.env.PUBLIC_URL || "",
  serviceWorker = typeof navigator !== "undefined" ? navigator.serviceWorker : null,
  windowObject = typeof window !== "undefined" ? window : null,
} = {}) {
  if (!serviceWorker || !windowObject) return;
  const serviceWorkerUrl = `${publicUrl}/service-worker.js`;

  if (environment !== "production") {
    serviceWorker.getRegistration?.(publicUrl || "/")
      .then((registration) => registration?.unregister?.())
      .catch(() => {});
    return;
  }

  windowObject.addEventListener("load", () => {
    serviceWorker.register(serviceWorkerUrl).catch((error) => {
      console.warn("Trace offline shell could not be registered.", error);
    });
  });
}

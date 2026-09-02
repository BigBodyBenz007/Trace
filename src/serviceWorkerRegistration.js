import { detectRuntimePlatform } from "./services/runtimePlatform";

export function registerTraceServiceWorker({
  environment = process.env.NODE_ENV,
  publicUrl = process.env.PUBLIC_URL || "",
  navigatorObject = typeof navigator !== "undefined" ? navigator : null,
  serviceWorker = navigatorObject?.serviceWorker || null,
  windowObject = typeof window !== "undefined" ? window : null,
  runtime = detectRuntimePlatform({ windowObject, navigatorObject }),
} = {}) {
  if (!runtime?.allowsWebServiceWorker) return;
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

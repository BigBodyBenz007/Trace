import { detectRuntimePlatform } from "./services/runtimePlatform";

export function registerTraceServiceWorker({
  environment = process.env.NODE_ENV,
  publicUrl = process.env.PUBLIC_URL || "",
  navigatorObject = typeof navigator !== "undefined" ? navigator : null,
  serviceWorker: providedServiceWorker,
  windowObject = typeof window !== "undefined" ? window : null,
  runtime: providedRuntime,
} = {}) {
  const runtime = providedRuntime === undefined
    ? detectRuntimePlatform({ windowObject, navigatorObject: null })
    : providedRuntime;
  if (!runtime?.allowsWebServiceWorker || !windowObject) return;
  const serviceWorker = providedServiceWorker === undefined
    ? navigatorObject?.serviceWorker || null
    : providedServiceWorker;
  if (!serviceWorker) return;
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

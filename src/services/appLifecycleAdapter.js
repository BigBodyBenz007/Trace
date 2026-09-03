import { detectRuntimePlatform } from "./runtimePlatform";

export const APP_LIFECYCLE_PHASE = Object.freeze({
  ACTIVE: "active",
  BACKGROUND: "background",
  SUSPENDING: "suspending",
  RESUMED: "resumed",
});

export const APP_LIFECYCLE_SOURCE = Object.freeze({
  INITIAL: "initial",
  VISIBILITY: "visibilitychange",
  PAGE_HIDE: "pagehide",
  PAGE_SHOW: "pageshow",
});

function globalWindow() {
  return typeof window === "undefined" ? undefined : window;
}

function globalDocument() {
  return typeof document === "undefined" ? undefined : document;
}

function globalNavigator() {
  return typeof navigator === "undefined" ? undefined : navigator;
}

function configuredValue(options, key, fallback) {
  return Object.prototype.hasOwnProperty.call(options, key)
    ? options[key]
    : fallback();
}

function lifecycleEvent(phase, source, persisted = false) {
  return Object.freeze({ phase, source, persisted: Boolean(persisted) });
}

function currentVisibilityPhase(documentObject) {
  return documentObject?.visibilityState === "hidden"
    ? APP_LIFECYCLE_PHASE.BACKGROUND
    : APP_LIFECYCLE_PHASE.ACTIVE;
}

function addListener(target, type, listener) {
  if (typeof target?.addEventListener !== "function") return () => {};
  try {
    target.addEventListener(type, listener);
  } catch (error) {
    return () => {};
  }
  let attached = true;
  return () => {
    if (!attached) return;
    attached = false;
    try {
      target.removeEventListener?.(type, listener);
    } catch (error) {
      // Lifecycle cleanup must remain safe while the page is being discarded.
    }
  };
}

export function createWebAppLifecycleAdapter(options = {}) {
  const subscribers = new Set();
  let detachBrowserListeners = null;
  let lastVisibilityPhase = null;
  let pageSuspended = false;
  let pageShowSeen = false;

  function environment() {
    const windowObject = configuredValue(options, "windowObject", globalWindow);
    const documentObject = configuredValue(options, "documentObject", globalDocument);
    const navigatorObject = configuredValue(options, "navigatorObject", globalNavigator);
    return {
      windowObject,
      documentObject,
      runtime: options.runtime || detectRuntimePlatform({ windowObject, navigatorObject }),
    };
  }

  function notify(event) {
    Array.from(subscribers).forEach((subscriber) => {
      try {
        subscriber(event);
      } catch (error) {
        // One lifecycle consumer must not prevent another from protecting state.
      }
    });
  }

  function attachBrowserListeners(env) {
    lastVisibilityPhase = currentVisibilityPhase(env.documentObject);
    pageSuspended = false;
    pageShowSeen = false;

    const visibilityChanged = () => {
      const phase = currentVisibilityPhase(env.documentObject);
      if (phase === lastVisibilityPhase) return;
      lastVisibilityPhase = phase;
      notify(lifecycleEvent(phase, APP_LIFECYCLE_SOURCE.VISIBILITY));
    };
    const pageHidden = (event) => {
      if (pageSuspended) return;
      pageSuspended = true;
      notify(lifecycleEvent(
        APP_LIFECYCLE_PHASE.SUSPENDING,
        APP_LIFECYCLE_SOURCE.PAGE_HIDE,
        event?.persisted
      ));
    };
    const pageShown = (event) => {
      if (!pageSuspended && pageShowSeen) return;
      pageSuspended = false;
      pageShowSeen = true;
      lastVisibilityPhase = currentVisibilityPhase(env.documentObject);
      notify(lifecycleEvent(
        APP_LIFECYCLE_PHASE.RESUMED,
        APP_LIFECYCLE_SOURCE.PAGE_SHOW,
        event?.persisted
      ));
    };

    const detach = [
      addListener(env.documentObject, "visibilitychange", visibilityChanged),
      addListener(env.windowObject, "pagehide", pageHidden),
      addListener(env.windowObject, "pageshow", pageShown),
    ];
    return () => detach.forEach((remove) => remove());
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== "function") return () => {};
    const env = environment();
    if (!env.runtime?.isWeb) return () => {};

    if (!detachBrowserListeners) {
      detachBrowserListeners = attachBrowserListeners(env);
    }
    subscribers.add(subscriber);
    subscriber(lifecycleEvent(
      currentVisibilityPhase(env.documentObject),
      APP_LIFECYCLE_SOURCE.INITIAL
    ));

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      subscribers.delete(subscriber);
      if (subscribers.size > 0 || !detachBrowserListeners) return;
      detachBrowserListeners();
      detachBrowserListeners = null;
      lastVisibilityPhase = null;
      pageSuspended = false;
      pageShowSeen = false;
    };
  }

  return Object.freeze({ subscribe });
}

export const webAppLifecycleAdapter = createWebAppLifecycleAdapter();

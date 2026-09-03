import { RUNTIME_KINDS } from "./runtimePlatform";
import {
  APP_LIFECYCLE_PHASE,
  APP_LIFECYCLE_SOURCE,
  createWebAppLifecycleAdapter,
} from "./appLifecycleAdapter";

function eventTarget(properties = {}) {
  const listeners = new Map();
  return {
    ...properties,
    addEventListener: jest.fn((type, listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    }),
    removeEventListener: jest.fn((type, listener) => listeners.get(type)?.delete(listener)),
    dispatch(type, event = {}) {
      Array.from(listeners.get(type) || []).forEach((listener) => listener(event));
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    },
  };
}

function webEnvironment({ visibilityState = "visible", userAgent = "test browser" } = {}) {
  const windowObject = eventTarget();
  const documentObject = eventTarget({ visibilityState });
  const adapter = createWebAppLifecycleAdapter({
    windowObject,
    documentObject,
    navigatorObject: { userAgent },
  });
  return { adapter, documentObject, windowObject };
}

test.each([
  ["visible", APP_LIFECYCLE_PHASE.ACTIVE],
  ["hidden", APP_LIFECYCLE_PHASE.BACKGROUND],
])("initial %s visibility produces a deterministic %s event", (visibilityState, phase) => {
  const { adapter } = webEnvironment({ visibilityState });
  const subscriber = jest.fn();

  adapter.subscribe(subscriber);

  expect(subscriber).toHaveBeenCalledWith({
    phase,
    source: APP_LIFECYCLE_SOURCE.INITIAL,
    persisted: false,
  });
});

test("the web adapter subscribes only to visibilitychange, pagehide, and pageshow", () => {
  const { adapter, documentObject, windowObject } = webEnvironment();

  adapter.subscribe(jest.fn());

  expect(documentObject.addEventListener).toHaveBeenCalledWith(
    "visibilitychange",
    expect.any(Function)
  );
  expect(windowObject.addEventListener.mock.calls.map(([type]) => type)).toEqual([
    "pagehide",
    "pageshow",
  ]);
});

test("visibility transitions normalize hidden to background and visible to active", () => {
  const { adapter, documentObject } = webEnvironment();
  const subscriber = jest.fn();
  adapter.subscribe(subscriber);
  subscriber.mockClear();

  documentObject.visibilityState = "hidden";
  documentObject.dispatch("visibilitychange");
  documentObject.visibilityState = "visible";
  documentObject.dispatch("visibilitychange");

  expect(subscriber.mock.calls.map(([event]) => event)).toEqual([
    {
      phase: APP_LIFECYCLE_PHASE.BACKGROUND,
      source: APP_LIFECYCLE_SOURCE.VISIBILITY,
      persisted: false,
    },
    {
      phase: APP_LIFECYCLE_PHASE.ACTIVE,
      source: APP_LIFECYCLE_SOURCE.VISIBILITY,
      persisted: false,
    },
  ]);
});

test("pagehide and pageshow preserve back-forward-cache state", () => {
  const { adapter, windowObject } = webEnvironment();
  const subscriber = jest.fn();
  adapter.subscribe(subscriber);
  subscriber.mockClear();

  windowObject.dispatch("pagehide", { persisted: true });
  windowObject.dispatch("pageshow", { persisted: true });

  expect(subscriber.mock.calls.map(([event]) => event)).toEqual([
    {
      phase: APP_LIFECYCLE_PHASE.SUSPENDING,
      source: APP_LIFECYCLE_SOURCE.PAGE_HIDE,
      persisted: true,
    },
    {
      phase: APP_LIFECYCLE_PHASE.RESUMED,
      source: APP_LIFECYCLE_SOURCE.PAGE_SHOW,
      persisted: true,
    },
  ]);
});

test("pageshow resynchronizes visibility after browser event-order differences", () => {
  const { adapter, documentObject, windowObject } = webEnvironment();
  const subscriber = jest.fn();
  adapter.subscribe(subscriber);
  subscriber.mockClear();

  documentObject.visibilityState = "hidden";
  documentObject.dispatch("visibilitychange");
  windowObject.dispatch("pagehide");
  documentObject.visibilityState = "visible";
  windowObject.dispatch("pageshow");
  documentObject.visibilityState = "hidden";
  documentObject.dispatch("visibilitychange");

  expect(subscriber.mock.calls.map(([event]) => event.phase)).toEqual([
    APP_LIFECYCLE_PHASE.BACKGROUND,
    APP_LIFECYCLE_PHASE.SUSPENDING,
    APP_LIFECYCLE_PHASE.RESUMED,
    APP_LIFECYCLE_PHASE.BACKGROUND,
  ]);
});

test("repeated visibility and page events are deduplicated without losing distinct transitions", () => {
  const { adapter, documentObject, windowObject } = webEnvironment();
  const subscriber = jest.fn();
  adapter.subscribe(subscriber);
  subscriber.mockClear();

  documentObject.visibilityState = "hidden";
  documentObject.dispatch("visibilitychange");
  documentObject.dispatch("visibilitychange");
  windowObject.dispatch("pagehide", { persisted: true });
  windowObject.dispatch("pagehide", { persisted: false });
  windowObject.dispatch("pageshow", { persisted: true });
  windowObject.dispatch("pageshow", { persisted: false });

  expect(subscriber.mock.calls.map(([event]) => event.phase)).toEqual([
    APP_LIFECYCLE_PHASE.BACKGROUND,
    APP_LIFECYCLE_PHASE.SUSPENDING,
    APP_LIFECYCLE_PHASE.RESUMED,
  ]);
});

test("cleanup is idempotent and removes every attached browser listener exactly once", () => {
  const { adapter, documentObject, windowObject } = webEnvironment();
  const unsubscribe = adapter.subscribe(jest.fn());

  unsubscribe();
  unsubscribe();

  expect(documentObject.removeEventListener).toHaveBeenCalledTimes(1);
  expect(documentObject.removeEventListener).toHaveBeenCalledWith(
    "visibilitychange",
    expect.any(Function)
  );
  expect(windowObject.removeEventListener.mock.calls.map(([type]) => type)).toEqual([
    "pagehide",
    "pageshow",
  ]);
});

test("multiple subscribers and remounts never accumulate duplicate browser listeners", () => {
  const { adapter, documentObject, windowObject } = webEnvironment();
  const firstCleanup = adapter.subscribe(jest.fn());
  const secondCleanup = adapter.subscribe(jest.fn());

  expect(documentObject.listenerCount("visibilitychange")).toBe(1);
  expect(windowObject.listenerCount("pagehide")).toBe(1);
  expect(windowObject.listenerCount("pageshow")).toBe(1);
  firstCleanup();
  expect(windowObject.listenerCount("pagehide")).toBe(1);
  secondCleanup();
  expect(windowObject.listenerCount("pagehide")).toBe(0);

  const remountCleanup = adapter.subscribe(jest.fn());
  expect(documentObject.listenerCount("visibilitychange")).toBe(1);
  expect(windowObject.listenerCount("pagehide")).toBe(1);
  remountCleanup();
  expect(windowObject.listenerCount("pagehide")).toBe(0);
});

test.each([
  ["window", undefined, eventTarget({ visibilityState: "visible" })],
  ["document", eventTarget(), undefined],
  ["window and document", undefined, undefined],
])("missing %s is safe", (label, windowObject, documentObject) => {
  const subscriber = jest.fn();
  const adapter = createWebAppLifecycleAdapter({
    windowObject,
    documentObject,
    navigatorObject: {},
  });

  const unsubscribe = adapter.subscribe(subscriber);

  expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({
    phase: documentObject?.visibilityState === "hidden"
      ? APP_LIFECYCLE_PHASE.BACKGROUND
      : APP_LIFECYCLE_PHASE.ACTIVE,
  }));
  expect(() => unsubscribe()).not.toThrow();
});

test.each([
  ["iOS", RUNTIME_KINDS.NATIVE_IOS, "ios"],
  ["Android", RUNTIME_KINDS.NATIVE_ANDROID, "android"],
  ["unknown", RUNTIME_KINDS.NATIVE_UNKNOWN, "unknown"],
])("native %s is unsupported without attaching browser listeners", (label, kind, platform) => {
  const windowObject = eventTarget();
  const documentObject = eventTarget({ visibilityState: "hidden" });
  const subscriber = jest.fn();
  const adapter = createWebAppLifecycleAdapter({
    runtime: { kind, platform, isNative: true, isWeb: false },
    windowObject,
    documentObject,
    navigatorObject: { userAgent: "generic browser" },
  });

  const unsubscribe = adapter.subscribe(subscriber);

  expect(windowObject.addEventListener).not.toHaveBeenCalled();
  expect(documentObject.addEventListener).not.toHaveBeenCalled();
  expect(subscriber).not.toHaveBeenCalled();
  expect(() => unsubscribe()).not.toThrow();
});

test("runtime detection does not infer native behavior from user-agent text", () => {
  const { adapter, documentObject, windowObject } = webEnvironment({
    userAgent: "iPhone Android Capacitor-looking text",
  });
  const subscriber = jest.fn();

  adapter.subscribe(subscriber);

  expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({
    phase: APP_LIFECYCLE_PHASE.ACTIVE,
  }));
  expect(documentObject.listenerCount("visibilitychange")).toBe(1);
  expect(windowObject.listenerCount("pagehide")).toBe(1);
});

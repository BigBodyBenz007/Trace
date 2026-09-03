import { registerTraceServiceWorker } from "./serviceWorkerRegistration";

function nativeWindow(platform) {
  return {
    Capacitor: {
      isNativePlatform: () => true,
      getPlatform: () => platform,
    },
    addEventListener: jest.fn(),
  };
}

test("registers the scoped offline shell after production load", async () => {
  const register = jest.fn().mockResolvedValue({});
  let loadHandler;
  registerTraceServiceWorker({
    environment: "production",
    publicUrl: "/trace",
    serviceWorker: { register },
    windowObject: { addEventListener: jest.fn((name, handler) => { loadHandler = handler; }) },
  });
  expect(register).not.toHaveBeenCalled();
  await loadHandler();
  expect(register).toHaveBeenCalledWith("/trace/service-worker.js");
});

test("web runtime resolves navigator.serviceWorker and preserves load-time registration", async () => {
  const register = jest.fn().mockResolvedValue({});
  const serviceWorkerAccess = jest.fn(() => ({ register }));
  const navigatorObject = {};
  Object.defineProperty(navigatorObject, "serviceWorker", { get: serviceWorkerAccess });
  let loadHandler;
  const windowObject = {
    addEventListener: jest.fn((name, handler) => { loadHandler = handler; }),
  };

  registerTraceServiceWorker({
    environment: "production",
    publicUrl: "/trace",
    navigatorObject,
    windowObject,
  });

  expect(serviceWorkerAccess).toHaveBeenCalledTimes(1);
  expect(windowObject.addEventListener).toHaveBeenCalledWith("load", expect.any(Function));
  expect(register).not.toHaveBeenCalled();
  await loadHandler();
  expect(register).toHaveBeenCalledWith("/trace/service-worker.js");
});

test("development unregisters only the current app scope and never registers", async () => {
  const unregister = jest.fn().mockResolvedValue(true);
  const getRegistration = jest.fn().mockResolvedValue({ unregister });
  const register = jest.fn();
  const windowObject = { addEventListener: jest.fn() };
  registerTraceServiceWorker({
    environment: "development",
    publicUrl: "",
    serviceWorker: { getRegistration, register },
    windowObject,
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(getRegistration).toHaveBeenCalledWith("/");
  expect(unregister).toHaveBeenCalled();
  expect(register).not.toHaveBeenCalled();
  expect(windowObject.addEventListener).not.toHaveBeenCalled();
});

test("does nothing when service workers are unavailable", () => {
  expect(() => registerTraceServiceWorker({
    environment: "production",
    serviceWorker: null,
    windowObject: {},
  })).not.toThrow();
});

test.each([
  ["window", null, { serviceWorker: {} }],
  ["navigator", {}, null],
  ["window and navigator", null, null],
])("missing %s is safe", (label, windowObject, navigatorObject) => {
  expect(() => registerTraceServiceWorker({
    environment: "production",
    windowObject,
    navigatorObject,
  })).not.toThrow();
});

test("missing window returns before navigator.serviceWorker is read", () => {
  const serviceWorkerAccess = jest.fn();
  const navigatorObject = {};
  Object.defineProperty(navigatorObject, "serviceWorker", { get: serviceWorkerAccess });

  registerTraceServiceWorker({
    environment: "production",
    navigatorObject,
    windowObject: null,
  });

  expect(serviceWorkerAccess).not.toHaveBeenCalled();
});

test.each(["ios", "android", "future-os"])(
  "native %s runtime does not read or enter the web service-worker path",
  async (platform) => {
    const unregister = jest.fn();
    const getRegistration = jest.fn().mockResolvedValue({ unregister });
    const register = jest.fn();
    const windowObject = nativeWindow(platform);
    const serviceWorkerAccess = jest.fn(() => ({ getRegistration, register }));
    const navigatorObject = {};
    Object.defineProperty(navigatorObject, "serviceWorker", {
      get: serviceWorkerAccess,
    });

    registerTraceServiceWorker({
      environment: "production",
      navigatorObject,
      windowObject,
    });
    await Promise.resolve();

    expect(serviceWorkerAccess).not.toHaveBeenCalled();
    expect(windowObject.addEventListener).not.toHaveBeenCalled();
    expect(getRegistration).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
    expect(unregister).not.toHaveBeenCalled();
  }
);

test("native guard never unregisters or clears an existing service worker", async () => {
  const unregister = jest.fn();
  const getRegistration = jest.fn().mockResolvedValue({ unregister });

  registerTraceServiceWorker({
    environment: "development",
    navigatorObject: { serviceWorker: { getRegistration } },
    serviceWorker: { getRegistration },
    windowObject: nativeWindow("ios"),
  });
  await Promise.resolve();

  expect(getRegistration).not.toHaveBeenCalled();
  expect(unregister).not.toHaveBeenCalled();
});

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

test("development unregisters only the current app scope and never registers", async () => {
  const unregister = jest.fn().mockResolvedValue(true);
  const getRegistration = jest.fn().mockResolvedValue({ unregister });
  const register = jest.fn();
  registerTraceServiceWorker({
    environment: "development",
    publicUrl: "",
    serviceWorker: { getRegistration, register },
    windowObject: { addEventListener: jest.fn() },
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(getRegistration).toHaveBeenCalledWith("/");
  expect(unregister).toHaveBeenCalled();
  expect(register).not.toHaveBeenCalled();
});

test("does nothing when service workers are unavailable", () => {
  expect(() => registerTraceServiceWorker({
    environment: "production",
    serviceWorker: null,
    windowObject: {},
  })).not.toThrow();
});

test.each(["ios", "android", "future-os"])(
  "native %s runtime does not enter the web service-worker path",
  async (platform) => {
    const unregister = jest.fn();
    const getRegistration = jest.fn().mockResolvedValue({ unregister });
    const register = jest.fn();
    const windowObject = nativeWindow(platform);

    registerTraceServiceWorker({
      environment: "production",
      navigatorObject: { serviceWorker: { getRegistration, register } },
      serviceWorker: { getRegistration, register },
      windowObject,
    });
    await Promise.resolve();

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

import { registerTraceServiceWorker } from "./serviceWorkerRegistration";

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

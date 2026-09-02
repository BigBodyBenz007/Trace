import { detectRuntimePlatform, RUNTIME_KINDS } from "./runtimePlatform";

function nativeWindow(platform, isNative = true) {
  return {
    Capacitor: {
      isNativePlatform: jest.fn(() => isNative),
      getPlatform: jest.fn(() => platform),
    },
  };
}

test("default browser runtime is classified as web", () => {
  expect(detectRuntimePlatform()).toMatchObject({
    kind: RUNTIME_KINDS.WEB,
    platform: "web",
    isNative: false,
    isWeb: true,
    allowsWebServiceWorker: true,
  });
});

test("normal PWA capabilities do not make a browser runtime native", () => {
  const runtime = detectRuntimePlatform({
    windowObject: { matchMedia: jest.fn() },
    navigatorObject: {
      serviceWorker: {},
      share: jest.fn(),
      canShare: jest.fn(),
    },
  });

  expect(runtime).toMatchObject({ kind: RUNTIME_KINDS.WEB, isNative: false, isWeb: true });
  expect(runtime.capabilities).toEqual({
    serviceWorker: true,
    webShare: true,
    fileShare: true,
    matchMedia: true,
  });
});

test.each([
  ["ios", RUNTIME_KINDS.NATIVE_IOS, "ios"],
  ["android", RUNTIME_KINDS.NATIVE_ANDROID, "android"],
])("future Capacitor %s signal is classified as native", (reported, kind, platform) => {
  expect(detectRuntimePlatform({ windowObject: nativeWindow(reported), navigatorObject: {} }))
    .toMatchObject({ kind, platform, isNative: true, isWeb: false, allowsWebServiceWorker: false });
});

test("unknown future native platform is classified safely", () => {
  expect(detectRuntimePlatform({ windowObject: nativeWindow("future-os"), navigatorObject: {} }))
    .toMatchObject({
      kind: RUNTIME_KINDS.NATIVE_UNKNOWN,
      platform: "unknown",
      isNative: true,
      isWeb: false,
      allowsWebServiceWorker: false,
    });
});

test("an explicit native signal without a platform is native-unknown", () => {
  const windowObject = { Capacitor: { isNativePlatform: () => true } };
  expect(detectRuntimePlatform({ windowObject, navigatorObject: {} }).kind)
    .toBe(RUNTIME_KINDS.NATIVE_UNKNOWN);
});

test("a native platform report is recognized when the optional native predicate is absent", () => {
  const windowObject = { Capacitor: { getPlatform: () => "android" } };
  expect(detectRuntimePlatform({ windowObject, navigatorObject: {} })).toMatchObject({
    kind: RUNTIME_KINDS.NATIVE_ANDROID,
    isNative: true,
    allowsWebServiceWorker: false,
  });
});

test("missing window is handled safely", () => {
  expect(detectRuntimePlatform({ windowObject: undefined, navigatorObject: { serviceWorker: {} } }))
    .toMatchObject({
      kind: RUNTIME_KINDS.WEB,
      isNative: false,
      capabilities: { serviceWorker: true, matchMedia: false },
    });
});

test("missing navigator is handled safely", () => {
  expect(detectRuntimePlatform({ windowObject: {}, navigatorObject: undefined }))
    .toEqual({
      kind: RUNTIME_KINDS.WEB,
      platform: "web",
      isNative: false,
      isWeb: true,
      allowsWebServiceWorker: true,
      capabilities: { serviceWorker: false, webShare: false, fileShare: false, matchMedia: false },
    });
});

test.each([
  null,
  "malformed",
  {},
  { isNativePlatform: true, getPlatform: "ios" },
  { isNativePlatform: () => { throw new Error("bridge unavailable"); }, getPlatform: () => { throw new Error("bridge unavailable"); } },
  { isNativePlatform: () => false, getPlatform: () => ({ platform: "ios" }) },
])("partial or malformed Capacitor global does not crash startup", (Capacitor) => {
  expect(() => detectRuntimePlatform({ windowObject: { Capacitor }, navigatorObject: {} })).not.toThrow();
  expect(detectRuntimePlatform({ windowObject: { Capacitor }, navigatorObject: {} }).kind)
    .toBe(RUNTIME_KINDS.WEB);
});

test("runtime detection does not use user-agent text as a native signal", () => {
  const navigatorObject = {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    platform: "iPhone",
  };
  expect(detectRuntimePlatform({ windowObject: {}, navigatorObject })).toMatchObject({
    kind: RUNTIME_KINDS.WEB,
    isNative: false,
  });
});

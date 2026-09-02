export const RUNTIME_KINDS = Object.freeze({
  WEB: "web",
  NATIVE_IOS: "native-ios",
  NATIVE_ANDROID: "native-android",
  NATIVE_UNKNOWN: "native-unknown",
});

function globalWindow() {
  return typeof window === "undefined" ? null : window;
}

function globalNavigator() {
  return typeof navigator === "undefined" ? null : navigator;
}

function optionOrGlobal(options, key, fallback) {
  return Object.prototype.hasOwnProperty.call(options, key) ? options[key] : fallback();
}

function callBridgeMethod(bridge, method) {
  if (typeof bridge?.[method] !== "function") return undefined;
  try {
    return bridge[method]();
  } catch (error) {
    return undefined;
  }
}

function nativeClassification(windowObject) {
  const bridge = windowObject?.Capacitor;
  if (!bridge || (typeof bridge !== "object" && typeof bridge !== "function")) {
    return { isNative: false, platform: "web", kind: RUNTIME_KINDS.WEB };
  }

  const nativeSignal = callBridgeMethod(bridge, "isNativePlatform");
  const reportedPlatform = callBridgeMethod(bridge, "getPlatform");
  const platform = typeof reportedPlatform === "string"
    ? reportedPlatform.trim().toLowerCase()
    : "";
  const platformSignalsNative = Boolean(platform && platform !== "web");
  const isNative = nativeSignal === true || platformSignalsNative;

  if (!isNative) return { isNative: false, platform: "web", kind: RUNTIME_KINDS.WEB };
  if (platform === "ios") return { isNative: true, platform: "ios", kind: RUNTIME_KINDS.NATIVE_IOS };
  if (platform === "android") return { isNative: true, platform: "android", kind: RUNTIME_KINDS.NATIVE_ANDROID };
  return { isNative: true, platform: "unknown", kind: RUNTIME_KINDS.NATIVE_UNKNOWN };
}

export function detectRuntimePlatform(options = {}) {
  const windowObject = optionOrGlobal(options, "windowObject", globalWindow);
  const navigatorObject = optionOrGlobal(options, "navigatorObject", globalNavigator);
  const classification = nativeClassification(windowObject);
  const isWeb = !classification.isNative;

  return Object.freeze({
    kind: classification.kind,
    platform: classification.platform,
    isNative: classification.isNative,
    isWeb,
    allowsWebServiceWorker: isWeb,
    capabilities: Object.freeze({
      serviceWorker: Boolean(navigatorObject?.serviceWorker),
      webShare: typeof navigatorObject?.share === "function",
      fileShare: typeof navigatorObject?.canShare === "function",
      matchMedia: typeof windowObject?.matchMedia === "function",
    }),
  });
}

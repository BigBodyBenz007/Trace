import { lookupCatalogFoodByBarcode } from "./barcodeFoodLookup";
import { canonicalGtinKey, normalizeGtin } from "./productIdentifiers";
import { createRemoteBarcodeCache } from "./remoteBarcodeCache";
import { immutableCopy, normalizeRemoteLookupResult } from "./remoteFoodModel";
import { detectRuntimePlatform } from "./runtimePlatform";

export const REMOTE_BARCODE_ENDPOINT = "/api/nutrition/barcode";
export const REMOTE_BARCODE_REQUEST_TIMEOUT_MS = 9000;
export const REMOTE_BARCODE_RESPONSE_MAX_BYTES = 64 * 1024;

function defaultStorage() {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function defaultRuntime() {
  const platform = detectRuntimePlatform();
  return {
    ...platform,
    isOnline: typeof navigator === "undefined" || navigator.onLine !== false,
  };
}

function defaultBrowserFetch(...args) {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return Promise.reject(new TypeError("Browser fetch is unavailable."));
  }
  return window.fetch(...args);
}

function safeResult(status, identifier = null, extra = {}) {
  return immutableCopy({ status, identifier, food: null, ...extra });
}

async function readBoundedResponse(response, maxBytes) {
  const declared = Number(response?.headers?.get?.("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

export function createRemoteBarcodeLookup({
  fetchImpl = defaultBrowserFetch,
  clock = Date.now,
  storage = defaultStorage(),
  endpoint = REMOTE_BARCODE_ENDPOINT,
  runtime = defaultRuntime,
  localLookup = lookupCatalogFoodByBarcode,
  requestTimeoutMs = REMOTE_BARCODE_REQUEST_TIMEOUT_MS,
  responseMaxBytes = REMOTE_BARCODE_RESPONSE_MAX_BYTES,
} = {}) {
  const cache = createRemoteBarcodeCache({ storage, clock });
  const inFlight = new Map();
  const gatewayEndpoint = typeof endpoint === "string"
    && endpoint.startsWith("/")
    && !endpoint.startsWith("//")
    ? endpoint
    : REMOTE_BARCODE_ENDPOINT;

  async function requestRemote(barcode) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetchImpl(gatewayEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ barcode }),
        credentials: "same-origin",
        signal: controller.signal,
      });
      const payload = await readBoundedResponse(response, responseMaxBytes);
      const result = normalizeRemoteLookupResult(payload);
      if (!result) return safeResult("unavailable", { scheme: "gtin", value: barcode });
      if (["found", "incomplete"].includes(result.status)) cache.set(barcode, result);
      return result;
    } catch (error) {
      const runtimeState = typeof runtime === "function" ? runtime() : runtime;
      return safeResult(
        runtimeState?.isOnline === false ? "offline" : "unavailable",
        { scheme: "gtin", value: barcode }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async function lookup(value) {
    const barcode = normalizeGtin(value);
    if (!barcode) return safeResult("invalid");

    const local = localLookup(barcode);
    if (local.status === "found") {
      return immutableCopy({ ...local, source: "local" });
    }

    const cached = cache.get(barcode);
    if (cached) return cached;

    const runtimeState = typeof runtime === "function" ? runtime() : runtime;
    if (runtimeState?.isOnline === false) {
      return cache.get(barcode, { allowExpired: true })
        || safeResult("offline", { scheme: "gtin", value: barcode });
    }
    if (runtimeState?.isWeb === false) {
      return safeResult("unavailable", { scheme: "gtin", value: barcode });
    }

    const key = canonicalGtinKey(barcode);
    if (!inFlight.has(key)) {
      inFlight.set(key, requestRemote(barcode).finally(() => inFlight.delete(key)));
    }
    return inFlight.get(key);
  }

  return Object.freeze({ lookup });
}

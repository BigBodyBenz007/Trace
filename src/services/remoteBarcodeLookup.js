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

function needsAssessmentRefresh(food) {
  const input = food?.assessmentInputs;
  if (input == null) return true;
  const fields = Object.fromEntries(input.serving.map(({ field, value }) => [field, value]));
  const unit = value => {
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
    return ["g", "grm"].includes(normalized) ? "g" : ["ml", "mlt"].includes(normalized) ? "ml" : null;
  };
  // Refresh only captured shapes affected by the known basis/unit fixes. A
  // genuinely missing nutrient or unresolved category is not a refresh trigger.
  if (input.source.provider === "usda-fdc") {
    return input.datasets.some(dataset => ["grm", "mlt"].includes(dataset.quantity?.unit?.toLowerCase())
      || (dataset.id === "usda-reference" && dataset.basis === "unknown" && unit(fields.servingSizeUnit)));
  }
  if (input.source.provider !== "open-food-facts") return false;
  const servingUnit = unit(fields.serving_quantity_unit), packageUnit = unit(fields.product_quantity_unit);
  const servingText = typeof fields.serving_size === "string" ? fields.serving_size.toLowerCase() : "";
  const conflict = (servingUnit === "ml" && /\d\s*(?:g|grams?)\b/.test(servingText))
    || (servingUnit === "g" && /\d\s*(?:ml|millilit(?:er|re)s?)\b/.test(servingText));
  if (!servingUnit || conflict || (packageUnit && packageUnit !== servingUnit)) return false;
  return input.datasets.some(dataset => dataset.id === "off-100g"
    && (dataset.basis === "unknown" || (servingUnit === "ml" && dataset.basis === "100g")));
}

export function createRemoteBarcodeLookup({
  fetchImpl = defaultBrowserFetch,
  clock = Date.now,
  storage = defaultStorage(),
  endpoint = REMOTE_BARCODE_ENDPOINT,
  runtime = defaultRuntime,
  localLookup = lookupCatalogFoodByBarcode,
  userLookup = () => ({ status: "not-found", identifier: null, food: null }),
  requestTimeoutMs = REMOTE_BARCODE_REQUEST_TIMEOUT_MS,
  responseMaxBytes = REMOTE_BARCODE_RESPONSE_MAX_BYTES,
} = {}) {
  const cache = createRemoteBarcodeCache({ storage, clock });
  const inFlight = new Map();
  // Older valid v2 records predate optional capture or its basis fixes. Refresh
  // them once online instead of hiding newer evidence for the cache lifetime.
  // This is an in-memory attempt marker, not a cache or saved-record migration.
  const legacyRefreshAttempts = new Set();
  const gatewayEndpoint = typeof endpoint === "string"
    && endpoint.startsWith("/")
    && !endpoint.startsWith("//")
    ? endpoint
    : REMOTE_BARCODE_ENDPOINT;

  async function requestRemote(barcode, fallback = null) {
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
      if (!result) return fallback || safeResult("unavailable", { scheme: "gtin", value: barcode });
      if (["found", "incomplete"].includes(result.status)) {
        cache.set(barcode, result);
        return result;
      }
      return fallback || result;
    } catch (error) {
      const runtimeState = typeof runtime === "function" ? runtime() : runtime;
      return fallback || safeResult(
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

    const custom = userLookup(barcode);
    if (custom.status === "found") {
      return immutableCopy({ ...custom, source: "user" });
    }

    const cached = cache.get(barcode);
    if (cached && !needsAssessmentRefresh(cached.food)) return cached;

    const runtimeState = typeof runtime === "function" ? runtime() : runtime;
    if (cached && (runtimeState?.isOnline === false || runtimeState?.isWeb !== true)) return cached;
    if (runtimeState?.isOnline === false) {
      return cache.get(barcode, { allowExpired: true })
        || safeResult("offline", { scheme: "gtin", value: barcode });
    }
    if (runtimeState?.isWeb === false) {
      return safeResult("unavailable", { scheme: "gtin", value: barcode });
    }

    const key = canonicalGtinKey(barcode);
    if (inFlight.has(key)) return inFlight.get(key);
    if (cached) {
      if (legacyRefreshAttempts.has(key)) return cached;
      legacyRefreshAttempts.add(key);
    }
    if (!inFlight.has(key)) {
      inFlight.set(key, requestRemote(barcode, cached).finally(() => inFlight.delete(key)));
    }
    return inFlight.get(key);
  }

  return Object.freeze({ lookup });
}

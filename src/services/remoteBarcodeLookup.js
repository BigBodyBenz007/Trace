import { getReviewedLabels } from './sharedPackageLabels';
import { readPersonalLabels, personalLabelsFor } from './personalPackageLabels';
import { lookupCatalogFoodByBarcode } from "./barcodeFoodLookup";
import { canonicalGtinKey, normalizeGtin } from "./productIdentifiers";
import { createRemoteBarcodeCache } from "./remoteBarcodeCache";
import { immutableCopy, normalizeRemoteLookupResult } from "./remoteFoodModel";
import { detectRuntimePlatform } from "./runtimePlatform";
import { bareBarcodeLookup, barcodeAssessmentTier, barcodeSourceKey, chooseBarcodeSource } from "./barcodeSourceSelection";

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
    return (food.nutritionBasis?.kind === "derived-serving"
      && !["retrieved", "not-supplied"].includes(food.usdaDetails?.status))
      || input.datasets.some(dataset => ["grm", "mlt"].includes(dataset.quantity?.unit?.toLowerCase())
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
  const providerRequests = new Map();
  const nextRetryAt = new Map();
  // Older valid v2 records predate optional capture or its basis fixes. Refresh
  // them once online instead of hiding newer evidence for the cache lifetime.
  // This is an in-memory attempt marker, not a cache or saved-record migration.
  const legacyRefreshAttempts = new Set();
  const gatewayEndpoint = typeof endpoint === "string"
    && endpoint.startsWith("/")
    && !endpoint.startsWith("//")
    ? endpoint
    : REMOTE_BARCODE_ENDPOINT;

  function rememberAttempts(barcode, result, provider) {
    const now = clock();
    const header = result.retryAfter;
    const parsed = typeof header === "string"
      ? /^\d+$/.test(header) ? now + Number(header) * 1000 : Date.parse(header) : NaN;
    const limitedProvider = provider || result.providerAttempts?.find(entry => entry.status === result.status)?.provider;
    for (const entry of result.providerAttempts || []) {
      nextRetryAt.set(`${canonicalGtinKey(barcode)}:${entry.provider}`,
        Math.max(now + 60000, entry.provider === limitedProvider && Number.isFinite(parsed) ? parsed : 0));
    }
  }

  async function requestRemote(barcode, fallback = null, provider = null) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetchImpl(gatewayEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ barcode, ...(provider ? { provider } : {}) }),
        credentials: "same-origin",
        signal: controller.signal,
      });
      const payload = await readBoundedResponse(response, responseMaxBytes);
      let result = normalizeRemoteLookupResult(payload);
      if (!result || canonicalGtinKey(result.identifier?.value) !== canonicalGtinKey(barcode)) {
        result = safeResult("unavailable", { scheme: "gtin", value: barcode });
      }
      if (provider && !result.providerAttempts?.some(entry => entry.provider === provider)) {
        result = immutableCopy({ ...result, providerAttempts: [{ provider, status: result.status }] });
      }
      rememberAttempts(barcode, result, provider);
      if (["found", "incomplete"].includes(result.status)) {
        if (!provider) {
          cache.set(barcode, result);
          // We just asked the gateway for current evidence. Do not immediately
          // refresh it again if that response still lacks optional details.
          legacyRefreshAttempts.add(canonicalGtinKey(barcode));
        }
        return result;
      }
      return fallback ? immutableCopy({ ...fallback, gatewayStatus: result.status,
        providerAttempts: result.providerAttempts || [] }) : result;
    } catch (error) {
      const runtimeState = typeof runtime === "function" ? runtime() : runtime;
      const result = safeResult(
        runtimeState?.isOnline === false ? "offline" : "unavailable",
        { scheme: "gtin", value: barcode },
        provider ? { providerAttempts: [{ provider, status: "unavailable" }] } : {}
      );
      rememberAttempts(barcode, result, provider);
      return fallback ? immutableCopy({ ...fallback, gatewayStatus: result.status }) : result;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function lookupPreferred(value) {
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
      const retained = cached || cache.get(barcode, { allowExpired: true });
      inFlight.set(key, requestRemote(barcode, retained).finally(() => inFlight.delete(key)));
    }
    return inFlight.get(key);
  }

  // Keep raw provider priority in the cache. A development assessment chooses a
  // whole effective record at read time; ordinary logging keeps its prior order.
  function mergeEvidence(primary, extra, chosen) {
    const alternatives = [], seen = new Set([barcodeSourceKey(primary)]);
    for (const candidate of [chosen, ...(primary.alternatives || []), extra, ...(extra.alternatives || [])]) {
      if (!candidate?.food || seen.has(barcodeSourceKey(candidate))) continue;
      seen.add(barcodeSourceKey(candidate));
      const bare = bareBarcodeLookup(candidate);
      if (alternatives.length < 3 && new TextEncoder().encode(JSON.stringify({ ...primary, alternatives: [...alternatives, bare] })).byteLength <= 60 * 1024) alternatives.push(bare);
    }
    const attempts = new Map();
    for (const entry of [...(primary.providerAttempts || []), ...(extra.providerAttempts || [])]) attempts.set(entry.provider, entry);
    return immutableCopy({ ...primary, alternatives, providerAttempts: [...attempts.values()] });
  }

  async function lookupEvidence(value, { assess } = {}) {
    let preferred = await lookupPreferred(value);
    if (preferred.status === "invalid") return preferred;
    try { preferred = personalLabelsFor(preferred, readPersonalLabels(storage)); }
    catch (error) { preferred = {...preferred, personalLabelWarning:error.message}; }
    // Another provider cannot confirm a private package edition.
    if (preferred.personalLabelChoices?.length) return preferred;
    if (typeof assess !== "function" || preferred.source === "user" || preferred.status === "invalid"
      || barcodeAssessmentTier(preferred, assess) === 2) return preferred;
    const barcode = normalizeGtin(value), key = canonicalGtinKey(barcode);
    const state = typeof runtime === "function" ? runtime() : runtime;
    const offline = state?.isOnline === false;
    let evidence = cache.get(barcode, { allowExpired: offline }) || (preferred.food?.sourceType === "remote-barcode" ? preferred : null);
    let attempts = [...(evidence?.providerAttempts || preferred.providerAttempts || [])];
    let candidates = [...(preferred.alternatives || [])];
    const addEvidence = result => {
      if (!result) return;
      candidates.push(...(result.food ? [result] : []), ...(result.alternatives || []).map(candidate =>
        result.stale ? { ...candidate, stale: true } : candidate));
      attempts = [...new Map([...attempts, ...(result.providerAttempts || [])].map(entry => [entry.provider, entry])).values()];
    };
    addEvidence(evidence);
    let chosen = chooseBarcodeSource(preferred, candidates, assess, attempts, offline);
    if (barcodeAssessmentTier(chosen, assess) === 2 || offline || state?.isWeb !== true) return chosen;

    // Catalog hits have not contacted the gateway at all. Keep its default
    // provider order for this first request; then request only missing evidence.
    if (preferred.source === "local" && !evidence) {
      if (!inFlight.has(key)) inFlight.set(key, requestRemote(barcode).finally(() => inFlight.delete(key)));
      const remote = await inFlight.get(key);
      evidence = remote.food ? remote : null;
      addEvidence(remote);
      chosen = chooseBarcodeSource(preferred, candidates, assess, attempts);
      if (barcodeAssessmentTier(chosen, assess) === 2) return chosen;
    }
    for (const provider of ["usda-fdc", "open-food-facts"]) {
      const known = attempts.find(entry => entry.provider === provider);
      const alreadyPresent = [preferred, ...candidates].some(result => result.food?.provider?.id === provider);
      const requestKey = `${key}:${provider}`;
      if (alreadyPresent || known?.status === "not-found"
        || clock() < (nextRetryAt.get(requestKey) || 0)) continue;
      if (!providerRequests.has(requestKey)) {
        providerRequests.set(requestKey, requestRemote(barcode, null, provider).finally(() => providerRequests.delete(requestKey)));
      }
      const alternative = await providerRequests.get(requestKey);
      addEvidence(alternative);
      chosen = chooseBarcodeSource(preferred, candidates, assess, attempts);
      if (evidence?.food) {
        evidence = mergeEvidence(evidence, alternative, chosen);
        cache.set(barcode, evidence, { preserveAge: true });
      } else if (alternative.food) {
        evidence = alternative;
        cache.set(barcode, evidence);
      }
      if (barcodeAssessmentTier(chosen, assess) === 2) break;
    }
    return chosen;
  }

  async function lookup(value, options) {
    const result=await lookupEvidence(value,options);
    if(result.status==='invalid'||result.personalLabelChoices?.length) return result;
    const state=typeof runtime==='function'?runtime():runtime;
    if(state?.isOnline===false||state?.isWeb===false) return result;
    try {
      const published=await getReviewedLabels(result.identifier?.value||value);
      return {...result,reviewedLabelChoices:published.versions,reviewedLabelsCheckedAt:published.checkedAt};
    } catch {return result;}
  }
  return Object.freeze({ lookup });
}

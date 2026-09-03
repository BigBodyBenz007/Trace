"use strict";

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product";
const REQUEST_TIMEOUT_MS = 4000;
const MAX_REQUEST_BYTES = 2048;
const MAX_PROVIDER_RESPONSE_BYTES = 256 * 1024;
const GTIN_LENGTHS = new Set([8, 12, 13, 14]);
const NUTRIENT_KEYS = Object.freeze([
  "calories",
  "protein",
  "carbohydrates",
  "fat",
  "fiber",
  "sodium",
  "totalSugar",
  "addedSugar",
]);
const REQUIRED_NUTRIENTS = Object.freeze([
  "calories",
  "protein",
  "carbohydrates",
  "fat",
]);

function normalizeGtin(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\s-]+/g, "");
  if (!/^\d+$/.test(normalized) || !GTIN_LENGTHS.has(normalized.length)) return null;

  const digits = [...normalized].map(Number);
  const checkDigit = digits.pop();
  const sum = digits.reduceRight(
    (total, digit, index) =>
      total + digit * ((digits.length - 1 - index) % 2 === 0 ? 3 : 1),
    0
  );
  return (10 - (sum % 10)) % 10 === checkDigit ? normalized : null;
}

function canonicalGtin(value) {
  const normalized = normalizeGtin(value);
  return normalized ? normalized.padStart(14, "0") : null;
}

function identifier(value) {
  return Object.freeze({ scheme: "gtin", value });
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function textOrNull(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

function positiveOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parsePublishedNumber(value, multiplier = 1) {
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: null };
  }
  const number = Number(value) * multiplier;
  return Number.isFinite(number) && number >= 0
    ? { valid: true, value: number }
    : { valid: false, value: null };
}

function firstPublished(object, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object || {}, key)) return object[key];
  }
  return null;
}

function isoDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function unixDate(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp >= 0
    ? new Date(timestamp * 1000).toISOString()
    : null;
}

function newestRevisionDate(record) {
  const dates = [
    record?.modifiedDate,
    record?.publishedDate,
    record?.publicationDate,
    record?.availableDate,
  ].map(isoDate).filter(Boolean);
  return dates.sort().at(-1) || null;
}

function revisionTimestamp(record) {
  const revision = newestRevisionDate(record);
  return revision ? Date.parse(revision) : 0;
}

function normalizeUnit(value) {
  return String(value || "").trim().toLowerCase().replace(/\./g, "");
}

function convertWeight(value, unit, target) {
  const normalizedUnit = normalizeUnit(unit);
  let multiplier = 1;
  if (target === "mg") {
    if (["g", "gram", "grams"].includes(normalizedUnit)) multiplier = 1000;
    else if (["mcg", "ug", "µg"].includes(normalizedUnit)) multiplier = 0.001;
    else if (!["mg", "milligram", "milligrams"].includes(normalizedUnit)) return { valid: false, value: null };
  } else if (target === "g") {
    if (["mg", "milligram", "milligrams"].includes(normalizedUnit)) multiplier = 0.001;
    else if (["mcg", "ug", "µg"].includes(normalizedUnit)) multiplier = 0.000001;
    else if (!["g", "gram", "grams", ""].includes(normalizedUnit)) return { valid: false, value: null };
  }
  return parsePublishedNumber(value, multiplier);
}

function usdaNutrient(food, matcher, expectedUnit) {
  const match = (Array.isArray(food?.foodNutrients) ? food.foodNutrients : []).find((entry) => {
    const name = textOrNull(entry?.nutrientName || entry?.nutrient?.name)?.toLowerCase();
    return name ? matcher(name, normalizeUnit(entry?.unitName || entry?.nutrient?.unitName)) : false;
  });
  if (!match) return { valid: true, value: null };
  const value = Object.prototype.hasOwnProperty.call(match, "value") ? match.value : match.amount;
  const unit = match.unitName || match.nutrient?.unitName;
  if (expectedUnit === "kcal") {
    return normalizeUnit(unit) === "kcal"
      ? parsePublishedNumber(value)
      : { valid: false, value: null };
  }
  return convertWeight(value, unit, expectedUnit);
}

function usdaNutrients(food) {
  const definitions = {
    calories: [(name, unit) => name === "energy" && unit === "kcal", "kcal"],
    protein: [(name) => name === "protein", "g"],
    carbohydrates: [(name) => name === "carbohydrate, by difference", "g"],
    fat: [(name) => name === "total lipid (fat)", "g"],
    fiber: [(name) => name === "fiber, total dietary", "g"],
    sodium: [(name) => name === "sodium, na", "mg"],
    totalSugar: [(name) => name === "total sugars" || name === "sugars, total including nlea", "g"],
    addedSugar: [(name) => name === "added sugars" || name === "sugars, added", "g"],
  };
  const nutrients = {};
  for (const [key, [matcher, unit]] of Object.entries(definitions)) {
    const parsed = usdaNutrient(food, matcher, unit);
    if (!parsed.valid) return null;
    nutrients[key] = parsed.value;
  }
  return nutrients;
}

function offNutrient(product, nutrient, suffix, targetUnit) {
  const nutriments = product?.nutriments;
  if (!nutriments || typeof nutriments !== "object" || Array.isArray(nutriments)) {
    return { valid: true, value: null };
  }
  const key = `${nutrient}_${suffix}`;
  if (!Object.prototype.hasOwnProperty.call(nutriments, key)) {
    return { valid: true, value: null };
  }
  if (targetUnit === "kcal") return parsePublishedNumber(nutriments[key]);
  const publishedUnit = firstPublished(nutriments, [
    `${nutrient}_unit`,
    `${nutrient}_${suffix}_unit`,
  ]);
  const defaultUnit = nutrient === "sodium" ? "g" : "g";
  return convertWeight(nutriments[key], publishedUnit || defaultUnit, targetUnit);
}

function offNutrients(product, suffix) {
  const definitions = {
    calories: ["energy-kcal", "kcal"],
    protein: ["proteins", "g"],
    carbohydrates: ["carbohydrates", "g"],
    fat: ["fat", "g"],
    fiber: ["fiber", "g"],
    sodium: ["sodium", "mg"],
    totalSugar: ["sugars", "g"],
    addedSugar: ["added-sugars", "g"],
  };
  const nutrients = {};
  for (const [key, [providerKey, unit]] of Object.entries(definitions)) {
    const parsed = offNutrient(product, providerKey, suffix, unit);
    if (!parsed.valid) return null;
    nutrients[key] = parsed.value;
  }
  return nutrients;
}

function nutrientCount(nutrients) {
  return REQUIRED_NUTRIENTS.filter((key) => nutrients?.[key] !== null).length;
}

function buildCompleteness(food) {
  const unknownFields = [];
  ["brand", "packageQuantity", "servingsPerContainer"].forEach((key) => {
    if (food[key] === null) unknownFields.push(key);
  });
  ["description", "amount", "grams"].forEach((key) => {
    if (food.serving?.[key] === null || food.serving?.[key] === undefined) {
      unknownFields.push(`serving.${key}`);
    }
  });
  NUTRIENT_KEYS.forEach((key) => {
    if (food.nutrients[key] === null) unknownFields.push(`nutrients.${key}`);
  });
  if (food.provenance.revisionDate === null) unknownFields.push("provenance.revisionDate");

  const sugarValid = food.nutrients.totalSugar === null
    || food.nutrients.addedSugar === null
    || food.nutrients.addedSugar <= food.nutrients.totalSugar;
  const logReady = Boolean(food.name && food.dataBasis)
    && REQUIRED_NUTRIENTS.every((key) => food.nutrients[key] !== null)
    && sugarValid;
  return {
    completeness: logReady
      ? (unknownFields.length ? "partial" : "complete")
      : "insufficient",
    unknownFields,
    logReady,
  };
}

function finalizeFood(food) {
  if (!food?.name || !food?.provider?.recordId || !food?.provenance?.sourceUrl) return null;
  if (!NUTRIENT_KEYS.every((key) => {
    const value = food.nutrients?.[key];
    return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
  })) return null;
  if (
    food.nutrients.totalSugar !== null
    && food.nutrients.addedSugar !== null
    && food.nutrients.addedSugar > food.nutrients.totalSugar
  ) return null;
  return deepFreeze({ ...food, ...buildCompleteness(food) });
}

function normalizeUsdaFood(food, barcode, retrievedAt) {
  const nutrients = usdaNutrients(food);
  const recordId = food?.fdcId === null || food?.fdcId === undefined
    ? null
    : String(food.fdcId);
  if (!nutrients || !recordId) return null;

  const servingAmount = positiveOrNull(food.servingSize);
  const servingUnit = textOrNull(food.servingSizeUnit)?.toLowerCase() || null;
  const servingGrams = servingAmount !== null
    && ["g", "gram", "grams"].includes(normalizeUnit(servingUnit))
    ? servingAmount
    : null;
  const servingDescription = textOrNull(food.householdServingFullText)
    || (servingAmount !== null && servingUnit ? `${servingAmount} ${servingUnit}` : null);

  return finalizeFood({
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers: [identifier(barcode)],
    provider: {
      id: "usda-fdc",
      recordId,
      attribution: "USDA FoodData Central",
    },
    brand: textOrNull(food.brandOwner || food.brandName),
    name: textOrNull(food.description),
    packageQuantity: textOrNull(food.packageWeight),
    serving: {
      description: servingDescription,
      amount: servingAmount,
      unit: servingUnit,
      grams: servingGrams,
    },
    servingsPerContainer: positiveOrNull(food.servingsPerContainer),
    nutrients,
    dataBasis: "100g",
    provenance: {
      sourceUrl: `https://fdc.nal.usda.gov/food-details/${encodeURIComponent(recordId)}/nutrients`,
      provider: "USDA FoodData Central",
      providerRecordId: recordId,
      attribution: "USDA FoodData Central (public domain / CC0)",
      revisionDate: newestRevisionDate(food),
      retrievedAt,
    },
  });
}

function offBasis(product) {
  const declared = String(product?.nutrition_data_per || "").toLowerCase();
  const serving = offNutrients(product, "serving");
  const per100g = offNutrients(product, "100g");
  if (declared === "serving" && serving && nutrientCount(serving)) {
    return { dataBasis: "serving", nutrients: serving };
  }
  if (per100g && nutrientCount(per100g)) {
    return { dataBasis: "100g", nutrients: per100g };
  }
  if (serving && nutrientCount(serving)) {
    return { dataBasis: "serving", nutrients: serving };
  }
  return { dataBasis: declared === "serving" ? "serving" : "100g", nutrients: per100g || serving };
}

function safeOffSourceUrl(value, barcode) {
  try {
    const url = new URL(value || "");
    if (url.protocol === "https:" && /(^|\.)openfoodfacts\.org$/i.test(url.hostname)) {
      return url.toString();
    }
  } catch (error) {
    // Use the provider's canonical public product page below.
  }
  return `https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`;
}

function normalizeOpenFoodFactsProduct(product, barcode, retrievedAt) {
  if (canonicalGtin(product?.code) !== canonicalGtin(barcode)) return null;
  const basis = offBasis(product);
  if (!basis.nutrients) return null;

  const servingAmount = positiveOrNull(product.serving_quantity);
  const servingUnit = textOrNull(product.serving_quantity_unit)?.toLowerCase() || null;
  const servingGrams = servingAmount !== null
    && ["g", "gram", "grams"].includes(normalizeUnit(servingUnit))
    ? servingAmount
    : null;
  const servingDescription = textOrNull(product.serving_size);
  const productQuantity = positiveOrNull(product.product_quantity);
  const productQuantityUnit = textOrNull(product.product_quantity_unit);
  const packageQuantity = textOrNull(product.quantity)
    || (productQuantity !== null && productQuantityUnit
      ? `${productQuantity} ${productQuantityUnit}`
      : null);
  const revisionDate = isoDate(product.last_modified_datetime) || unixDate(product.last_modified_t);
  return finalizeFood({
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers: [identifier(barcode)],
    provider: {
      id: "open-food-facts",
      recordId: String(product.code),
      attribution: "Open Food Facts contributors",
    },
    brand: textOrNull(product.brands),
    name: textOrNull(product.product_name || product.product_name_en),
    packageQuantity,
    serving: {
      description: servingDescription,
      amount: servingAmount,
      unit: servingUnit,
      grams: servingGrams,
    },
    servingsPerContainer: positiveOrNull(product.servings_per_container),
    nutrients: basis.nutrients,
    dataBasis: basis.dataBasis,
    provenance: {
      sourceUrl: safeOffSourceUrl(product.url, barcode),
      provider: "Open Food Facts",
      providerRecordId: String(product.code),
      attribution: "Open Food Facts contributors; database licensed under ODbL",
      revisionDate,
      retrievedAt,
    },
  });
}

function retryAfter(response) {
  const value = response?.headers?.get?.("retry-after");
  return typeof value === "string" && value.trim() && value.length <= 128
    ? value.trim()
    : null;
}

async function readLimitedText(response, maxBytes) {
  const declared = Number(response?.headers?.get?.("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("oversized");

  if (response?.body?.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let output = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("oversized");
      }
      output += decoder.decode(chunk.value, { stream: true });
    }
    return output + decoder.decode();
  }

  const output = await response.text();
  if (Buffer.byteLength(output, "utf8") > maxBytes) throw new Error("oversized");
  return output;
}

async function fetchProviderJson({ fetchImpl, url, options, timeoutMs, maxBytes }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    if (response.status === 429) {
      return { status: "rate-limited", retryAfter: retryAfter(response) };
    }
    if (response.status === 503) {
      return { status: "unavailable", retryAfter: retryAfter(response) };
    }
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "unavailable" };

    const body = await readLimitedText(response, maxBytes);
    try {
      return { status: "ok", data: JSON.parse(body) };
    } catch (error) {
      return { status: "unavailable" };
    }
  } catch (error) {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

function lookupResult(status, barcode, food = null, extra = {}) {
  return deepFreeze({
    status,
    identifier: barcode ? identifier(barcode) : null,
    food,
    ...extra,
  });
}

async function lookupUsda({ barcode, fetchImpl, apiKey, now, timeoutMs, maxBytes }) {
  if (!textOrNull(apiKey)) return lookupResult("unconfigured", barcode);
  const response = await fetchProviderJson({
    fetchImpl,
    url: `${USDA_SEARCH_URL}?api_key=${encodeURIComponent(apiKey)}`,
    options: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: barcode, dataType: ["Branded"], pageSize: 50 }),
    },
    timeoutMs,
    maxBytes,
  });
  if (response.status !== "ok") {
    return lookupResult(response.status, barcode, null,
      response.retryAfter ? { retryAfter: response.retryAfter } : {});
  }
  if (!Array.isArray(response.data?.foods)) return lookupResult("unavailable", barcode);

  const retrievedAt = new Date(now()).toISOString();
  const candidates = response.data.foods
    .filter((food) => String(food?.dataType || "").toLowerCase() === "branded")
    .filter((food) => canonicalGtin(food?.gtinUpc) === canonicalGtin(barcode))
    .sort((left, right) => revisionTimestamp(right) - revisionTimestamp(left));
  for (const candidate of candidates) {
    const food = normalizeUsdaFood(candidate, barcode, retrievedAt);
    if (food) return lookupResult(food.logReady ? "found" : "incomplete", barcode, food);
  }
  return lookupResult("not-found", barcode);
}

const OFF_FIELDS = [
  "code", "product_name", "product_name_en", "brands", "quantity",
  "product_quantity", "product_quantity_unit", "serving_size",
  "serving_quantity", "serving_quantity_unit", "servings_per_container",
  "nutrition_data_per", "nutriments", "last_modified_t",
  "last_modified_datetime", "url",
].join(",");

async function lookupOpenFoodFacts({ barcode, fetchImpl, userAgent, now, timeoutMs, maxBytes }) {
  if (!textOrNull(userAgent)) return lookupResult("unconfigured", barcode);
  const response = await fetchProviderJson({
    fetchImpl,
    url: `${OPEN_FOOD_FACTS_URL}/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(OFF_FIELDS)}`,
    options: {
      method: "GET",
      headers: { "user-agent": userAgent, accept: "application/json" },
    },
    timeoutMs,
    maxBytes,
  });
  if (response.status !== "ok") {
    return lookupResult(response.status, barcode, null,
      response.retryAfter ? { retryAfter: response.retryAfter } : {});
  }
  if (response.data?.status === 0) return lookupResult("not-found", barcode);
  if (response.data?.status !== 1 || !response.data.product) {
    return lookupResult("unavailable", barcode);
  }

  const food = normalizeOpenFoodFactsProduct(
    response.data.product,
    barcode,
    new Date(now()).toISOString()
  );
  if (!food) return lookupResult("not-found", barcode);
  return lookupResult(food.logReady ? "found" : "incomplete", barcode, food);
}

function preferredFailure(usda, openFoodFacts, barcode) {
  const incomplete = [usda, openFoodFacts]
    .filter((result) => result.status === "incomplete" && result.food)
    .sort((left, right) =>
      left.food.unknownFields.length - right.food.unknownFields.length
      || (left.food.provider.id === "usda-fdc" ? -1 : 1));
  if (incomplete.length) return incomplete[0];

  for (const status of ["rate-limited", "unavailable", "unconfigured", "not-found"]) {
    const result = [usda, openFoodFacts].find((candidate) => candidate.status === status);
    if (result) return result;
  }
  return lookupResult("unavailable", barcode);
}

async function lookupRemoteBarcode({
  barcode,
  fetchImpl = globalThis.fetch,
  env = process.env,
  now = Date.now,
  timeoutMs = REQUEST_TIMEOUT_MS,
  maxBytes = MAX_PROVIDER_RESPONSE_BYTES,
} = {}) {
  const normalized = normalizeGtin(barcode);
  if (!normalized) return lookupResult("invalid", null);
  if (typeof fetchImpl !== "function") return lookupResult("unavailable", normalized);

  const usda = await lookupUsda({
    barcode: normalized,
    fetchImpl,
    apiKey: env?.USDA_FDC_API_KEY,
    now,
    timeoutMs,
    maxBytes,
  });
  if (usda.status === "found") return usda;

  const openFoodFacts = await lookupOpenFoodFacts({
    barcode: normalized,
    fetchImpl,
    userAgent: env?.OPEN_FOOD_FACTS_USER_AGENT,
    now,
    timeoutMs,
    maxBytes,
  });
  if (openFoodFacts.status === "found") return openFoodFacts;
  return preferredFailure(usda, openFoodFacts, normalized);
}

function setResponseHeaders(response) {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store, max-age=0");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
}

function send(response, statusCode, payload) {
  setResponseHeaders(response);
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
}

function parseRequestBody(request) {
  const declared = Number(request.headers?.["content-length"]);
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) return { oversized: true };
  const raw = Buffer.isBuffer(request.body) ? request.body.toString("utf8") : request.body;
  const serialized = typeof raw === "string" ? raw : JSON.stringify(raw ?? null);
  if (Buffer.byteLength(serialized, "utf8") > MAX_REQUEST_BYTES) return { oversized: true };
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { invalid: true };
    const keys = Object.keys(parsed);
    if (keys.length !== 1 || keys[0] !== "barcode") return { invalid: true };
    return { barcode: parsed.barcode };
  } catch (error) {
    return { invalid: true };
  }
}

function createHandler({ lookup = lookupRemoteBarcode } = {}) {
  return async function barcodeHandler(request, response) {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      return send(response, 405, lookupResult("invalid", null));
    }
    const contentType = String(request.headers?.["content-type"] || "").toLowerCase();
    if (contentType && !contentType.startsWith("application/json")) {
      return send(response, 415, lookupResult("invalid", null));
    }
    const body = parseRequestBody(request);
    if (body.oversized) return send(response, 413, lookupResult("invalid", null));
    const barcode = normalizeGtin(body.barcode);
    if (body.invalid || !barcode) return send(response, 400, lookupResult("invalid", null));

    try {
      return send(response, 200, await lookup({ barcode }));
    } catch (error) {
      return send(response, 200, lookupResult("unavailable", barcode));
    }
  };
}

const handler = createHandler();

module.exports = {
  MAX_PROVIDER_RESPONSE_BYTES,
  MAX_REQUEST_BYTES,
  OFF_FIELDS,
  REQUEST_TIMEOUT_MS,
  canonicalGtin,
  createHandler,
  handler,
  lookupOpenFoodFacts,
  lookupRemoteBarcode,
  lookupUsda,
  normalizeGtin,
  normalizeOpenFoodFactsProduct,
  normalizeUsdaFood,
};

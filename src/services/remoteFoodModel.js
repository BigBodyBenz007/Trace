import {
  canonicalGtinKey,
  normalizeProductIdentifiers,
} from "./productIdentifiers";
import { NUTRITION_ENTRY_NUTRIENT_KEYS } from "./nutritionCalculation";

export const REMOTE_FOOD_PROVIDERS = Object.freeze({
  USDA: "usda-fdc",
  OPEN_FOOD_FACTS: "open-food-facts",
});

export const REMOTE_LOOKUP_STATUSES = Object.freeze([
  "found",
  "incomplete",
  "not-found",
  "invalid",
  "offline",
  "rate-limited",
  "unavailable",
  "unconfigured",
]);

const PROVIDERS = new Set(Object.values(REMOTE_FOOD_PROVIDERS));
const LOOKUP_STATUSES = new Set(REMOTE_LOOKUP_STATUSES);
const COMPLETENESS = new Set(["complete", "partial", "insufficient"]);
const DATA_BASES = new Set(["serving", "100g"]);
const REQUIRED_NUTRIENTS = ["calories", "protein", "carbohydrates", "fat"];

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value) {
  if (value === null) return null;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function nonNegativeOrNull(value) {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function positiveOrNull(value) {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function isoOrNull(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) {
    return undefined;
  }
  return new Date(Date.parse(value)).toISOString();
}

function validSourceUrl(value, provider) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const allowed = provider === REMOTE_FOOD_PROVIDERS.USDA
      ? url.protocol === "https:" && url.hostname === "fdc.nal.usda.gov"
      : url.protocol === "https:" && /(^|\.)openfoodfacts\.org$/i.test(url.hostname);
    return allowed ? url.toString() : null;
  } catch (error) {
    return null;
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function immutableCopy(value) {
  if (Array.isArray(value)) return deepFreeze(value.map(immutableCopy));
  if (plainObject(value)) {
    return deepFreeze(Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, immutableCopy(item)])
    ));
  }
  return value;
}

export function normalizeRemoteFood(food) {
  if (!plainObject(food)) return null;
  const identifiers = normalizeProductIdentifiers(food.identifiers);
  const providerId = food.provider?.id;
  const providerRecordId = stringOrNull(food.provider?.recordId);
  const providerAttribution = stringOrNull(food.provider?.attribution);
  const name = stringOrNull(food.name);
  const brand = stringOrNull(food.brand);
  const packageQuantity = stringOrNull(food.packageQuantity);
  const servingsPerContainer = positiveOrNull(food.servingsPerContainer);
  const servingDescription = stringOrNull(food.serving?.description);
  const servingAmount = positiveOrNull(food.serving?.amount);
  const servingUnit = stringOrNull(food.serving?.unit);
  const servingGrams = positiveOrNull(food.serving?.grams);
  const revisionDate = isoOrNull(food.provenance?.revisionDate);
  const retrievedAt = isoOrNull(food.provenance?.retrievedAt);
  const sourceUrl = validSourceUrl(food.provenance?.sourceUrl, providerId);
  const provenanceProvider = stringOrNull(food.provenance?.provider);
  const provenanceRecordId = stringOrNull(food.provenance?.providerRecordId);
  const provenanceAttribution = stringOrNull(food.provenance?.attribution);

  if (
    food.sourceType !== "remote-barcode"
    || food.dataType !== "branded"
    || identifiers === null
    || identifiers.length !== 1
    || !canonicalGtinKey(identifiers[0].value)
    || !PROVIDERS.has(providerId)
    || providerRecordId === undefined
    || providerAttribution === undefined
    || name === undefined
    || brand === undefined
    || packageQuantity === undefined
    || servingsPerContainer === undefined
    || servingDescription === undefined
    || servingAmount === undefined
    || servingUnit === undefined
    || servingGrams === undefined
    || !DATA_BASES.has(food.dataBasis)
    || !COMPLETENESS.has(food.completeness)
    || typeof food.logReady !== "boolean"
    || !Array.isArray(food.unknownFields)
    || food.unknownFields.some((field) => typeof field !== "string" || !field)
    || new Set(food.unknownFields).size !== food.unknownFields.length
    || revisionDate === undefined
    || retrievedAt === undefined
    || !sourceUrl
    || provenanceProvider === undefined
    || provenanceRecordId === undefined
    || provenanceAttribution === undefined
    || provenanceRecordId !== providerRecordId
  ) return null;

  const nutrients = {};
  for (const key of NUTRITION_ENTRY_NUTRIENT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(food.nutrients || {}, key)) return null;
    const value = nonNegativeOrNull(food.nutrients[key]);
    if (value === undefined) return null;
    nutrients[key] = value;
  }
  if (
    nutrients.totalSugar !== null
    && nutrients.addedSugar !== null
    && nutrients.addedSugar > nutrients.totalSugar
  ) return null;

  const calculatedLogReady = REQUIRED_NUTRIENTS.every((key) => nutrients[key] !== null);
  const calculatedUnknownFields = [];
  [["brand", brand], ["packageQuantity", packageQuantity], ["servingsPerContainer", servingsPerContainer]]
    .forEach(([key, value]) => {
      if (value === null) calculatedUnknownFields.push(key);
    });
  [["description", servingDescription], ["amount", servingAmount], ["grams", servingGrams]]
    .forEach(([key, value]) => {
      if (value === null) calculatedUnknownFields.push(`serving.${key}`);
    });
  NUTRITION_ENTRY_NUTRIENT_KEYS.forEach((key) => {
    if (nutrients[key] === null) calculatedUnknownFields.push(`nutrients.${key}`);
  });
  if (revisionDate === null) calculatedUnknownFields.push("provenance.revisionDate");
  const expectedCompleteness = calculatedLogReady
    ? (calculatedUnknownFields.length ? "partial" : "complete")
    : "insufficient";
  if (food.logReady !== calculatedLogReady) return null;
  if (food.completeness !== expectedCompleteness) return null;
  if (
    [...food.unknownFields].sort().join("\n")
    !== [...calculatedUnknownFields].sort().join("\n")
  ) return null;

  return deepFreeze({
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers,
    provider: {
      id: providerId,
      recordId: providerRecordId,
      attribution: providerAttribution,
    },
    brand,
    name,
    packageQuantity,
    serving: {
      description: servingDescription,
      amount: servingAmount,
      unit: servingUnit,
      grams: servingGrams,
    },
    servingsPerContainer,
    nutrients,
    dataBasis: food.dataBasis,
    completeness: food.completeness,
    unknownFields: [...food.unknownFields],
    logReady: food.logReady,
    provenance: {
      sourceUrl,
      provider: provenanceProvider,
      providerRecordId: provenanceRecordId,
      attribution: provenanceAttribution,
      revisionDate,
      retrievedAt,
    },
  });
}

export function normalizeRemoteLookupResult(result) {
  if (!plainObject(result) || !LOOKUP_STATUSES.has(result.status)) return null;
  const identifiers = result.identifier === null
    ? Object.freeze([])
    : normalizeProductIdentifiers([result.identifier]);
  if (identifiers === null || identifiers.length > 1) return null;
  const identifier = identifiers[0] || null;

  if (result.status === "found" || result.status === "incomplete") {
    const food = normalizeRemoteFood(result.food);
    if (!food || !identifier) return null;
    if (canonicalGtinKey(identifier.value) !== canonicalGtinKey(food.identifiers[0].value)) {
      return null;
    }
    if ((result.status === "found") !== food.logReady) return null;
    return deepFreeze({ status: result.status, identifier, food });
  }

  if (result.food !== null && result.food !== undefined) return null;
  const retryAfter = result.retryAfter === undefined
    ? undefined
    : stringOrNull(result.retryAfter);
  if (retryAfter === null || (result.retryAfter !== undefined && retryAfter === undefined)) return null;
  return deepFreeze({
    status: result.status,
    identifier,
    food: null,
    ...(retryAfter ? { retryAfter } : {}),
  });
}

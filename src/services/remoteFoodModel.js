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
const DATA_BASES = new Set(["serving", "100g", "100ml", "package"]);
const NUTRITION_BASIS_KINDS = new Set([
  "provider-serving",
  "derived-serving",
  "provider-package",
  "reference-only",
]);
const SAFE_NUTRITION_BASIS_KINDS = new Set([
  "provider-serving",
  "derived-serving",
  "provider-package",
]);
const BASIS_DIMENSIONS = new Set(["mass", "volume"]);
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

function normalizedBasisQuantity(value) {
  if (value === null) return null;
  if (!plainObject(value)) return undefined;
  const amount = positiveOrNull(value.amount);
  const unit = stringOrNull(value.unit);
  const dimension = value.dimension === null
    ? null
    : BASIS_DIMENSIONS.has(value.dimension) ? value.dimension : undefined;
  if (amount === undefined || amount === null || unit === undefined || unit === null
    || dimension === undefined) return undefined;
  return { amount, unit, dimension };
}

function normalizeNutritionBasis(value) {
  if (value === undefined) return undefined;
  if (!plainObject(value) || !NUTRITION_BASIS_KINDS.has(value.kind)) return null;
  const source = stringOrNull(value.source);
  const sourceBasis = stringOrNull(value.sourceBasis);
  const sourceQuantity = normalizedBasisQuantity(value.sourceQuantity);
  const servingQuantity = normalizedBasisQuantity(value.servingQuantity);
  const conversionFactor = value.conversionFactor === null
    ? null
    : positiveOrNull(value.conversionFactor);
  if (
    source === undefined || source === null
    || !DATA_BASES.has(sourceBasis)
    || sourceQuantity === undefined
    || servingQuantity === undefined
    || (value.kind !== "reference-only" && servingQuantity === null)
    || conversionFactor === undefined
    || (value.kind === "derived-serving" && conversionFactor === null)
    || (value.kind !== "derived-serving" && conversionFactor !== null)
  ) return null;
  if (
    (value.kind === "provider-serving" && sourceBasis !== "serving")
    || (value.kind === "provider-package" && sourceBasis !== "package")
    || (value.kind === "derived-serving" && !["100g", "100ml"].includes(sourceBasis))
    || (value.kind === "derived-serving" && sourceQuantity === null)
    || (value.kind === "derived-serving" && servingQuantity?.dimension !== sourceQuantity?.dimension)
    || (sourceBasis === "100g" && (
      sourceQuantity?.amount !== 100
      || sourceQuantity?.unit !== "g"
      || sourceQuantity?.dimension !== "mass"
    ))
    || (sourceBasis === "100ml" && (
      sourceQuantity?.amount !== 100
      || sourceQuantity?.unit !== "ml"
      || sourceQuantity?.dimension !== "volume"
    ))
  ) return null;

  const sourceNutrients = {};
  for (const key of NUTRITION_ENTRY_NUTRIENT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value.sourceNutrients || {}, key)) return null;
    const nutrient = nonNegativeOrNull(value.sourceNutrients[key]);
    if (nutrient === undefined) return null;
    sourceNutrients[key] = nutrient;
  }
  if (
    sourceNutrients.totalSugar !== null
    && sourceNutrients.addedSugar !== null
    && sourceNutrients.addedSugar > sourceNutrients.totalSugar
  ) return null;

  return {
    kind: value.kind,
    source,
    sourceBasis,
    sourceQuantity,
    servingQuantity,
    conversionFactor,
    sourceNutrients,
  };
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
  const nutritionBasis = normalizeNutritionBasis(food.nutritionBasis);

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
    || nutritionBasis === null
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
  if (nutritionBasis !== undefined && SAFE_NUTRITION_BASIS_KINDS.has(nutritionBasis.kind)) {
    if (food.dataBasis !== "serving") return null;
    for (const key of NUTRITION_ENTRY_NUTRIENT_KEYS) {
      const sourceValue = nutritionBasis.sourceNutrients[key];
      const expected = sourceValue === null
        ? null
        : sourceValue * (nutritionBasis.conversionFactor ?? 1);
      if (expected === null ? nutrients[key] !== null : (
        nutrients[key] === null
        || Math.abs(nutrients[key] - expected) > Math.max(1, Math.abs(expected)) * 1e-10
      )) return null;
    }
  }

  const hasSafeServingBasis = nutritionBasis === undefined
    ? null
    : SAFE_NUTRITION_BASIS_KINDS.has(nutritionBasis.kind);
  const calculatedLogReady = REQUIRED_NUTRIENTS.every((key) => nutrients[key] !== null)
    && hasSafeServingBasis !== false;
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
  if (hasSafeServingBasis === false) calculatedUnknownFields.push("nutritionBasis.labeledServing");
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
    ...(nutritionBasis === undefined ? {} : { nutritionBasis }),
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

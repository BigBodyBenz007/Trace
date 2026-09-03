import { NUTRITION_ENTRY_NUTRIENT_KEYS } from "./nutritionCalculation";
import {
  canonicalGtinKey,
  normalizeProductIdentifiers,
} from "./productIdentifiers";

export const BRANDED_PACKAGED_FOOD_CATEGORIES = Object.freeze({
  yogurt: "Yogurt",
  "cottage-cheese": "Cottage cheese",
  "cheese-snack": "Cheese snack",
});

export const YOGURT_DAIRY_PHASE_1A_CATEGORY_COUNTS = Object.freeze({
  yogurt: 24,
  "cottage-cheese": 8,
  "cheese-snack": 8,
});

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeNumberOrNull(value) {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function normalizeBrandedPackagedFood(food) {
  const identifiers = normalizeProductIdentifiers(food?.identifiers);
  if (
    !food?.id?.startsWith("packaged-food:")
    || !isNonEmptyString(food.brand)
    || !isNonEmptyString(food.name)
    || !BRANDED_PACKAGED_FOOD_CATEGORIES[food.category]
    || !isNonEmptyString(food.serving?.description)
    || !(typeof food.serving?.amount === "number" && food.serving.amount > 0)
    || !(typeof food.serving?.grams === "number" && food.serving.grams > 0)
    || !isNonEmptyString(food.packaged?.packageSize)
    || !(typeof food.packaged?.servingsPerContainer === "number" && food.packaged.servingsPerContainer > 0)
    || identifiers === null
    || identifiers.length !== 1
  ) return null;

  const nutrients = Object.fromEntries(NUTRITION_ENTRY_NUTRIENT_KEYS.map((key) => [
    key,
    food.nutrients?.[key],
  ]));
  if (!Object.values(nutrients).every(isNonNegativeNumberOrNull)) return null;

  const unknownNutrients = NUTRITION_ENTRY_NUTRIENT_KEYS.filter((key) => nutrients[key] === null);
  const completeness = unknownNutrients.length ? "partial" : "complete";

  return deepFreeze({
    ...food,
    sourceType: "packaged-food",
    dataType: "branded",
    categoryLabel: BRANDED_PACKAGED_FOOD_CATEGORIES[food.category],
    searchAliases: [...food.searchAliases],
    serving: { ...food.serving },
    nutrients,
    packaged: { ...food.packaged },
    identifiers,
    provenance: {
      ...food.provenance,
      completeness,
      unknownNutrients,
      verification: {
        ...food.provenance.verification,
        secondarySources: [...(food.provenance.verification.secondarySources || [])],
      },
    },
  });
}

export function normalizeBrandedPackagedFoods(foods) {
  return Object.freeze((Array.isArray(foods) ? foods : [])
    .map(normalizeBrandedPackagedFood)
    .filter(Boolean));
}

export function validateBrandedPackagedFoodCatalog(foods, {
  expectedCount = 40,
  expectedCategoryCounts = YOGURT_DAIRY_PHASE_1A_CATEGORY_COUNTS,
  existingFoods = [],
} = {}) {
  const records = Array.isArray(foods) ? foods : [];
  const errors = [];
  const ids = new Set();
  const definitions = new Set();
  const identifierOwners = new Map();
  const categoryCounts = Object.fromEntries(
    Object.keys(expectedCategoryCounts).map((category) => [category, 0])
  );

  (Array.isArray(existingFoods) ? existingFoods : []).forEach((food) => {
    const identifiers = normalizeProductIdentifiers(food?.identifiers);
    if (!identifiers) return;
    identifiers.forEach((identifier) => {
      identifierOwners.set(canonicalGtinKey(identifier.value), food.id || "existing catalog record");
    });
  });

  if (records.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} branded packaged foods; received ${records.length}.`);
  }

  records.forEach((food, index) => {
    const label = food?.id || `record ${index + 1}`;
    if (!food?.id?.startsWith("packaged-food:")) errors.push(`${label} has an invalid packaged-food ID.`);
    if (ids.has(food?.id)) errors.push(`Duplicate branded packaged food ID: ${food.id}`);
    ids.add(food?.id);

    if (!isNonEmptyString(food?.brand) || !isNonEmptyString(food?.name)) {
      errors.push(`${label} is missing its brand or product name.`);
    }
    if (!BRANDED_PACKAGED_FOOD_CATEGORIES[food?.category]) {
      errors.push(`${label} has an invalid category.`);
    } else if (Object.prototype.hasOwnProperty.call(categoryCounts, food.category)) {
      categoryCounts[food.category] += 1;
    }
    if (!Array.isArray(food?.searchAliases) || food.searchAliases.length === 0
      || food.searchAliases.some((alias) => !isNonEmptyString(alias))) {
      errors.push(`${label} must have meaningful search aliases.`);
    }

    const definition = [food?.brand, food?.name, food?.packaged?.packageSize]
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|");
    if (definitions.has(definition)) errors.push(`Duplicate branded packaged product: ${definition}`);
    definitions.add(definition);

    if (
      !(typeof food?.serving?.amount === "number" && food.serving.amount > 0)
      || !isNonEmptyString(food?.serving?.unit)
      || !isNonEmptyString(food?.serving?.description)
      || !(typeof food?.serving?.grams === "number" && food.serving.grams > 0)
    ) errors.push(`${label} has an invalid serving definition.`);
    if (
      !isNonEmptyString(food?.packaged?.packageSize)
      || !(typeof food?.packaged?.servingsPerContainer === "number" && food.packaged.servingsPerContainer > 0)
    ) errors.push(`${label} has invalid package metadata.`);

    NUTRITION_ENTRY_NUTRIENT_KEYS.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(food?.nutrients || {}, key)
        || !isNonNegativeNumberOrNull(food.nutrients[key])) {
        errors.push(`${label} has an invalid or missing ${key} value.`);
      }
    });
    if (
      isNonNegativeNumberOrNull(food?.nutrients?.totalSugar)
      && isNonNegativeNumberOrNull(food?.nutrients?.addedSugar)
      && food.nutrients.totalSugar !== null
      && food.nutrients.addedSugar !== null
      && food.nutrients.addedSugar > food.nutrients.totalSugar
    ) errors.push(`${label} has added sugar greater than total sugar.`);

    const identifiers = normalizeProductIdentifiers(food?.identifiers);
    if (identifiers === null || identifiers.length !== 1) {
      errors.push(`${label} must have exactly one valid GTIN identifier.`);
    } else {
      identifiers.forEach((identifier) => {
        const key = canonicalGtinKey(identifier.value);
        const owner = identifierOwners.get(key);
        if (owner) {
          errors.push(`Product identifier collision for ${key}: ${owner} and ${label}.`);
        }
        identifierOwners.set(key, label);
      });
    }

    const verification = food?.provenance?.verification;
    if (
      food?.provenance?.source !== "official-manufacturer"
      || !isNonEmptyString(food?.provenance?.sourceId)
      || !isNonEmptyString(food?.provenance?.confidence)
      || !isNonEmptyString(verification?.sourceUrl)
      || !isNonEmptyString(verification?.sourceReference)
      || !/^\d{4}-\d{2}-\d{2}$/.test(verification?.accessedAt || "")
    ) errors.push(`${label} has incomplete source provenance.`);
  });

  Object.entries(expectedCategoryCounts).forEach(([category, expected]) => {
    if (categoryCounts[category] !== expected) {
      errors.push(`Expected ${expected} ${category} records; received ${categoryCounts[category]}.`);
    }
  });

  return errors;
}

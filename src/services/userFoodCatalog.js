import { normalizeFoodQuery } from "./foodSearch";
import { createServingDefinition } from "./servingDefinition";
import { GROCERY_FOOD_CATEGORY_OPTIONS } from "./groceryFoodCatalog";
import {
  canonicalGtinKey,
  normalizeProductIdentifiers,
} from "./productIdentifiers";
import { getSugarValidationError } from "./nutritionCalculation";
import { applyRemoteNutrientPrecision } from "./barcodeNutritionSelection";
import { immutableCopy, normalizeRemoteFood } from "./remoteFoodModel";

export const USER_FOODS_STORAGE_KEY = "userFoods";

export { GROCERY_FOOD_CATEGORY_OPTIONS };

const GROCERY_FOOD_CATEGORIES = new Set(
  GROCERY_FOOD_CATEGORY_OPTIONS.map(({ value }) => value)
);

function normalizeOptionalText(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  return normalized || null;
}

function toOptionalNonNegativeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function normalizeOptionalPositiveNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function barcodeKey(food) {
  const identifiers = normalizeProductIdentifiers(food?.identifiers);
  return identifiers?.length === 1
    ? canonicalGtinKey(identifiers[0].value)
    : null;
}

export function createUserFood(
  name,
  nutrients,
  serving = createServingDefinition({ amount: 1, unit: "serving" }),
  details = {}
) {
  const normalizedName = normalizeFoodQuery(name);

  if (!normalizedName || getSugarValidationError(nutrients)) return null;
  if (
    !serving
    || !Number.isFinite(Number(serving.amount))
    || Number(serving.amount) <= 0
    || typeof serving.unit !== "string"
    || typeof serving.description !== "string"
    || !serving.description.trim()
    || (serving.grams !== undefined
      && (!Number.isFinite(Number(serving.grams)) || Number(serving.grams) <= 0))
  ) return null;

  const brand = normalizeOptionalText(details.brand);
  const notes = normalizeOptionalText(details.notes);
  const identifiers = normalizeProductIdentifiers(details.identifiers);
  if (identifiers === null) return null;
  const canonicalBarcode = identifiers.length === 1
    ? canonicalGtinKey(identifiers[0].value)
    : null;
  const sourceId = canonicalBarcode
    ? `barcode:${canonicalBarcode}`
    : encodeURIComponent(normalizedName);
  const category = GROCERY_FOOD_CATEGORIES.has(details.category)
    ? details.category
    : "other";
  const categoryLabel = GROCERY_FOOD_CATEGORY_OPTIONS.find(
    (option) => option.value === category
  ).label;
  let normalizedNutrients = {
    calories: toOptionalNonNegativeNumber(nutrients?.calories),
    protein: toOptionalNonNegativeNumber(nutrients?.protein),
    carbohydrates: toOptionalNonNegativeNumber(nutrients?.carbohydrates),
    fat: toOptionalNonNegativeNumber(nutrients?.fat),
    fiber: toOptionalNonNegativeNumber(nutrients?.fiber),
    sodium: toOptionalNonNegativeNumber(nutrients?.sodium),
    totalSugar: toOptionalNonNegativeNumber(nutrients?.totalSugar),
    addedSugar: toOptionalNonNegativeNumber(nutrients?.addedSugar),
  };
  if (Object.values(normalizedNutrients).includes(undefined)) return null;
  if (getSugarValidationError(normalizedNutrients)) return null;
  if (canonicalBarcode) {
    normalizedNutrients = applyRemoteNutrientPrecision(normalizedNutrients);
  }
  const packageSize = normalizeOptionalText(details.packageQuantity);
  const servingsPerContainer = normalizeOptionalPositiveNumber(
    details.servingsPerContainer
  );
  if (servingsPerContainer === undefined) return null;
  const normalizedProviderSnapshot = details.providerSourceSnapshot == null
    ? null
    : normalizeRemoteFood(details.providerSourceSnapshot);
  if (details.providerSourceSnapshot != null && !normalizedProviderSnapshot) return null;
  if (
    normalizedProviderSnapshot
    && canonicalGtinKey(normalizedProviderSnapshot.identifiers[0].value) !== canonicalBarcode
  ) return null;
  const completeness = ["calories", "protein", "carbohydrates", "fat"].every(
    (nutrient) => normalizedNutrients[nutrient] !== null
  )
    ? "complete"
    : "partial";

  return {
    id: `user-added:${sourceId}`,
    name: String(name).trim().replace(/\s+/g, " "),
    sourceType: "grocery-custom",
    dataType: normalizedProviderSnapshot ? "user-completed" : "user-entered",
    ...(canonicalBarcode ? { dataBasis: "serving" } : {}),
    category,
    categoryLabel,
    ...(brand ? { brand } : {}),
    ...(notes ? { notes } : {}),
    ...(identifiers.length ? { identifiers } : {}),
    ...(packageSize !== null || servingsPerContainer !== null
      ? {
          packaged: {
            packageSize,
            servingsPerContainer,
          },
        }
      : {}),
    ...(normalizedProviderSnapshot
      ? { providerSourceSnapshot: immutableCopy(normalizedProviderSnapshot) }
      : {}),
    serving: { ...serving },
    nutrients: normalizedNutrients,
    provenance: {
      source: "user-added",
      sourceId,
      confidence: "user-added",
      label: normalizedProviderSnapshot
        ? `User-completed from ${normalizedProviderSnapshot.provenance.attribution}`
        : canonicalBarcode
          ? "User-created barcode food"
          : "User-entered",
      completeness,
      ...(normalizedProviderSnapshot
        ? {
            provider: normalizedProviderSnapshot.provider.id,
            providerRecordId: normalizedProviderSnapshot.provider.recordId,
            providerAttribution: normalizedProviderSnapshot.provenance.attribution,
            sourceUrl: normalizedProviderSnapshot.provenance.sourceUrl,
          }
        : {}),
    },
  };
}

function foodDefinitionsMatch(firstFood, secondFood) {
  const servingFields = ["amount", "unit", "description", "grams"];
  const nutrientFields = [
    "calories",
    "protein",
    "carbohydrates",
    "fat",
    "fiber",
    "sodium",
    "totalSugar",
    "addedSugar",
  ];
  const metadataValue = (food, field) => {
    if (field === "sourceType") return food[field] || "grocery-custom";
    if (field === "category") return food[field] || "other";
    if (field === "dataType") return food[field] || "user-entered";
    return food[field] || null;
  };

  const firstIdentifiers = normalizeProductIdentifiers(firstFood.identifiers);
  const secondIdentifiers = normalizeProductIdentifiers(secondFood.identifiers);
  const identifiersMatch = firstIdentifiers !== null && secondIdentifiers !== null &&
    JSON.stringify(firstIdentifiers) === JSON.stringify(secondIdentifiers);

  return (
    identifiersMatch &&
    ["brand", "category", "notes", "sourceType", "dataType"].every(
      (field) => metadataValue(firstFood, field) === metadataValue(secondFood, field)
    ) &&
    servingFields.every(
      (field) => firstFood.serving?.[field] === secondFood.serving?.[field]
    ) &&
    nutrientFields.every(
      (field) =>
        (firstFood.nutrients?.[field] ?? null) ===
        (secondFood.nutrients?.[field] ?? null)
    ) &&
    JSON.stringify(firstFood.packaged || null) === JSON.stringify(secondFood.packaged || null) &&
    JSON.stringify(firstFood.providerSourceSnapshot || null) ===
      JSON.stringify(secondFood.providerSourceSnapshot || null)
  );
}

export function addUserFood(userFoods, userFood) {
  if (!userFood) {
    return {
      foods: userFoods,
      added: false,
      existingFood: null,
      matchesDefinition: false,
    };
  }

  const normalizedName = normalizeFoodQuery(userFood.name);
  const candidateBarcode = barcodeKey(userFood);
  const existingFood = userFoods.find((food) =>
    (candidateBarcode && barcodeKey(food) === candidateBarcode)
    || normalizeFoodQuery(food.name) === normalizedName
  );

  return existingFood
    ? {
        foods: userFoods,
        added: false,
        existingFood,
        matchesDefinition: foodDefinitionsMatch(existingFood, userFood),
      }
    : {
        foods: [...userFoods, userFood],
        added: true,
        existingFood: null,
        matchesDefinition: true,
      };
}

export function lookupUserFoodByBarcode(userFoods = [], value) {
  const key = canonicalGtinKey(value);
  if (!key) return { status: "invalid", identifier: null, food: null };
  const food = userFoods.find((candidate) => barcodeKey(candidate) === key) || null;
  return {
    status: food ? "found" : "not-found",
    identifier: { scheme: "gtin", value: normalizeProductIdentifiers([
      { scheme: "gtin", value },
    ])[0].value },
    food,
  };
}

export function updateUserFood(userFoods, id, replacement) {
  const index = userFoods.findIndex((food) => food.id === id);
  if (index < 0 || !replacement) {
    return { foods: userFoods, updated: false, food: null, existingFood: null };
  }
  const collision = userFoods.find((food, foodIndex) => foodIndex !== index && (
    (barcodeKey(replacement) && barcodeKey(food) === barcodeKey(replacement))
    || normalizeFoodQuery(food.name) === normalizeFoodQuery(replacement.name)
  ));
  if (collision) {
    return { foods: userFoods, updated: false, food: null, existingFood: collision };
  }
  const food = {
    ...replacement,
    id: userFoods[index].id,
    provenance: {
      ...replacement.provenance,
      sourceId: userFoods[index].provenance?.sourceId || replacement.provenance.sourceId,
    },
  };
  const foods = [...userFoods];
  foods[index] = food;
  return { foods, updated: true, food, existingFood: null };
}

export function deleteUserFood(userFoods, id) {
  const food = userFoods.find((candidate) => candidate.id === id) || null;
  return food
    ? { foods: userFoods.filter((candidate) => candidate.id !== id), deleted: true, food }
    : { foods: userFoods, deleted: false, food: null };
}

export function readUserFoods(storage) {
  const savedUserFoods = storage.getItem(USER_FOODS_STORAGE_KEY);

  if (!savedUserFoods) return [];

  const parsedUserFoods = JSON.parse(savedUserFoods);
  if (!Array.isArray(parsedUserFoods)) {
    throw new Error("Invalid user food data.");
  }

  return parsedUserFoods.map((food) => {
    if (food?.providerSourceSnapshot === undefined) return food;
    const providerSourceSnapshot = normalizeRemoteFood(food.providerSourceSnapshot);
    if (!providerSourceSnapshot) throw new Error("Invalid user food provider source data.");
    return { ...food, providerSourceSnapshot };
  });
}

export function writeUserFoods(storage, userFoods) {
  storage.setItem(USER_FOODS_STORAGE_KEY, JSON.stringify(userFoods));
}

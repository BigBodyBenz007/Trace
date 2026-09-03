import { normalizeFoodQuery } from "./foodSearch";
import { createServingDefinition } from "./servingDefinition";
import { GROCERY_FOOD_CATEGORY_OPTIONS } from "./groceryFoodCatalog";
import { normalizeProductIdentifiers } from "./productIdentifiers";

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
  return Number.isFinite(number) ? Math.max(0, number) : null;
}

export function createUserFood(
  name,
  nutrients,
  serving = createServingDefinition({ amount: 1, unit: "serving" }),
  details = {}
) {
  const normalizedName = normalizeFoodQuery(name);

  if (!normalizedName) return null;

  const sourceId = encodeURIComponent(normalizedName);
  const brand = normalizeOptionalText(details.brand);
  const notes = normalizeOptionalText(details.notes);
  const identifiers = normalizeProductIdentifiers(details.identifiers);
  if (identifiers === null) return null;
  const category = GROCERY_FOOD_CATEGORIES.has(details.category)
    ? details.category
    : "other";
  const categoryLabel = GROCERY_FOOD_CATEGORY_OPTIONS.find(
    (option) => option.value === category
  ).label;
  const normalizedNutrients = {
    calories: toOptionalNonNegativeNumber(nutrients?.calories),
    protein: toOptionalNonNegativeNumber(nutrients?.protein),
    carbohydrates: toOptionalNonNegativeNumber(nutrients?.carbohydrates),
    fat: toOptionalNonNegativeNumber(nutrients?.fat),
    fiber: toOptionalNonNegativeNumber(nutrients?.fiber),
    sodium: toOptionalNonNegativeNumber(nutrients?.sodium),
  };
  const completeness = ["calories", "protein", "carbohydrates", "fat"].every(
    (nutrient) => normalizedNutrients[nutrient] !== null
  )
    ? "complete"
    : "partial";

  return {
    id: `user-added:${sourceId}`,
    name: String(name).trim().replace(/\s+/g, " "),
    sourceType: "grocery-custom",
    dataType: "user-entered",
    category,
    categoryLabel,
    ...(brand ? { brand } : {}),
    ...(notes ? { notes } : {}),
    ...(identifiers.length ? { identifiers } : {}),
    serving: { ...serving },
    nutrients: normalizedNutrients,
    provenance: {
      source: "user-added",
      sourceId,
      confidence: "user-added",
      label: "User-entered",
      completeness,
    },
  };
}

function foodDefinitionsMatch(firstFood, secondFood) {
  const servingFields = ["amount", "unit", "description", "grams"];
  const nutrientFields = ["calories", "protein", "carbohydrates", "fat", "fiber", "sodium"];
  const metadataValue = (food, field) => {
    if (field === "sourceType") return food[field] || "grocery-custom";
    if (field === "category") return food[field] || "other";
    return food[field] || null;
  };

  const firstIdentifiers = normalizeProductIdentifiers(firstFood.identifiers);
  const secondIdentifiers = normalizeProductIdentifiers(secondFood.identifiers);
  const identifiersMatch = firstIdentifiers !== null && secondIdentifiers !== null &&
    JSON.stringify(firstIdentifiers) === JSON.stringify(secondIdentifiers);

  return (
    identifiersMatch &&
    ["brand", "category", "notes", "sourceType"].every(
      (field) => metadataValue(firstFood, field) === metadataValue(secondFood, field)
    ) &&
    servingFields.every(
      (field) => firstFood.serving?.[field] === secondFood.serving?.[field]
    ) &&
    nutrientFields.every(
      (field) =>
        (firstFood.nutrients?.[field] ?? null) ===
        (secondFood.nutrients?.[field] ?? null)
    )
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
  const existingFood = userFoods.find(
    (food) => normalizeFoodQuery(food.name) === normalizedName
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

export function readUserFoods(storage) {
  const savedUserFoods = storage.getItem(USER_FOODS_STORAGE_KEY);

  if (!savedUserFoods) return [];

  const parsedUserFoods = JSON.parse(savedUserFoods);
  if (!Array.isArray(parsedUserFoods)) {
    throw new Error("Invalid user food data.");
  }

  return parsedUserFoods;
}

export function writeUserFoods(storage, userFoods) {
  storage.setItem(USER_FOODS_STORAGE_KEY, JSON.stringify(userFoods));
}

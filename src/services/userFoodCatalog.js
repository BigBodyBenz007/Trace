import { normalizeFoodQuery } from "./foodSearch";
import { createServingDefinition } from "./servingDefinition";

export const USER_FOODS_STORAGE_KEY = "userFoods";

function toNonNegativeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function toOptionalNonNegativeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  return toNonNegativeNumber(value);
}

export function createUserFood(
  name,
  nutrients,
  serving = createServingDefinition({ amount: 1, unit: "serving" })
) {
  const normalizedName = normalizeFoodQuery(name);

  if (!normalizedName) return null;

  const sourceId = encodeURIComponent(normalizedName);

  return {
    id: `user-added:${sourceId}`,
    name: String(name).trim().replace(/\s+/g, " "),
    serving: { ...serving },
    nutrients: {
      calories: toNonNegativeNumber(nutrients?.calories),
      protein: toNonNegativeNumber(nutrients?.protein),
      carbohydrates: toNonNegativeNumber(nutrients?.carbohydrates),
      fat: toNonNegativeNumber(nutrients?.fat),
      sodium: toOptionalNonNegativeNumber(nutrients?.sodium),
    },
    provenance: {
      source: "user-added",
      sourceId,
      confidence: "user-added",
    },
  };
}

function foodDefinitionsMatch(firstFood, secondFood) {
  const servingFields = ["amount", "unit", "description", "grams"];
  const nutrientFields = ["calories", "protein", "carbohydrates", "fat", "sodium"];

  return (
    servingFields.every(
      (field) => firstFood.serving?.[field] === secondFood.serving?.[field]
    ) &&
    nutrientFields.every(
      (field) => firstFood.nutrients?.[field] === secondFood.nutrients?.[field]
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

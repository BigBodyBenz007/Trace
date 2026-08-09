import { normalizeFoodQuery } from "./foodSearch";

export const USER_FOODS_STORAGE_KEY = "userFoods";

function toNonNegativeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function createUserFood(name, nutrients) {
  const normalizedName = normalizeFoodQuery(name);

  if (!normalizedName) return null;

  const sourceId = encodeURIComponent(normalizedName);

  return {
    id: `user-added:${sourceId}`,
    name: String(name).trim().replace(/\s+/g, " "),
    serving: {
      amount: 1,
      unit: "serving",
      description: "1 serving",
    },
    nutrients: {
      calories: toNonNegativeNumber(nutrients?.calories),
      protein: toNonNegativeNumber(nutrients?.protein),
      carbohydrates: toNonNegativeNumber(nutrients?.carbohydrates),
      fat: toNonNegativeNumber(nutrients?.fat),
    },
    provenance: {
      source: "user-added",
      sourceId,
      confidence: "user-added",
    },
  };
}

export function addUserFood(userFoods, userFood) {
  if (!userFood) return { foods: userFoods, added: false };

  const normalizedName = normalizeFoodQuery(userFood.name);
  const alreadyExists = userFoods.some(
    (food) => normalizeFoodQuery(food.name) === normalizedName
  );

  return alreadyExists
    ? { foods: userFoods, added: false }
    : { foods: [...userFoods, userFood], added: true };
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

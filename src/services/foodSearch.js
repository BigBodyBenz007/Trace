import starterFoods from "../data/starterFoods";
import restaurantFoods from "../data/restaurantFoods";
import { normalizeRestaurantFoods } from "./restaurantFoodModel";

export const DEFAULT_RESULT_LIMIT = 6;

export function normalizeFoodQuery(query) {
  return String(query || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function searchFoods(
  query,
  foods = starterFoods,
  limit = DEFAULT_RESULT_LIMIT
) {
  const normalizedQuery = normalizeFoodQuery(query);

  if (!normalizedQuery || !/[a-z0-9]/i.test(normalizedQuery)) return [];

  return foods
    .filter((food) => normalizeFoodQuery([food.name, food.restaurant?.name].filter(Boolean).join(" ")).includes(normalizedQuery))
    .sort((firstFood, secondFood) => {
      const firstName = normalizeFoodQuery(`${firstFood.restaurant?.name || ""} ${firstFood.name}`);
      const secondName = normalizeFoodQuery(`${secondFood.restaurant?.name || ""} ${secondFood.name}`);
      const firstStartsWith = firstName.startsWith(normalizedQuery);
      const secondStartsWith = secondName.startsWith(normalizedQuery);

      if (firstStartsWith !== secondStartsWith) return firstStartsWith ? -1 : 1;
      return firstName.localeCompare(secondName);
    })
    .slice(0, Math.max(0, limit));
}

export function searchFoodCatalog(
  query,
  userFoods = [],
  limit = DEFAULT_RESULT_LIMIT
) {
  return searchFoods(query, [...starterFoods, ...normalizeRestaurantFoods(restaurantFoods), ...userFoods], limit);
}

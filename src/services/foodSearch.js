import starterFoods from "../data/starterFoods";
import restaurantFoods from "../data/restaurantFoods";
import { normalizeRestaurantFoods } from "./restaurantFoodModel";

export const DEFAULT_RESULT_LIMIT = 6;

export function normalizeFoodQuery(query) {
  return String(query || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\btacobell\b/g, "taco bell")
    .replace(/\bchickfila\b/g, "chick fil a")
    .trim();
}

export function searchFoods(
  query,
  foods = starterFoods,
  limit = DEFAULT_RESULT_LIMIT
) {
  const normalizedQuery = normalizeFoodQuery(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  if (queryTokens.length === 0) return [];

  return foods
    .filter((food) => {
      const searchableFood = normalizeFoodQuery([
        food.name,
        food.restaurant?.name,
        food.brand,
        food.category,
        food.categoryLabel,
        ...(food.searchAliases || []),
      ].filter(Boolean).join(" "));
      return queryTokens.every((token) => searchableFood.includes(token));
    })
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

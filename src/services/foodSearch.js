import starterFoods from "../data/starterFoods";
import restaurantFoods from "../data/restaurantFoods";
import beverageFoods from "../data/beverageFoods";
import groceryFoods from "./groceryFoodCatalog";
import { normalizeRestaurantFoods } from "./restaurantFoodModel";
import { normalizeBeverageFoods } from "./beverageFoodModel";

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

  const fieldMatches = (value) => {
    const normalizedValue = normalizeFoodQuery(value);
    return Boolean(normalizedValue)
      && queryTokens.every((token) => normalizedValue.includes(token));
  };
  const relevanceScore = (food) => {
    const foodName = normalizeFoodQuery(food.name);
    const foodNameWords = foodName.split(" ").filter(Boolean);
    const directNameMatch = fieldMatches(foodName);
    const leadingModifiers = new Set([
      "black", "brown", "dark", "green", "long", "red", "short", "white", "whole", "wild", "yellow",
    ]);
    const preparationWords = [
      "baked", "boiled", "braised", "canned", "cooked", "dried", "fried", "frozen", "grilled", "heated", "prepared", "raw", "roasted", "smoked",
    ];
    const preparationOnlyMatch = food.sourceType === "grocery"
      && queryTokens.every((token) => preparationWords.some((word) => word.startsWith(token)));

    if ((food.searchAliases || []).some((alias) => normalizeFoodQuery(alias) === normalizedQuery)) return -1;
    if (
      directNameMatch
      && !preparationOnlyMatch
      && (
        foodName.startsWith(normalizedQuery)
        || (leadingModifiers.has(foodNameWords[0]) && queryTokens.every((token) => foodName.includes(token)))
      )
    ) return 0;
    if ((food.searchAliases || []).some(fieldMatches)) return 0;
    if (fieldMatches(food.restaurant?.name)) return 0;
    if (directNameMatch && !preparationOnlyMatch) return 1;
    if (fieldMatches(`${food.restaurant?.name || ""} ${food.name}`)) return preparationOnlyMatch ? 2 : 1;
    if (fieldMatches(food.brand)) return 1;
    if (fieldMatches(`${food.category || ""} ${food.categoryLabel || ""}`)) return 2;
    return 3;
  };

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
      const relevanceDifference = relevanceScore(firstFood) - relevanceScore(secondFood);

      if (relevanceDifference !== 0) return relevanceDifference;
      const sourcePriority = (food) => {
        if (food.provenance?.source === "user-added" || food.dataType === "user-entered") return 0;
        if (food.sourceType === "grocery") return 1;
        if (food.sourceType === "restaurant") return 2;
        if (food.sourceType === "beverage") return 3;
        return 2;
      };
      const priorityDifference = sourcePriority(firstFood) - sourcePriority(secondFood);
      if (priorityDifference !== 0) return priorityDifference;
      return firstName.localeCompare(secondName);
    })
    .slice(0, Math.max(0, limit));
}

export function searchFoodCatalog(
  query,
  userFoods = [],
  limit = DEFAULT_RESULT_LIMIT
) {
  const foods = [
    ...userFoods,
    ...groceryFoods,
    ...starterFoods,
    ...normalizeBeverageFoods(beverageFoods),
    ...normalizeRestaurantFoods(restaurantFoods),
  ];
  const seenDedupeKeys = new Set();
  return searchFoods(query, foods, foods.length)
    .filter((food) => {
      if (!food.dedupeKey) return true;
      if (seenDedupeKeys.has(food.dedupeKey)) return false;
      seenDedupeKeys.add(food.dedupeKey);
      return true;
    })
    .slice(0, Math.max(0, limit));
}

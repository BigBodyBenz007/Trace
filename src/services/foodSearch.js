import starterFoods from "../data/starterFoods";

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
    .filter((food) => normalizeFoodQuery(food.name).includes(normalizedQuery))
    .sort((firstFood, secondFood) => {
      const firstName = normalizeFoodQuery(firstFood.name);
      const secondName = normalizeFoodQuery(secondFood.name);
      const firstStartsWith = firstName.startsWith(normalizedQuery);
      const secondStartsWith = secondName.startsWith(normalizedQuery);

      if (firstStartsWith !== secondStartsWith) return firstStartsWith ? -1 : 1;
      return firstName.localeCompare(secondName);
    })
    .slice(0, Math.max(0, limit));
}

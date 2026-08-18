import { NUTRIENT_KEYS } from "./nutritionCalculation";

const OPTIONAL_NUTRIENT_KEYS = ["sodium"];

export const RESTAURANT_FOOD_SOURCE = "official-restaurant";

export function normalizeRestaurantFood(food) {
  if (!food?.id || !food.restaurant?.id || !food.restaurant?.name || !food.name || !food.serving?.description) return null;
  const normalizeNutrients = (source) => Object.fromEntries([...NUTRIENT_KEYS, ...OPTIONAL_NUTRIENT_KEYS].map((nutrient) => {
    const value = source?.[nutrient];
    if (value === null || value === undefined || value === "") return [nutrient, null];
    const number = Number(value);
    return [nutrient, Number.isFinite(number) && number >= 0 ? number : null];
  }));
  const nutrients = normalizeNutrients(food.nutrients);
  const completeness = NUTRIENT_KEYS.every((nutrient) => nutrients[nutrient] !== null) ? "complete" : "partial";
  return {
    ...food,
    sourceType: "restaurant",
    restaurant: { ...food.restaurant },
    nutrients,
    servingOptions: food.servingOptions?.map((option) => ({ ...option, nutrients: normalizeNutrients(option.nutrients) })),
    provenance: {
      ...food.provenance,
      source: food.provenance?.source || RESTAURANT_FOOD_SOURCE,
      sourceId: food.provenance?.sourceId || food.id,
      confidence: food.provenance?.confidence || "official-source",
      completeness,
      verification: { ...(food.provenance?.verification || {}), status: food.provenance?.verification?.status || completeness },
    },
  };
}

export function normalizeRestaurantFoods(foods) {
  return (Array.isArray(foods) ? foods : []).map(normalizeRestaurantFood).filter(Boolean);
}

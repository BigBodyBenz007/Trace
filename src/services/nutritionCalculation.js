export const NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbohydrates",
  "fat",
];

function toNonNegativeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function scaleNutrition(nutritionBasis, amount) {
  const multiplier = toNonNegativeNumber(amount);

  return NUTRIENT_KEYS.reduce((scaledNutrition, nutrient) => {
    scaledNutrition[nutrient] =
      toNonNegativeNumber(nutritionBasis?.[nutrient]) * multiplier;
    return scaledNutrition;
  }, {});
}

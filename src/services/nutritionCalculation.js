export const NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbohydrates",
  "fat",
];

export const OPTIONAL_NUTRIENT_KEYS = ["sodium"];
export const TRACKED_NUTRIENT_KEYS = [...NUTRIENT_KEYS, ...OPTIONAL_NUTRIENT_KEYS];

function toNonNegativeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function isUnknownNutritionValue(value) {
  return value === null || value === undefined || value === "" || !Number.isFinite(Number(value));
}

export function scaleNutrition(nutritionBasis, amount) {
  const multiplier = toNonNegativeNumber(amount);

  const scaled = NUTRIENT_KEYS.reduce((scaledNutrition, nutrient) => {
    scaledNutrition[nutrient] = isUnknownNutritionValue(nutritionBasis?.[nutrient])
      ? null
      : toNonNegativeNumber(nutritionBasis[nutrient]) * multiplier;
    return scaledNutrition;
  }, {});
  Object.keys(nutritionBasis || {}).filter((nutrient) => !NUTRIENT_KEYS.includes(nutrient)).forEach((nutrient) => {
    scaled[nutrient] = isUnknownNutritionValue(nutritionBasis[nutrient])
      ? null
      : toNonNegativeNumber(nutritionBasis[nutrient]) * multiplier;
  });
  return scaled;
}

export const NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbohydrates",
  "fat",
];

export const OPTIONAL_NUTRIENT_KEYS = ["sodium"];
export const TRACKED_NUTRIENT_KEYS = [...NUTRIENT_KEYS, ...OPTIONAL_NUTRIENT_KEYS];
export const FOOD_NUTRIENT_KEYS = [...TRACKED_NUTRIENT_KEYS, "fiber"];
export const SUGAR_NUTRIENT_KEYS = ["totalSugar", "addedSugar"];
export const NUTRITION_COMPLETENESS_NUTRIENT_KEYS = [
  ...TRACKED_NUTRIENT_KEYS,
  ...SUGAR_NUTRIENT_KEYS,
];
export const NUTRITION_ENTRY_NUTRIENT_KEYS = [
  ...FOOD_NUTRIENT_KEYS,
  ...SUGAR_NUTRIENT_KEYS,
];

function toNonNegativeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function isUnknownNutritionValue(value) {
  return value === null || value === undefined || value === "" || !Number.isFinite(Number(value));
}

export function getSugarValidationError({ totalSugar, addedSugar } = {}) {
  const values = [
    ["Total Sugar", totalSugar],
    ["Added Sugar", addedSugar],
  ];

  for (const [label, value] of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      return `${label} must be zero or greater.`;
    }
  }

  if (
    !isUnknownNutritionValue(totalSugar) &&
    !isUnknownNutritionValue(addedSugar) &&
    Number(addedSugar) > Number(totalSugar)
  ) {
    return "Added Sugar cannot exceed Total Sugar.";
  }

  return "";
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

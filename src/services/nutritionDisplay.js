const NUTRIENT_DISPLAY_DECIMALS = Object.freeze({
  calories: 2,
  protein: 2,
  carbohydrates: 2,
  fat: 2,
  fiber: 2,
  totalSugar: 2,
  addedSugar: 2,
  sodium: 1,
  caffeine: 1,
});

export function formatNutrientValue(value, nutrient, unit = "") {
  if (value === null || value === undefined) return "Unknown";

  const number = Number(value);
  const decimals = NUTRIENT_DISPLAY_DECIMALS[nutrient];
  const displayedValue = value !== "" && Number.isFinite(number) && decimals !== undefined
    ? Number(number.toFixed(decimals))
    : value;

  return `${displayedValue}${unit}`;
}

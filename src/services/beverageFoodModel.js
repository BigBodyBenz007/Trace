const BEVERAGE_NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbohydrates",
  "fat",
  "sodium",
  "totalSugar",
  "addedSugar",
];

export const BEVERAGE_CATEGORIES = Object.freeze({
  soda: "Soda",
  energy: "Energy Drink",
  "sports-hydration": "Sports & Hydration",
  "ready-to-drink-coffee": "Ready-to-Drink Coffee",
  tea: "Tea",
  other: "Other Drinks",
});

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function normalizeBeverageFood(food) {
  if (
    !food?.id ||
    !String(food.id).startsWith("beverage:") ||
    !String(food.brand || "").trim() ||
    !String(food.name || "").trim() ||
    !BEVERAGE_CATEGORIES[food.category] ||
    !food.serving?.description ||
    !food.beverage?.packageSize ||
    !food.provenance?.sourceId ||
    !food.provenance?.verification?.sourceUrl
  ) return null;

  const nutrients = Object.fromEntries(BEVERAGE_NUTRIENT_KEYS.map((key) => [
    key,
    normalizeOptionalNumber(food.nutrients?.[key]),
  ]));
  const completeness = BEVERAGE_NUTRIENT_KEYS.every((key) => nutrients[key] !== null)
    ? "complete"
    : "partial";

  return {
    ...food,
    sourceType: "beverage",
    categoryLabel: BEVERAGE_CATEGORIES[food.category],
    nutrients,
    beverage: {
      ...food.beverage,
      caffeineMg: normalizeOptionalNumber(food.beverage.caffeineMg),
    },
    provenance: {
      ...food.provenance,
      source: food.provenance.source || "official-manufacturer",
      confidence: food.provenance.confidence || "official-source",
      completeness,
      verification: {
        ...food.provenance.verification,
        status: food.provenance.verification.status || completeness,
      },
    },
  };
}

export function normalizeBeverageFoods(foods) {
  return (Array.isArray(foods) ? foods : []).map(normalizeBeverageFood).filter(Boolean);
}

export function validateBeverageCatalog(foods) {
  const errors = [];
  const ids = new Set();
  const definitions = new Set();

  (Array.isArray(foods) ? foods : []).forEach((food, index) => {
    const label = food?.id || `record ${index + 1}`;
    if (!normalizeBeverageFood(food)) errors.push(`${label} is missing required beverage data.`);
    if (ids.has(food?.id)) errors.push(`Duplicate beverage ID: ${food.id}`);
    ids.add(food?.id);

    const definition = [food?.brand, food?.name, food?.serving?.description]
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|");
    if (definitions.has(definition)) errors.push(`Duplicate beverage product: ${definition}`);
    definitions.add(definition);

    Object.entries(food?.nutrients || {}).forEach(([key, value]) => {
      if (value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        errors.push(`${label} has an invalid ${key} value.`);
      }
    });
    const caffeine = food?.beverage?.caffeineMg;
    if (caffeine !== null && caffeine !== undefined && (!Number.isFinite(Number(caffeine)) || Number(caffeine) < 0)) {
      errors.push(`${label} has an invalid caffeine value.`);
    }
  });

  return errors;
}

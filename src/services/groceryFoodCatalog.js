import groceryFoodSeedsV1, {
  GROCERY_CATALOG_VERSION,
  USDA_GROCERY_CATALOG_RELEASE,
} from "../data/groceryFoods.v1";
import { FOOD_NUTRIENT_KEYS } from "./nutritionCalculation";

export { GROCERY_CATALOG_VERSION, USDA_GROCERY_CATALOG_RELEASE };

export const GROCERY_FOOD_CATEGORY_OPTIONS = Object.freeze([
  Object.freeze({ value: "protein", label: "Protein / meat" }),
  Object.freeze({ value: "seafood", label: "Seafood" }),
  Object.freeze({ value: "eggs-dairy", label: "Eggs / dairy" }),
  Object.freeze({ value: "grains-starches", label: "Grains / starches" }),
  Object.freeze({ value: "vegetables", label: "Vegetables" }),
  Object.freeze({ value: "fruit", label: "Fruit" }),
  Object.freeze({ value: "fats-oils", label: "Fats / oils" }),
  Object.freeze({ value: "pantry", label: "Pantry" }),
  Object.freeze({ value: "other", label: "Other" }),
]);

const CATEGORY_LABELS = Object.freeze(Object.fromEntries(
  GROCERY_FOOD_CATEGORY_OPTIONS.map(({ label, value }) => [value, label])
));

function scaledNutrient(value, grams, nutrient) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  const precision = ["calories", "sodium"].includes(nutrient) ? 1 : 2;
  return Number(((number * grams) / 100).toFixed(precision));
}

export function normalizeGroceryFood(seed) {
  const grams = Number(seed?.serving?.grams);
  const fdcId = Number(seed?.fdcId);
  if (
    !Number.isInteger(fdcId) ||
    !String(seed?.name || "").trim() ||
    !Number.isFinite(grams) ||
    grams <= 0 ||
    !CATEGORY_LABELS[seed?.category]
  ) {
    return null;
  }

  const nutrients = Object.freeze(Object.fromEntries(
    FOOD_NUTRIENT_KEYS.map((nutrient) => [
      nutrient,
      scaledNutrient(seed.nutrientsPer100g?.[nutrient], grams, nutrient),
    ])
  ));
  const unknownNutrients = Object.freeze(
    FOOD_NUTRIENT_KEYS.filter((nutrient) => nutrients[nutrient] === null)
  );
  const completeness = unknownNutrients.length === 0 ? "complete" : "partial";

  return Object.freeze({
    id: `grocery:usda:${fdcId}`,
    name: seed.name,
    sourceType: "grocery",
    dataType: "generic",
    category: seed.category,
    categoryLabel: CATEGORY_LABELS[seed.category],
    preparationState: seed.preparationState,
    ...(seed.brand ? { brand: seed.brand } : {}),
    ...(seed.dedupeKey ? { dedupeKey: seed.dedupeKey } : {}),
    searchAliases: Object.freeze([...(seed.searchAliases || [])]),
    serving: Object.freeze({ ...seed.serving }),
    nutrients,
    provenance: Object.freeze({
      source: "usda-fooddata-central",
      sourceId: String(fdcId),
      sourceDescription: seed.sourceDescription,
      sourceDataType: seed.sourceDataType,
      sourceRelease: seed.sourceRelease,
      sourceUrl: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${fdcId}/nutrients`,
      confidence: "official-source",
      label: "USDA",
      completeness,
      unknownNutrients,
      catalogVersion: GROCERY_CATALOG_VERSION,
      catalogRelease: USDA_GROCERY_CATALOG_RELEASE,
    }),
  });
}

const COOKED_METHOD_PATTERN = /\b(baked|barbecued|boiled|braised|broiled|cooked|fried|grilled|heated|microwaved|poached|roasted|sauteed|saut\u00e9ed|simmered|steamed|stewed|toasted)\b/i;
const ADDED_COOKING_INGREDIENT_PATTERN = /\b(battered|breaded|marinated)\b|\b(in|with)\s+(butter|gravy|marinade|oil|sauce)\b/i;
const PREPARED_MEAL_PATTERN = /\b(casserole|dinner|entree|meal|pizza|sandwich|soup|stew)\b/i;
const PREPARED_GRAIN_PRODUCT_PATTERN = /\b(bagel|bread|english muffin|granola|roll|taco shell|tortilla)\b/i;
const PROCESSED_MEAT_PATTERN = /\b(bacon|ham|luncheon|sausage)\b|\b(cured|smoked)\b/i;
const SAFE_CANNED_PATTERN = /\b(in water|juice pack|no salt added|without salt|water pack)\b/i;

export function isIngredientLevelGroceryFood(food) {
  if (!food) return false;
  if (food.category === "fats-oils") return true;

  const sourceText = `${food.name || ""} ${food.provenance?.sourceDescription || ""}`;
  if (
    ["cooked", "frozen-cooked"].includes(food.preparationState)
    || COOKED_METHOD_PATTERN.test(sourceText)
    || ADDED_COOKING_INGREDIENT_PATTERN.test(sourceText)
    || PREPARED_MEAL_PATTERN.test(sourceText)
  ) return false;

  if (["protein", "seafood"].includes(food.category) && PROCESSED_MEAT_PATTERN.test(sourceText)) {
    return false;
  }
  if (
    food.category === "grains-starches"
    && PREPARED_GRAIN_PRODUCT_PATTERN.test(sourceText)
    && !/\b(bread crumbs|breadcrumbs)\b/i.test(sourceText)
  ) return false;

  if (["raw", "dry"].includes(food.preparationState)) return true;
  if (/\buncooked\b/i.test(sourceText)) return true;
  if (food.preparationState === "frozen") {
    return /\b(raw|unprepared|unsweetened)\b/i.test(sourceText);
  }
  if (food.preparationState === "canned") {
    return SAFE_CANNED_PATTERN.test(sourceText)
      && !/\b(brine|oil|sauce|syrup|sweetened)\b/i.test(sourceText);
  }
  if (["ready-to-eat", "ready-to-use"].includes(food.preparationState)) {
    return ["eggs-dairy", "fruit", "pantry", "vegetables"].includes(food.category);
  }
  return false;
}

export const grocerySourceFoods = Object.freeze(
  groceryFoodSeedsV1.map(normalizeGroceryFood).filter(Boolean)
);

const groceryFoods = Object.freeze(grocerySourceFoods.filter(isIngredientLevelGroceryFood));

export default groceryFoods;

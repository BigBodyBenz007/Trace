import starterFoods from "../data/starterFoods";
import beverageFoods from "../data/beverageFoods";
import restaurantFoods from "../data/restaurantFoods";
import groceryFoods from "./groceryFoodCatalog";
import brandedPackagedFoods from "./brandedPackagedFoodCatalog";
import { normalizeBeverageFoods } from "./beverageFoodModel";
import { normalizeRestaurantFoods } from "./restaurantFoodModel";
import {
  canonicalGtinKey,
  createProductIdentifierIndex,
  normalizeGtin,
} from "./productIdentifiers";

const localBarcodeFoods = Object.freeze([
  ...groceryFoods,
  ...brandedPackagedFoods,
  ...starterFoods,
  ...normalizeBeverageFoods(beverageFoods),
  ...normalizeRestaurantFoods(restaurantFoods),
]);

// Building the committed index eagerly makes an identifier collision a catalog
// error instead of allowing an ambiguous barcode to select an arbitrary food.
const localBarcodeIndex = createProductIdentifierIndex(localBarcodeFoods);

export function lookupCatalogFoodByBarcode(value) {
  const normalizedValue = normalizeGtin(value);
  if (!normalizedValue) {
    return {
      status: "invalid",
      identifier: null,
      food: null,
    };
  }

  const identifier = {
    scheme: "gtin",
    value: normalizedValue,
  };
  const food = localBarcodeIndex.get(canonicalGtinKey(normalizedValue)) || null;

  return {
    status: food ? "found" : "not-found",
    identifier,
    food,
  };
}

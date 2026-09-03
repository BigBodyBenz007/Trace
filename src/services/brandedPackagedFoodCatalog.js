import starterFoods from "../data/starterFoods";
import beverageFoods from "../data/beverageFoods";
import restaurantFoods from "../data/restaurantFoods";
import brandedPackagedFoodSeeds, {
  BRANDED_PACKAGED_CATALOG_VERSION,
  YOGURT_DAIRY_PHASE_1A_ACCESSED_AT,
  YOGURT_DAIRY_PHASE_1A_BATCH,
} from "../data/brandedPackagedFoods.v1.yogurtDairy";
import { normalizeBeverageFoods } from "./beverageFoodModel";
import groceryFoods from "./groceryFoodCatalog";
import { normalizeRestaurantFoods } from "./restaurantFoodModel";
import {
  normalizeBrandedPackagedFoods,
  validateBrandedPackagedFoodCatalog,
} from "./brandedPackagedFoodModel";

export {
  BRANDED_PACKAGED_CATALOG_VERSION,
  YOGURT_DAIRY_PHASE_1A_ACCESSED_AT,
  YOGURT_DAIRY_PHASE_1A_BATCH,
};

const existingCatalogFoods = [
  ...groceryFoods,
  ...starterFoods,
  ...normalizeBeverageFoods(beverageFoods),
  ...normalizeRestaurantFoods(restaurantFoods),
];

export const brandedPackagedFoodCatalogErrors = Object.freeze(
  validateBrandedPackagedFoodCatalog(brandedPackagedFoodSeeds, {
    existingFoods: existingCatalogFoods,
  })
);

if (brandedPackagedFoodCatalogErrors.length) {
  throw new Error(`Invalid branded packaged food catalog:\n${brandedPackagedFoodCatalogErrors.join("\n")}`);
}

const brandedPackagedFoods = normalizeBrandedPackagedFoods(brandedPackagedFoodSeeds);

export default brandedPackagedFoods;

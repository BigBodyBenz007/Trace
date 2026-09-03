import starterFoods from "../data/starterFoods";
import beverageFoods from "../data/beverageFoods";
import restaurantFoods from "../data/restaurantFoods";
import yogurtDairyPhase1ASeeds, {
  BRANDED_PACKAGED_CATALOG_VERSION,
  YOGURT_DAIRY_PHASE_1A_ACCESSED_AT,
  YOGURT_DAIRY_PHASE_1A_BATCH,
} from "../data/brandedPackagedFoods.v1.yogurtDairy";
import cerealOatmealPhase1BSeeds, {
  BRANDED_PACKAGED_CEREAL_OATMEAL_CATALOG_VERSION,
  CEREAL_OATMEAL_PHASE_1B_ACCESSED_AT,
  CEREAL_OATMEAL_PHASE_1B_BATCH,
} from "../data/brandedPackagedFoods.v1.cerealOatmeal";
import { normalizeBeverageFoods } from "./beverageFoodModel";
import groceryFoods from "./groceryFoodCatalog";
import { normalizeRestaurantFoods } from "./restaurantFoodModel";
import {
  BRANDED_PACKAGED_COMBINED_CATEGORY_COUNTS,
  CEREAL_OATMEAL_PHASE_1B_CATEGORY_COUNTS,
  YOGURT_DAIRY_PHASE_1A_CATEGORY_COUNTS,
  normalizeBrandedPackagedFoods,
  validateBrandedPackagedFoodCatalog,
} from "./brandedPackagedFoodModel";

export {
  BRANDED_PACKAGED_CATALOG_VERSION,
  YOGURT_DAIRY_PHASE_1A_ACCESSED_AT,
  YOGURT_DAIRY_PHASE_1A_BATCH,
  BRANDED_PACKAGED_CEREAL_OATMEAL_CATALOG_VERSION,
  CEREAL_OATMEAL_PHASE_1B_ACCESSED_AT,
  CEREAL_OATMEAL_PHASE_1B_BATCH,
};

const existingCatalogFoods = [
  ...groceryFoods,
  ...starterFoods,
  ...normalizeBeverageFoods(beverageFoods),
  ...normalizeRestaurantFoods(restaurantFoods),
];

export const yogurtDairyPhase1ACatalogErrors = Object.freeze(
  validateBrandedPackagedFoodCatalog(yogurtDairyPhase1ASeeds, {
    expectedCount: 40,
    expectedCategoryCounts: YOGURT_DAIRY_PHASE_1A_CATEGORY_COUNTS,
    existingFoods: existingCatalogFoods,
  })
);

export const cerealOatmealPhase1BCatalogErrors = Object.freeze(
  validateBrandedPackagedFoodCatalog(cerealOatmealPhase1BSeeds, {
    expectedCount: 40,
    expectedCategoryCounts: CEREAL_OATMEAL_PHASE_1B_CATEGORY_COUNTS,
    existingFoods: [...existingCatalogFoods, ...yogurtDairyPhase1ASeeds],
    allowUnknownServingsPerContainer: true,
  })
);

const brandedPackagedFoodSeeds = [
  ...yogurtDairyPhase1ASeeds,
  ...cerealOatmealPhase1BSeeds,
];

export const brandedPackagedFoodCatalogErrors = Object.freeze([
  ...yogurtDairyPhase1ACatalogErrors,
  ...cerealOatmealPhase1BCatalogErrors,
  ...validateBrandedPackagedFoodCatalog(brandedPackagedFoodSeeds, {
    expectedCount: 80,
    expectedCategoryCounts: BRANDED_PACKAGED_COMBINED_CATEGORY_COUNTS,
    existingFoods: existingCatalogFoods,
    allowUnknownServingsPerContainer: true,
  }),
]);

if (brandedPackagedFoodCatalogErrors.length) {
  throw new Error(`Invalid branded packaged food catalog:\n${brandedPackagedFoodCatalogErrors.join("\n")}`);
}

const brandedPackagedFoods = normalizeBrandedPackagedFoods(brandedPackagedFoodSeeds);

export default brandedPackagedFoods;

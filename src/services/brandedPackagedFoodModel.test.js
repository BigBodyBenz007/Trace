import brandedPackagedFoodSeeds from "../data/brandedPackagedFoods.v1.yogurtDairy";
import cerealOatmealPhase1BSeeds from "../data/brandedPackagedFoods.v1.cerealOatmeal";
import brandedPackagedFoods, {
  brandedPackagedFoodCatalogErrors,
  cerealOatmealPhase1BCatalogErrors,
  yogurtDairyPhase1ACatalogErrors,
} from "./brandedPackagedFoodCatalog";
import {
  BRANDED_PACKAGED_COMBINED_CATEGORY_COUNTS,
  CEREAL_OATMEAL_PHASE_1B_CATEGORY_COUNTS,
  YOGURT_DAIRY_PHASE_1A_CATEGORY_COUNTS,
  normalizeBrandedPackagedFood,
  normalizeBrandedPackagedFoods,
  validateBrandedPackagedFoodCatalog,
} from "./brandedPackagedFoodModel";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("keeps all 40 Phase 1A records and publishes exactly 40 Phase 1B records", () => {
  expect(brandedPackagedFoodCatalogErrors).toEqual([]);
  expect(yogurtDairyPhase1ACatalogErrors).toEqual([]);
  expect(cerealOatmealPhase1BCatalogErrors).toEqual([]);
  expect(brandedPackagedFoodSeeds).toHaveLength(40);
  expect(cerealOatmealPhase1BSeeds).toHaveLength(40);
  expect(brandedPackagedFoods).toHaveLength(80);
  expect(Object.fromEntries(Object.keys(YOGURT_DAIRY_PHASE_1A_CATEGORY_COUNTS).map((category) => [
    category,
    brandedPackagedFoods.filter((food) => food.category === category).length,
  ]))).toEqual({ yogurt: 24, "cottage-cheese": 8, "cheese-snack": 8 });
  expect(Object.fromEntries(Object.keys(CEREAL_OATMEAL_PHASE_1B_CATEGORY_COUNTS).map((category) => [
    category,
    brandedPackagedFoods.filter((food) => food.category === category).length,
  ]))).toEqual({ cereal: 28, oatmeal: 12 });
  expect(Object.fromEntries(Object.keys(BRANDED_PACKAGED_COMBINED_CATEGORY_COUNTS).map((category) => [
    category,
    brandedPackagedFoods.filter((food) => food.category === category).length,
  ]))).toEqual({ yogurt: 24, "cottage-cheese": 8, "cheese-snack": 8, cereal: 28, oatmeal: 12 });
  expect(new Set(brandedPackagedFoods.map((food) => food.id)).size).toBe(80);
  expect(new Set(brandedPackagedFoods.map((food) => food.identifiers[0].value.padStart(14, "0"))).size).toBe(80);
  expect(Object.isFrozen(brandedPackagedFoods[0])).toBe(true);
  expect(Object.isFrozen(brandedPackagedFoods[0].provenance.verification.secondarySources)).toBe(true);
});

test("preserves the complete Phase 1A set and its strict original category contract", () => {
  const normalizedPhase1A = normalizeBrandedPackagedFoods(brandedPackagedFoodSeeds);
  expect(normalizedPhase1A).toHaveLength(40);
  expect(brandedPackagedFoods.slice(0, 40).map((food) => food.id))
    .toEqual(normalizedPhase1A.map((food) => food.id));
  expect(validateBrandedPackagedFoodCatalog(brandedPackagedFoodSeeds, {
    expectedCount: 40,
    expectedCategoryCounts: YOGURT_DAIRY_PHASE_1A_CATEGORY_COUNTS,
  })).toEqual([]);

  const missingPhase1AServingCount = clone(brandedPackagedFoodSeeds[0]);
  missingPhase1AServingCount.packaged.servingsPerContainer = null;
  expect(validateBrandedPackagedFoodCatalog([missingPhase1AServingCount], {
    expectedCount: 1,
    expectedCategoryCounts: { yogurt: 1 },
  })).toContain(`${missingPhase1AServingCount.id} has invalid package metadata.`);
});

test("normalizes the complete packaged-food contract without changing zero or null", () => {
  const source = clone(brandedPackagedFoodSeeds[0]);
  source.nutrients.fiber = null;
  source.nutrients.fat = 0;
  const food = normalizeBrandedPackagedFood(source);

  expect(food).toMatchObject({
    sourceType: "packaged-food",
    dataType: "branded",
    categoryLabel: "Yogurt",
    nutrients: { fat: 0, fiber: null },
    provenance: {
      completeness: "partial",
      unknownNutrients: ["fiber"],
      verification: { accessedAt: "2026-09-03" },
    },
  });
});

test("strict validation rejects bad counts, product duplicates, invalid nutrition, and identifier collisions", () => {
  const oneRecordOptions = {
    expectedCount: 1,
    expectedCategoryCounts: { yogurt: 1 },
  };
  const badSugar = clone(brandedPackagedFoodSeeds[0]);
  badSugar.nutrients.addedSugar = badSugar.nutrients.totalSugar + 1;
  expect(validateBrandedPackagedFoodCatalog([badSugar], oneRecordOptions))
    .toContain(`${badSugar.id} has added sugar greater than total sugar.`);

  const missingNutrient = clone(brandedPackagedFoodSeeds[0]);
  delete missingNutrient.nutrients.fiber;
  expect(validateBrandedPackagedFoodCatalog([missingNutrient], oneRecordOptions))
    .toContain(`${missingNutrient.id} has an invalid or missing fiber value.`);

  const duplicate = clone(brandedPackagedFoodSeeds[0]);
  expect(validateBrandedPackagedFoodCatalog([duplicate, clone(duplicate)], {
    expectedCount: 2,
    expectedCategoryCounts: { yogurt: 2 },
  })).toEqual(expect.arrayContaining([
    expect.stringContaining("Duplicate branded packaged food ID"),
    expect.stringContaining("Duplicate branded packaged product"),
    expect.stringContaining("Product identifier collision"),
  ]));

  expect(validateBrandedPackagedFoodCatalog([clone(brandedPackagedFoodSeeds[0])], {
    ...oneRecordOptions,
    existingFoods: [{ id: "other-catalog:item", identifiers: brandedPackagedFoodSeeds[0].identifiers }],
  })).toEqual(expect.arrayContaining([expect.stringContaining("other-catalog:item")]));
});

test("every record has exact serving, package, sugar, GTIN, and source fields", () => {
  brandedPackagedFoods.forEach((food) => {
    expect(food.serving).toEqual(expect.objectContaining({
      amount: expect.any(Number),
      unit: expect.any(String),
      description: expect.any(String),
      grams: expect.any(Number),
    }));
    expect(food.packaged.packageSize).toEqual(expect.any(String));
    expect(food.packaged.servingsPerContainer === null
      || (typeof food.packaged.servingsPerContainer === "number" && food.packaged.servingsPerContainer > 0)).toBe(true);
    expect(food.nutrients.totalSugar === null || typeof food.nutrients.totalSugar === "number").toBe(true);
    expect(food.nutrients.addedSugar === null || typeof food.nutrients.addedSugar === "number").toBe(true);
    expect(food.identifiers).toEqual([{ scheme: "gtin", value: expect.any(String) }]);
    expect(food.provenance).toEqual(expect.objectContaining({
      source: "official-manufacturer",
      confidence: expect.stringMatching(/^(manufacturer-and-secondary-match|official-source)$/),
      catalogVersion: 1,
      catalogBatch: expect.stringMatching(/^(yogurt-dairy-phase-1a|cereal-oatmeal-phase-1b)$/),
      verification: expect.objectContaining({
        status: "complete",
        sourceUrl: expect.stringMatching(/^https:\/\//),
        accessedAt: "2026-09-03",
      }),
    }));
  });
});

test("Phase 1B covers three cereal manufacturers and exact oatmeal subtypes", () => {
  const phase1B = brandedPackagedFoods.slice(40);
  expect(new Set(phase1B.filter((food) => food.category === "cereal").map((food) => (
    food.brand === "Kellogg's" || food.brand === "Special K" || food.brand === "Frosted Mini-Wheats"
      ? "WK Kellogg"
      : food.brand === "Post" || ["Honey Bunches of Oats", "Pebbles", "Grape-Nuts", "Honey-Comb", "Great Grains", "Premier Protein"].includes(food.brand)
        ? "Post Consumer Brands"
        : "General Mills"
  )))).toEqual(new Set(["General Mills", "WK Kellogg", "Post Consumer Brands"]));
  expect(phase1B.filter((food) => food.category === "oatmeal").map((food) => food.id)).toEqual(expect.arrayContaining([
    "packaged-food:quaker-old-fashioned-oats-42oz",
    "packaged-food:quaker-quick-one-minute-oats-42oz",
    "packaged-food:quaker-instant-original-10ct",
    "packaged-food:quaker-lower-sugar-maple-brown-sugar-8ct",
    "packaged-food:quaker-protein-maple-brown-sugar-6ct",
    "packaged-food:premier-protein-apple-cinnamon-oatmeal-6ct",
  ]));
  expect(phase1B.some((food) => food.packaged.servingsPerContainer === null)).toBe(true);
  expect(phase1B.some((food) => food.nutrients.totalSugar === null)).toBe(true);
  expect(phase1B.some((food) => food.nutrients.addedSugar === null)).toBe(true);
});

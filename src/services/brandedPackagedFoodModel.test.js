import brandedPackagedFoodSeeds from "../data/brandedPackagedFoods.v1.yogurtDairy";
import brandedPackagedFoods, {
  brandedPackagedFoodCatalogErrors,
} from "./brandedPackagedFoodCatalog";
import {
  YOGURT_DAIRY_PHASE_1A_CATEGORY_COUNTS,
  normalizeBrandedPackagedFood,
  validateBrandedPackagedFoodCatalog,
} from "./brandedPackagedFoodModel";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("publishes exactly 40 validated, immutable yogurt and dairy records", () => {
  expect(brandedPackagedFoodCatalogErrors).toEqual([]);
  expect(brandedPackagedFoods).toHaveLength(40);
  expect(Object.fromEntries(Object.keys(YOGURT_DAIRY_PHASE_1A_CATEGORY_COUNTS).map((category) => [
    category,
    brandedPackagedFoods.filter((food) => food.category === category).length,
  ]))).toEqual({ yogurt: 24, "cottage-cheese": 8, "cheese-snack": 8 });
  expect(new Set(brandedPackagedFoods.map((food) => food.id)).size).toBe(40);
  expect(Object.isFrozen(brandedPackagedFoods[0])).toBe(true);
  expect(Object.isFrozen(brandedPackagedFoods[0].provenance.verification.secondarySources)).toBe(true);
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
    expect(food.packaged).toEqual(expect.objectContaining({
      packageSize: expect.any(String),
      servingsPerContainer: expect.any(Number),
    }));
    expect(food.nutrients).toEqual(expect.objectContaining({
      totalSugar: expect.any(Number),
      addedSugar: expect.any(Number),
    }));
    expect(food.identifiers).toEqual([{ scheme: "gtin", value: expect.any(String) }]);
    expect(food.provenance).toEqual(expect.objectContaining({
      source: "official-manufacturer",
      confidence: "manufacturer-and-secondary-match",
      catalogVersion: 1,
      catalogBatch: "yogurt-dairy-phase-1a",
      verification: expect.objectContaining({
        status: "complete",
        sourceUrl: expect.stringMatching(/^https:\/\//),
        accessedAt: "2026-09-03",
      }),
    }));
  });
});

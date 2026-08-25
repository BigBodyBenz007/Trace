import groceryFoods, {
  GROCERY_CATALOG_VERSION,
  USDA_GROCERY_CATALOG_RELEASE,
  normalizeGroceryFood,
} from "./groceryFoodCatalog";

function food(id) {
  return groceryFoods.find((candidate) => candidate.id === `grocery:usda:${id}`);
}

test("ships a versioned USDA grocery batch with stable unique IDs and required categories", () => {
  expect(GROCERY_CATALOG_VERSION).toBe(1);
  expect(USDA_GROCERY_CATALOG_RELEASE).toBe("foundation-2026-04_sr-legacy-2018-04");
  expect(groceryFoods).toHaveLength(460);
  expect(new Set(groceryFoods.map(({ id }) => id)).size).toBe(groceryFoods.length);
  expect(new Set(groceryFoods.map(({ name }) => name.toLowerCase())).size).toBe(groceryFoods.length);
  expect(new Set(groceryFoods.map(({ category }) => category))).toEqual(new Set([
    "protein",
    "seafood",
    "eggs-dairy",
    "grains-starches",
    "vegetables",
    "fruit",
    "fats-oils",
    "pantry",
  ]));
  expect(Object.fromEntries([
    "protein",
    "seafood",
    "eggs-dairy",
    "fruit",
    "vegetables",
    "grains-starches",
    "fats-oils",
    "pantry",
  ].map((category) => [
    category,
    groceryFoods.filter((item) => item.category === category).length,
  ]))).toEqual({
    protein: 85,
    seafood: 50,
    "eggs-dairy": 55,
    fruit: 55,
    vegetables: 75,
    "grains-starches": 75,
    "fats-oils": 20,
    pantry: 45,
  });

  groceryFoods.forEach((item) => {
    expect(item).toMatchObject({
      sourceType: "grocery",
      dataType: "generic",
      category: expect.any(String),
      preparationState: expect.any(String),
      searchAliases: expect.any(Array),
      serving: {
        amount: expect.any(Number),
        unit: expect.any(String),
        description: expect.any(String),
        grams: expect.any(Number),
      },
      provenance: {
        source: "usda-fooddata-central",
        sourceId: expect.any(String),
        label: "USDA",
        catalogVersion: 1,
        sourceDescription: expect.any(String),
        sourceDataType: expect.any(String),
        sourceRelease: expect.any(String),
        unknownNutrients: expect.any(Array),
      },
    });
    expect(["complete", "partial"]).toContain(item.provenance.completeness);
    Object.values(item.nutrients).forEach((value) => {
      expect(value === null || (typeof value === "number" && value >= 0)).toBe(true);
    });
  });
});

test("keeps raw and cooked chicken as distinct USDA records and servings", () => {
  expect(food(2646170)).toMatchObject({
    name: "Chicken breast, boneless, skinless, raw",
    preparationState: "raw",
    serving: { description: "4 oz raw (113 g)" },
    provenance: { sourceId: "2646170" },
  });
  expect(food(171477)).toMatchObject({
    name: "Chicken breast, cooked, roasted",
    preparationState: "cooked",
    serving: { description: "3 oz cooked (85 g)" },
    provenance: { sourceId: "171477" },
  });
  expect(food(2646170).nutrients).not.toEqual(food(171477).nutrients);
});

test("keeps fresh, frozen, and canned grocery forms distinct", () => {
  expect(food(747447)).toMatchObject({
    name: "Broccoli, raw",
    category: "vegetables",
    preparationState: "raw",
  });
  expect(food(169968)).toMatchObject({
    name: "Broccoli, frozen, chopped, unprepared",
    category: "vegetables",
    preparationState: "frozen",
  });
  expect(food(2346398)).toMatchObject({ name: "Pineapple, raw", preparationState: "raw" });
  expect(food(169946)).toMatchObject({ name: expect.stringContaining("Pineapple, frozen"), preparationState: "frozen" });
  expect(food(167767)).toMatchObject({ name: expect.stringContaining("Pineapple, canned"), preparationState: "canned" });
  expect(new Set([747447, 169968, 2346398, 169946, 167767].map((id) => food(id).id)).size).toBe(5);
});

test("preserves missing nutrients as null and explicit USDA zero as zero", () => {
  const rawChicken = food(2646170);
  const cookedChicken = food(171477);

  expect(rawChicken.nutrients.fiber).toBeNull();
  expect(rawChicken.provenance).toMatchObject({
    completeness: "partial",
    unknownNutrients: ["fiber"],
  });
  expect(rawChicken.nutrients.carbohydrates).toBe(0);
  expect(cookedChicken.nutrients.fiber).toBe(0);
  expect(cookedChicken.nutrients.carbohydrates).toBe(0);
});

test("normalization never turns an absent nutrient into zero", () => {
  const normalized = normalizeGroceryFood({
    fdcId: 1,
    name: "Test food",
    category: "pantry",
    preparationState: "ready-to-use",
    serving: { amount: 1, unit: "serving", description: "1 serving", grams: 50 },
    nutrientsPer100g: {
      calories: null,
      protein: 0,
      carbohydrates: "",
      fat: 2,
      fiber: undefined,
      sodium: 0,
    },
    sourceDescription: "Test food",
    sourceDataType: "Foundation",
    sourceRelease: "test",
  });

  expect(normalized.nutrients).toEqual({
    calories: null,
    protein: 0,
    carbohydrates: null,
    fat: 1,
    fiber: null,
    sodium: 0,
  });
  expect(normalized.provenance.unknownNutrients).toEqual([
    "calories",
    "carbohydrates",
    "fiber",
  ]);
});

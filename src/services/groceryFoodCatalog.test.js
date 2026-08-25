import groceryFoods, {
  GROCERY_CATALOG_VERSION,
  USDA_GROCERY_CATALOG_RELEASE,
  grocerySourceFoods,
  isIngredientLevelGroceryFood,
  normalizeGroceryFood,
} from "./groceryFoodCatalog";

function food(id, foods = groceryFoods) {
  return foods.find((candidate) => candidate.id === `grocery:usda:${id}`);
}

test("preserves the 460-record source batch while exposing an ingredient-only search catalog", () => {
  expect(GROCERY_CATALOG_VERSION).toBe(1);
  expect(USDA_GROCERY_CATALOG_RELEASE).toBe("foundation-2026-04_sr-legacy-2018-04");
  expect(grocerySourceFoods).toHaveLength(460);
  expect(groceryFoods.length).toBeLessThan(grocerySourceFoods.length);
  expect(groceryFoods.length).toBeGreaterThan(250);
  expect(groceryFoods.every(isIngredientLevelGroceryFood)).toBe(true);
  expect(new Set(grocerySourceFoods.map(({ id }) => id)).size).toBe(grocerySourceFoods.length);
  expect(new Set(grocerySourceFoods.map(({ name }) => name.toLowerCase())).size).toBe(grocerySourceFoods.length);
  expect(new Set(grocerySourceFoods.map(({ category }) => category))).toEqual(new Set([
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
    grocerySourceFoods.filter((item) => item.category === category).length,
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

  grocerySourceFoods.forEach((item) => {
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

test("preserves source records but excludes cooked chicken from grocery search", () => {
  const raw = food(2646170, grocerySourceFoods);
  const cooked = food(171477, grocerySourceFoods);
  expect(raw).toMatchObject({
    name: "Chicken breast, boneless, skinless, raw",
    preparationState: "raw",
    serving: { description: "4 oz raw (113 g)" },
    provenance: { sourceId: "2646170" },
  });
  expect(cooked).toMatchObject({
    name: "Chicken breast, cooked, roasted",
    preparationState: "cooked",
    serving: { description: "3 oz cooked (85 g)" },
    provenance: { sourceId: "171477" },
  });
  expect(raw.nutrients).not.toEqual(cooked.nutrients);
  expect(food(2646170)).toBe(raw);
  expect(food(171477)).toBeUndefined();
});

test("keeps original fresh, frozen, and canned records available as source data", () => {
  expect(food(747447, grocerySourceFoods)).toMatchObject({
    name: "Broccoli, raw",
    category: "vegetables",
    preparationState: "raw",
  });
  expect(food(169968, grocerySourceFoods)).toMatchObject({
    name: "Broccoli, frozen, chopped, unprepared",
    category: "vegetables",
    preparationState: "frozen",
  });
  expect(food(2346398, grocerySourceFoods)).toMatchObject({ name: "Pineapple, raw", preparationState: "raw" });
  expect(food(169946, grocerySourceFoods)).toMatchObject({ name: expect.stringContaining("Pineapple, frozen"), preparationState: "frozen" });
  expect(food(167767, grocerySourceFoods)).toMatchObject({ name: expect.stringContaining("Pineapple, canned"), preparationState: "canned" });
  expect(new Set([747447, 169968, 2346398, 169946, 167767].map((id) => food(id, grocerySourceFoods).id)).size).toBe(5);
});

test("preserves missing nutrients as null and explicit USDA zero as zero", () => {
  const rawChicken = food(2646170, grocerySourceFoods);
  const cookedChicken = food(171477, grocerySourceFoods);

  expect(rawChicken.nutrients.fiber).toBeNull();
  expect(rawChicken.provenance).toMatchObject({
    completeness: "partial",
    unknownNutrients: ["fiber"],
  });
  expect(rawChicken.nutrients.carbohydrates).toBe(0);
  expect(cookedChicken.nutrients.fiber).toBe(0);
  expect(cookedChicken.nutrients.carbohydrates).toBe(0);
});

test("keeps raw eggs, egg whites, and dried eggs while excluding fried eggs", () => {
  expect(food(171287)).toMatchObject({ name: "Egg, whole, raw", preparationState: "raw" });
  expect(food(172183)).toMatchObject({ name: "Egg white, raw", preparationState: "raw" });
  expect(food(329490)).toMatchObject({ name: "Egg, whole, dried", preparationState: "dry" });
  expect(food(323793)).toMatchObject({ name: "Egg white, dried", preparationState: "dry" });
  expect(food(173423, grocerySourceFoods)).toMatchObject({ name: "Egg, whole, cooked, fried" });
  expect(food(173423)).toBeUndefined();
});

test("excludes cooked methods consistently while retaining raw meat and seafood", () => {
  const cookingMethods = /\b(baked|boiled|braised|broiled|cooked|fried|grilled|poached|roasted|steamed|stewed)\b/i;
  expect(food(2646170)).toMatchObject({ category: "protein", preparationState: "raw" });
  expect(food(175167)).toMatchObject({ category: "seafood", preparationState: "raw" });
  groceryFoods.forEach((item) => {
    if (item.category === "fats-oils") return;
    expect(`${item.name} ${item.provenance.sourceDescription}`).not.toMatch(cookingMethods);
  });
});

test("keeps standalone cooking oils and fats with exact USDA servings and nutrition", () => {
  [171413, 172336, 171314, 171401, 173584, 171430, 171410, 172338, 171411, 171412, 171016, 173573]
    .forEach((id) => expect(food(id)).toMatchObject({
      category: "fats-oils",
      provenance: { source: "usda-fooddata-central", sourceId: String(id) },
    }));
  expect(food(171314)).toMatchObject({
    name: "Ghee (clarified butter)",
    serving: { description: "1 tablespoon (14 g)", grams: 14 },
    nutrients: { calories: 126, protein: 0, carbohydrates: 0, fat: 14, fiber: 0, sodium: 0 },
  });
  expect(food(171401)).toMatchObject({
    name: "Lard",
    serving: { description: "1 tablespoon (12.8 g)", grams: 12.8 },
    nutrients: { calories: 115.5, fat: 12.8 },
  });
  expect(food(173584)).toMatchObject({
    name: "Vegetable shortening",
    nutrients: { calories: 113.2, fat: 12.8, sodium: 0.5 },
  });
  expect(food(171430)).toMatchObject({
    name: "PAM cooking spray, original",
    serving: { amount: 1, unit: "spray", grams: 0.3 },
    nutrients: { calories: 2.4, protein: 0, carbohydrates: 0.06, fat: 0.24, fiber: 0, sodium: 0.2 },
  });
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

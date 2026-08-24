import {
  USER_FOODS_STORAGE_KEY,
  addUserFood,
  createUserFood,
  readUserFoods,
  writeUserFoods,
} from "./userFoodCatalog";

const nutrients = {
  calories: 350,
  protein: 22,
  carbohydrates: 18,
  fat: 20,
};

beforeEach(() => {
  localStorage.clear();
});

test("creates a reusable one-serving food with user-added provenance", () => {
  expect(createUserFood("  Meatloaf  ", nutrients)).toEqual({
    id: "user-added:meatloaf",
    name: "Meatloaf",
    sourceType: "grocery-custom",
    category: "other",
    categoryLabel: "Other",
    serving: {
      amount: 1,
      unit: "serving",
      description: "1 serving",
    },
    nutrients: { ...nutrients, fiber: null, sodium: null },
    provenance: {
      source: "user-added",
      sourceId: "meatloaf",
      confidence: "user-added",
      label: "User-entered",
      completeness: "complete",
    },
  });
});

test("creates a reusable food with a richer canonical serving", () => {
  expect(
    createUserFood("Meatloaf", nutrients, {
      amount: 4,
      unit: "oz",
      description: "4 oz",
    }).serving
  ).toEqual({ amount: 4, unit: "oz", description: "4 oz" });
});

test("supports optional known sodium on reusable foods", () => {
  expect(createUserFood("Soup", { ...nutrients, sodium: 640 }).nutrients).toEqual({
    ...nutrients,
    fiber: null,
    sodium: 640,
  });
  expect(createUserFood("Soup", nutrients).nutrients.sodium).toBeNull();
});

test("creates a grocery food with brand, category, notes, fiber, and user-entered source", () => {
  expect(
    createUserFood(
      " Raw chicken breast strips ",
      { calories: 120, protein: 26, carbohydrates: 0, fat: 2, fiber: 0 },
      { amount: 4, unit: "oz", description: "4 oz" },
      {
        brand: " Store Brand ",
        category: "protein",
        notes: " Keep refrigerated ",
      }
    )
  ).toMatchObject({
    name: "Raw chicken breast strips",
    brand: "Store Brand",
    category: "protein",
    categoryLabel: "Protein / meat",
    notes: "Keep refrigerated",
    sourceType: "grocery-custom",
    nutrients: { calories: 120, protein: 26, carbohydrates: 0, fat: 2, fiber: 0, sodium: null },
    provenance: { source: "user-added", label: "User-entered", completeness: "complete" },
  });
});

test("keeps every omitted grocery nutrient unknown while preserving explicit zero", () => {
  expect(createUserFood("Potatoes", { carbohydrates: 0 }).nutrients).toEqual({
    calories: null,
    protein: null,
    carbohydrates: 0,
    fat: null,
    fiber: null,
    sodium: null,
  });
});

test("persists and reads user foods from their own storage key", () => {
  const food = createUserFood("Meatloaf", nutrients);

  writeUserFoods(localStorage, [food]);

  expect(JSON.parse(localStorage.getItem(USER_FOODS_STORAGE_KEY))).toEqual([
    food,
  ]);
  expect(readUserFoods(localStorage)).toEqual([food]);
});

test("prevents duplicate user foods by normalized name and keeps first values", () => {
  const original = createUserFood("Meatloaf", nutrients);
  const replacement = createUserFood("  MEATLOAF ", {
    ...nutrients,
    calories: 500,
  });

  expect(addUserFood([original], replacement)).toEqual({
    foods: [original],
    added: false,
    existingFood: original,
    matchesDefinition: false,
  });
});

test("recognizes an exact duplicate without replacing the existing record", () => {
  const original = createUserFood("Meatloaf", nutrients, {
    amount: 1,
    unit: "slice",
    description: "1 slice",
  });
  const duplicate = createUserFood("  MEATLOAF ", nutrients, {
    amount: 1,
    unit: "slice",
    description: "1 slice",
  });

  expect(addUserFood([original], duplicate)).toEqual({
    foods: [original],
    added: false,
    existingFood: original,
    matchesDefinition: true,
  });
});

test("recognizes a pre-grocery saved food as the same definition", () => {
  const current = createUserFood("Meatloaf", nutrients);
  const legacy = {
    id: current.id,
    name: current.name,
    serving: current.serving,
    nutrients: { ...nutrients, sodium: null },
    provenance: {
      source: "user-added",
      sourceId: "meatloaf",
      confidence: "user-added",
    },
  };

  expect(addUserFood([legacy], current)).toMatchObject({
    foods: [legacy],
    added: false,
    existingFood: legacy,
    matchesDefinition: true,
  });
});

import {
  USER_FOODS_STORAGE_KEY,
  addUserFood,
  createUserFood,
  deleteUserFood,
  lookupUserFoodByBarcode,
  readUserFoods,
  updateUserFood,
  writeUserFoods,
} from "./userFoodCatalog";

const nutrients = {
  calories: 350,
  protein: 22,
  carbohydrates: 18,
  fat: 20,
};

const BARCODE = "012000001291";

function providerFood() {
  return {
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers: [{ scheme: "gtin", value: BARCODE }],
    provider: { id: "usda-fdc", recordId: "123", attribution: "USDA FoodData Central" },
    brand: "Provider Brand",
    name: "Incomplete Provider Food",
    packageQuantity: null,
    serving: { description: "30 g", amount: 30, unit: "g", grams: 30 },
    servingsPerContainer: null,
    nutrients: {
      calories: null,
      protein: 4.000000000000001,
      carbohydrates: 8,
      fat: 2,
      fiber: null,
      sodium: 25,
      totalSugar: 3,
      addedSugar: null,
    },
    dataBasis: "serving",
    nutritionBasis: {
      kind: "provider-serving",
      source: "labelNutrients",
      sourceBasis: "serving",
      sourceQuantity: { amount: 1, unit: "serving", dimension: null },
      servingQuantity: { amount: 30, unit: "g", dimension: "mass" },
      conversionFactor: null,
      sourceNutrients: {
        calories: null,
        protein: 4.000000000000001,
        carbohydrates: 8,
        fat: 2,
        fiber: null,
        sodium: 25,
        totalSugar: 3,
        addedSugar: null,
      },
    },
    completeness: "insufficient",
    unknownFields: [
      "packageQuantity",
      "servingsPerContainer",
      "nutrients.calories",
      "nutrients.fiber",
      "nutrients.addedSugar",
      "provenance.revisionDate",
    ],
    logReady: false,
    provenance: {
      sourceUrl: "https://fdc.nal.usda.gov/food-details/123/nutrients",
      provider: "USDA FoodData Central",
      providerRecordId: "123",
      attribution: "USDA FoodData Central (public domain / CC0)",
      revisionDate: null,
      retrievedAt: "2026-09-03T12:00:00.000Z",
    },
  };
}

beforeEach(() => {
  localStorage.clear();
});

test("creates a reusable one-serving food with user-added provenance", () => {
  expect(createUserFood("  Meatloaf  ", nutrients)).toEqual({
    id: "user-added:meatloaf",
    name: "Meatloaf",
    sourceType: "grocery-custom",
    dataType: "user-entered",
    category: "other",
    categoryLabel: "Other",
    serving: {
      amount: 1,
      unit: "serving",
      description: "1 serving",
    },
    nutrients: { ...nutrients, fiber: null, sodium: null, totalSugar: null, addedSugar: null },
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
    totalSugar: null,
    addedSugar: null,
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
    nutrients: { calories: 120, protein: 26, carbohydrates: 0, fat: 2, fiber: 0, sodium: null, totalSugar: null, addedSugar: null },
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
    totalSugar: null,
    addedSugar: null,
  });
});

test("preserves optional sugar including explicit zero and rejects invalid sugar", () => {
  expect(createUserFood("Yogurt", { ...nutrients, totalSugar: 12, addedSugar: 0 }).nutrients).toMatchObject({
    totalSugar: 12,
    addedSugar: 0,
  });
  expect(createUserFood("Invalid", { ...nutrients, totalSugar: -1 })).toBeNull();
  expect(createUserFood("Invalid", { ...nutrients, totalSugar: 3, addedSugar: 4 })).toBeNull();
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

test("loads older stored custom foods without barcode fields unchanged", () => {
  const legacy = {
    id: "user-added:legacy",
    name: "Legacy food",
    serving: { amount: 1, unit: "serving", description: "1 serving" },
    nutrients: { calories: 10, protein: null, carbohydrates: null, fat: null },
    provenance: { source: "user-added", sourceId: "legacy", confidence: "user-added" },
  };
  localStorage.setItem(USER_FOODS_STORAGE_KEY, JSON.stringify([legacy]));
  expect(readUserFoods(localStorage)).toEqual([legacy]);
});

test("treats sugar as part of a reusable food definition", () => {
  const original = createUserFood("Yogurt", { ...nutrients, totalSugar: 12, addedSugar: 4 });
  const changedSugar = createUserFood("Yogurt", { ...nutrients, totalSugar: 12, addedSugar: 5 });

  expect(addUserFood([original], changedSugar)).toMatchObject({
    added: false,
    existingFood: original,
    matchesDefinition: false,
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

test("creates a clean barcode-linked custom food while preserving zero and unknown", () => {
  const food = createUserFood(
    "Scanned food",
    {
      calories: 112.6666666666671,
      protein: 20.00000000000002,
      carbohydrates: 5.999999999999993,
      fat: 3.000000000000003,
      fiber: null,
      sodium: 44.99999999999999,
      totalSugar: 3.000000000000003,
      addedSugar: 0,
    },
    { amount: 1, unit: "serving", description: "1 serving", grams: 150 },
    { identifiers: [{ scheme: "gtin", value: BARCODE }], packageQuantity: "5.3 oz" }
  );

  expect(food).toMatchObject({
    id: "user-added:barcode:gtin:00012000001291",
    dataType: "user-entered",
    dataBasis: "serving",
    identifiers: [{ scheme: "gtin", value: BARCODE }],
    packaged: { packageSize: "5.3 oz", servingsPerContainer: null },
    nutrients: {
      calories: 113,
      protein: 20,
      carbohydrates: 6,
      fat: 3,
      fiber: null,
      sodium: 45,
      totalSugar: 3,
      addedSugar: 0,
    },
    provenance: { source: "user-added", label: "User-created barcode food" },
  });
  expect(food.provenance).not.toHaveProperty("sourceUrl");
  expect(food).not.toHaveProperty("providerSourceSnapshot");
  expect(lookupUserFoodByBarcode([food], "00012000001291")).toMatchObject({
    status: "found",
    food,
  });
});

test("rejects negative and nonfinite custom nutrition instead of coercing it", () => {
  expect(createUserFood("Negative", { ...nutrients, fat: -1 })).toBeNull();
  expect(createUserFood("Infinite", { ...nutrients, protein: Infinity })).toBeNull();
});

test("canonical barcode identity prevents duplicate custom records even with different names", () => {
  const original = createUserFood("First name", nutrients, undefined, {
    identifiers: [{ scheme: "gtin", value: BARCODE }],
  });
  const collision = createUserFood("Second name", nutrients, undefined, {
    identifiers: [{ scheme: "gtin", value: "00012000001291" }],
  });
  expect(addUserFood([original], collision)).toMatchObject({
    added: false,
    existingFood: original,
  });
});

test("updates and deletes a barcode food without changing its stable identity", () => {
  const original = createUserFood("Original", nutrients, undefined, {
    identifiers: [{ scheme: "gtin", value: BARCODE }],
  });
  const replacement = createUserFood("Updated", { ...nutrients, calories: 400 }, undefined, {
    identifiers: [{ scheme: "gtin", value: BARCODE }],
  });
  const updated = updateUserFood([original], original.id, replacement);
  expect(updated).toMatchObject({ updated: true, food: { id: original.id, name: "Updated" } });
  expect(lookupUserFoodByBarcode(updated.foods, BARCODE).food.name).toBe("Updated");
  expect(deleteUserFood(updated.foods, original.id)).toEqual({
    foods: [],
    deleted: true,
    food: updated.food,
  });
});

test("completed custom food retains an immutable unrounded provider record", () => {
  const snapshot = providerFood();
  const food = createUserFood("Completed food", nutrients, undefined, {
    identifiers: [{ scheme: "gtin", value: BARCODE }],
    providerSourceSnapshot: snapshot,
  });
  expect(food).toMatchObject({
    dataType: "user-completed",
    provenance: {
      source: "user-added",
      provider: "usda-fdc",
      providerRecordId: "123",
    },
  });
  expect(food.providerSourceSnapshot.nutrients.protein).toBe(4.000000000000001);
  expect(Object.isFrozen(food.providerSourceSnapshot)).toBe(true);
  writeUserFoods(localStorage, [food]);
  const reloaded = readUserFoods(localStorage)[0];
  expect(reloaded.providerSourceSnapshot.nutrients.protein).toBe(4.000000000000001);
  expect(Object.isFrozen(reloaded.providerSourceSnapshot)).toBe(true);
  expect(createUserFood("Mismatch", nutrients, undefined, {
    identifiers: [{ scheme: "gtin", value: "00000000000000" }],
    providerSourceSnapshot: snapshot,
  })).toBeNull();
});

test("editing completed custom values cannot mutate the retained provider source", () => {
  const snapshot = providerFood();
  const rawBefore = JSON.stringify(snapshot);
  const original = createUserFood("Completed food", nutrients, undefined, {
    identifiers: [{ scheme: "gtin", value: BARCODE }],
    providerSourceSnapshot: snapshot,
  });
  const before = JSON.stringify(original.providerSourceSnapshot);
  const replacement = createUserFood("Completed food edited", {
    ...nutrients,
    calories: 999,
  }, undefined, {
    identifiers: [{ scheme: "gtin", value: BARCODE }],
    providerSourceSnapshot: original.providerSourceSnapshot,
  });
  const updated = updateUserFood([original], original.id, replacement);
  expect(updated.food.nutrients.calories).toBe(999);
  expect(JSON.stringify(updated.food.providerSourceSnapshot)).toBe(before);
  expect(JSON.stringify(snapshot)).toBe(rawBefore);
});

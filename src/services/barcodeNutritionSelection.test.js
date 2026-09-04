import { createBarcodeNutritionCandidate } from "./barcodeNutritionSelection";

function remoteFood(overrides = {}) {
  const food = {
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers: [{ scheme: "gtin", value: "00012345600012" }],
    provider: { id: "usda-fdc", recordId: "123", attribution: "USDA FoodData Central" },
    brand: "Example Brand",
    name: "Example Yogurt",
    packageQuantity: "4 oz cup",
    serving: { description: "1 cup (30 g)", amount: 1, unit: "cup", grams: 30 },
    servingsPerContainer: 1,
    nutrients: {
      calories: 100,
      protein: 10,
      carbohydrates: 20,
      fat: 0,
      fiber: null,
      sodium: 50,
      totalSugar: 8,
      addedSugar: null,
    },
    dataBasis: "100g",
    completeness: "partial",
    unknownFields: ["nutrients.fiber", "nutrients.addedSugar", "provenance.revisionDate"],
    logReady: true,
    provenance: {
      sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/123/nutrients",
      provider: "usda-fdc",
      providerRecordId: "123",
      attribution: "USDA FoodData Central",
      revisionDate: null,
      retrievedAt: "2026-09-03T12:00:00.000Z",
    },
    ...overrides,
  };
  return food;
}

test("adapts provider per-100g values to a gram serving while preserving null and zero", () => {
  const food = remoteFood();
  const candidate = createBarcodeNutritionCandidate({ status: "found", food });

  expect(candidate.canUse).toBe(true);
  expect(candidate.selection.serving).toEqual({
    amount: 1,
    unit: "cup",
    description: "1 cup (30 g)",
    grams: 30,
  });
  expect(candidate.selection.nutrients).toMatchObject({
    calories: 30,
    protein: 3,
    carbohydrates: 6,
    fat: 0,
    fiber: null,
    sodium: 15,
  });
  expect(candidate.selection.remote.nutrients.calories).toBe(100);
  expect(candidate.selection.remote.dataBasis).toBe("100g");
  expect(Object.isFrozen(candidate.selection.remote)).toBe(true);
});

test("uses an honest 100 g serving when per-100g data has no serving grams", () => {
  const food = remoteFood({
    serving: { description: null, amount: null, unit: null, grams: null },
    completeness: "partial",
    unknownFields: [
      "serving.description",
      "serving.amount",
      "serving.grams",
      "nutrients.fiber",
      "nutrients.addedSugar",
      "provenance.revisionDate",
    ],
  });
  const candidate = createBarcodeNutritionCandidate({ status: "found", food });

  expect(candidate.selection.serving).toEqual({
    amount: 100,
    unit: "g",
    description: "100 g",
    grams: 100,
  });
  expect(candidate.selection.nutrients.calories).toBe(100);
});

test("does not offer an incomplete remote product for use", () => {
  const food = remoteFood({
    nutrients: {
      ...remoteFood().nutrients,
      calories: null,
    },
    completeness: "insufficient",
    unknownFields: [
      "nutrients.calories",
      "nutrients.fiber",
      "nutrients.addedSugar",
      "provenance.revisionDate",
    ],
    logReady: false,
  });
  const candidate = createBarcodeNutritionCandidate({ status: "incomplete", food });

  expect(candidate.canUse).toBe(false);
  expect(candidate.selection).toBeNull();
  expect(candidate.display.nutrients.calories).toBeNull();
});

test("preserves the stale marker on an expired offline cache result", () => {
  const candidate = createBarcodeNutritionCandidate({
    status: "found",
    stale: true,
    food: remoteFood(),
  });
  expect(candidate.stale).toBe(true);
});

import {
  applyRemoteNutrientPrecision,
  createBarcodeNutritionCandidate,
} from "./barcodeNutritionSelection";
import { lookupCatalogFoodByBarcode } from "./barcodeFoodLookup";

const FLOATING_NUTRIENTS = Object.freeze({
  calories: 112.6666666666671,
  protein: 20.00000000000002,
  carbohydrates: 5.999999999999993,
  fat: 3.000000000000003,
  fiber: null,
  sodium: 44.99999999999999,
  totalSugar: 3.000000000000003,
  addedSugar: 0,
});

const SOURCE_NUTRIENTS = Object.freeze({
  calories: 100,
  protein: 10,
  carbohydrates: 20,
  fat: 0,
  fiber: null,
  sodium: 50,
  totalSugar: 8,
  addedSugar: null,
});

function remoteFood(overrides = {}) {
  const food = {
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers: [{ scheme: "gtin", value: "00012345600012" }],
    provider: { id: "usda-fdc", recordId: "123", attribution: "USDA FoodData Central" },
    brand: "Example Brand",
    name: "Example Yogurt",
    packageQuantity: "4 oz cup",
    serving: { description: "1 cup (30 g)", amount: 30, unit: "g", grams: 30 },
    servingsPerContainer: 1,
    nutrients: {
      calories: 30,
      protein: 3,
      carbohydrates: 6,
      fat: 0,
      fiber: null,
      sodium: 15,
      totalSugar: 2.4,
      addedSugar: null,
    },
    dataBasis: "serving",
    nutritionBasis: {
      kind: "derived-serving",
      source: "foodNutrients",
      sourceBasis: "100g",
      sourceQuantity: { amount: 100, unit: "g", dimension: "mass" },
      servingQuantity: { amount: 30, unit: "g", dimension: "mass" },
      conversionFactor: 0.3,
      sourceNutrients: SOURCE_NUTRIENTS,
    },
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

test("uses a gateway-derived gram serving while preserving raw basis, null, and zero", () => {
  const food = remoteFood();
  const candidate = createBarcodeNutritionCandidate({ status: "found", food });

  expect(candidate.canUse).toBe(true);
  expect(candidate.selection.serving).toEqual({
    amount: 30,
    unit: "g",
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
  expect(candidate.selection.remote.nutrients.calories).toBe(30);
  expect(candidate.selection.remote.nutritionBasis.sourceNutrients.calories).toBe(100);
  expect(candidate.selection.remote.nutritionBasis.sourceBasis).toBe("100g");
  expect(candidate.display.basisMessage).toMatch(/Nutrition shown for 1 cup \(30 g\)/);
  expect(candidate.display.basisMessage).toMatch(/per-100 g data/);
  expect(candidate.display.servingsPerContainer).toBe(1);
  expect(Object.isFrozen(candidate.selection.remote)).toBe(true);
});

test("does not present reference-only per-100g data as a usable serving", () => {
  const food = remoteFood({
    serving: { description: null, amount: null, unit: null, grams: null },
    nutritionBasis: {
      kind: "reference-only",
      source: "foodNutrients",
      sourceBasis: "100g",
      sourceQuantity: { amount: 100, unit: "g", dimension: "mass" },
      servingQuantity: { amount: 1, unit: "serving", dimension: null },
      conversionFactor: null,
      sourceNutrients: SOURCE_NUTRIENTS,
    },
    dataBasis: "100g",
    nutrients: SOURCE_NUTRIENTS,
    completeness: "insufficient",
    unknownFields: [
      "serving.description",
      "serving.amount",
      "serving.grams",
      "nutrients.fiber",
      "nutrients.addedSugar",
      "provenance.revisionDate",
      "nutritionBasis.labeledServing",
    ],
    logReady: false,
  });
  const candidate = createBarcodeNutritionCandidate({ status: "incomplete", food });

  expect(candidate.canUse).toBe(false);
  expect(candidate.selection).toBeNull();
  expect(candidate.display.nutrients.calories).toBeNull();
  expect(candidate.recovery.food.nutrients.calories).toBeNull();
  expect(candidate.display.basisMessage).toMatch(/did not supply enough compatible serving data/i);
});

test("does not offer an incomplete remote product for use", () => {
  const food = remoteFood({
    nutrients: {
      ...remoteFood().nutrients,
      calories: null,
    },
    nutritionBasis: {
      ...remoteFood().nutritionBasis,
      sourceNutrients: { ...SOURCE_NUTRIENTS, calories: null },
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
  expect(candidate.recovery).toMatchObject({
    barcode: { scheme: "gtin", value: "00012345600012" },
    food: {
      name: "Example Yogurt",
      serving: { description: "1 cup (30 g)", grams: 30 },
      nutrients: { calories: null, protein: 3, carbohydrates: 6, fat: 0 },
    },
  });
  expect(candidate.recovery.providerSourceSnapshot.nutrients.protein).toBe(3);
  expect(candidate.recovery.providerSourceSnapshot.dataBasis).toBe("serving");
  expect(candidate.recovery.providerSourceSnapshot.nutritionBasis.sourceNutrients.protein).toBe(10);
  expect(Object.isFrozen(candidate.recovery.providerSourceSnapshot)).toBe(true);
});

test("preserves the stale marker on an expired offline cache result", () => {
  const candidate = createBarcodeNutritionCandidate({
    status: "found",
    stale: true,
    food: remoteFood(),
  });
  expect(candidate.stale).toBe(true);
});

test("legacy normalized per-100g records cannot bypass labeled-serving policy", () => {
  const food = remoteFood({ dataBasis: "100g" });
  delete food.nutritionBasis;
  const candidate = createBarcodeNutritionCandidate({ status: "found", food });
  expect(candidate.canUse).toBe(false);
  expect(candidate.selection).toBeNull();
  expect(candidate.display.nutrients.calories).toBeNull();
  expect(candidate.recovery.providerSourceSnapshot.dataBasis).toBe("100g");
});

test("removes false precision from a direct 100 g serving without rounding provider data", () => {
  const food = remoteFood({
    brand: "Oikos",
    name: "Oikos Pro Mixed Berry",
    serving: { description: "100 g", amount: 100, unit: "g", grams: 100 },
    nutrients: FLOATING_NUTRIENTS,
    dataBasis: "serving",
    nutritionBasis: {
      kind: "provider-serving",
      source: "labelNutrients",
      sourceBasis: "serving",
      sourceQuantity: { amount: 1, unit: "serving", dimension: null },
      servingQuantity: { amount: 100, unit: "g", dimension: "mass" },
      conversionFactor: null,
      sourceNutrients: FLOATING_NUTRIENTS,
    },
    unknownFields: ["nutrients.fiber", "provenance.revisionDate"],
  });
  const candidate = createBarcodeNutritionCandidate({ status: "found", food });

  expect(candidate.display.nutrients).toEqual({
    calories: 113,
    protein: 20,
    carbohydrates: 6,
    fat: 3,
    fiber: null,
    sodium: 45,
    totalSugar: 3,
    addedSugar: 0,
  });
  expect(candidate.selection.nutrients).toEqual(candidate.display.nutrients);
  expect(candidate.selection.remote.nutrients).toEqual(FLOATING_NUTRIENTS);
  expect(candidate.selection.remote.dataBasis).toBe("serving");
  expect(candidate.display.basisMessage).toBe("Nutrition shown for 100 g.");
  expect(candidate.display.basisMessage).not.toMatch(/per-100/);
});

test("remote precision preserves zero and null, avoids negative zero, and rejects invalid results", () => {
  const precise = applyRemoteNutrientPrecision({
    calories: -0,
    protein: null,
    carbohydrates: 1.234,
    fat: Number.POSITIVE_INFINITY,
    fiber: -1,
    sodium: 1.5,
    totalSugar: 2.345,
    addedSugar: 0,
  });

  expect(precise).toEqual({
    calories: 0,
    protein: null,
    carbohydrates: 1.23,
    fat: null,
    fiber: null,
    sodium: 2,
    totalSugar: 2.35,
    addedSugar: 0,
  });
  expect(Object.is(precise.calories, -0)).toBe(false);
});

test("does not apply remote precision rounding to a verified local catalog result", () => {
  const localResult = lookupCatalogFoodByBarcode("036632019530");
  const candidate = createBarcodeNutritionCandidate(localResult);

  expect(localResult.status).toBe("found");
  expect(candidate.selection.nutrients).toEqual(localResult.food.nutrients);
  expect(candidate.display.nutrients).toEqual(localResult.food.nutrients);
});

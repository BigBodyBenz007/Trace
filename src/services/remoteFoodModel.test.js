import {
  normalizeRemoteFood,
  normalizeRemoteLookupResult,
} from "./remoteFoodModel";

function remoteFood(overrides = {}) {
  return {
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers: [{ scheme: "gtin", value: "00000000000000" }],
    provider: {
      id: "usda-fdc",
      recordId: "123",
      attribution: "USDA FoodData Central",
    },
    brand: "Test Brand",
    name: "Test Product",
    packageQuantity: "10 oz",
    serving: { description: "30 g", amount: 30, unit: "g", grams: 30 },
    servingsPerContainer: 5,
    nutrients: {
      calories: 100,
      protein: 4,
      carbohydrates: 12,
      fat: 3,
      sodium: 0,
      fiber: 2,
      totalSugar: 5,
      addedSugar: 0,
    },
    dataBasis: "serving",
    nutritionBasis: {
      kind: "derived-serving",
      source: "foodNutrients",
      sourceBasis: "100g",
      sourceQuantity: { amount: 100, unit: "g", dimension: "mass" },
      servingQuantity: { amount: 30, unit: "g", dimension: "mass" },
      conversionFactor: 0.3,
      sourceNutrients: {
        calories: 333.3333333333333,
        protein: 13.333333333333334,
        carbohydrates: 40,
        fat: 10,
        sodium: 0,
        fiber: 6.666666666666667,
        totalSugar: 16.666666666666668,
        addedSugar: 0,
      },
    },
    completeness: "complete",
    unknownFields: [],
    logReady: true,
    provenance: {
      sourceUrl: "https://fdc.nal.usda.gov/food-details/123/nutrients",
      provider: "USDA FoodData Central",
      providerRecordId: "123",
      attribution: "USDA FoodData Central (public domain / CC0)",
      revisionDate: "2026-01-02T00:00:00.000Z",
      retrievedAt: "2026-09-03T12:00:00.000Z",
    },
    ...overrides,
  };
}

function remoteResult(barcode = "00000000000000", overrides = {}) {
  const food = remoteFood({
    identifiers: [{ scheme: "gtin", value: barcode }],
    ...overrides.food,
  });
  return {
    status: "found",
    identifier: { scheme: "gtin", value: barcode },
    food,
    ...overrides,
  };
}

test("normalizes a provider record into an immutable browser trust boundary", () => {
  const source = remoteFood();
  const normalized = normalizeRemoteFood(source);
  expect(normalized).toEqual(source);
  expect(Object.isFrozen(normalized)).toBe(true);
  expect(Object.isFrozen(normalized.nutrients)).toBe(true);
  expect(Object.isFrozen(normalized.provenance)).toBe(true);
  expect(normalized).not.toBe(source);
  expect(normalized.nutrients).not.toBe(source.nutrients);
});

test("preserves unknown null and explicit zero nutrient values", () => {
  const normalized = normalizeRemoteFood(remoteFood({
    completeness: "partial",
    unknownFields: ["nutrients.addedSugar"],
    nutrients: { ...remoteFood().nutrients, sodium: 0, addedSugar: null },
    nutritionBasis: {
      ...remoteFood().nutritionBasis,
      sourceNutrients: { ...remoteFood().nutritionBasis.sourceNutrients, addedSugar: null },
    },
  }));
  expect(normalized.nutrients.sodium).toBe(0);
  expect(normalized.nutrients.addedSugar).toBeNull();
});

test("rejects invalid nutrients, inconsistent sugar, unsafe sources, and false readiness", () => {
  expect(normalizeRemoteFood(remoteFood({
    nutrients: { ...remoteFood().nutrients, protein: -1 },
  }))).toBeNull();
  expect(normalizeRemoteFood(remoteFood({
    nutrients: { ...remoteFood().nutrients, totalSugar: 1, addedSugar: 2 },
  }))).toBeNull();
  expect(normalizeRemoteFood(remoteFood({
    provenance: { ...remoteFood().provenance, sourceUrl: "https://example.com/product" },
  }))).toBeNull();
  expect(normalizeRemoteFood(remoteFood({
    nutrients: { ...remoteFood().nutrients, fat: null },
  }))).toBeNull();
});

test("requires result status, identifier, food readiness, and barcode to agree", () => {
  expect(normalizeRemoteLookupResult(remoteResult())).toMatchObject({ status: "found" });
  expect(normalizeRemoteLookupResult({
    ...remoteResult(),
    identifier: { scheme: "gtin", value: "00012000001291" },
  })).toBeNull();
  expect(normalizeRemoteLookupResult({ ...remoteResult(), status: "incomplete" })).toBeNull();
  expect(normalizeRemoteLookupResult({ status: "made-up", identifier: null, food: null }))
    .toBeNull();
});

test("validates explicit serving-basis provenance while accepting legacy backup snapshots", () => {
  expect(normalizeRemoteFood(remoteFood()).nutritionBasis).toMatchObject({
    kind: "derived-serving",
    sourceBasis: "100g",
    conversionFactor: 0.3,
  });
  const malformed = remoteFood({
    nutritionBasis: { ...remoteFood().nutritionBasis, conversionFactor: null },
  });
  expect(normalizeRemoteFood(malformed)).toBeNull();

  const legacy = remoteFood();
  delete legacy.nutritionBasis;
  expect(normalizeRemoteFood(legacy)).not.toBeNull();
});

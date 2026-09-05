const {
  MAX_PROVIDER_RESPONSE_BYTES,
  MAX_REQUEST_BYTES,
  createHandler,
  lookupRemoteBarcode,
  normalizeOpenFoodFactsProduct,
  normalizeUsdaFood,
} = require("../../api/nutrition/_barcodeGateway.cjs");
const { normalizeRemoteFood } = require("./remoteFoodModel");

const BARCODE = "00000000000000";
const OTHER_BARCODE = "00012000001291";
const NOW = Date.parse("2026-09-03T12:00:00.000Z");

function headers(values = {}) {
  const normalized = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), String(value)])
  );
  return { get: (key) => normalized[key.toLowerCase()] ?? null };
}

function upstream(body, { status = 200, responseHeaders = {} } = {}) {
  const serialized = typeof body === "string" ? body : JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: headers(responseHeaders),
    body: null,
    text: jest.fn().mockResolvedValue(serialized),
  };
}

function usdaFood(overrides = {}) {
  return {
    fdcId: 100,
    dataType: "Branded",
    gtinUpc: BARCODE,
    description: "Exact Product",
    brandOwner: "Trace Test Brand",
    packageWeight: "10 oz",
    servingSize: 30,
    servingSizeUnit: "g",
    householdServingFullText: "1 cup (30 g)",
    servingsPerContainer: 8,
    modifiedDate: "2026-01-01",
    foodNutrients: [
      { nutrientName: "Energy", unitName: "KCAL", value: 120 },
      { nutrientName: "Protein", unitName: "G", value: 4 },
      { nutrientName: "Carbohydrate, by difference", unitName: "G", value: 20 },
      { nutrientName: "Total lipid (fat)", unitName: "G", value: 3 },
      { nutrientName: "Fiber, total dietary", unitName: "G", value: 2 },
      { nutrientName: "Sodium, Na", unitName: "MG", value: 150 },
      { nutrientName: "Total Sugars", unitName: "G", value: 7 },
      { nutrientName: "Added Sugars", unitName: "G", value: 5 },
    ],
    ...overrides,
  };
}

function offProduct(overrides = {}) {
  return {
    code: BARCODE,
    product_name: "Fallback Product",
    brands: "Fallback Brand",
    quantity: "300 g",
    serving_size: "30 g",
    serving_quantity: 30,
    serving_quantity_unit: "g",
    servings_per_container: 10,
    nutrition_data_per: "100g",
    last_modified_t: 1788436800,
    url: `https://world.openfoodfacts.org/product/${BARCODE}/fallback-product`,
    nutriments: {
      "energy-kcal_100g": 42,
      energy_100g: 999,
      proteins_100g: 4,
      carbohydrates_100g: 11,
      fat_100g: 2,
      fiber_100g: 0,
      sodium_100g: 0.12,
      sodium_unit: "g",
      sugars_100g: 3,
      "added-sugars_100g": 0,
    },
    ...overrides,
  };
}

function env(overrides = {}) {
  return {
    USDA_FDC_API_KEY: "test-usda-secret",
    OPEN_FOOD_FACTS_USER_AGENT: "Trace-tests/1.0 test-contact",
    ...overrides,
  };
}

test("rejects invalid barcodes before provider access", async () => {
  const fetchImpl = jest.fn();
  await expect(lookupRemoteBarcode({ barcode: "not-a-barcode", fetchImpl, env: env() }))
    .resolves.toEqual({ status: "invalid", identifier: null, food: null });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("selects the newest exact USDA branded revision and rejects fuzzy results", async () => {
  const fetchImpl = jest.fn().mockResolvedValue(upstream({
    foods: [
      usdaFood({ fdcId: 1, description: "Older", modifiedDate: "2025-01-01" }),
      usdaFood({ fdcId: 9, description: "Fuzzy", gtinUpc: OTHER_BARCODE, modifiedDate: "2027-01-01" }),
      usdaFood({ fdcId: 2, description: "Newest", modifiedDate: "2026-06-01" }),
      usdaFood({ fdcId: 3, dataType: "Foundation", modifiedDate: "2028-01-01" }),
    ],
  }));

  const result = await lookupRemoteBarcode({ barcode: BARCODE, fetchImpl, env: env(), now: () => NOW });
  expect(result).toMatchObject({
    status: "found",
    food: {
      name: "Newest",
      dataBasis: "serving",
      nutritionBasis: { kind: "derived-serving", sourceBasis: "100g" },
      provider: { id: "usda-fdc", recordId: "2" },
      provenance: {
        providerRecordId: "2",
        revisionDate: "2026-06-01T00:00:00.000Z",
        retrievedAt: "2026-09-03T12:00:00.000Z",
      },
    },
  });
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.food.nutrients)).toBe(true);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const [url, request] = fetchImpl.mock.calls[0];
  expect(url).toContain("api.nal.usda.gov/fdc/v1/foods/search");
  expect(request.method).toBe("POST");
  expect(JSON.parse(request.body)).toEqual({
    query: BARCODE,
    dataType: ["Branded"],
    pageSize: 50,
  });
});

test("USDA branded label nutrients win over conflicting per-100g nutrients", () => {
  const food = normalizeUsdaFood(usdaFood({
    householdServingFullText: "1 can (355 mL)",
    servingSize: 355,
    servingSizeUnit: "mL",
    labelNutrients: {
      calories: { value: 150 },
      protein: { value: 2 },
      carbohydrates: { value: 36 },
      fat: { value: 0 },
      fiber: { value: 0 },
      sodium: { value: 45 },
      sugars: { value: 34 },
      addedSugar: { value: 30 },
    },
  }), BARCODE, new Date(NOW).toISOString());

  expect(food).toMatchObject({
    dataBasis: "serving",
    serving: {
      description: "1 can (355 mL)",
      amount: 355,
      unit: "ml",
    },
    nutrients: {
      calories: 150,
      protein: 2,
      carbohydrates: 36,
      fat: 0,
      sodium: 45,
    },
    nutritionBasis: {
      kind: "provider-serving",
      source: "labelNutrients",
      sourceBasis: "serving",
    },
  });
});

test("uses Open Food Facts only as fallback and converts kcal and sodium without merging providers", async () => {
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce(upstream({ foods: [usdaFood({ gtinUpc: OTHER_BARCODE })] }))
    .mockResolvedValueOnce(upstream({ status: 1, product: offProduct() }));
  const result = await lookupRemoteBarcode({ barcode: BARCODE, fetchImpl, env: env(), now: () => NOW });

  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(result).toMatchObject({
    status: "found",
    food: {
      provider: { id: "open-food-facts", recordId: BARCODE },
      nutrients: { calories: 12.6, sodium: 36, fiber: 0, addedSugar: 0 },
      dataBasis: "serving",
      nutritionBasis: { kind: "derived-serving", sourceBasis: "100g" },
      provenance: {
        attribution: expect.stringContaining("ODbL"),
        sourceUrl: expect.stringContaining("openfoodfacts.org/product"),
      },
    },
  });
  expect(result.food).not.toHaveProperty("fdcId");
  expect(fetchImpl.mock.calls[1][1].headers["user-agent"])
    .toBe("Trace-tests/1.0 test-contact");
});

test("honors a published per-serving basis and preserves unknown values and explicit zero", () => {
  const food = normalizeOpenFoodFactsProduct(offProduct({
    nutrition_data_per: "serving",
    nutriments: {
      "energy-kcal_serving": 90,
      proteins_serving: 3,
      carbohydrates_serving: 12,
      fat_serving: 2,
      fiber_serving: 0,
      sodium_serving: 0,
      sodium_unit: "g",
      sugars_serving: 4,
    },
  }), BARCODE, new Date(NOW).toISOString());

  expect(food.dataBasis).toBe("serving");
  expect(food.nutrients).toMatchObject({ calories: 90, fiber: 0, sodium: 0 });
  expect(food.nutrients.addedSugar).toBeNull();
  expect(food.unknownFields).toContain("nutrients.addedSugar");
});

test("returns incomplete instead of log-ready when a core nutrient is unknown", async () => {
  const incomplete = usdaFood({
    foodNutrients: usdaFood().foodNutrients.filter(({ nutrientName }) => nutrientName !== "Total lipid (fat)"),
  });
  const fetchImpl = jest.fn().mockResolvedValueOnce(upstream({ foods: [incomplete] }));
  const result = await lookupRemoteBarcode({
    barcode: BARCODE,
    fetchImpl,
    env: env({ OPEN_FOOD_FACTS_USER_AGENT: "" }),
    now: () => NOW,
  });
  expect(result).toMatchObject({
    status: "incomplete",
    food: { completeness: "insufficient", logReady: false },
  });
  expect(result.food.nutrients.fat).toBeNull();
});

test("keeps malformed nutrients unknown without inventing zero", () => {
  const usda = normalizeUsdaFood(usdaFood({
    foodNutrients: usdaFood().foodNutrients.map((nutrient) =>
      nutrient.nutrientName === "Protein" ? { ...nutrient, value: -1 } : nutrient),
  }), BARCODE, new Date(NOW).toISOString());
  expect(usda.nutrients.protein).toBeNull();
  expect(usda.logReady).toBe(false);

  const off = normalizeOpenFoodFactsProduct(offProduct({
    nutriments: {
      ...offProduct().nutriments,
      sugars_100g: 2,
      "added-sugars_100g": 3,
    },
  }), BARCODE, new Date(NOW).toISOString());
  expect(off.nutrients.addedSugar).toBeNull();
  expect(off.nutrients.totalSugar).toBe(0.6);
});

test("USDA derives one declared gram serving from per-100g nutrients", () => {
  const food = normalizeUsdaFood(usdaFood(), BARCODE, new Date(NOW).toISOString());
  expect(food).toMatchObject({
    dataBasis: "serving",
    serving: { description: "1 cup (30 g)", amount: 30, unit: "g", grams: 30 },
    nutrients: { calories: 36, protein: 1.2, carbohydrates: 6, sodium: 45 },
    nutritionBasis: {
      kind: "derived-serving",
      source: "foodNutrients",
      sourceBasis: "100g",
      conversionFactor: 0.3,
    },
  });
  expect(food.nutrients.fat).toBeCloseTo(0.9, 12);
});

test("Open Food Facts direct serving nutrients win over conflicting per-100g values", () => {
  const food = normalizeOpenFoodFactsProduct(offProduct({
    nutriments: {
      ...offProduct().nutriments,
      "energy-kcal_serving": 210,
      proteins_serving: 9,
      carbohydrates_serving: 31,
      fat_serving: 6,
      sodium_serving: 0.4,
      sodium_serving_unit: "g",
    },
  }), BARCODE, new Date(NOW).toISOString());
  expect(food).toMatchObject({
    nutrients: { calories: 210, protein: 9, carbohydrates: 31, fat: 6, sodium: 400 },
    nutritionBasis: { kind: "provider-serving", source: "nutriments._serving" },
  });
});

test("Open Food Facts uses _value fields when nutrition_data_per declares serving", () => {
  const food = normalizeOpenFoodFactsProduct(offProduct({
    nutrition_data_per: "serving",
    nutriments: {
      "energy-kcal_value": 88,
      proteins_value: 4,
      carbohydrates_value: 10,
      fat_value: 3,
      fiber_value: 0,
      sodium_value: 125,
      sodium_value_unit: "mg",
      sugars_value: 0,
      "added-sugars_value": 0,
    },
  }), BARCODE, new Date(NOW).toISOString());
  expect(food).toMatchObject({
    nutrients: { calories: 88, protein: 4, sodium: 125, totalSugar: 0, addedSugar: 0 },
    nutritionBasis: { kind: "provider-serving", source: "nutriments._value" },
  });
});

test("allows volume-to-volume conversion from an explicit per-100mL basis", () => {
  const food = normalizeOpenFoodFactsProduct(offProduct({
    nutrition_data_per: "100ml",
    serving_size: "1 bottle (250 mL)",
    serving_quantity: 250,
    serving_quantity_unit: "mL",
    nutriments: {
      "energy-kcal_100ml": 40,
      proteins_100ml: 1.2,
      carbohydrates_100ml: 8,
      fat_100ml: 0,
      sodium_100ml: 0.02,
      sodium_unit: "g",
    },
  }), BARCODE, new Date(NOW).toISOString());
  expect(food).toMatchObject({
    nutrients: { calories: 100, protein: 3, carbohydrates: 20, fat: 0, sodium: 50 },
    nutritionBasis: { kind: "derived-serving", sourceBasis: "100ml", conversionFactor: 2.5 },
  });
});

test("rejects mass-to-volume conversion and missing, zero, or ambiguous serving metadata", () => {
  for (const overrides of [
    { serving_quantity: 250, serving_quantity_unit: "mL", serving_size: "1 bottle" },
    { serving_quantity: 0, serving_quantity_unit: "g", serving_size: "zero" },
    { serving_quantity: null, serving_quantity_unit: null, serving_size: null },
    { serving_quantity: "many", serving_quantity_unit: "g", serving_size: "some" },
    { serving_quantity: 2, serving_quantity_unit: "mystery", serving_size: "2 mystery" },
  ]) {
    const food = normalizeOpenFoodFactsProduct(offProduct(overrides), BARCODE, new Date(NOW).toISOString());
    expect(food.logReady).toBe(false);
    expect(food.nutritionBasis.kind).toBe("reference-only");
    expect(food.unknownFields).toContain("nutritionBasis.labeledServing");
    expect(normalizeRemoteFood(food)).not.toBeNull();
  }
});

test("accepts a genuine provider-declared 100 g serving", () => {
  const food = normalizeUsdaFood(usdaFood({
    servingSize: 100,
    servingSizeUnit: "g",
    householdServingFullText: "1 serving (100 g)",
  }), BARCODE, new Date(NOW).toISOString());
  expect(food.logReady).toBe(true);
  expect(food.serving.description).toBe("1 serving (100 g)");
  expect(food.nutritionBasis).toMatchObject({ kind: "derived-serving", conversionFactor: 1 });
});

test("uses whole-package values only when the package is explicitly one serving", () => {
  const packageNutriments = {
    "energy-kcal_value": 300,
    proteins_value: 10,
    carbohydrates_value: 40,
    fat_value: 8,
  };
  const oneServing = normalizeOpenFoodFactsProduct(offProduct({
    nutrition_data_per: "package",
    serving_size: null,
    serving_quantity: null,
    serving_quantity_unit: null,
    product_quantity: 355,
    product_quantity_unit: "mL",
    quantity: "355 mL bottle",
    servings_per_container: 1,
    nutriments: packageNutriments,
  }), BARCODE, new Date(NOW).toISOString());
  expect(oneServing).toMatchObject({
    logReady: true,
    serving: { description: "1 package (355 mL bottle)", amount: 1, unit: "package" },
    nutritionBasis: { kind: "provider-package" },
  });

  const multiServing = normalizeOpenFoodFactsProduct(offProduct({
    nutrition_data_per: "package",
    serving_size: null,
    serving_quantity: null,
    serving_quantity_unit: null,
    product_quantity: 355,
    product_quantity_unit: "mL",
    servings_per_container: 2,
    nutriments: packageNutriments,
  }), BARCODE, new Date(NOW).toISOString());
  expect(multiServing.logReady).toBe(false);
  expect(multiServing.nutritionBasis.kind).toBe("reference-only");
});

test("preserves explicit zero and null independently for every supported nutrient", () => {
  const food = normalizeUsdaFood(usdaFood({
    labelNutrients: {
      calories: { value: 0 },
      protein: { value: 0 },
      carbohydrates: { value: 0 },
      fat: { value: 0 },
      fiber: { value: 0 },
      sodium: { value: 0 },
      sugars: { value: 0 },
    },
  }), BARCODE, new Date(NOW).toISOString());
  expect(food.nutrients).toEqual({
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    totalSugar: 0,
    addedSugar: null,
  });
});

test("converts Open Food Facts kJ energy to kcal without using an energy-kJ value as kcal", () => {
  const food = normalizeOpenFoodFactsProduct(offProduct({
    nutrition_data_per: "serving",
    nutriments: {
      energy_serving: 418.4,
      energy_serving_unit: "kJ",
      proteins_serving: 2,
      carbohydrates_serving: 20,
      fat_serving: 1,
    },
  }), BARCODE, new Date(NOW).toISOString());
  expect(food.nutrients.calories).toBeCloseTo(100, 8);
});

test.each([
  [429, "rate-limited"],
  [503, "unavailable"],
])("normalizes provider %s and preserves Retry-After without retrying", async (status, expected) => {
  const fetchImpl = jest.fn().mockResolvedValue(upstream("", {
    status,
    responseHeaders: { "retry-after": "120" },
  }));
  const result = await lookupRemoteBarcode({
    barcode: BARCODE,
    fetchImpl,
    env: env({ OPEN_FOOD_FACTS_USER_AGENT: "" }),
  });
  expect(result).toMatchObject({ status: expected, retryAfter: "120" });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("handles timeout, malformed JSON, and oversized upstream bodies without throwing", async () => {
  const timeoutFetch = jest.fn((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), {
      name: "AbortError",
    })));
  }));
  await expect(lookupRemoteBarcode({
    barcode: BARCODE,
    fetchImpl: timeoutFetch,
    env: env({ OPEN_FOOD_FACTS_USER_AGENT: "" }),
    timeoutMs: 1,
  })).resolves.toMatchObject({ status: "unavailable" });

  for (const response of [
    upstream("{bad-json"),
    upstream("{}", { responseHeaders: { "content-length": MAX_PROVIDER_RESPONSE_BYTES + 1 } }),
  ]) {
    const fetchImpl = jest.fn().mockResolvedValue(response);
    await expect(lookupRemoteBarcode({
      barcode: BARCODE,
      fetchImpl,
      env: env({ OPEN_FOOD_FACTS_USER_AGENT: "" }),
    })).resolves.toMatchObject({ status: "unavailable" });
  }
});

test("missing provider configuration is safe and returned data never contains credentials", async () => {
  const unconfigured = await lookupRemoteBarcode({ barcode: BARCODE, fetchImpl: jest.fn(), env: {} });
  expect(unconfigured).toMatchObject({ status: "unconfigured" });

  const secret = "never-return-this-secret";
  const userAgent = "never-return-this-contact";
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const fetchImpl = jest.fn().mockResolvedValue(upstream({ foods: [usdaFood()] }));
  const found = await lookupRemoteBarcode({
    barcode: BARCODE,
    fetchImpl,
    env: { USDA_FDC_API_KEY: secret, OPEN_FOOD_FACTS_USER_AGENT: userAgent },
    now: () => NOW,
  });
  expect(JSON.stringify(found)).not.toContain(secret);
  expect(JSON.stringify(found)).not.toContain(userAgent);
  expect(log).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
  log.mockRestore();
  warn.mockRestore();
  error.mockRestore();
});

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = body; },
  };
}

test("the Vercel handler is POST-only, body-bounded, schema-limited, and security-headered", async () => {
  const lookup = jest.fn().mockResolvedValue({
    status: "not-found",
    identifier: { scheme: "gtin", value: BARCODE },
    food: null,
  });
  const handler = createHandler({ lookup });

  const methodResponse = responseRecorder();
  await handler({ method: "GET", headers: {} }, methodResponse);
  expect(methodResponse.statusCode).toBe(405);
  expect(methodResponse.headers.allow).toBe("POST");

  const oversizedResponse = responseRecorder();
  await handler({
    method: "POST",
    headers: { "content-type": "application/json", "content-length": String(MAX_REQUEST_BYTES + 1) },
    body: { barcode: BARCODE },
  }, oversizedResponse);
  expect(oversizedResponse.statusCode).toBe(413);

  const extraFieldResponse = responseRecorder();
  await handler({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { barcode: BARCODE, url: "https://example.com/proxy" },
  }, extraFieldResponse);
  expect(extraFieldResponse.statusCode).toBe(400);
  expect(lookup).not.toHaveBeenCalled();

  const malformedResponse = responseRecorder();
  await handler({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{bad-json",
  }, malformedResponse);
  expect(malformedResponse.statusCode).toBe(400);

  const validResponse = responseRecorder();
  await handler({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { barcode: BARCODE },
  }, validResponse);
  expect(validResponse.statusCode).toBe(200);
  expect(lookup).toHaveBeenCalledWith({ barcode: BARCODE });
  expect(validResponse.headers).toMatchObject({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
});

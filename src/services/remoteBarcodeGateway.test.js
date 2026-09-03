const {
  MAX_PROVIDER_RESPONSE_BYTES,
  MAX_REQUEST_BYTES,
  createHandler,
  lookupRemoteBarcode,
  normalizeOpenFoodFactsProduct,
  normalizeUsdaFood,
} = require("../../api/nutrition/_barcodeGateway.cjs");

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
      dataBasis: "100g",
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
      nutrients: { calories: 42, sodium: 120, fiber: 0, addedSugar: 0 },
      dataBasis: "100g",
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

test("rejects negative nutrients and added sugar above total sugar", () => {
  expect(normalizeUsdaFood(usdaFood({
    foodNutrients: usdaFood().foodNutrients.map((nutrient) =>
      nutrient.nutrientName === "Protein" ? { ...nutrient, value: -1 } : nutrient),
  }), BARCODE, new Date(NOW).toISOString())).toBeNull();
  expect(normalizeOpenFoodFactsProduct(offProduct({
    nutriments: {
      ...offProduct().nutriments,
      sugars_100g: 2,
      "added-sugars_100g": 3,
    },
  }), BARCODE, new Date(NOW).toISOString())).toBeNull();
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

import starterFoods from "../data/starterFoods";
import beverageFoods from "../data/beverageFoods";
import restaurantFoods from "../data/restaurantFoods";
import brandedPackagedFoods from "./brandedPackagedFoodCatalog";
import groceryFoods from "./groceryFoodCatalog";
import { normalizeBeverageFoods } from "./beverageFoodModel";
import { lookupCatalogFoodByBarcode } from "./barcodeFoodLookup";
import { normalizeRestaurantFoods } from "./restaurantFoodModel";
import { createRemoteBarcodeCache } from "./remoteBarcodeCache";
import {
  REMOTE_BARCODE_ENDPOINT,
  createRemoteBarcodeLookup,
} from "./remoteBarcodeLookup";

const BARCODE = "00000000000000";
const { normalizeOpenFoodFactsProduct, normalizeUsdaFood } = require("../../api/nutrition/_barcodeGateway.cjs");
const { offRecord, usdaRecord, RETRIEVED_AT } = require("./__fixtures__/nutritionAssessmentInputs.cjs");

// These existing provider-schema fixtures are synthetic, not coverage evidence.
function assessedResult(provider = "usda", barcode = BARCODE) {
  const food = provider === "off"
    ? normalizeOpenFoodFactsProduct(offRecord({ code: barcode }), barcode, RETRIEVED_AT)
    : normalizeUsdaFood(usdaRecord({ gtinUpc: barcode }), barcode, RETRIEVED_AT);
  return JSON.parse(JSON.stringify({ status: "found", identifier: { scheme: "gtin", value: barcode }, food }));
}

function remoteResult(barcode = BARCODE) {
  return {
    status: "found",
    identifier: { scheme: "gtin", value: barcode },
    food: {
      sourceType: "remote-barcode",
      dataType: "branded",
      identifiers: [{ scheme: "gtin", value: barcode }],
      provider: { id: "usda-fdc", recordId: "123", attribution: "USDA FoodData Central" },
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
        kind: "provider-serving",
        source: "labelNutrients",
        sourceBasis: "serving",
        sourceQuantity: { amount: 1, unit: "serving", dimension: null },
        servingQuantity: { amount: 30, unit: "g", dimension: "mass" },
        conversionFactor: null,
        sourceNutrients: {
          calories: 100,
          protein: 4,
          carbohydrates: 12,
          fat: 3,
          sodium: 0,
          fiber: 2,
          totalSugar: 5,
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
    },
  };
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem: jest.fn((key) => data.get(key) ?? null),
    setItem: jest.fn((key, value) => data.set(key, value)),
  };
}

function gatewayResponse(payload) {
  const body = JSON.stringify(payload);
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => name.toLowerCase() === "content-length" ? String(body.length) : null },
    text: jest.fn().mockResolvedValue(body),
  };
}

test("ingredient text and attribution survive browser lookup and a new offline cache reader", async () => {
  const result = remoteResult();
  result.food.ingredients = { text: " Leche, cacao.\n ", language: "es" };
  const storage = memoryStorage();
  const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(result));
  const options = {
    storage, fetchImpl, clock: () => 1000,
    localLookup: () => ({ status: "not-found", food: null }),
  };
  const service = createRemoteBarcodeLookup({ ...options, runtime: { isWeb: true, isOnline: true } });
  const found = await service.lookup(BARCODE);
  expect(found.food.ingredients).toEqual(result.food.ingredients);
  expect(found.food.provider).toEqual(result.food.provider);
  expect(found.food.provenance).toEqual(result.food.provenance);
  const offline = createRemoteBarcodeLookup({ ...options, runtime: { isWeb: true, isOnline: false } });
  const cached = await offline.lookup(BARCODE);
  expect(cached.food).toEqual(found.food);
  expect(cached.cache.hit).toBe(true);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("invalid input performs no local, storage, or network activity", async () => {
  const storage = memoryStorage();
  const fetchImpl = jest.fn();
  const localLookup = jest.fn();
  const userLookup = jest.fn();
  const service = createRemoteBarcodeLookup({ storage, fetchImpl, localLookup, userLookup });

  await expect(service.lookup("invalid")).resolves.toEqual({
    status: "invalid",
    identifier: null,
    food: null,
  });
  expect(localLookup).not.toHaveBeenCalled();
  expect(userLookup).not.toHaveBeenCalled();
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("a verified local hit returns without cache or remote access", async () => {
  const storage = memoryStorage();
  const fetchImpl = jest.fn();
  const localFood = { id: "local:test", name: "Local" };
  const service = createRemoteBarcodeLookup({
    storage,
    fetchImpl,
    localLookup: jest.fn(() => ({
      status: "found",
      identifier: { scheme: "gtin", value: "012000001291" },
      food: localFood,
    })),
  });

  const result = await service.lookup("012000001291");
  expect(result).toMatchObject({ status: "found", source: "local", food: localFood });
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(Object.isFrozen(result.food)).toBe(true);
});

test("verified Trace catalog precedence remains above a matching custom barcode food", async () => {
  const customLookup = jest.fn(() => ({
    status: "found",
    identifier: { scheme: "gtin", value: "012000001291" },
    food: { id: "user-added:barcode", name: "Custom" },
  }));
  const service = createRemoteBarcodeLookup({
    storage: memoryStorage(),
    fetchImpl: jest.fn(),
    localLookup: () => ({
      status: "found",
      identifier: { scheme: "gtin", value: "012000001291" },
      food: { id: "verified", name: "Verified" },
    }),
    userLookup: customLookup,
  });
  await expect(service.lookup("012000001291"))
    .resolves.toMatchObject({ source: "local", food: { id: "verified" } });
  expect(customLookup).not.toHaveBeenCalled();
});

test("a custom barcode food wins over cache and gateway access", async () => {
  const storage = memoryStorage();
  createRemoteBarcodeCache({ storage, clock: () => 1000 })
    .set("012000001291", remoteResult("012000001291"));
  const fetchImpl = jest.fn();
  const customFood = { id: "user-added:barcode", name: "Custom" };
  const service = createRemoteBarcodeLookup({
    storage,
    clock: () => 1000,
    fetchImpl,
    localLookup: () => ({ status: "not-found", identifier: null, food: null }),
    userLookup: () => ({
      status: "found",
      identifier: { scheme: "gtin", value: "012000001291" },
      food: customFood,
    }),
  });
  await expect(service.lookup("00012000001291"))
    .resolves.toMatchObject({ source: "user", food: customFood });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("deleting a custom match restores the existing remote fallback path", async () => {
  let customFood = { id: "user-added:barcode", name: "Custom" };
  const storage = memoryStorage();
  createRemoteBarcodeCache({ storage, clock: () => 1000 })
    .set("012000001291", remoteResult("012000001291"));
  const service = createRemoteBarcodeLookup({
    storage,
    clock: () => 1000,
    fetchImpl: jest.fn(),
    localLookup: () => ({ status: "not-found", identifier: null, food: null }),
    userLookup: () => customFood
      ? { status: "found", identifier: { scheme: "gtin", value: "012000001291" }, food: customFood }
      : { status: "not-found", identifier: { scheme: "gtin", value: "012000001291" }, food: null },
  });
  await expect(service.lookup("012000001291"))
    .resolves.toMatchObject({ source: "user" });
  customFood = null;
  await expect(service.lookup("012000001291"))
    .resolves.toMatchObject({ cache: { hit: true }, food: { name: "Test Product" } });
});

test("a fresh canonical cache hit avoids the gateway", async () => {
  const storage = memoryStorage();
  const clock = () => 1000;
  createRemoteBarcodeCache({ storage, clock })
    .set("012000001291", assessedResult("usda", "012000001291"));
  const fetchImpl = jest.fn();
  const service = createRemoteBarcodeLookup({
    storage,
    clock,
    fetchImpl,
    localLookup: () => ({ status: "not-found", identifier: null, food: null }),
    runtime: () => ({ isWeb: true, isOnline: true }),
  });

  await expect(service.lookup("00012000001291"))
    .resolves.toMatchObject({ status: "found", cache: { hit: true, stale: false } });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test.each(["absent", "null"])("an online web lookup refreshes %s legacy assessment evidence once", async state => {
  const storage = memoryStorage(), clock = () => 1000;
  const fresh = assessedResult(), legacy = JSON.parse(JSON.stringify(fresh));
  if (state === "absent") delete legacy.food.assessmentInputs;
  else legacy.food.assessmentInputs = null;
  createRemoteBarcodeCache({ storage, clock }).set(BARCODE, legacy);
  const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(fresh));
  const service = createRemoteBarcodeLookup({ storage, clock, fetchImpl,
    localLookup: () => ({ status: "not-found" }), runtime: { isWeb: true, isOnline: true } });
  expect((await service.lookup(BARCODE)).food.assessmentInputs).toEqual(fresh.food.assessmentInputs);
  expect((await service.lookup(BARCODE)).food.assessmentInputs).toEqual(fresh.food.assessmentInputs);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(legacy.food.assessmentInputs).toBe(state === "absent" ? undefined : null);
});

test.each([
  { isWeb: true, isOnline: false }, { isWeb: false, isOnline: true }, { isOnline: true },
])("legacy cached reads stay unchanged outside online web lookup: %j", async runtime => {
  const storage = memoryStorage(), clock = () => 1000, legacy = remoteResult();
  createRemoteBarcodeCache({ storage, clock }).set(BARCODE, legacy);
  const fetchImpl = jest.fn();
  const service = createRemoteBarcodeLookup({ storage, clock, fetchImpl,
    localLookup: () => ({ status: "not-found" }), runtime });
  expect((await service.lookup(BARCODE)).food).toEqual(legacy.food);
  expect(fetchImpl).not.toHaveBeenCalled();
});

test.each(["unavailable", "not-found", "malformed", "network"])("a failed legacy refresh (%s) retains usable cached food without repeated requests", async failure => {
  const storage = memoryStorage(), clock = () => 1000, legacy = remoteResult();
  createRemoteBarcodeCache({ storage, clock }).set(BARCODE, legacy);
  const fetchImpl = failure === "network" ? jest.fn().mockRejectedValue(new Error("Synthetic offline failure"))
    : jest.fn().mockResolvedValue(gatewayResponse(failure === "malformed" ? {} : {
      status: failure, identifier: { scheme: "gtin", value: BARCODE }, food: null }));
  const service = createRemoteBarcodeLookup({ storage, clock, fetchImpl,
    localLookup: () => ({ status: "not-found" }), runtime: { isWeb: true, isOnline: true } });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    expect(await service.lookup(BARCODE)).toMatchObject({ status: "found", cache: { hit: true }, food: legacy.food });
  }
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(createRemoteBarcodeCache({ storage, clock }).get(BARCODE).food).toEqual(legacy.food);
});

test("canonical legacy refreshes share an in-flight request and do not repeat if evidence remains absent", async () => {
  const storage = memoryStorage(), clock = () => 1000;
  const barcode = "012000001291", legacy = remoteResult(barcode);
  createRemoteBarcodeCache({ storage, clock }).set(barcode, legacy);
  let resolveFetch;
  const fetchImpl = jest.fn(() => new Promise(resolve => { resolveFetch = resolve; }));
  const service = createRemoteBarcodeLookup({ storage, clock, fetchImpl,
    localLookup: () => ({ status: "not-found" }), runtime: { isWeb: true, isOnline: true } });
  const first = service.lookup(barcode), second = service.lookup("00012000001291");
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  resolveFetch(gatewayResponse(legacy));
  const [a, b] = await Promise.all([first, second]);
  expect(a).toEqual(b);
  expect((await service.lookup(barcode)).food).toEqual(legacy.food);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test.each(["off-unknown", "off-volume", "usda-unknown", "usda-unit"])("cached evidence affected by a known normalization gap refreshes: %s", async gap => {
  const storage = memoryStorage(), clock = () => 1000;
  const off = gap.startsWith("off"), fresh = assessedResult(off ? "off" : "usda");
  const legacy = JSON.parse(JSON.stringify(fresh)), input = legacy.food.assessmentInputs;
  if (off) {
    const reference = input.datasets.find(dataset => dataset.id === "off-100g");
    reference.basis = gap === "off-unknown" ? "unknown" : "100g";
    reference.quantity = gap === "off-unknown" ? null : { amount: 100, unit: "g" };
    input.serving.find(entry => entry.field === "serving_quantity_unit").value = "ml";
    input.serving.find(entry => entry.field === "serving_size").value = "30 ml";
  } else if (gap === "usda-unknown") {
    const reference = input.datasets.find(dataset => dataset.id === "usda-reference");
    reference.basis = "unknown"; reference.quantity = null;
  } else {
    input.serving.find(entry => entry.field === "servingSizeUnit").value = "GRM";
    input.datasets.find(dataset => dataset.id === "usda-label-serving").quantity.unit = "GRM";
  }
  createRemoteBarcodeCache({ storage, clock }).set(BARCODE, legacy);
  const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(fresh));
  const service = createRemoteBarcodeLookup({ storage, clock, fetchImpl,
    localLookup: () => ({ status: "not-found" }), runtime: { isWeb: true, isOnline: true } });
  expect((await service.lookup(BARCODE)).food.assessmentInputs).toEqual(fresh.food.assessmentInputs);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test.each(["printed-conflict", "package-conflict", "unknown-unit", "missing-nutrient"])("unresolved source evidence does not trigger a normalization refresh: %s", async condition => {
  const storage = memoryStorage(), clock = () => 1000, cached = assessedResult("off");
  const input = cached.food.assessmentInputs;
  if (condition === "missing-nutrient") {
    input.datasets.forEach(dataset => { dataset.observations = dataset.observations.filter(entry => entry.nutrient !== "sodium"); });
  } else {
    const reference = input.datasets.find(dataset => dataset.id === "off-100g");
    reference.basis = "unknown"; reference.quantity = null;
    input.serving.find(entry => entry.field === "serving_quantity_unit").value = condition === "unknown-unit" ? "cup" : "ml";
    if (condition === "package-conflict") {
      input.serving.find(entry => entry.field === "serving_size").value = "30 ml";
      input.serving.push({ field: "product_quantity_unit", value: "g" });
    }
  }
  createRemoteBarcodeCache({ storage, clock }).set(BARCODE, cached);
  const fetchImpl = jest.fn();
  const service = createRemoteBarcodeLookup({ storage, clock, fetchImpl,
    localLookup: () => ({ status: "not-found" }), runtime: { isWeb: true, isOnline: true } });
  expect((await service.lookup(BARCODE)).food.assessmentInputs).toEqual(input);
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("an archived real provider wrapper can refresh legacy memory cache without modifying original observations or saved entries", async () => {
  const archive = require("../../docs/barcode-grading-grocery-pilot-2026-10-20/results.json");
  const original = JSON.stringify(archive);
  const fresh = archive.observations.find(row => row.barcode === "00884912180056").lookup;
  const legacy = JSON.parse(JSON.stringify(fresh)); delete legacy.food.assessmentInputs;
  const storage = memoryStorage(), clock = () => 1000;
  const history = JSON.stringify([{ id: "synthetic-historical-entry", sodium: 0.22 }]);
  storage.setItem("nutritionEntries", history);
  createRemoteBarcodeCache({ storage, clock }).set(fresh.identifier.value, legacy);
  const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(fresh));
  const service = createRemoteBarcodeLookup({ storage, clock, fetchImpl,
    localLookup: () => ({ status: "not-found" }), runtime: { isWeb: true, isOnline: true } });
  expect((await service.lookup(fresh.identifier.value)).food.assessmentInputs).toEqual(fresh.food.assessmentInputs);
  expect(storage.getItem("nutritionEntries")).toBe(history);
  expect(storage.setItem.mock.calls.filter(([key]) => key !== "remoteBarcodeFoodResponses"))
    .toEqual([["nutritionEntries", history]]);
  expect(JSON.stringify(archive)).toBe(original);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("offline lookup may return an otherwise valid expired entry only as stale", async () => {
  let now = 1000;
  const storage = memoryStorage();
  createRemoteBarcodeCache({ storage, clock: () => now, ttlMs: 100 })
    .set(BARCODE, remoteResult());
  now = 1100;
  const fetchImpl = jest.fn();
  const service = createRemoteBarcodeLookup({
    storage,
    clock: () => now,
    fetchImpl,
    localLookup: () => ({ status: "not-found", identifier: null, food: null }),
    runtime: () => ({ isWeb: true, isOnline: false }),
  });

  await expect(service.lookup(BARCODE))
    .resolves.toMatchObject({ status: "found", stale: true, cache: { stale: true } });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("offline cache miss returns offline without network access", async () => {
  const fetchImpl = jest.fn();
  const service = createRemoteBarcodeLookup({
    storage: memoryStorage(),
    fetchImpl,
    localLookup: () => ({ status: "not-found", identifier: null, food: null }),
    runtime: { isWeb: true, isOnline: false },
  });
  await expect(service.lookup(BARCODE)).resolves.toMatchObject({ status: "offline" });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("same canonical barcode shares one in-flight same-origin request", async () => {
  let resolveFetch;
  const fetchImpl = jest.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));
  const service = createRemoteBarcodeLookup({
    storage: memoryStorage(),
    fetchImpl,
    localLookup: () => ({ status: "not-found", identifier: null, food: null }),
    runtime: () => ({ isWeb: true, isOnline: true }),
  });

  const first = service.lookup("012000001291");
  const second = service.lookup("00012000001291");
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl.mock.calls[0][0]).toBe(REMOTE_BARCODE_ENDPOINT);
  expect(fetchImpl.mock.calls[0][1]).toMatchObject({
    method: "POST",
    credentials: "same-origin",
    body: JSON.stringify({ barcode: "012000001291" }),
  });
  resolveFetch(gatewayResponse(remoteResult("012000001291")));
  await expect(Promise.all([first, second])).resolves.toEqual([
    expect.objectContaining({ status: "found" }),
    expect.objectContaining({ status: "found" }),
  ]);
});

test("creating the service performs no startup request or storage read", () => {
  const storage = memoryStorage();
  const fetchImpl = jest.fn();
  createRemoteBarcodeLookup({ storage, fetchImpl });
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(storage.getItem).not.toHaveBeenCalled();
});

test("the default browser fetch preserves its window binding", async () => {
  const originalFetch = window.fetch;
  let fetchContext;
  const fetchImpl = jest.fn(function browserFetch() {
    fetchContext = this;
    return Promise.resolve(gatewayResponse({
      status: "not-found",
      identifier: { scheme: "gtin", value: BARCODE },
      food: null,
    }));
  });
  window.fetch = fetchImpl;
  try {
    const service = createRemoteBarcodeLookup({
      storage: memoryStorage(),
      localLookup: () => ({ status: "not-found", identifier: null, food: null }),
      runtime: () => ({ isWeb: true, isOnline: true }),
    });
    await expect(service.lookup(BARCODE)).resolves.toMatchObject({ status: "not-found" });
    expect(fetchImpl).toHaveBeenCalledWith(REMOTE_BARCODE_ENDPOINT, expect.any(Object));
    expect(fetchContext).toBe(window);
  } finally {
    window.fetch = originalFetch;
  }
});

test("the default browser fetch fails safely when fetch is missing", async () => {
  const originalFetch = window.fetch;
  window.fetch = undefined;
  try {
    const service = createRemoteBarcodeLookup({
      storage: memoryStorage(),
      localLookup: () => ({ status: "not-found", identifier: null, food: null }),
      runtime: () => ({ isWeb: true, isOnline: true }),
    });
    await expect(service.lookup(BARCODE)).resolves.toMatchObject({ status: "unavailable" });
  } finally {
    window.fetch = originalFetch;
  }
});

test("endpoint injection remains constrained to a same-origin path", async () => {
  const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse({
    status: "not-found",
    identifier: { scheme: "gtin", value: BARCODE },
    food: null,
  }));
  const service = createRemoteBarcodeLookup({
    storage: memoryStorage(),
    fetchImpl,
    endpoint: "https://untrusted.example/proxy",
    localLookup: () => ({ status: "not-found", identifier: null, food: null }),
    runtime: () => ({ isWeb: true, isOnline: true }),
  });
  await service.lookup(BARCODE);
  expect(fetchImpl).toHaveBeenCalledWith(REMOTE_BARCODE_ENDPOINT, expect.any(Object));
});

test("malformed and oversized gateway responses fail closed", async () => {
  for (const response of [
    { headers: { get: () => null }, text: jest.fn().mockResolvedValue("{bad") },
    { headers: { get: () => String(70 * 1024) }, text: jest.fn() },
  ]) {
    const service = createRemoteBarcodeLookup({
      storage: memoryStorage(),
      fetchImpl: jest.fn().mockResolvedValue(response),
      localLookup: () => ({ status: "not-found", identifier: null, food: null }),
      runtime: () => ({ isWeb: true, isOnline: true }),
    });
    await expect(service.lookup(BARCODE)).resolves.toMatchObject({ status: "unavailable" });
  }
});

test("all 134 existing verified local barcode records still resolve locally", () => {
  const foods = [
    ...groceryFoods,
    ...brandedPackagedFoods,
    ...starterFoods,
    ...normalizeBeverageFoods(beverageFoods),
    ...normalizeRestaurantFoods(restaurantFoods),
  ].filter((food) => food.identifiers?.length);
  expect(foods).toHaveLength(134);
  foods.forEach((food) => {
    food.identifiers.forEach(({ value }) => {
      expect(lookupCatalogFoodByBarcode(value)).toMatchObject({
        status: "found",
        food: { id: food.id },
      });
    });
  });
});

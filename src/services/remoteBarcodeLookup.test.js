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
      dataBasis: "100g",
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

test("invalid input performs no local, storage, or network activity", async () => {
  const storage = memoryStorage();
  const fetchImpl = jest.fn();
  const localLookup = jest.fn();
  const service = createRemoteBarcodeLookup({ storage, fetchImpl, localLookup });

  await expect(service.lookup("invalid")).resolves.toEqual({
    status: "invalid",
    identifier: null,
    food: null,
  });
  expect(localLookup).not.toHaveBeenCalled();
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

test("a fresh canonical cache hit avoids the gateway", async () => {
  const storage = memoryStorage();
  const clock = () => 1000;
  createRemoteBarcodeCache({ storage, clock })
    .set("012000001291", remoteResult("012000001291"));
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

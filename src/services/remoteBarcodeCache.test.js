import {
  REMOTE_BARCODE_CACHE_MAX_RECORDS,
  REMOTE_BARCODE_CACHE_STORAGE_KEY,
  REMOTE_BARCODE_CACHE_TTL_MS,
  REMOTE_BARCODE_CACHE_VERSION,
  createRemoteBarcodeCache,
} from "./remoteBarcodeCache";

function remoteResult(barcode = "00000000000000") {
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

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key) => data.get(key) ?? null),
    setItem: jest.fn((key, value) => data.set(key, value)),
    value(key = REMOTE_BARCODE_CACHE_STORAGE_KEY) { return data.get(key); },
  };
}

test("uses a versioned 30-day cache capped at 500 records", () => {
  expect(REMOTE_BARCODE_CACHE_VERSION).toBe(1);
  expect(REMOTE_BARCODE_CACHE_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  expect(REMOTE_BARCODE_CACHE_MAX_RECORDS).toBe(500);
});

test("canonicalizes UPC and GTIN forms and returns immutable fresh entries", () => {
  const storage = memoryStorage();
  const cache = createRemoteBarcodeCache({ storage, clock: () => 1000 });
  expect(cache.set("012000001291", remoteResult("012000001291"))).toBe(true);

  const cached = cache.get("00012000001291");
  expect(cached).toMatchObject({ status: "found", stale: false, cache: { hit: true, stale: false } });
  expect(Object.isFrozen(cached)).toBe(true);
  expect(Object.isFrozen(cached.food.nutrients)).toBe(true);
});

test("ignores expired entries unless explicitly requested for offline stale use", () => {
  let now = 1000;
  const storage = memoryStorage();
  const cache = createRemoteBarcodeCache({ storage, clock: () => now, ttlMs: 100 });
  cache.set("00000000000000", remoteResult());
  now = 1100;

  expect(cache.get("00000000000000")).toBeNull();
  expect(cache.get("00000000000000", { allowExpired: true }))
    .toMatchObject({ status: "found", stale: true, cache: { hit: true, stale: true } });
});

test("evicts the least recently used record at the configured bound", () => {
  let now = 1;
  const storage = memoryStorage();
  const cache = createRemoteBarcodeCache({ storage, clock: () => now, maxRecords: 2 });
  const first = "00000000000000";
  const second = "00052000324815";
  const third = "00012000016721";
  cache.set(first, remoteResult(first));
  now += 1;
  cache.set(second, remoteResult(second));
  now += 1;
  cache.get(first);
  now += 1;
  cache.set(third, remoteResult(third));

  expect(cache.get(first)).not.toBeNull();
  expect(cache.get(second)).toBeNull();
  expect(cache.get(third)).not.toBeNull();
  expect(JSON.parse(storage.value()).records).toHaveLength(2);
});

test.each([
  ["corrupt JSON", "{not-json"],
  ["future schema", JSON.stringify({ version: 99, records: [] })],
  ["malformed record", JSON.stringify({ version: 1, records: [{ key: "bad" }] })],
])("ignores %s safely", (label, stored) => {
  const storage = memoryStorage({ [REMOTE_BARCODE_CACHE_STORAGE_KEY]: stored });
  const cache = createRemoteBarcodeCache({ storage, clock: () => 1000 });
  expect(cache.get("00000000000000", { allowExpired: true })).toBeNull();
});

test("does not persist failed lookups or payloads outside the normalized schema", () => {
  const storage = memoryStorage();
  const cache = createRemoteBarcodeCache({ storage, clock: () => 1000 });
  expect(cache.set("00000000000000", {
    status: "unavailable",
    identifier: { scheme: "gtin", value: "00000000000000" },
    food: null,
  })).toBe(false);
  expect(storage.setItem).not.toHaveBeenCalled();
});

import { normalizeRemoteFood } from "./remoteFoodModel";
import { createRemoteBarcodeCache, REMOTE_BARCODE_CACHE_STORAGE_KEY, REMOTE_BARCODE_CACHE_VERSION } from "./remoteBarcodeCache";
import { createRemoteBarcodeLookup } from "./remoteBarcodeLookup";
import { createBarcodeNutritionCandidate } from "./barcodeNutritionSelection";
import { createUserFood, writeUserFoods, readUserFoods, USER_FOODS_STORAGE_KEY } from "./userFoodCatalog";
import { appendNutritionEntry, readNutritionEntries, NUTRITION_ENTRIES_STORAGE_KEY } from "./nutritionEntryStorage";
import { getAdditiveNameSource } from "./additiveNameReference";
import { REMOTE_BARCODE_RESPONSE_MAX_BYTES } from "./remoteBarcodeLookup";

const { normalizeOpenFoodFactsProduct } = require("../../api/nutrition/_barcodeGateway.cjs");
const BARCODE = "00012345600012";
const NOW = Date.parse("2026-10-19T12:00:00Z");

function result(tags) {
  const food = normalizeOpenFoodFactsProduct({
    code: BARCODE, product_name: "Synthetic food", brands: "Example",
    ingredients_text: "Milk, citric acid", lang: "en", additives_tags: tags,
    serving_size: "100 g", serving_quantity: 100, serving_quantity_unit: "g",
    nutrition_data_per: "serving",
    nutriments: { "energy-kcal_serving": 100, proteins_serving: 3, carbohydrates_serving: 10, fat_serving: 2 },
  }, BARCODE, new Date(NOW).toISOString());
  return { status: "found", identifier: { scheme: "gtin", value: BARCODE }, food };
}

beforeEach(() => localStorage.clear());

test.each([undefined, [], ["en:e330", "en:unknown-tag"]])(
  "provider metadata survives browser normalization, cache, offline lookup, and selection: %p", async (tags) => {
    const original = result(tags);
    const normalized = normalizeRemoteFood(original.food);
    expect(normalized.additives).toEqual(original.food.additives);
    const cache = createRemoteBarcodeCache({ storage: localStorage, clock: () => NOW });
    expect(cache.set(BARCODE, original)).toBe(true);
    const fetchImpl = jest.fn();
    const lookup = createRemoteBarcodeLookup({
      storage: localStorage, clock: () => NOW, runtime: { isWeb: true, isOnline: false },
      localLookup: () => ({ status: "not-found", food: null }), fetchImpl,
    });
    const cached = await lookup.lookup(BARCODE);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(cached.food.additives).toEqual(original.food.additives);
    const candidate = createBarcodeNutritionCandidate(cached);
    expect(candidate.canUse).toBe(true);
    expect(candidate.display.additives).toEqual(original.food.additives);
    expect(candidate.selection.additives).toEqual(original.food.additives);
    expect(candidate.selection.remote.additives).toEqual(original.food.additives);
    expect(candidate.display.attribution).toBe(original.food.provenance.attribution);
    expect(candidate.selection.nutrients).toEqual(original.food.nutrients);
    expect(candidate.selection.remote.nutritionBasis).toEqual(original.food.nutritionBasis);
    expect(candidate.display.ingredients).toEqual(original.food.ingredients);
  }
);

test("selection distinguishes the name-reference source from provider-reported product presence", () => {
  const candidate = createBarcodeNutritionCandidate(result(["en:e330", "en:unknown-tag"]));
  const [known, unknown] = candidate.selection.remote.additives.items;
  expect(known).toMatchObject({ name: "Citric acid", identification: "provider-reported", source: "open-food-facts" });
  expect(known.nameReference).toMatchObject({ jurisdiction: "EU", verification: "exact-source-name" });
  expect(getAdditiveNameSource(known.nameReference).attribution).toContain("European Union");
  expect(unknown).toMatchObject({ name: null, nameReference: null });
});

test("legacy v2 cache records retain absence without a schema change or invented data", () => {
  const legacy = JSON.parse(JSON.stringify(result(undefined)));
  delete legacy.food.additives;
  const cache = createRemoteBarcodeCache({ storage: localStorage, clock: () => NOW });
  expect(cache.set(BARCODE, legacy)).toBe(true);
  const raw = localStorage.getItem(REMOTE_BARCODE_CACHE_STORAGE_KEY);
  expect(JSON.parse(raw).version).toBe(2);
  expect(REMOTE_BARCODE_CACHE_VERSION).toBe(2);
  const reopened = createRemoteBarcodeCache({ storage: localStorage, clock: () => NOW });
  expect(localStorage.getItem(REMOTE_BARCODE_CACHE_STORAGE_KEY)).toBe(raw);
  expect(reopened.get(BARCODE).food).not.toHaveProperty("additives");
  expect(createBarcodeNutritionCandidate(reopened.get(BARCODE)).selection.remote).not.toHaveProperty("additives");
});

test("pre-reference v2 cache items resolve locally without requiring a refresh or changing status", async () => {
  const original = result(["en:e330"]);
  const cache = createRemoteBarcodeCache({ storage: localStorage, clock: () => NOW });
  cache.set(BARCODE, original);
  const legacyCache = JSON.parse(localStorage.getItem(REMOTE_BARCODE_CACHE_STORAGE_KEY));
  const item = legacyCache.records[0].result.food.additives.items[0];
  item.name = null;
  delete item.nameReference;
  localStorage.setItem(REMOTE_BARCODE_CACHE_STORAGE_KEY, JSON.stringify(legacyCache));
  const fetchImpl = jest.fn();
  const lookup = createRemoteBarcodeLookup({ storage: localStorage, clock: () => NOW,
    runtime: { isOnline: false, isWeb: true }, localLookup: () => ({ status: "not-found" }), fetchImpl });
  const cached = await lookup.lookup(BARCODE);
  expect(cached.food.additives).toEqual(original.food.additives);
  expect(cached.food.provenance).toEqual(original.food.provenance);
  expect(fetchImpl).not.toHaveBeenCalled();
});

test.each(["remote", "custom"])("%s saved records preserve name provenance and legacy snapshots without migration", (kind) => {
  const food = result(["en:e330"]).food;
  const reference = kind === "remote"
    ? { sourceType: "remote-barcode", identifiers: food.identifiers, provider: food.provider, additives: food.additives, ingredients: food.ingredients }
    : { sourceType: "grocery-custom", identifiers: food.identifiers, providerSourceSnapshot: food };
  const saved = appendNutritionEntry(localStorage, {
    name: food.name, ...food.nutrients, notes: "", loggedAt: new Date(NOW).toISOString(), foodReference: reference,
  }, { createId: () => "name-reference-entry" });
  expect(saved.status).toBe("saved");
  const raw = localStorage.getItem(NUTRITION_ENTRIES_STORAGE_KEY);
  const [entry] = readNutritionEntries(localStorage).entries;
  const snapshot = kind === "remote" ? entry.foodReference : entry.foodReference.providerSourceSnapshot;
  expect(snapshot.additives).toEqual(food.additives);
  expect(snapshot.ingredients).toEqual(food.ingredients);
  expect(localStorage.getItem(NUTRITION_ENTRIES_STORAGE_KEY)).toBe(raw);

  const legacy = JSON.parse(raw);
  const oldSnapshot = kind === "remote" ? legacy[0].foodReference : legacy[0].foodReference.providerSourceSnapshot;
  oldSnapshot.additives.items[0].name = null;
  delete oldSnapshot.additives.items[0].nameReference;
  const oldRaw = JSON.stringify(legacy);
  localStorage.setItem(NUTRITION_ENTRIES_STORAGE_KEY, oldRaw);
  expect(readNutritionEntries(localStorage).entries).toEqual(legacy);
  expect(localStorage.getItem(NUTRITION_ENTRIES_STORAGE_KEY)).toBe(oldRaw);
});

test("reading a legacy custom product resolves names in memory without rewriting stored products", () => {
  const food = result(["en:e330"]).food;
  const custom = createUserFood(food.name, food.nutrients, food.serving, {
    identifiers: food.identifiers, providerSourceSnapshot: food,
  });
  const legacy = JSON.parse(JSON.stringify(custom));
  legacy.providerSourceSnapshot.additives.items[0].name = null;
  delete legacy.providerSourceSnapshot.additives.items[0].nameReference;
  writeUserFoods(localStorage, [legacy]);
  const raw = localStorage.getItem(USER_FOODS_STORAGE_KEY);
  expect(readUserFoods(localStorage)[0].providerSourceSnapshot.additives).toEqual(food.additives);
  expect(localStorage.getItem(USER_FOODS_STORAGE_KEY)).toBe(raw);
});

test("bounded repeated recognized tags plus maximum ingredient text fit the browser response limit", () => {
  const original = JSON.parse(JSON.stringify(result(Array.from({ length: 100 }, (_, i) => `${" ".repeat(i)}en:e500ii`))));
  original.food.ingredients.text = "x".repeat(8192);
  expect(new TextEncoder().encode(JSON.stringify(original)).byteLength).toBeLessThan(REMOTE_BARCODE_RESPONSE_MAX_BYTES);
});

test("an online result retains additives on later cached lookups without extra requests", async () => {
  const original = result(["en:e330"]);
  const fetchImpl = jest.fn().mockResolvedValue({
    headers: { get: () => null }, text: async () => JSON.stringify(original),
  });
  const lookup = createRemoteBarcodeLookup({
    storage: localStorage, clock: () => NOW, runtime: { isWeb: true, isOnline: true },
    localLookup: () => ({ status: "not-found", food: null }), fetchImpl,
  });
  expect((await lookup.lookup(BARCODE)).food.additives).toEqual(original.food.additives);
  expect((await lookup.lookup(BARCODE)).food.additives).toEqual(original.food.additives);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("optional malformed additive metadata cannot invalidate otherwise usable nutrition", () => {
  const original = result(["en:e330"]);
  const food = normalizeRemoteFood({ ...original.food, additives: { items: "bad" } });
  expect(food.additives.status).toBe("unknown");
  expect(food.logReady).toBe(true);
  expect(food.unknownFields).toEqual(original.food.unknownFields);
  expect(food.nutrients).toEqual(original.food.nutrients);
});

test("recovery and custom product storage retain the original additive source", () => {
  const original = result(["en:e330"]);
  const incomplete = {
    ...original.food, logReady: false, completeness: "insufficient",
    unknownFields: [...original.food.unknownFields, "nutrients.calories"],
    nutrients: { ...original.food.nutrients, calories: null },
    nutritionBasis: { ...original.food.nutritionBasis,
      sourceNutrients: { ...original.food.nutritionBasis.sourceNutrients, calories: null } },
  };
  const candidate = createBarcodeNutritionCandidate({ ...original, status: "incomplete", food: incomplete });
  expect(candidate.canUse).toBe(false);
  expect(candidate.recovery.food.additives).toEqual(original.food.additives);
  expect(candidate.recovery.providerSourceSnapshot.additives).toEqual(original.food.additives);
  const custom = createUserFood("Completed food", original.food.nutrients, original.food.serving, {
    identifiers: original.food.identifiers, providerSourceSnapshot: candidate.recovery.providerSourceSnapshot,
  });
  writeUserFoods(localStorage, [custom]);
  const [stored] = readUserFoods(localStorage);
  expect(stored.providerSourceSnapshot.additives).toEqual(original.food.additives);
  const review = createBarcodeNutritionCandidate({ status: "found", food: stored });
  expect(review.canUse).toBe(true);
  expect(review.display.additives).toEqual(original.food.additives);
  expect(review.selection.providerSourceSnapshot.provenance).toEqual(original.food.provenance);
});

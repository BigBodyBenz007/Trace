import { normalizeRemoteFood } from "./remoteFoodModel";
import { createRemoteBarcodeCache, REMOTE_BARCODE_CACHE_STORAGE_KEY, REMOTE_BARCODE_CACHE_VERSION } from "./remoteBarcodeCache";
import { createRemoteBarcodeLookup } from "./remoteBarcodeLookup";
import { createBarcodeNutritionCandidate } from "./barcodeNutritionSelection";
import { createUserFood, writeUserFoods, readUserFoods } from "./userFoodCatalog";

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

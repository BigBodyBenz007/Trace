import { normalizeRemoteFood } from "./remoteFoodModel";
import { createRemoteBarcodeCache, REMOTE_BARCODE_CACHE_STORAGE_KEY,
  REMOTE_BARCODE_CACHE_VERSION } from "./remoteBarcodeCache";
import { createRemoteBarcodeLookup, REMOTE_BARCODE_RESPONSE_MAX_BYTES } from "./remoteBarcodeLookup";
import { createBarcodeNutritionCandidate } from "./barcodeNutritionSelection";
import { createUserFood, writeUserFoods, readUserFoods, USER_FOODS_STORAGE_KEY } from "./userFoodCatalog";
import { appendNutritionEntry, readNutritionEntries, NUTRITION_ENTRIES_STORAGE_KEY } from "./nutritionEntryStorage";

const { normalizeOpenFoodFactsProduct, normalizeUsdaFood } = require("../../api/nutrition/_barcodeGateway.cjs");
const { BARCODE, RETRIEVED_AT, offRecord, usdaRecord } = require("./__fixtures__/nutritionAssessmentInputs.cjs");
const NOW = Date.parse(RETRIEVED_AT);
const copy = (value) => JSON.parse(JSON.stringify(value));

function result(provider = "off") {
  const food = provider === "off"
    ? normalizeOpenFoodFactsProduct(offRecord(), BARCODE, RETRIEVED_AT)
    : normalizeUsdaFood(usdaRecord(), BARCODE, RETRIEVED_AT);
  return { status: "found", identifier: { scheme: "gtin", value: BARCODE }, food };
}

beforeEach(() => localStorage.clear());

test.each(["off", "usda"])("%s evidence survives v2 cache, offline lookup, review and selection", async (provider) => {
  const original = result(provider);
  expect(normalizeRemoteFood(original.food).assessmentInputs).toEqual(original.food.assessmentInputs);
  const cache = createRemoteBarcodeCache({ storage: localStorage, clock: () => NOW });
  expect(cache.set(BARCODE, original)).toBe(true);
  expect(REMOTE_BARCODE_CACHE_VERSION).toBe(2);
  const fetchImpl = jest.fn();
  const lookup = createRemoteBarcodeLookup({ storage: localStorage, clock: () => NOW,
    runtime: { isWeb: true, isOnline: false }, localLookup: () => ({ status: "not-found" }), fetchImpl });
  const cached = await lookup.lookup(BARCODE);
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(cached.food.assessmentInputs).toEqual(original.food.assessmentInputs);
  const candidate = createBarcodeNutritionCandidate(cached);
  expect(candidate.canUse).toBe(true);
  expect(candidate.display.assessmentInputs).toEqual(original.food.assessmentInputs);
  expect(candidate.display.assessmentInputQuality.scoreReady).toBe(false);
  expect(candidate.selection.assessmentInputs).toEqual(original.food.assessmentInputs);
  expect(candidate.selection.remote.assessmentInputs).toEqual(original.food.assessmentInputs);
  expect(candidate.selection.nutrients).toEqual(original.food.nutrients);
  expect(candidate.display.ingredients).toEqual(original.food.ingredients);
  expect(candidate.display.additives).toEqual(original.food.additives);
});

test("one existing online lookup captures evidence and later uses cache with no extra request", async () => {
  const original = result();
  const fetchImpl = jest.fn().mockResolvedValue({
    headers: { get: () => null }, text: async () => JSON.stringify(original),
  });
  const lookup = createRemoteBarcodeLookup({ storage: localStorage, clock: () => NOW,
    runtime: { isWeb: true, isOnline: true }, localLookup: () => ({ status: "not-found" }), fetchImpl });
  expect((await lookup.lookup(BARCODE)).food.assessmentInputs).toEqual(original.food.assessmentInputs);
  expect((await lookup.lookup(BARCODE)).food.assessmentInputs).toEqual(original.food.assessmentInputs);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("legacy cache and saved records retain absence without migration, refresh or nutritional changes", () => {
  const legacy = copy(result());
  delete legacy.food.assessmentInputs;
  const cache = createRemoteBarcodeCache({ storage: localStorage, clock: () => NOW });
  cache.set(BARCODE, legacy);
  const rawCache = localStorage.getItem(REMOTE_BARCODE_CACHE_STORAGE_KEY);
  const reopened = createRemoteBarcodeCache({ storage: localStorage, clock: () => NOW });
  expect(localStorage.getItem(REMOTE_BARCODE_CACHE_STORAGE_KEY)).toBe(rawCache);
  expect(createBarcodeNutritionCandidate(reopened.get(BARCODE)).selection.remote).not.toHaveProperty("assessmentInputs");
  appendNutritionEntry(localStorage, { name: legacy.food.name, ...legacy.food.nutrients,
    notes: "", loggedAt: RETRIEVED_AT, foodReference: { sourceType: "remote-barcode", provider: legacy.food.provider } },
  { createId: () => "legacy-assessment-entry" });
  const rawEntry = localStorage.getItem(NUTRITION_ENTRIES_STORAGE_KEY);
  expect(readNutritionEntries(localStorage).entries[0].foodReference).not.toHaveProperty("assessmentInputs");
  expect(localStorage.getItem(NUTRITION_ENTRIES_STORAGE_KEY)).toBe(rawEntry);
});

test.each(["remote", "custom"])("%s snapshots persist original observations and market evidence", (kind) => {
  const { food } = result();
  const reference = kind === "remote"
    ? { sourceType: "remote-barcode", assessmentInputs: food.assessmentInputs, ingredients: food.ingredients, additives: food.additives }
    : { sourceType: "grocery-custom", identifiers: food.identifiers, providerSourceSnapshot: food };
  expect(appendNutritionEntry(localStorage, { name: food.name, ...food.nutrients,
    notes: "", loggedAt: RETRIEVED_AT, foodReference: reference },
  { createId: () => "assessment-entry" }).status).toBe("saved");
  const raw = localStorage.getItem(NUTRITION_ENTRIES_STORAGE_KEY);
  const [entry] = readNutritionEntries(localStorage).entries;
  const snapshot = kind === "remote" ? entry.foodReference : entry.foodReference.providerSourceSnapshot;
  expect(snapshot.assessmentInputs).toEqual(food.assessmentInputs);
  expect(snapshot.ingredients).toEqual(food.ingredients);
  expect(snapshot.additives).toEqual(food.additives);
  expect(localStorage.getItem(NUTRITION_ENTRIES_STORAGE_KEY)).toBe(raw);
});

test("stale incomplete recovery preserves staleness through custom storage and reselection", () => {
  const original = result();
  const incomplete = { ...original.food, logReady: false, completeness: "insufficient",
    unknownFields: [...original.food.unknownFields, "nutrients.calories"],
    nutrients: { ...original.food.nutrients, calories: null },
    nutritionBasis: { ...original.food.nutritionBasis,
      sourceNutrients: { ...original.food.nutritionBasis.sourceNutrients, calories: null } } };
  const candidate = createBarcodeNutritionCandidate({ ...original, status: "incomplete", stale: true, food: incomplete });
  expect(candidate.canUse).toBe(false);
  expect(candidate.display.assessmentInputQuality.sourceDateStatus).toBe("stale");
  expect(candidate.recovery.food.assessmentInputs.source.cacheStale).toBe(true);
  expect(candidate.recovery.providerSourceSnapshot.assessmentInputs.source.cacheStale).toBe(true);
  const custom = createUserFood("User-completed food", original.food.nutrients, original.food.serving, {
    identifiers: original.food.identifiers, providerSourceSnapshot: candidate.recovery.providerSourceSnapshot,
  });
  writeUserFoods(localStorage, [custom]);
  const raw = localStorage.getItem(USER_FOODS_STORAGE_KEY);
  const [stored] = readUserFoods(localStorage);
  expect(localStorage.getItem(USER_FOODS_STORAGE_KEY)).toBe(raw);
  const review = createBarcodeNutritionCandidate({ status: "found", food: stored });
  expect(review.canUse).toBe(true);
  expect(review.display.assessmentInputQuality.sourceDateStatus).toBe("stale");
  expect(review.selection.providerSourceSnapshot.assessmentInputs.source.cacheStale).toBe(true);
  // The original provider dataset remains unchanged by the user's completed logging values.
  expect(review.display.assessmentInputs.datasets).toEqual(original.food.assessmentInputs.datasets);
});

test("malformed optional evidence cannot invalidate logging or existing ingredient/additive data", () => {
  const { food } = result();
  const normalized = normalizeRemoteFood({ ...food, assessmentInputs: { schemaVersion: 999 } });
  expect(normalized.assessmentInputs).toBeNull();
  const candidate = createBarcodeNutritionCandidate({ status: "found", food: normalized });
  expect(candidate.canUse).toBe(true);
  expect(candidate.selection.nutrients).toEqual(food.nutrients);
  expect(candidate.display.assessmentInputQuality.states).toContain("invalid-or-oversized-inputs");
  expect(candidate.display.ingredients).toEqual(food.ingredients);
  expect(candidate.display.additives).toEqual(food.additives);
});

test("bounded assessment data, maximal ingredients and repeated additives fit the existing response limit", () => {
  const record = offRecord({ ingredients_text: "x".repeat(8192),
    additives_tags: Array.from({ length: 100 }, (_, index) => `${" ".repeat(index)}en:e500ii`) });
  const food = normalizeOpenFoodFactsProduct(record, BARCODE, RETRIEVED_AT);
  expect(food.assessmentInputs).not.toBeNull();
  const response = { ...result(), food };
  expect(new TextEncoder().encode(JSON.stringify(response)).byteLength).toBeLessThan(REMOTE_BARCODE_RESPONSE_MAX_BYTES);
});

test("optional metadata cannot push a previously usable large Unicode product over the response limit", () => {
  const record = offRecord({ ingredients_text: "\u754c".repeat(4700),
    additives_tags: Array.from({ length: 100 }, (_, index) => `${" ".repeat(index)}en:e500ii`) });
  const food = normalizeOpenFoodFactsProduct(record, BARCODE, RETRIEVED_AT);
  expect(food.assessmentInputs).toBeNull();
  expect(food.logReady).toBe(true);
  expect(food.ingredients.text).toBe(record.ingredients_text);
  expect(new TextEncoder().encode(JSON.stringify({ ...result(), food })).byteLength)
    .toBeLessThan(REMOTE_BARCODE_RESPONSE_MAX_BYTES);
});

import fs from 'node:fs';
import path from 'node:path';
import { createRemoteBarcodeLookup } from './remoteBarcodeLookup';
import { createRemoteBarcodeCache, REMOTE_BARCODE_CACHE_TTL_MS, REMOTE_BARCODE_CACHE_STORAGE_KEY } from './remoteBarcodeCache';
import { lookupCatalogFoodByBarcode } from './barcodeFoodLookup';
import { createBarcodeNutritionCandidate } from './barcodeNutritionSelection';
import { assessLookupForGrading } from '../development/barcodeAssessmentFallback';
import { screenIngredientDeclaration } from '../development/additiveScreeningPolicy';
import capturedManufacturerLookups from './__fixtures__/manufacturerProviderLookups.json';

const { normalizeOpenFoodFactsProduct, normalizeUsdaFood } = require('../../api/nutrition/_barcodeGateway.cjs');
const { offRecord, usdaRecord, BARCODE, RETRIEVED_AT } = require('./__fixtures__/nutritionAssessmentInputs.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const none = () => ({ status: 'not-found', identifier: null, food: null });
const memoryStorage = () => { const values = new Map(); return {
  getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
}; };
const response = body => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify(body) });
const attempt = (provider, status = 'found') => ({ provider, status });
const captures = fs.readFileSync(path.join(__dirname,
  '../../docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);

function capturedOff(barcode) {
  const row = captures.find(entry => entry.barcode === barcode);
  const food = normalizeOpenFoodFactsProduct(row.responses[0].body.product, barcode, row.capturedAt);
  return { status: food.logReady ? 'found' : 'incomplete', identifier: { scheme: 'gtin', value: barcode }, food };
}

// All controls produced by this helper are constructed provider-schema fixtures,
// not additional product captures or manufacturer-verified food observations.
function synthetic(provider, { missingSaturatedFat = false, ingredients = 'Whole grain oats, sugar', name = 'Synthetic cereal' } = {}) {
  const raw = provider === 'usda-fdc'
    ? usdaRecord({ description: name, ingredients })
    : offRecord({ product_name: name, ingredients_text: ingredients });
  if (missingSaturatedFat) {
    if (provider === 'usda-fdc') {
      delete raw.labelNutrients.saturatedFat;
      raw.foodNutrients = raw.foodNutrients.filter(item => item.nutrientName !== 'Fatty acids, total saturated');
    } else delete raw.nutriments['saturated-fat_100g'];
  }
  const food = provider === 'usda-fdc' ? normalizeUsdaFood(raw, BARCODE, RETRIEVED_AT)
    : normalizeOpenFoodFactsProduct(raw, BARCODE, RETRIEVED_AT);
  return { status: food.logReady ? 'found' : 'incomplete', identifier: { scheme: 'gtin', value: BARCODE }, food };
}

function lookupService(fetchImpl, options = {}) {
  return createRemoteBarcodeLookup({ storage: memoryStorage(), fetchImpl,
    clock: () => Date.parse('2026-10-22T00:10:00Z'),
    localLookup: none, userLookup: none, runtime: { isWeb: true, isOnline: true }, ...options });
}

test('captured Chobani alternative replaces the complete catalog edition rather than borrowing its ingredient list', async () => {
  const barcode = '00894700010045', original = lookupCatalogFoodByBarcode(barcode), alternative = capturedOff(barcode);
  const snapshot = JSON.stringify({ original, alternative });
  expect(original.food.nutrients.sodium).toBe(60);
  expect(alternative.food.nutrients.sodium).toBe(55);
  expect(assessLookupForGrading(original)).toMatchObject({ nutrition: true, overall: false });
  expect(assessLookupForGrading(alternative)).toMatchObject({ nutrition: true, overall: true });
  const fetchImpl = jest.fn().mockResolvedValue(response({ ...alternative,
    providerAttempts: [attempt('usda-fdc', 'unconfigured'), attempt('open-food-facts')] }));
  const service = lookupService(fetchImpl, { localLookup: lookupCatalogFoodByBarcode });
  const chosen = await service.lookup(barcode, { assess: assessLookupForGrading });
  expect(chosen.food).toEqual(alternative.food);
  expect(chosen.sourceSelection).toMatchObject({ outcome: 'fallback-selected', preferred: original });
  expect(chosen.sourceSelection.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ food: alternative.food })]));
  const candidate = createBarcodeNutritionCandidate(chosen);
  expect(candidate.display.nutrients.sodium).toBe(55);
  expect(candidate.display.ingredients).toEqual(alternative.food.ingredients);
  expect(candidate.selection.remote.provider).toEqual(alternative.food.provider);
  expect(JSON.stringify({ original, alternative })).toBe(snapshot);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('constructed missing-saturated-fat catalog control can use a coherent captured OFF panel', async () => {
  const alternative = capturedOff('00894700010045');
  const original = clone(lookupCatalogFoodByBarcode(alternative.identifier.value));
  // Constructed absence control: the actual catalog record does not claim this
  // missing-fat state. Other catalog values are not spliced into the OFF panel.
  original.food.nutrients.fat = 1;
  delete original.food.nutrients.saturatedFat;
  expect(assessLookupForGrading(original).nutrition).toBe(false);
  const service = lookupService(jest.fn().mockResolvedValue(response(alternative)), { localLookup: () => original });
  const chosen = await service.lookup(alternative.identifier.value, { assess: assessLookupForGrading });
  expect(chosen.food).toEqual(alternative.food);
  expect(assessLookupForGrading(chosen)).toMatchObject({ nutrition: true, overall: true });
});

test('already-fetched alternatives are assessed before requesting any additional provider', async () => {
  const preferred = synthetic('usda-fdc', { missingSaturatedFat: true }), alternative = synthetic('open-food-facts');
  const fetchImpl = jest.fn().mockResolvedValue(response({ ...preferred, alternatives: [alternative],
    providerAttempts: [attempt('usda-fdc'), attempt('open-food-facts')] }));
  const chosen = await lookupService(fetchImpl).lookup(BARCODE, { assess: assessLookupForGrading });
  expect(chosen.food).toEqual(alternative.food);
  expect(chosen.sourceSelection.outcome).toBe('fallback-selected');
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('the missing supported provider is requested once when the preferred panel cannot be assessed', async () => {
  const preferred = synthetic('open-food-facts', { missingSaturatedFat: true }), alternative = synthetic('usda-fdc');
  const fetchImpl = jest.fn().mockResolvedValueOnce(response({ ...preferred,
    providerAttempts: [attempt('open-food-facts')] })).mockResolvedValueOnce(response({ ...alternative,
    providerAttempts: [attempt('usda-fdc')] }));
  const service = lookupService(fetchImpl);
  const chosen = await service.lookup(BARCODE, { assess: assessLookupForGrading });
  expect(chosen.food).toEqual(alternative.food);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ barcode: BARCODE });
  expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ barcode: BARCODE, provider: 'usda-fdc' });
  await service.lookup(BARCODE, { assess: assessLookupForGrading });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

test('fully usable preferred records, including provisional combined assessments, do not trigger fallback', async () => {
  const preferred = synthetic('usda-fdc');
  expect(assessLookupForGrading(preferred)).toMatchObject({ nutrition: true, overall: true });
  const fetchImpl = jest.fn().mockResolvedValue(response(preferred));
  const chosen = await lookupService(fetchImpl).lookup(BARCODE, { assess: assessLookupForGrading });
  expect(chosen.food).toEqual(preferred.food);
  expect(chosen.sourceSelection).toBeUndefined();
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('selection uses usability only, retaining the preferred record on ties rather than chasing a higher score', async () => {
  const preferred = synthetic('usda-fdc'), alternative = synthetic('open-food-facts');
  const assess = jest.fn(result => ({ nutrition: true, overall: false,
    score: result.food.provider.id === 'usda-fdc' ? 12 : 95 }));
  const fetchImpl = jest.fn().mockResolvedValue(response({ ...preferred, alternatives: [alternative],
    providerAttempts: [attempt('usda-fdc'), attempt('open-food-facts')] }));
  const chosen = await lookupService(fetchImpl).lookup(BARCODE, { assess });
  expect(chosen.food).toEqual(preferred.food);
  expect(chosen.sourceSelection.outcome).toBe('no-usable-alternative');
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('an attractive numerical result cannot compensate for unusable evidence', async () => {
  const preferred = synthetic('usda-fdc'), alternative = synthetic('open-food-facts');
  const assess = result => result.food.provider.id === 'usda-fdc'
    ? { nutrition: true, overall: false, score: 12 }
    : { nutrition: false, overall: false, score: 100 };
  const fetchImpl = jest.fn().mockResolvedValue(response({ ...preferred, alternatives: [alternative],
    providerAttempts: [attempt('usda-fdc'), attempt('open-food-facts')] }));
  const chosen = await lookupService(fetchImpl).lookup(BARCODE, { assess });
  expect(chosen.food).toEqual(preferred.food);
  expect(chosen.sourceSelection.outcome).toBe('no-usable-alternative');
});

test.each([
  ['different barcode', result => { result.identifier.value = '012345678905'; result.food.identifiers[0].value = '012345678905'; }],
  ['different brand', result => { result.food.brand = 'Unrelated Brand'; result.food.assessmentInputs.identity.brand = 'Unrelated Brand'; }],
  ['different named variant', result => { result.food.name = 'Synthetic chocolate cereal'; result.food.assessmentInputs.identity.name = result.food.name; }],
  ['explicit foreign formulation', result => { result.food.assessmentInputs.markets = [{ field: 'countries_tags', values: ['en:france'] }]; }],
])('constructed %s control cannot replace the preferred product', async (_description, mutate) => {
  const preferred = synthetic('usda-fdc', { missingSaturatedFat: true, name: 'Synthetic vanilla cereal' });
  const alternative = clone(synthetic('open-food-facts', { name: 'Synthetic vanilla cereal' }));
  mutate(alternative);
  const fetchImpl = jest.fn().mockResolvedValue(response({ ...preferred, alternatives: [alternative],
    providerAttempts: [attempt('usda-fdc'), attempt('open-food-facts')] }));
  const chosen = await lookupService(fetchImpl).lookup(BARCODE, { assess: assessLookupForGrading });
  expect(chosen.food).toEqual(preferred.food);
  expect(chosen.sourceSelection.outcome).toBe('no-usable-alternative');
});

test.each([
  ['unavailable', 'provider-unavailable'], ['rate-limited', 'provider-unavailable'],
  ['unconfigured', 'provider-unavailable'], ['not-found', 'no-usable-alternative'],
])('a missing alternative reported as %s retains the food and distinguishes the fallback outcome', async (status, outcome) => {
  const preferred = synthetic('open-food-facts', { missingSaturatedFat: true });
  const fetchImpl = jest.fn().mockResolvedValueOnce(response(preferred))
    .mockResolvedValueOnce(response({ status, identifier: preferred.identifier, food: null,
      providerAttempts: [attempt('usda-fdc', status)] }));
  const service = lookupService(fetchImpl);
  const chosen = await service.lookup(BARCODE, { assess: assessLookupForGrading });
  expect(chosen.food).toEqual(preferred.food);
  expect(chosen.sourceSelection.outcome).toBe(outcome);
  expect(chosen.sourceSelection.providerAttempts).toEqual(expect.arrayContaining([attempt('usda-fdc', status)]));
  expect(createBarcodeNutritionCandidate(chosen).canUse).toBe(true);
  await service.lookup(BARCODE, { assess: assessLookupForGrading });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

test.each([
  ['seconds', '120', 120000],
  ['HTTP date', new Date(Date.parse('2026-10-22T00:10:00Z') + 180000).toUTCString(), 180000],
  ['invalid header', 'not-a-valid-retry-time', 60000],
])('targeted provider retry honors %s without a sleep or repeated early request', async (_format, retryAfter, delay) => {
  const preferred = synthetic('open-food-facts', { missingSaturatedFat: true }), alternative = synthetic('usda-fdc');
  const start = Date.parse('2026-10-22T00:10:00Z');
  let now = start;
  const fetchImpl = jest.fn().mockResolvedValueOnce(response({ ...preferred,
    providerAttempts: [attempt('open-food-facts')] }))
    .mockResolvedValueOnce(response({ status: 'rate-limited', identifier: preferred.identifier, food: null, retryAfter,
      providerAttempts: [attempt('usda-fdc', 'rate-limited')] }))
    .mockResolvedValueOnce(response({ ...alternative, providerAttempts: [attempt('usda-fdc')] }));
  const service = lookupService(fetchImpl, { clock: () => now });
  const first = await service.lookup(BARCODE, { assess: assessLookupForGrading });
  expect(first.food).toEqual(preferred.food);
  expect(first.sourceSelection.outcome).toBe('provider-unavailable');
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  now = start + delay - 1;
  expect((await service.lookup(BARCODE, { assess: assessLookupForGrading })).food).toEqual(preferred.food);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  now = start + delay;
  const retried = await service.lookup(BARCODE, { assess: assessLookupForGrading });
  expect(retried.food).toEqual(alternative.food);
  expect(retried.sourceSelection.outcome).toBe('fallback-selected');
  expect(fetchImpl).toHaveBeenCalledTimes(3);
  expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toEqual({ barcode: BARCODE, provider: 'usda-fdc' });
});

test('cached alternative editions survive a new reader and expired offline lookup without clearing history', async () => {
  let now = Date.parse('2026-10-22T00:10:00Z');
  const storage = memoryStorage(), historical = JSON.stringify([{ id: 'synthetic-history', sodium: 60 }]);
  storage.setItem('nutritionEntries', historical);
  const barcode = '00894700010045', alternative = capturedOff(barcode);
  const fetchImpl = jest.fn().mockResolvedValue(response({ ...alternative,
    providerAttempts: [attempt('usda-fdc', 'not-found'), attempt('open-food-facts')] }));
  const first = lookupService(fetchImpl, { storage, clock: () => now, localLookup: lookupCatalogFoodByBarcode });
  const chosen = await first.lookup(barcode, { assess: assessLookupForGrading });
  expect(chosen.food.nutrients.sodium).toBe(55);
  now += REMOTE_BARCODE_CACHE_TTL_MS + 1;
  const offlineFetch = jest.fn();
  const offline = lookupService(offlineFetch, { storage, clock: () => now,
    localLookup: lookupCatalogFoodByBarcode, runtime: { isWeb: true, isOnline: false } });
  const cached = await offline.lookup(barcode, { assess: assessLookupForGrading });
  expect(cached.food).toEqual(chosen.food);
  expect(cached.stale).toBe(true);
  expect(cached.sourceSelection.preferred.food.nutrients.sodium).toBe(60);
  expect(offlineFetch).not.toHaveBeenCalled();
  expect(storage.getItem('nutritionEntries')).toBe(historical);
});

test('failed offline fallback preserves the existing usable cached food without attempting providers', async () => {
  const preferred = synthetic('open-food-facts', { missingSaturatedFat: true }), storage = memoryStorage();
  createRemoteBarcodeCache({ storage, clock: () => 1000 }).set(BARCODE, preferred);
  const fetchImpl = jest.fn();
  const result = await lookupService(fetchImpl, { storage, clock: () => REMOTE_BARCODE_CACHE_TTL_MS + 2000,
    runtime: { isWeb: true, isOnline: false } }).lookup(BARCODE, { assess: assessLookupForGrading });
  expect(result.food).toEqual(preferred.food);
  expect(result.sourceSelection.outcome).toBe('offline');
  expect(result.stale).toBe(true);
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('failed online refresh and fallback do not renew the age of an expired retained provider observation', async () => {
  const preferred = synthetic('open-food-facts', { missingSaturatedFat: true }), storage = memoryStorage();
  const history = JSON.stringify([{ id: 'synthetic-historical-entry', sodium: 123 }]);
  storage.setItem('nutritionEntries', history);
  createRemoteBarcodeCache({ storage, clock: () => 1000 }).set(BARCODE, preferred);
  const originalAge = JSON.parse(storage.getItem(REMOTE_BARCODE_CACHE_STORAGE_KEY)).records[0];
  const now = REMOTE_BARCODE_CACHE_TTL_MS + 2000;
  const unavailable = provider => response({ status: 'unavailable', identifier: preferred.identifier, food: null,
    providerAttempts: [attempt(provider, 'unavailable')] });
  const fetchImpl = jest.fn().mockResolvedValueOnce(unavailable('open-food-facts'))
    .mockResolvedValueOnce(unavailable('usda-fdc'));
  const online = await lookupService(fetchImpl, { storage, clock: () => now })
    .lookup(BARCODE, { assess: assessLookupForGrading });
  expect(online.food).toEqual(preferred.food);
  expect(online.stale).toBe(true);
  expect(online.sourceSelection.outcome).toBe('provider-unavailable');
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  const retainedAge = JSON.parse(storage.getItem(REMOTE_BARCODE_CACHE_STORAGE_KEY)).records[0];
  expect(retainedAge.storedAt).toBe(originalAge.storedAt);
  expect(retainedAge.expiresAt).toBe(originalAge.expiresAt);
  const offlineFetch = jest.fn();
  const offline = await lookupService(offlineFetch, { storage, clock: () => now + 1000,
    runtime: { isWeb: true, isOnline: false } }).lookup(BARCODE, { assess: assessLookupForGrading });
  expect(offline.food).toEqual(preferred.food);
  expect(offline.stale).toBe(true);
  expect(offline.sourceSelection.outcome).toBe('offline');
  expect(offlineFetch).not.toHaveBeenCalled();
  expect(storage.getItem('nutritionEntries')).toBe(history);
});

test('ordinary production lookup keeps preferred ranking even when a grading fallback was cached', async () => {
  const preferred = synthetic('usda-fdc', { missingSaturatedFat: true }), alternative = synthetic('open-food-facts');
  const storage = memoryStorage(), fetchImpl = jest.fn().mockResolvedValue(response({ ...preferred,
    alternatives: [alternative], providerAttempts: [attempt('usda-fdc'), attempt('open-food-facts')] }));
  const service = lookupService(fetchImpl, { storage });
  expect((await service.lookup(BARCODE, { assess: assessLookupForGrading })).food).toEqual(alternative.food);
  const production = lookupService(jest.fn(), { storage });
  const originalPriority = await production.lookup(BARCODE);
  expect(originalPriority.food).toEqual(preferred.food);
  expect(originalPriority.sourceSelection).toBeUndefined();
});

test('a newly usable OFF panel survives a full alternative cache without changing ordinary USDA priority', async () => {
  const preferred = synthetic('usda-fdc', { missingSaturatedFat: true });
  const older = [101, 102, 103].map(recordId => {
    const result = clone(preferred), id = String(recordId);
    result.food.provider.recordId = id;
    result.food.provenance.providerRecordId = id;
    result.food.provenance.sourceUrl = `https://fdc.nal.usda.gov/food-details/${id}/nutrients`;
    result.food.assessmentInputs.source.recordId = id;
    result.food.assessmentInputs.source.url = result.food.provenance.sourceUrl;
    return result;
  });
  const alternative = synthetic('open-food-facts'), storage = memoryStorage();
  const fetchImpl = jest.fn().mockResolvedValueOnce(response({ ...preferred, alternatives: older,
    providerAttempts: [attempt('usda-fdc')] })).mockResolvedValueOnce(response({ ...alternative,
    providerAttempts: [attempt('open-food-facts')] }));
  const fresh = await lookupService(fetchImpl, { storage }).lookup(BARCODE, { assess: assessLookupForGrading });
  expect(fresh.food).toEqual(alternative.food);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  const offlineFetch = jest.fn(), offline = lookupService(offlineFetch, { storage,
    runtime: { isWeb: true, isOnline: false } });
  expect((await offline.lookup(BARCODE, { assess: assessLookupForGrading })).food).toEqual(alternative.food);
  expect((await offline.lookup(BARCODE)).food).toEqual(preferred.food);
  expect(offlineFetch).not.toHaveBeenCalled();
});

test('an explicit reference panel can be assessed without manufacturing a loggable labeled serving', async () => {
  const raw = offRecord({ product_name: 'Synthetic cereal', ingredients_text: 'Whole grain oats, sugar',
    serving_size: undefined, serving_quantity: undefined, serving_quantity_unit: undefined });
  const food = normalizeOpenFoodFactsProduct(raw, BARCODE, RETRIEVED_AT);
  const reference = { status: 'incomplete', identifier: { scheme: 'gtin', value: BARCODE }, food };
  expect(food.nutritionBasis.kind).toBe('reference-only');
  expect(food.logReady).toBe(false);
  expect(assessLookupForGrading(reference)).toMatchObject({ nutrition: true, overall: true });
  const fetchImpl = jest.fn().mockResolvedValue(response(reference));
  const result = await lookupService(fetchImpl).lookup(BARCODE, { assess: assessLookupForGrading });
  expect(result.food).toEqual(food);
  expect(createBarcodeNutritionCandidate(result)).toMatchObject({ canUse: false, selection: null });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('custom user foods are never automatically replaced because assessment evidence is missing', async () => {
  const custom = { status: 'found', identifier: { scheme: 'gtin', value: BARCODE },
    food: { id: 'user-added:synthetic', name: 'User food', sourceType: 'grocery-custom' } };
  const fetchImpl = jest.fn(), assess = jest.fn(() => ({ nutrition: false, overall: false }));
  const result = await lookupService(fetchImpl, { userLookup: () => custom }).lookup(BARCODE, { assess });
  expect(result).toMatchObject({ source: 'user', food: custom.food });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('constructed rolled-oats lexical control recognizes the established ordinary identity without declaring unknown ingredients reviewed', () => {
  const complete = screenIngredientDeclaration('Whole grain rolled oats');
  expect(complete).toMatchObject({ usable: true, ordinary: ['oats'], unresolved: [], knownConcern: 0 });
  expect(complete.items).toEqual([]);
  const partial = screenIngredientDeclaration('Whole grain rolled oats, unfamiliar ingredient');
  expect(partial.ordinary).toEqual(['oats']);
  expect(partial.unresolved).toEqual(['Unreviewed ingredient phrase: unfamiliar ingredient']);
  expect(partial.items).toEqual([]);
});

test.each(capturedManufacturerLookups.observations)(
  'captured manufacturer-corrected USDA record $request.body.barcode is assessed before any unnecessary fallback', async observation => {
    const preferred = observation.response, fetchImpl = jest.fn().mockResolvedValue(response(preferred));
    const chosen = await lookupService(fetchImpl).lookup(observation.request.body.barcode, { assess: assessLookupForGrading });
    const candidate = createBarcodeNutritionCandidate(chosen);
    expect(candidate.selection.nutritionCorrection).toBeDefined();
    const expectedNutrients = observation.request.body.barcode === '044000045586'
      ? { addedSugar: 7, totalSugar: 7 } : { sodium: 220 };
    expect(candidate.selection.nutrients).toMatchObject(expectedNutrients);
    expect(assessLookupForGrading(chosen)).toMatchObject({ nutrition: true, overall: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(chosen.sourceSelection).toBeUndefined();
  });

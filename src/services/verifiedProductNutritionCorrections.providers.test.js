import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import NutritionPage from '../components/NutritionPage';
import capturedGateway from './__fixtures__/manufacturerProviderLookups.json';
import teddyArchive from '../../docs/trace-nutrition-v2-teddy-2026-10-20.json';
import teddyLabel from '../data/teddyGrahamsHoneyLabel.json';
import panels from '../data/questSpamManufacturerLabels.json';
import { createBarcodeNutritionCandidate } from './barcodeNutritionSelection';
import { createRemoteBarcodeLookup } from './remoteBarcodeLookup';
import { createRemoteBarcodeCache, REMOTE_BARCODE_CACHE_TTL_MS } from './remoteBarcodeCache';
import { getAppliedVerifiedNutritionCorrection, resolveVerifiedNutritionCorrection } from './verifiedProductNutritionCorrections';
import { NUTRITION_ENTRY_NUTRIENT_KEYS, scaleNutrition } from './nutritionCalculation';
import { appendNutritionEntry, readNutritionEntries } from './nutritionEntryStorage';
import { assessBarcodeNutrition } from '../development/barcodeNutritionAssessment';
import { assessOverallFoodQuality } from '../development/traceOverallFoodQuality';

const { normalizeOpenFoodFactsProduct } = require('../../api/nutrition/_barcodeGateway.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const memory = () => { const values = new Map(); return {
  getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
}; };

// These OFF HTTP bodies were captured in the preselected 100-product sample.
// The two USDA cases below are complete normalized live Trace gateway responses,
// not invented raw USDA bodies or independently verified manufacturer editions.
const rawOff = fs.readFileSync(path.join(__dirname,
  '../../docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl'), 'utf8')
  .trim().split('\n').map(JSON.parse);
const manufacturerCases = panels.map(panel => {
  const row = rawOff.find(entry => entry.barcode.endsWith(panel.identity.gtin));
  const food = normalizeOpenFoodFactsProduct(row.responses[0].body.product, row.barcode, row.capturedAt);
  return { label: panel.identity.brand + ' captured raw OFF', panel,
    lookup: { ...row.lookup, food }, corrected: Object.fromEntries(NUTRITION_ENTRY_NUTRIENT_KEYS.map(key => [key, panel.nutrients[key]])) };
});
const usdaCases = capturedGateway.observations.map(observation => {
  const teddy = observation.request.body.barcode === teddyLabel.identity.gtin;
  const panel = teddy ? teddyLabel : panels[0];
  return { label: (teddy ? 'Teddy' : 'Quest') + ' captured live USDA gateway', panel, lookup: observation.response,
    corrected: teddy ? { ...observation.response.food.nutrients, addedSugar: 7, totalSugar: 7 }
      : Object.fromEntries(NUTRITION_ENTRY_NUTRIENT_KEYS.map(key => [key, panel.nutrients[key]])) };
});
const cases = [...manufacturerCases, ...usdaCases, { label: 'Teddy captured normalized OFF', panel: teddyLabel,
  lookup: teddyArchive.lookup, corrected: { ...teddyArchive.lookup.food.nutrients, addedSugar: 7 } }];

function offlineService(lookup, { storage = memory(), clock = () => Date.parse('2026-10-22T00:10:00Z'),
  runtime = () => ({ isWeb: true, isOnline: true }) } = {}) {
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => null },
    text: async () => JSON.stringify(lookup) });
  return { fetchImpl, service: createRemoteBarcodeLookup({ fetchImpl, storage, clock, runtime,
    localLookup: () => ({ status: 'not-found' }) }) };
}

test.each(cases)('$label: provider selection and original observations survive the shared correction', row => {
  const original = JSON.stringify(row.lookup), candidate = createBarcodeNutritionCandidate(row.lookup);
  expect(candidate.canUse).toBe(true);
  expect(candidate.display.nutritionCorrection?.id).toBe(row.panel.id);
  expect(getAppliedVerifiedNutritionCorrection(candidate, row.lookup.identifier)?.id).toBe(row.panel.id);
  expect(candidate.display.nutrients).toEqual(row.corrected);
  expect(candidate.selection.nutrients).toEqual(row.corrected);
  expect(candidate.selection.remote.provider).toEqual(row.lookup.food.provider);
  expect(candidate.selection.remote.nutrients).toEqual(row.lookup.food.nutrients);
  expect(candidate.selection.remote.ingredients).toEqual(row.lookup.food.ingredients);
  expect(candidate.selection.remote.additives).toEqual(row.lookup.food.additives);
  expect(candidate.selection.remote.assessmentInputs).toEqual(row.lookup.food.assessmentInputs);
  expect(candidate.selection.remote.provenance).toEqual(row.lookup.food.provenance);
  expect(candidate.selection.identifiers).toEqual(row.lookup.food.identifiers);
  expect(candidate.selection.nutritionCorrection.source).toEqual(row.panel.source);
  for (const servings of [.5, 1, 2]) {
    const scaled = scaleNutrition(candidate.selection.nutrients, servings);
    NUTRITION_ENTRY_NUTRIENT_KEYS.forEach(key => expect(scaled[key]).toBe(row.corrected[key] * servings));
  }
  const nutrition = assessBarcodeNutrition(candidate, row.lookup.identifier);
  const overall = assessOverallFoodQuality(candidate, nutrition);
  expect(nutrition).toMatchObject({ grade: null, scoreReady: true, scanMatchEligible: false });
  expect(overall).toMatchObject({ grade: null, scoreReady: true });
  expect(JSON.stringify(row.lookup)).toBe(original);
});

test.each(cases.filter(row => row.panel.mode === 'replacement-panel'))('$label: replacement panel keeps nutrition and ingredients in the same manufacturer edition', row => {
  const candidate = createBarcodeNutritionCandidate(row.lookup);
  const nutrition = assessBarcodeNutrition(candidate, row.lookup.identifier);
  const overall = assessOverallFoodQuality(candidate, nutrition);
  expect(candidate.display.ingredients).toEqual(row.panel.ingredients);
  expect(candidate.display.ingredientSource).toEqual(row.panel.source);
  expect(candidate.display.additives).toBeUndefined();
  expect(nutrition.result.normalized.originalNutrients).toEqual(row.panel.nutrients);
  expect(overall.additiveAssessment.originalIngredientText).toBe(row.panel.ingredients.text);
  expect(overall.additiveAssessment.source).toEqual({ url: row.panel.source.url, attribution: row.panel.source.attribution });
});

test.each(cases.filter(row => row.panel.mode !== 'replacement-panel'))('$label: the partial correction is not represented as replacement of the whole provider panel', row => {
  const candidate = createBarcodeNutritionCandidate(row.lookup);
  const nutrition = assessBarcodeNutrition(candidate, row.lookup.identifier);
  expect(candidate.selection.nutritionCorrection.mode).not.toBe('replacement-panel');
  expect(candidate.display.ingredients).toEqual(row.lookup.food.ingredients);
  expect(candidate.display.additives).toEqual(row.lookup.food.additives);
  expect(nutrition.nutritionScore100).toBe(20);
  expect(assessOverallFoodQuality(candidate, nutrition)).toMatchObject({ overallScore100: 20, provisional: true });
  // A partial correction does not silently convert the remaining USDA facts
  // into a manufacturer panel or discard their original declared units.
  for (const key of NUTRITION_ENTRY_NUTRIENT_KEYS.filter(key => !['addedSugar', 'totalSugar'].includes(key))) {
    expect(candidate.display.nutrients[key]).toBe(row.lookup.food.nutrients[key]);
  }
});

test.each(cases)('$label: equivalent UPC/EAN/GTIN representations retain correction scope', row => {
  for (const value of [row.panel.identity.gtin, row.panel.identity.gtin.padStart(13, '0'), row.panel.identity.gtin.padStart(14, '0')]) {
    const lookup = clone(row.lookup);
    lookup.identifier.value = value;
    lookup.food.identifiers[0].value = value;
    lookup.food.assessmentInputs.identity.providerGtin = value;
    expect(createBarcodeNutritionCandidate(lookup).selection.nutrients).toEqual(row.corrected);
  }
});

test.each(cases)('$label: fresh and expired offline caches apply the same reference without provider switching', async row => {
  let now = Date.parse('2026-10-22T00:10:00Z'), online = true;
  const { service, fetchImpl } = offlineService(row.lookup, { clock: () => now,
    runtime: () => ({ isWeb: true, isOnline: online }) });
  const fresh = await service.lookup(row.panel.identity.gtin);
  const cached = await service.lookup(row.panel.identity.gtin);
  expect(cached.cache.hit).toBe(true);
  expect(createBarcodeNutritionCandidate(fresh).selection.nutrients).toEqual(row.corrected);
  expect(createBarcodeNutritionCandidate(cached).selection.nutrients).toEqual(row.corrected);
  now += REMOTE_BARCODE_CACHE_TTL_MS + 1; online = false;
  const stale = await service.lookup(row.panel.identity.gtin);
  expect(stale.stale).toBe(true);
  const candidate = createBarcodeNutritionCandidate(stale);
  expect(candidate.selection.remote.provider).toEqual(row.lookup.food.provider);
  expect(candidate.selection.nutrients).toEqual(row.corrected);
  expect(assessBarcodeNutrition(candidate, stale.identifier).nutritionScore100).not.toBeNull();
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test.each(cases)('$label: legacy cached observations lacking optional assessment metadata cannot bypass the reference', async row => {
  const legacy = clone(row.lookup); delete legacy.food.assessmentInputs;
  const original = JSON.stringify(legacy), storage = memory();
  const historical = JSON.stringify([{ id: 'historical-cache-control', sodium: 0.22 }]);
  storage.setItem('nutritionEntries', historical);
  let now = Date.parse('2026-10-22T00:10:00Z');
  const cache = createRemoteBarcodeCache({ storage, clock: () => now });
  expect(cache.set(row.panel.identity.gtin, legacy)).toBe(true);
  now += REMOTE_BARCODE_CACHE_TTL_MS + 1;
  const { service, fetchImpl } = offlineService(legacy, { storage, clock: () => now,
    runtime: () => ({ isWeb: true, isOnline: false }) });
  const result = await service.lookup(row.panel.identity.gtin);
  expect(result.cache.hit).toBe(true);
  expect(result.stale).toBe(true);
  const candidate = createBarcodeNutritionCandidate(result);
  expect(candidate.selection.nutrients).toEqual(row.corrected);
  expect(candidate.selection.remote.assessmentInputs).toBeUndefined();
  expect(assessBarcodeNutrition(candidate, result.identifier).nutritionScore100).not.toBeNull();
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(storage.getItem('nutritionEntries')).toBe(historical);
  expect(JSON.stringify(legacy)).toBe(original);
});

function withMissingProtein(lookup) {
  // A constructed, internally consistent missing-nutrient control, not a
  // claim that the captured provider response lacked protein.
  const copy = clone(lookup), food = copy.food;
  food.nutrients.protein = null; food.nutritionBasis.sourceNutrients.protein = null;
  food.logReady = false; food.completeness = 'insufficient'; copy.status = 'incomplete';
  food.unknownFields = [...new Set([...food.unknownFields, 'nutrients.protein'])];
  food.assessmentInputs.datasets.forEach(dataset => {
    dataset.observations = dataset.observations.filter(observation => observation.nutrient !== 'protein');
  });
  return copy;
}

test.each(cases.filter(row => row.panel.mode === 'replacement-panel'))('$label: an applicable complete manufacturer panel fills a missing provider macro coherently', row => {
  const lookup = withMissingProtein(row.lookup), candidate = createBarcodeNutritionCandidate(lookup);
  expect(candidate.canUse).toBe(true);
  expect(candidate.selection.nutrients).toEqual(row.corrected);
  expect(candidate.selection.remote.nutrients.protein).toBeNull();
  expect(candidate.display.ingredients).toEqual(row.panel.ingredients);
  expect(assessBarcodeNutrition(candidate, lookup.identifier).result.normalized.originalNutrients).toEqual(row.panel.nutrients);
});

test('the partial Teddy sugar correction does not fill unrelated missing provider macros', () => {
  const candidate = createBarcodeNutritionCandidate(withMissingProtein(usdaCases.find(row => row.panel === teddyLabel).lookup));
  expect(candidate.canUse).toBe(false);
  expect(candidate.selection).toBeNull();
});

test.each(usdaCases.flatMap(row => [
  ['a different UPC', food => { food.identifiers[0].value = '012345678905'; }],
  ['a conflicting flavor', food => { food.name = 'Chocolate Brownie'; food.assessmentInputs.identity.name = food.name; }],
  ['a contradictory brand', food => { food.brand = 'Unrelated Brand'; food.assessmentInputs.identity.brand = food.brand; }],
  ['a foreign-only market', food => { food.assessmentInputs.markets = [{ field: 'marketCountry', values: ['France'] }]; }],
  ['a conflicting serving', food => { food.serving.amount = 28; food.serving.grams = 28; }],
  ['a conflicting package', food => { food.packageQuantity = '2.75 oz'; }],
  ['a mismatched assessment GTIN', food => { food.assessmentInputs.identity.providerGtin = '012345678905'; }],
].map(([condition, mutate]) => ({ row, condition, mutate }))))(
  '$row.label: constructed negative control rejects $condition', ({ row, mutate }) => {
    const food = clone(row.lookup.food); mutate(food);
    expect(resolveVerifiedNutritionCorrection(food, { identifier: row.lookup.identifier })).toBeNull();
  });

test.each(usdaCases.flatMap(row => [
  ['invalid source URL', lookup => { lookup.food.assessmentInputs.source.url = 'https://example.com/unrelated'; }],
  ['invalid capture status', lookup => { lookup.food.assessmentInputs.identification = 'unreviewed'; }],
  ['explicit invalid wrapper', lookup => { lookup.food.assessmentInputs = null; }],
].map(([condition, mutate]) => ({ row, condition, mutate }))))(
  '$row.label: candidate normalization does not turn $condition into allowed legacy absence', ({ row, mutate }) => {
    const lookup = clone(row.lookup); mutate(lookup);
    const candidate = createBarcodeNutritionCandidate(lookup);
    expect(candidate.canUse).toBe(true);
    expect(candidate.display.nutritionCorrection).toBeUndefined();
    expect(candidate.selection.nutrients).toEqual(row.lookup.food.nutrients);
  });

test.each(usdaCases)('$label: unknown package/market metadata alone does not contradict exact verified identity', row => {
  // Constructed metadata-absence control, not another captured observation.
  const food = clone(row.lookup.food);
  food.packageQuantity = null; food.assessmentInputs.markets = [];
  expect(resolveVerifiedNutritionCorrection(food, { identifier: row.lookup.identifier })?.id).toBe(row.panel.id);
});

test.each(usdaCases.flatMap(row => [.5, 1, 2].map(servings => ({ row, servings }))))(
  '$row.label: actual review → selection → save → reopen at $servings servings', async ({ row, servings }) => {
    const original = JSON.stringify(row.lookup), storage = memory();
    const legacy = { id: 'historical-provider-entry', name: 'Historical provider entry', loggedAt: '2026-10-20T12:00:00Z',
      ...row.lookup.food.nutrients, notes: '' };
    storage.setItem('nutritionEntries', JSON.stringify([legacy]));
    const { service } = offlineService(row.lookup);
    const props = { onBack: jest.fn(), nutritionEntries: [legacy],
      nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
      saveNutritionEntry: entry => appendNutritionEntry(storage, entry, { createId: () => 'new-manufacturer-entry' }).status === 'saved',
      updateNutritionEntry: jest.fn(), deleteNutritionEntry: jest.fn(), saveNutritionGoals: jest.fn(), saveUserFood: jest.fn(),
      barcodeLookupService: service, lifecycleAdapter: { subscribe: () => () => {} }, buttonStyle: {}, inputStyle: {}, containerStyle: {} };
    const originalScroll = window.scrollTo; window.scrollTo = jest.fn();
    let view;
    try {
      view = render(<NutritionPage {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }));
      fireEvent.change(screen.getByLabelText('Enter barcode manually'), { target: { value: row.panel.identity.gtin } });
      fireEvent.click(screen.getByRole('button', { name: 'Look Up Barcode' }));
      const review = await screen.findByRole('article', { name: 'Barcode product review' });
      expect(within(review).getByText(row.corrected.sodium + ' mg')).toBeInTheDocument();
      expect(within(review).getByRole('button', { name: 'Ingredients' })).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(screen.getByRole('button', { name: 'Use This Food' }));
      fireEvent.change(screen.getByLabelText('Number of servings'), { target: { value: String(servings) } });
      expect(screen.getByLabelText('Sodium (mg)', { selector: 'input[aria-label="Sodium (mg)"]' })).toHaveValue(row.corrected.sodium * servings);
      expect(screen.getByLabelText('Added Sugar (g)', { selector: 'input[aria-label="Added Sugar (g)"]' })).toHaveValue(row.corrected.addedSugar * servings);
      fireEvent.click(screen.getByRole('button', { name: 'Save Entry' }));
      await waitFor(() => expect(readNutritionEntries(storage).entries).toHaveLength(2));
      const entries = readNutritionEntries(storage).entries, saved = entries.find(entry => entry.id === 'new-manufacturer-entry');
      NUTRITION_ENTRY_NUTRIENT_KEYS.forEach(key => {
        expect(saved[key]).toBe(row.corrected[key] * servings);
        expect(saved.nutritionBasis[key]).toBe(row.corrected[key]);
      });
      expect(saved.foodReference.providerNutritionBasis.nutrients).toEqual(row.lookup.food.nutrients);
      expect(saved.foodReference.assessmentInputs).toEqual(row.lookup.food.assessmentInputs);
      expect(saved.foodReference.nutritionCorrection.source).toEqual(row.panel.source);
      expect(saved.foodReference.ingredients).toEqual(row.panel.mode === 'replacement-panel' ? row.panel.ingredients : row.lookup.food.ingredients);
      expect(entries.find(entry => entry.id === legacy.id)).toEqual(legacy);
      expect(JSON.stringify(saved)).not.toMatch(/nutritionScore100|overallScore100|"grade"|scoreReady/);
      view.unmount(); view = render(<NutritionPage {...props} nutritionEntries={[saved]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.getByLabelText('Added Sugar (g)', { selector: 'input[aria-label="Added Sugar (g)"]' })).toHaveValue(row.corrected.addedSugar * servings);
      fireEvent.change(screen.getByLabelText('Number of servings'), { target: { value: '2' } });
      expect(screen.getByLabelText('Sodium (mg)', { selector: 'input[aria-label="Sodium (mg)"]' })).toHaveValue(row.corrected.sodium * 2);
      expect(JSON.stringify(row.lookup)).toBe(original);
    } finally { view?.unmount(); window.scrollTo = originalScroll; }
  }, 20000);

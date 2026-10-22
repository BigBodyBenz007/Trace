import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import NutritionPage from '../components/NutritionPage';
import { lookupCatalogFoodByBarcode } from '../services/barcodeFoodLookup';
import { createRemoteBarcodeLookup } from '../services/remoteBarcodeLookup';
import { REMOTE_BARCODE_CACHE_TTL_MS } from '../services/remoteBarcodeCache';
import { appendNutritionEntry, readNutritionEntries } from '../services/nutritionEntryStorage';
import { NUTRITION_ENTRY_NUTRIENT_KEYS } from '../services/nutritionCalculation';
import { assessLookupForGrading } from './barcodeAssessmentFallback';

const { normalizeOpenFoodFactsProduct } = require('../../api/nutrition/_barcodeGateway.cjs');
const barcode = '00894700010045';
// Actual captured OFF product body from the existing 100-product sample. The
// catalog and OFF declarations are separate observations, not a verified common
// package revision. The test must replace the entire panel rather than borrow
// OFF ingredients while retaining the catalog's different sodium value.
const row = fs.readFileSync(path.join(__dirname,
  '../../docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl'), 'utf8')
  .trim().split('\n').map(JSON.parse).find(entry => entry.barcode === barcode);
const food = normalizeOpenFoodFactsProduct(row.responses[0].body.product, barcode, row.capturedAt);
const alternate = { status: 'found', identifier: { scheme: 'gtin', value: barcode }, food,
  providerAttempts: [{ provider: 'usda-fdc', status: 'not-found' }, { provider: 'open-food-facts', status: 'found' }] };
const originalEnvironment = process.env.NODE_ENV;
const originalScroll = window.scrollTo;
const memory = () => { const values = new Map(); return {
  getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
}; };

beforeEach(() => {
  process.env.NODE_ENV = 'development';
  window.history.replaceState({}, '', '/?barcodeGrading=1');
  window.scrollTo = jest.fn();
});
afterEach(() => {
  process.env.NODE_ENV = originalEnvironment;
  window.history.replaceState({}, '', '/');
  window.scrollTo = originalScroll;
});

test.each([
  { servings: .5, offline: false }, { servings: 1, offline: false },
  { servings: 2, offline: false }, { servings: 1, offline: true },
])('captured coherent source fallback survives actual review → selection → save → reopen at $servings servings (offline=$offline)', async ({ servings, offline }) => {
  const original = lookupCatalogFoodByBarcode(barcode), snapshot = JSON.stringify({ original, alternate });
  const storage = memory(), cacheStorage = memory();
  const historical = { id: 'historical-original-edition', name: 'Historical catalog entry',
    loggedAt: '2026-10-20T12:00:00Z', ...original.food.nutrients, notes: '' };
  storage.setItem('nutritionEntries', JSON.stringify([historical]));
  let now = Date.parse('2026-10-22T00:10:00Z');
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200,
    headers: { get: () => null }, text: async () => JSON.stringify(alternate) });
  const makeService = (online, fetcher) => createRemoteBarcodeLookup({ storage: cacheStorage,
    fetchImpl: fetcher, clock: () => now, localLookup: lookupCatalogFoodByBarcode,
    runtime: { isWeb: true, isOnline: online } });
  let service = makeService(true, fetchImpl);
  const offlineFetch = jest.fn();
  if (offline) {
    await service.lookup(barcode, { assess: assessLookupForGrading });
    now += REMOTE_BARCODE_CACHE_TTL_MS + 1;
    service = makeService(false, offlineFetch);
  }
  const props = { onBack: jest.fn(), nutritionEntries: [historical],
    nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
    saveNutritionEntry: entry => appendNutritionEntry(storage, entry, { createId: () => 'new-fallback-entry' }).status === 'saved',
    updateNutritionEntry: jest.fn(), deleteNutritionEntry: jest.fn(), saveNutritionGoals: jest.fn(), saveUserFood: jest.fn(),
    barcodeLookupService: service, lifecycleAdapter: { subscribe: () => () => {} },
    buttonStyle: {}, inputStyle: {}, containerStyle: {} };
  let view = render(<NutritionPage {...props} />);
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }));
    fireEvent.change(screen.getByLabelText('Enter barcode manually'), { target: { value: barcode } });
    fireEvent.click(screen.getByRole('button', { name: 'Look Up Barcode' }));
    const review = await screen.findByRole('article', { name: 'Barcode product review' });
    expect(within(review).getByText('55 mg')).toBeInTheDocument();
    expect(within(review).queryByText('60 mg')).not.toBeInTheDocument();
    expect(within(review).getByRole('button', { name: 'Ingredients' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(review).getByLabelText('Score details & limitations')).not.toHaveAttribute('open');
    expect(within(review).getByLabelText('Experimental overall rating')).toBeInTheDocument();
    expect(readNutritionEntries(storage).entries).toEqual([historical]);
    fireEvent.click(within(review).getByRole('button', { name: 'Use This Food' }));
    fireEvent.change(screen.getByLabelText('Number of servings'), { target: { value: String(servings) } });
    expect(screen.getByLabelText('Sodium (mg)', { selector: 'input[aria-label="Sodium (mg)"]' })).toHaveValue(55 * servings);
    fireEvent.click(screen.getByRole('button', { name: 'Save Entry' }));
    await waitFor(() => expect(readNutritionEntries(storage).entries).toHaveLength(2));
    const saved = readNutritionEntries(storage).entries.find(entry => entry.id === 'new-fallback-entry');
    NUTRITION_ENTRY_NUTRIENT_KEYS.forEach(key => {
      expect(saved[key]).toBe(food.nutrients[key] * servings);
      expect(saved.nutritionBasis[key]).toBe(food.nutrients[key]);
    });
    expect(saved.foodReference.provider).toEqual(food.provider);
    expect(saved.foodReference.ingredients).toEqual(food.ingredients);
    expect(saved.foodReference.assessmentInputs).toEqual(offline
      ? { ...food.assessmentInputs, source: { ...food.assessmentInputs.source, cacheStale: true } }
      : food.assessmentInputs);
    expect(saved.foodReference.providerNutritionBasis.nutrients).toEqual(food.nutrients);
    expect(saved.foodReference.sourceSelection).toMatchObject({ outcome: 'fallback-selected',
      preferred: { food: original.food } });
    expect(saved.foodReference.sourceSelection.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ food }),
    ]));
    expect(JSON.stringify(saved)).not.toMatch(/nutritionScore100|overallScore100|scoreReady|"grade"/);
    expect(readNutritionEntries(storage).entries.find(entry => entry.id === historical.id)).toEqual(historical);
    view.unmount();
    view = render(<NutritionPage {...props} nutritionEntries={[saved]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Sodium (mg)', { selector: 'input[aria-label="Sodium (mg)"]' })).toHaveValue(55 * servings);
    fireEvent.change(screen.getByLabelText('Number of servings'), { target: { value: '2' } });
    expect(screen.getByLabelText('Sodium (mg)', { selector: 'input[aria-label="Sodium (mg)"]' })).toHaveValue(110);
    expect(JSON.stringify({ original, alternate })).toBe(snapshot);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(offlineFetch).not.toHaveBeenCalled();
  } finally { view.unmount(); }
}, 20000);

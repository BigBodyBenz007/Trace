// Twenty normalized score replays and twelve raw-nutrient gateway replays.
// Neither substitutes newer manufacturer labels for the captured observations.
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import NutritionPage from '../components/NutritionPage';
import comparison from '../../docs/trace-nutrition-v2-comparison-2026-10-20.json';
import first from '../../docs/barcode-grading-grocery-pilot-2026-10-20/results.json';
import follow from '../../docs/barcode-grading-grocery-pilot-2026-10-20/follow-up-results.json';
import energyArchive from '../../docs/barcode-energy-provider-evidence-2026-10-20.json';
import overallArchive from '../../docs/trace-overall-food-quality-2026-10-20.json';
import { createBarcodeNutritionCandidate } from './barcodeNutritionSelection';
import { getAssessmentDatasetNutrients } from './nutritionAssessmentInputs';
import { scaleNutrition } from './nutritionCalculation';
import { assessBarcodeNutrition } from '../development/barcodeNutritionAssessment';
import { assessOverallFoodQuality } from '../development/traceOverallFoodQuality';
import { appendNutritionEntry, readNutritionEntries, updateStoredNutritionEntry } from './nutritionEntryStorage';
import { shouldLoadBarcodeGrading } from '../development/barcodeGradingMode';

const { normalizeOpenFoodFactsProduct, lookupRemoteBarcode } = require('../../api/nutrition/_barcodeGateway.cjs');
const clone = value => JSON.parse(JSON.stringify(value));

test.each(comparison.products.slice(0, 20))('already-normalized score replay (bypasses gateway): $selectedName', row => {
  const observation = follow.observations.find(o => o.barcode === row.barcode)
    || first.observations.find(o => o.barcode === row.barcode);
  const original = JSON.stringify(observation);
  const lookup = clone(observation.lookup);
  // Recover only the previously reviewed approximate-energy qualifiers. All
  // numeric values, source dates and ingredient observations remain unchanged.
  const approved = row.qualificationReview && row.after.evidence.originalDataset;
  const dataset = approved ? lookup.food.assessmentInputs.datasets.find(d => d.id === approved.id) : null;
  expect(Boolean(dataset)).toBe(Boolean(approved));
  const entries = dataset?.observations || [];
  expect(entries.map(entry => entry.rawValue)).toEqual(entries.map(entry =>
    approved.observations.find(o => o.field === entry.field).rawValue));
  entries.forEach(entry => {
    entry.derivation = approved.observations.find(o => o.field === entry.field).derivation;
  });
  // Historical batch assertions retain the captured provider panel. Reviewed
  // manufacturer replacements have separate raw-to-logging integration tests.
  const candidate = createBarcodeNutritionCandidate(lookup, { applyVerifiedCorrections: false });
  const before = JSON.stringify(candidate);
  const assessment = assessBarcodeNutrition(candidate, lookup.identifier);
  const overall = assessOverallFoodQuality(candidate, assessment);
  expect(assessment.nutritionScore100).toBe(row.after.nutritionScore100);
  expect(overall.overallScore100).toBe(overallArchive.products.find(p => p.barcode === row.barcode).overallScore100);
  expect(overall).toMatchObject({ grade: null, scoreReady: Number.isInteger(overall.overallScore100) });
  expect(JSON.stringify(candidate)).toBe(before);
  expect(JSON.stringify(observation)).toBe(original);
});

test.each(energyArchive.products)('captured raw OFF nutrients traverse gateway and assessment: $barcode', row => {
  const original = JSON.stringify(row.body.product);
  const lookup = (follow.observations.find(o => o.barcode === row.barcode)
    || first.observations.find(o => o.barcode === row.barcode)).lookup;
  // Identity fields come from this exact captured gateway response. The raw
  // nutritional values and serving metadata are the original provider fields.
  const product = { ...row.body.product, brands: lookup.food.brand,
    quantity: lookup.food.packageQuantity, lang: lookup.food.ingredients?.language,
    ingredients_text: lookup.food.ingredients?.text };
  // The energy archive retained raw nutrients, not the complete HTTP response.
  // Rejoin non-nutrition category/market fields from the same captured lookup.
  for (const claim of [...lookup.food.assessmentInputs.markets, ...lookup.food.assessmentInputs.categories]) {
    product[claim.field] = claim.field.endsWith('_tags') ? claim.values : claim.values[0];
  }
  const food = normalizeOpenFoodFactsProduct(product, row.barcode, lookup.food.provenance.retrievedAt);
  Object.entries(lookup.food.nutrients).filter(([, value]) => value === null).forEach(([key]) => {
    expect(food.nutrients[key]).toBeNull();
  });
  Object.entries(lookup.food.nutrients).filter(([, value]) => value !== null).forEach(([key, value]) => {
    expect(food.nutrients[key]).toBeCloseTo(value, 7);
  });
  const candidate = createBarcodeNutritionCandidate({ ...lookup, food }, { applyVerifiedCorrections: false });
  expect(assessBarcodeNutrition(candidate, lookup.identifier).nutritionScore100)
    .toBe(comparison.products.find(p => p.barcode === row.barcode).after.nutritionScore100);
  expect(JSON.stringify(row.body.product)).toBe(original);
});

test('corrected raw units reach real review, selection, assessment, save and reopen paths', async () => {
  const product = { code: '012345678905', product_name: 'Synthetic unit check', brands: 'Synthetic',
    serving_size: '30 g', serving_quantity: 30, serving_quantity_unit: 'g', nutrition_data_per: '100g',
    countries_tags: ['en:united-states'], categories_tags: ['en:breakfast-cereals'],
    nutriments: { 'energy-kcal_100g': 400, proteins_100g: 10, fat_100g: 5,
      'saturated-fat_100g': 1, carbohydrates_100g: 50, fiber_100g: 2, sugars_100g: 10,
      'added-sugars_100g': 8, sodium_100g: 0.5, sodium_unit: 'mg', sodium_value: 500 } };
  const original = JSON.stringify(product);
  const lookup = await lookupRemoteBarcode({ barcode: product.code,
    now: () => Date.parse('2026-10-21T12:00:00.000Z'), env: { OPEN_FOOD_FACTS_USER_AGENT: 'Trace-unit-test' },
    fetchImpl: jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => null }, body: null,
      text: async () => JSON.stringify({ status: 1, product }) }),
  });
  expect(lookup.status).toBe('found');
  const assessment = assessBarcodeNutrition(createBarcodeNutritionCandidate(lookup), lookup.identifier);
  expect(assessment.nutritionScore100).not.toBeNull();
  expect(assessment.result.normalized.originalNutrients.sodium).toBe(500);
  expect(assessment).toMatchObject({ grade: null, scoreReady: true });

  // Test-only memory storage. No real browser/profile/storage is opened.
  const legacy = { id: 'legacy-unit-check', name: 'Historical unit check', loggedAt: '2026-10-20T12:00:00.000Z',
    calories: 100, protein: 2, carbohydrates: 20, fat: 1, sodium: 0.15, notes: '' };
  const values = new Map([['nutritionEntries', JSON.stringify([legacy])]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const props = { onBack: jest.fn(), nutritionEntries: [legacy],
    nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
    saveNutritionEntry: entry => appendNutritionEntry(storage, entry, { createId: () => 'new-unit-check' }).status === 'saved',
    updateNutritionEntry: (id, entry) => updateStoredNutritionEntry(storage, id, entry).status === 'saved',
    deleteNutritionEntry: jest.fn(), saveNutritionGoals: jest.fn(), saveUserFood: jest.fn(),
    barcodeLookupService: { lookup: jest.fn().mockResolvedValue(lookup) },
    lifecycleAdapter: { subscribe: () => () => {} }, buttonStyle: {}, inputStyle: {}, containerStyle: {} };
  const oldScroll = window.scrollTo;
  window.scrollTo = jest.fn();
  let view;
  try {
    view = render(React.createElement(NutritionPage, props));
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }));
    const input = screen.getByLabelText('Enter barcode manually');
    fireEvent.change(input, { target: { value: product.code } });
    fireEvent.click(screen.getByRole('button', { name: 'Look Up Barcode' }));
    const review = await screen.findByRole('article', { name: 'Barcode product review' });
    expect(within(review).getByText('150 mg')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use This Food' }));
    const sodium = () => screen.getByLabelText('Sodium (mg)', { selector: 'input[aria-label="Sodium (mg)"]' });
    expect(sodium()).toHaveValue(150);
    fireEvent.change(screen.getByLabelText('Number of servings'), { target: { value: '2' } });
    expect(sodium()).toHaveValue(300);
    fireEvent.click(screen.getByRole('button', { name: 'Save Entry' }));
    await waitFor(() => expect(readNutritionEntries(storage).entries).toHaveLength(2));
    const saved = readNutritionEntries(storage).entries.find(entry => entry.id === 'new-unit-check');
    expect(saved.sodium).toBe(300);
    expect(saved.nutritionBasis.sodium).toBe(150);
    const datasets = saved.foodReference.assessmentInputs.datasets;
    expect(datasets.find(d => d.id === 'off-100g').observations.find(o => o.nutrient === 'sodium'))
      .toMatchObject({ rawValue: 0.5, rawUnit: 'g', enteredUnit: 'mg' });
    expect(datasets.find(d => d.id === 'off-value').observations.find(o => o.nutrient === 'sodium'))
      .toMatchObject({ rawValue: 500, rawUnit: 'mg', enteredUnit: 'mg' });
    expect(JSON.stringify(saved)).not.toMatch(/nutritionScore100|overallScore100|"grade"|scoreReady/);
    view.unmount();
    view = render(React.createElement(NutritionPage, { ...props, nutritionEntries: [saved] }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(sodium()).toHaveValue(300);
    fireEvent.change(screen.getByLabelText('Number of servings'), { target: { value: '0.5' } });
    expect(sodium()).toHaveValue(75);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(readNutritionEntries(storage).entries.find(entry => entry.id === 'new-unit-check').sodium).toBe(75);
    expect(readNutritionEntries(storage).entries.find(entry => entry.id === legacy.id)).toEqual(legacy);
    expect(JSON.stringify(product)).toBe(original);
  } finally {
    view?.unmount();
    window.scrollTo = oldScroll;
  }
});

test('normal Production grading needs no preview flag', () => {
  expect(shouldLoadBarcodeGrading('production', 'trace-umber.vercel.app', '')).toBe(true);
  expect(shouldLoadBarcodeGrading('production', 'trace-umber.vercel.app', '?barcodeGrading=1&nutritionPilot=1')).toBe(true);
});

test('normalized OFF units agree across review, assessment and new-entry serving multiplication', () => {
  // Synthetic API-contract fixture, not a fabricated grocery observation.
  const product = { code: '012345678905', product_name: 'Synthetic unit check',
    serving_size: '30 g', serving_quantity: 30, serving_quantity_unit: 'g', nutrition_data_per: '100g',
    nutriments: { 'energy-kcal_100g': 400, proteins_100g: 10, fat_100g: 5,
      carbohydrates_100g: 50, fiber_100g: 2, sugars_100g: 10,
      'added-sugars_100g': 8, sodium_100g: 0.5, sodium_unit: 'mg', sodium_value: 500 } };
  const food = normalizeOpenFoodFactsProduct(product, product.code, '2026-10-21T12:00:00.000Z');
  const lookup = { status: 'found', identifier: { scheme: 'gtin', value: product.code }, food };
  const candidate = createBarcodeNutritionCandidate(lookup);
  expect(candidate.display.nutrients.sodium).toBe(150);
  expect(candidate.selection.nutrients.sodium).toBe(150);
  const reference = food.assessmentInputs.datasets.find(d => d.id === 'off-100g');
  expect(getAssessmentDatasetNutrients(reference).sodium.value).toBe(500);
  for (const servings of [0.5, 1, 1.25, 2]) {
    expect(scaleNutrition(candidate.selection.nutrients, servings).sodium).toBe(150 * servings);
  }
  expect(candidate.selection.remote.assessmentInputs).toEqual(food.assessmentInputs);
});

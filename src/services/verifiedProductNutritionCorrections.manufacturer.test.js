import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import NutritionPage from '../components/NutritionPage';
import BarcodeNutritionReview, { BarcodeAdditives } from '../development/BarcodeNutritionReview';
import panels from '../data/questSpamManufacturerLabels.json';
import first from '../../docs/barcode-grading-grocery-pilot-2026-10-20/results.json';
import follow from '../../docs/barcode-grading-grocery-pilot-2026-10-20/follow-up-results.json';
import energy from '../../docs/barcode-energy-provider-evidence-2026-10-20.json';
import { createBarcodeNutritionCandidate } from './barcodeNutritionSelection';
import { createRemoteBarcodeLookup } from './remoteBarcodeLookup';
import { REMOTE_BARCODE_CACHE_TTL_MS } from './remoteBarcodeCache';
import { getAppliedVerifiedNutritionCorrection, isVerifiedManufacturerNutritionPanel } from './verifiedProductNutritionCorrections';
import { assessBarcodeNutrition } from '../development/barcodeNutritionAssessment';
import { assessOverallFoodQuality } from '../development/traceOverallFoodQuality';
import { appendNutritionEntry, readNutritionEntries } from './nutritionEntryStorage';
import { scaleNutrition, NUTRITION_ENTRY_NUTRIENT_KEYS } from './nutritionCalculation';

const { lookupRemoteBarcode } = require('../../api/nutrition/_barcodeGateway.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const memory = () => { const values = new Map(); return {
  getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
}; };

// Captured raw nutrient/serving fields, rejoined with identity, ingredient,
// market/category and additive metadata from the SAME archived lookup. This is
// not represented as an intact original HTTP response or fresh provider lookup.
function rawObservation(panel) {
  const barcode = panel.identity.gtin.padStart(14, '0');
  const lookup = (follow.observations.find(o => o.barcode === barcode)
    || first.observations.find(o => o.barcode === barcode)).lookup;
  const food = lookup.food;
  const product = { ...clone(energy.products.find(row => row.barcode === barcode).body.product),
    brands: food.brand, quantity: food.packageQuantity, lang: food.ingredients.language,
    ingredients_text: food.ingredients.text, additives_tags: food.additives.items.map(item => item.providerIdentifier) };
  for (const claim of [...food.assessmentInputs.markets, ...food.assessmentInputs.categories]) {
    product[claim.field] = claim.field.endsWith('_tags') ? claim.values : claim.values[0];
  }
  return { barcode, product };
}

async function lookupCaptured(panel) {
  const { barcode, product } = rawObservation(panel), original = JSON.stringify(product);
  const lookup = await lookupRemoteBarcode({ barcode,
    now: () => Date.parse(panel.providerObservation.revisionDate) + 60000,
    env: { OPEN_FOOD_FACTS_USER_AGENT: 'Trace-offline-regression' },
    fetchImpl: jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => null }, body: null,
      text: async () => JSON.stringify({ status: 1, product }) }),
  });
  expect(lookup.status).toBe('found');
  expect(JSON.stringify(product)).toBe(original);
  return lookup;
}

test.each(panels)('exact manufacturer evidence replaces one coherent panel: $identity.name', async panel => {
  expect(isVerifiedManufacturerNutritionPanel(panel)).toBe(true);
  const lookup = await lookupCaptured(panel), original = JSON.stringify(lookup);
  const candidate = createBarcodeNutritionCandidate(lookup);
  expect(candidate.display.nutritionCorrection?.id).toBe(panel.id);
  expect(candidate.selection.nutrients).toEqual(Object.fromEntries(NUTRITION_ENTRY_NUTRIENT_KEYS.map(key => [key, panel.nutrients[key]])));
  expect(candidate.selection.serving).toEqual({ ...panel.serving, grams: panel.serving.amount });
  expect(candidate.display.ingredients).toEqual(panel.ingredients);
  expect(candidate.display.ingredientSource).toEqual(panel.source);
  expect(candidate.display.additives).toBeUndefined();
  expect(candidate.selection.remote.ingredients).toEqual(lookup.food.ingredients);
  expect(candidate.selection.remote.additives).toEqual(lookup.food.additives);
  expect(candidate.selection.remote.assessmentInputs).toEqual(lookup.food.assessmentInputs);
  const sodiumObservation = candidate.selection.remote.assessmentInputs.datasets.find(d => d.id === 'off-serving')
    .observations.find(o => o.nutrient === 'sodium');
  expect(sodiumObservation.rawValue).toBe(panel.identity.brand === 'Quest' ? .00022 : .00136);
  expect(sodiumObservation.rawUnit).toBe('g');
  const before = createBarcodeNutritionCandidate(lookup, { applyVerifiedCorrections: false });
  const oldNutrition = assessBarcodeNutrition(before, lookup.identifier);
  const oldOverall = assessOverallFoodQuality(before, oldNutrition);
  expect(oldNutrition.nutritionScore100).toBe(panel.identity.brand === 'Quest' ? 54 : 23);
  expect(oldOverall.overallScore100).toBe(panel.identity.brand === 'Quest' ? 52 : 22);
  const nutrition = assessBarcodeNutrition(candidate, lookup.identifier);
  expect(nutrition.nutritionScore100).toBe(panel.identity.brand === 'Quest' ? 54 : 21);
  expect(nutrition.result.rawScore).toBeCloseTo(panel.identity.brand === 'Quest' ? 54.181623931623925 : 21.15, 10);
  expect(nutrition.result.normalized.originalNutrients).toEqual(panel.nutrients);
  expect(nutrition.result.normalized.originalBasis).toMatchObject({ amount: panel.serving.amount, unit: 'g' });
  expect(nutrition.evidence.originalProviderAssessment).toEqual(oldNutrition);
  expect(nutrition.evidence.reviewedManufacturerLabel).toEqual(panel);
  expect(nutrition).toMatchObject({ grade: null, scoreReady: false, scanMatchEligible: false });
  const overall = assessOverallFoodQuality(candidate, nutrition);
  expect(overall.overallScore100).toBe(panel.identity.brand === 'Quest' ? 52 : 20);
  expect(overall.additiveAssessment.source).toEqual({ url: panel.source.url, attribution: panel.source.attribution });
  expect(overall.additiveAssessment.originalIngredientText).toBe(panel.ingredients.text);
  expect(overall.additiveAssessment.items.every(item => item.providerIdentifiers.length === 0)).toBe(true);
  expect(overall).toMatchObject({ grade: null, scoreReady: false });
  for (const quantity of [.5, 1, 2]) {
    const multiplied = scaleNutrition(candidate.selection.nutrients, quantity);
    NUTRITION_ENTRY_NUTRIENT_KEYS.forEach(key => expect(multiplied[key]).toBe(panel.nutrients[key] * quantity));
  }
  const view = render(<><BarcodeNutritionReview candidate={candidate} identifier={lookup.identifier} /><BarcodeAdditives candidate={candidate} /></>);
  expect(screen.getByLabelText('Score evidence scope')).toHaveTextContent('manufacturer label');
  expect(screen.getByText('Manufacturer nutrition')).toHaveAttribute('href', panel.source.nutritionUrl || panel.source.url);
  expect(screen.queryByLabelText('Manufacturer label comparison')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Why this score')).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Product additives')).not.toHaveAttribute('open');
  expect(screen.queryByText(/Honey · 10 oz/)).not.toBeInTheDocument();
  view.unmount();
  expect(JSON.stringify(lookup)).toBe(original);
});

test.each(panels)('fresh and expired cached observations cannot bypass the local panel: $identity.name', async panel => {
  const captured = await lookupCaptured(panel), storage = memory();
  let now = Date.parse('2026-10-21T12:00:00Z');
  let isOnline = true;
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => null }, text: async () => JSON.stringify(captured) });
  const service = createRemoteBarcodeLookup({ fetchImpl, storage, clock: () => now,
    runtime: () => ({ isWeb: true, isOnline }), localLookup: () => ({ status: 'not-found' }) });
  await service.lookup(panel.identity.gtin);
  let result = await service.lookup(panel.identity.gtin);
  expect(result.cache.hit).toBe(true);
  expect(createBarcodeNutritionCandidate(result).selection.nutrients.sodium).toBe(panel.nutrients.sodium);
  isOnline = false; now += REMOTE_BARCODE_CACHE_TTL_MS + 1;
  result = await service.lookup(panel.identity.gtin);
  expect(result.stale).toBe(true);
  const candidate = createBarcodeNutritionCandidate(result);
  expect(candidate.stale).toBe(true);
  expect(assessBarcodeNutrition(candidate, result.identifier).result.normalized.originalNutrients).toEqual(panel.nutrients);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  // Old cached wrappers may lack the qualifier correction. Even an unscorable
  // original provider assessment must not suppress the independent label panel.
  const older = clone(result);
  older.food.assessmentInputs.datasets.forEach(d => d.observations.forEach(o => { o.derivation = null; }));
  expect(assessBarcodeNutrition(createBarcodeNutritionCandidate(older), older.identifier).nutritionScore100).not.toBeNull();
});

test.each(panels.flatMap(panel => [1, .5, 2].map(quantity => ({ panel, quantity }))))(
  'actual review, save and reopen: $panel.identity.name, $quantity servings', async ({ panel, quantity }) => {
  const lookup = await lookupCaptured(panel), original = JSON.stringify(lookup);
  const legacy = { id: 'historical', name: 'Old saved product', loggedAt: '2026-10-20T12:00:00Z',
    calories: 100, protein: 2, carbohydrates: 20, fat: 1, sodium: panel.providerObservation.nutrients.sodium, notes: '' };
    const storage = memory(); storage.setItem('nutritionEntries', JSON.stringify([legacy]));
    const lookupStorage = memory();
    const service = createRemoteBarcodeLookup({ storage: lookupStorage, localLookup: () => ({ status: 'not-found' }),
      runtime: () => ({ isWeb: true, isOnline: true }),
      fetchImpl: jest.fn().mockResolvedValue({ ok: true, headers: { get: () => null }, text: async () => JSON.stringify(lookup) }) });
    const props = { onBack: jest.fn(), nutritionEntries: [], nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
      saveNutritionEntry: entry => appendNutritionEntry(storage, entry, { createId: () => 'new-label-entry' }).status === 'saved',
      updateNutritionEntry: jest.fn(), deleteNutritionEntry: jest.fn(), saveNutritionGoals: jest.fn(), saveUserFood: jest.fn(),
      barcodeLookupService: service, lifecycleAdapter: { subscribe: () => () => {} }, buttonStyle: {}, inputStyle: {}, containerStyle: {} };
    const oldScroll = window.scrollTo; window.scrollTo = jest.fn();
    let view;
    try {
      view = render(<NutritionPage {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }));
      fireEvent.change(screen.getByLabelText('Enter barcode manually'), { target: { value: panel.identity.gtin } });
      fireEvent.click(screen.getByRole('button', { name: 'Look Up Barcode' }));
      const review = await screen.findByRole('article', { name: 'Barcode product review' });
      expect(within(review).getByText(panel.nutrients.sodium + ' mg')).toBeInTheDocument();
      expect(review).toHaveTextContent(panel.serving.description);
      const ingredients = within(review).getByRole('button', { name: 'Ingredients' });
      expect(ingredients).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(ingredients);
      expect(within(review).getByLabelText('Ingredient text')).toHaveTextContent(panel.ingredients.text);
      expect(within(review).getByText('Source: ' + panel.source.attribution)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Use This Food' }));
      fireEvent.change(screen.getByLabelText('Number of servings'), { target: { value: String(quantity) } });
      expect(screen.getByLabelText('Sodium (mg)', { selector: 'input[aria-label="Sodium (mg)"]' })).toHaveValue(panel.nutrients.sodium * quantity);
      fireEvent.click(screen.getByRole('button', { name: 'Save Entry' }));
      await waitFor(() => expect(readNutritionEntries(storage).entries).toHaveLength(2));
      const entries = readNutritionEntries(storage).entries, saved = entries.find(entry => entry.id === 'new-label-entry');
      NUTRITION_ENTRY_NUTRIENT_KEYS.forEach(key => {
        expect(saved[key]).toBe(panel.nutrients[key] * quantity);
        expect(saved.nutritionBasis[key]).toBe(panel.nutrients[key]);
      });
      expect(saved.foodReference.nutritionCorrection.manufacturerPanel).toEqual(panel);
      expect(saved.foodReference.providerNutritionBasis.nutrients).toEqual(lookup.food.nutrients);
      expect(saved.foodReference.providerNutritionBasis.serving).toEqual(lookup.food.serving);
      expect(saved.foodReference.assessmentInputs).toEqual(lookup.food.assessmentInputs);
      expect(saved.foodReference.ingredients).toEqual(panel.ingredients);
      expect(saved.foodReference.ingredientSource).toEqual(panel.source);
      expect(saved.foodReference.additives).toBeUndefined();
      expect(entries.find(entry => entry.id === legacy.id)).toEqual(legacy);
      expect(JSON.stringify(saved)).not.toMatch(/nutritionScore100|overallScore100|"grade"|scoreReady/);
      view.unmount(); view = render(<NutritionPage {...props} nutritionEntries={[saved]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.getByLabelText('Sodium (mg)', { selector: 'input[aria-label="Sodium (mg)"]' })).toHaveValue(panel.nutrients.sodium * quantity);
      fireEvent.change(screen.getByLabelText('Number of servings'), { target: { value: '2' } });
      expect(screen.getByLabelText('Sodium (mg)', { selector: 'input[aria-label="Sodium (mg)"]' })).toHaveValue(panel.nutrients.sodium * 2);
      expect(JSON.stringify(lookup)).toBe(original);
    } finally { view?.unmount(); window.scrollTo = oldScroll; }
}, 20000);

test.each([
  ['a different UPC', c => { c.identifier.value = '044000045586'; }],
  ['a different flavor', c => { c.food.name = 'Chocolate Brownie'; }],
  ['a different package', c => { c.food.packageQuantity = 'Different size'; }],
  ['a different serving', c => { c.food.serving.grams = 40; }],
  ['an internally inconsistent provider nutrient wrapper', c => { c.food.nutrients.sodium = 200; }],
  ['a foreign-only claim', c => { c.food.assessmentInputs.markets = [{ field: 'countries_tags', values: ['en:france'] }]; }],
])('does not apply the US reference to %s', async (_, mutate) => {
  const lookup = clone(await lookupCaptured(panels[0])); mutate(lookup);
  expect(createBarcodeNutritionCandidate(lookup)?.display.nutritionCorrection).toBeUndefined();
});

test('old ingredient text alone does not disqualify a verified current UPC panel; edited correction data cannot forge assessment', async () => {
  const lookup = clone(await lookupCaptured(panels[0])); lookup.food.ingredients.text = 'Older manufacturer ingredient declaration.';
  const candidate = createBarcodeNutritionCandidate(lookup);
  expect(candidate.display.ingredients).toEqual(panels[0].ingredients);
  const edited = clone(candidate); edited.display.nutrients.sodium = .22;
  expect(getAppliedVerifiedNutritionCorrection(edited, lookup.identifier)).toBeNull();
  const wrongSource = clone(candidate); wrongSource.display.sourceUrl = 'https://example.com';
  expect(getAppliedVerifiedNutritionCorrection(wrongSource, lookup.identifier)).toBeNull();
});

test('the manufacturer reference is bound to product identity, not one captured OFF revision date', async () => {
  // Constructed source-edition control, not a newly captured source revision.
  const lookup = clone(await lookupCaptured(panels[0]));
  lookup.food.provenance.revisionDate = '2020-01-01T00:00:00.000Z';
  lookup.food.assessmentInputs.source.revisionDate = lookup.food.provenance.revisionDate;
  const candidate = createBarcodeNutritionCandidate(lookup);
  expect(candidate.display.nutritionCorrection?.id).toBe(panels[0].id);
  expect(candidate.selection.remote.provenance.revisionDate).toBe('2020-01-01T00:00:00.000Z');
});

test.each([
  panel => { panel.source.url = 'https://example.com'; },
  panel => { panel.source.nutritionUrl = 'https://example.com'; },
  panel => { panel.source.updatedOn = '2026-02-31'; },
  panel => { panel.source.verifiedAt = null; },
  panel => { panel.source.edition = null; },
  panel => { panel.sourceArtifacts = []; },
  panel => { panel.nutrients.sodium = null; },
  panel => { panel.ingredients.text = null; },
])('manufacturer replacement requires complete, coherent official evidence (%#)', mutate => {
  const panel = clone(panels[0]); mutate(panel);
  expect(isVerifiedManufacturerNutritionPanel(panel)).toBe(false);
});

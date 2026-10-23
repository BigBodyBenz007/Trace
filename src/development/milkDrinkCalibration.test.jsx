import { render, screen, fireEvent } from '@testing-library/react';
import { evaluateTraceUsNutritionV2 as evaluate } from './traceUsNutritionScoringV2';
import { resolveMilkDrinkEvidence } from './milkDrinkEvidence';
import { measurementQuantity } from './barcodeNutritionEvidence';
import { assessBarcodeNutrition } from './barcodeNutritionAssessment';
import { assessOverallFoodQuality } from './traceOverallFoodQuality';
import { explainNutritionPoints, getNutritionHighlights } from './barcodeReviewInformation';
import BarcodeNutritionReview from './BarcodeNutritionReview';
import { createBarcodeNutritionCandidate } from '../services/barcodeNutritionSelection';
import { createRemoteBarcodeLookup } from '../services/remoteBarcodeLookup';
import { shouldLoadBarcodeGrading } from './barcodeGradingMode';
import batch from '../../docs/nutrition-v2-calibration-2026-10-21.json';
const { normalizeOpenFoodFactsProduct } = require('../../api/nutrition/_barcodeGateway.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const reference = id => batch.references.find(ref => ref.id === id);
function inputFor(id = 'nonfat-milk') {
  const ref = reference(id), source = { url: ref.source.url, attribution: ref.source.attribution };
  return clone({ category: ref.category, basis: ref.basis, nutrients: ref.nutrients, source,
    productEvidence: { name: ref.source.documentTitle, source,
      categories: [{ field: 'official-product-page.section', values: ['fluid-dairy-milk'] }] } });
}

test.each([['nonfat-milk', 86], ['whole-milk', 80], ['sweetened-milk', 72]])(
  'frozen official reference %s reproduces the evaluated milk-only candidate %s', (id, expected) => {
    const input = inputFor(id), before = JSON.stringify(input), result = evaluate(input);
    expect(result).toMatchObject({ nutritionScore100: expected, grade: null, scoreReady: false,
      methodVersion: '2.1-milk-development-2026-10-21', sugarMode: 'addedSugar',
      comparison: { milkDrinkPolicyApplied: true, energyRule: 'milk food-energy ramp per 100 mL' } });
    expect(result.comparison.energyBurden).toBe(0);
    expect(JSON.stringify(input)).toBe(before);
  });

test('declared zero is preferred; unknown, invalid and contradictory added sugars retain total fallback', () => {
  const input = inputFor(), known = evaluate(input);
  expect(known.normalized.nutrients.addedSugar).toBe(0);
  expect(known.comparison.burdens.sugar).toBe(0);
  expect(known.points.sugar.min).toBe(0);
  expect(getNutritionHighlights(known).some(item => item.key === 'sugar')).toBe(false);
  for (const value of [null, -1, 13]) {
    const changed = clone(input); changed.nutrients.addedSugar.value = value;
    const result = evaluate(changed);
    expect(result.nutritionScore100).toBe(61);
    expect(result.sugarMode).toBe('totalSugar');
    expect(result.comparison.burdens.sugar).toBe(.5);
    expect(explainNutritionPoints(result)).toContain('naturally occurring sugars are not estimated');
    expect(changed.nutrients.addedSugar.value).toBe(value);
  }
  const unsupported = clone(input); unsupported.nutrients.addedSugar.unit = 'mg';
  expect(evaluate(unsupported).nutritionScore100).toBe(61);
  expect(evaluate(unsupported).excludedNutrients).toContain('addedSugar');
});

test.each([
  ['Fat Free Milk', ['en:dairies', 'en:milks-liquid-and-powder', 'en:milks']],
  ['Whole Milk', ['en:whole-milks']], ['Chocolate Milk', ['en:flavoured-milks']],
  ['Lactose Free Ultra-Filtered Milk', ['en:milks', 'en:lactose-free-milk']],
  ['High Protein Ultra-filtered Milk', ['en:milks', 'en:skimmed-milks']],
  ['Lait demi écrémé', ['en:semi-skimmed-milks']],
])('supported source classification applies to %s', (name, values) => {
  const input = inputFor(); input.productEvidence.name = name;
  input.productEvidence.categories = [{ field: 'categories_tags', values }];
  expect(evaluate(input).nutritionScore100).toBe(86);
});

test.each([
  ['Milk', []], ['Milk', ['Milk/Milk Substitutes']], ['Milk', ['en:dairies']],
  ['Almond Milk', ['en:milks']], ['Oat drink', ['en:milks', 'en:plant-based-beverages']],
  ['Juice with Milk', ['en:milks']], ['Coffee with Milk', ['en:milks']],
  ['Milk Chocolate', ['en:milks']], ['Chocolate Milk Pudding', ['en:milks']],
  ['Milk powder', ['en:milks']], ['Evaporated milk', ['en:milks']],
  ['Protein Shake', ['en:milks']], ['Core Power Milk Shake', ['en:milks', 'en:protein-shakes']],
  ['Drinking Yogurt', ['en:milks']], ['Milk', ['en:milks', 'en:meals']],
  ['Milk', ['en:milks', 'en:infant-formula']],
])('excluded or ambiguous %s (%j) retains the existing beverage policy and remains gradable', (name, values) => {
  const input = inputFor(); input.productEvidence.name = name;
  input.productEvidence.categories = [{ field: 'categories_tags', values }];
  input.ingredients = 'Milk'; // This cannot establish the special rule.
  const result = evaluate(input);
  expect(result.nutritionScore100).toBe(40);
  expect(result.comparison.milkDrinkPolicyApplied).toBe(false);
});

test('missing/mismatched source, mass-only milk and a research flag cannot activate the rule', () => {
  const input = inputFor(); input.productEvidence.source.url += '/other';
  expect(evaluate(input).nutritionScore100).toBe(40);
  delete input.productEvidence; input.calibrationDairyDrink = true;
  expect(evaluate(input).nutritionScore100).toBe(40);
  const mass = inputFor(); mass.basis.unit = 'g'; mass.category = 'general';
  expect(evaluate(mass).comparison.milkDrinkPolicyApplied).toBe(false);
  expect(resolveMilkDrinkEvidence(mass.productEvidence, mass.source, mass.basis).reason).toContain('no g-to-mL');
});

test('compatible volume and serving representations are invariant without density conversion', () => {
  const input = inputFor('whole-milk'), expected = evaluate(input);
  for (const factor of [.5, 2, 100 / 240]) {
    const changed = clone(input); changed.basis.amount *= factor;
    Object.values(changed.nutrients).forEach(n => { if (n.value !== null) n.value *= factor; });
    expect(evaluate(changed).rawScore).toBeCloseTo(expected.rawScore, 12);
  }
  const liters = clone(input);
  liters.basis = measurementQuantity({ basis: 'serving', quantity: { amount: .24, unit: 'l' } });
  expect(evaluate(liters).rawScore).toBe(expected.rawScore);
});

test.each([
  ['nonfat-milk', 'addedSugar', [0, 3, 6, 9, 12]],
  ['whole-milk', 'saturatedFat', [5, 6, 7, 8]],
  ['nonfat-milk', 'sodium', [130, 300, 600, 1000]],
])('increasing %s %s cannot improve raw or whole-number scores', (id, key, values) => {
  let previous = { rawScore: 101, nutritionScore100: 101 };
  for (const value of values) {
    const input = inputFor(id); input.nutrients[key].value = value;
    const output = evaluate(input);
    expect(output.rawScore).toBeLessThanOrEqual(previous.rawScore);
    expect(output.nutritionScore100).toBeLessThanOrEqual(previous.nutritionScore100);
    previous = output;
  }
});

test('global sugar preference is NOT implemented for non-milk drinks', () => {
  const input = inputFor(); input.productEvidence.categories = [{ field: 'category', values: ['en:soft-drinks'] }];
  expect(evaluate(input)).toMatchObject({ nutritionScore100: 40, sugarMode: 'totalSugar' });
  expect(evaluate(input).comparison.energyBurden).toBe(.625);
});

// Constructed OFF transport of the reliable manufacturer's numeric panel. It
// does not claim a real OFF observation, barcode match or reviewed formulation.
const barcode = '00012345600012';
function lookupFixture(id = 'nonfat-milk') {
  const ref = reference(id), nutriments = {};
  const fields = { calories: 'energy-kcal', saturatedFat: 'saturated-fat', sodium: 'sodium',
    totalSugar: 'sugars', addedSugar: 'added-sugars', fat: 'fat', carbohydrates: 'carbohydrates', fiber: 'fiber', protein: 'proteins' };
  Object.entries(fields).forEach(([key, field]) => {
    nutriments[field + '_100g'] = ref.nutrients[key].value * 100 / ref.basis.amount / (key === 'sodium' ? 1000 : 1);
    nutriments[field + '_unit'] = key === 'calories' ? 'kcal' : 'g';
  });
  const food = normalizeOpenFoodFactsProduct({ code: barcode, product_name: ref.name, brands: 'Synthetic transport control',
    countries_tags: ['en:united-states'], categories_tags: ['en:dairies', 'en:milks-liquid-and-powder', 'en:milks'],
    serving_size: '1 cup (240 ml)', serving_quantity: 240, serving_quantity_unit: 'ml', product_quantity_unit: 'ml',
    nutrition_data_per: '100g', nutriments, ingredients_text: 'Fat free milk, vitamin A palmitate, vitamin D3.' }, barcode, '2026-10-21T20:00:00.000Z');
  return { status: 'found', identifier: { scheme: 'gtin', value: barcode }, food };
}

test.each(['nonfat-milk', 'whole-milk', 'sweetened-milk'])('actual review shows %s nutrition, unchanged combination and consistent collapsed reasons', id => {
  const lookup = lookupFixture(id), candidate = createBarcodeNutritionCandidate(lookup);
  const nutrition = assessBarcodeNutrition(candidate, lookup.identifier), overall = assessOverallFoodQuality(candidate, nutrition);
  expect(nutrition.reasons).toEqual([]);
  expect(nutrition.nutritionScore100).toBe(evaluate(inputFor(id)).nutritionScore100);
  expect(overall.overallScore100).toBe(Math.round(nutrition.nutritionScore100 * (1 - .2 * overall.additiveAssessment.concernBurden)));
  render(<BarcodeNutritionReview candidate={candidate} identifier={lookup.identifier} />);
  expect(screen.getByLabelText('Experimental overall rating')).toHaveTextContent(overall.overallScore100 + '/100');
  const details = screen.getByLabelText('Why this score');
  expect(details).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Experimental nutrition rating')).not.toBeVisible();
  expect(nutrition.result.comparison.energyRule).toBe('milk food-energy ramp per 100 mL');
  expect(nutrition.result.sugarMode).toBe('addedSugar');
  expect(nutrition.result.methodVersion).toBe('2.1-milk-development-2026-10-21');
  expect(details).not.toHaveTextContent('2.1-milk-development');
  const opening = screen.getByLabelText('Opening score summary');
  expect(opening).not.toHaveTextContent('Calories lower');
  expect(opening.textContent.includes('sugars lower')).toBe(id === 'sweetened-milk');
  fireEvent.click(screen.getByText('Why this score'));
  expect(screen.getByLabelText('Experimental nutrition rating')).toBeVisible();
});

test('cached observations recompute the new method; neither food cache nor historical records store grades', async () => {
  const lookup = lookupFixture(), map = new Map();
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const historical = JSON.stringify([{ id: 'historical', sodium: 123 }]); storage.setItem('nutritionEntries', historical);
  const fetchImpl = jest.fn(async () => ({ ok: true, headers: { get: () => null }, text: async () => JSON.stringify(lookup) }));
  const service = createRemoteBarcodeLookup({ storage, runtime: { isWeb: true, isOnline: true }, fetchImpl,
    localLookup: () => ({ status: 'not-found', food: null }) });
  const fresh = await service.lookup(barcode), cached = await service.lookup(barcode);
  for (const result of [fresh, cached]) {
    const candidate = createBarcodeNutritionCandidate(result);
    expect(assessBarcodeNutrition(candidate, result.identifier).nutritionScore100).toBe(86);
    expect(candidate.selection.nutrients.addedSugar).toBe(0);
  }
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(storage.getItem('nutritionEntries')).toBe(historical);
  expect(storage.getItem('remoteBarcodeFoodResponses')).not.toMatch(/methodVersion|nutritionScore100/);
  expect(shouldLoadBarcodeGrading('production', 'localhost', '?barcodeGrading=1&nutritionPilot=1')).toBe(false);
});

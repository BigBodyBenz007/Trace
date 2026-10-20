import { assessBarcodeNutrition } from './barcodeNutritionAssessment';
import { createBarcodeNutritionCandidate } from '../services/barcodeNutritionSelection';
import { shouldLoadBarcodeGrading } from './barcodeGradingMode';
const { normalizeOpenFoodFactsProduct } = require('../../api/nutrition/_barcodeGateway.cjs');
const { barcodeGradingRecord, BARCODE, RETRIEVED_AT } = require('./__fixtures__/barcodeGrading.cjs');
const identifier = { scheme: 'gtin', value: BARCODE };
const clone = value => JSON.parse(JSON.stringify(value));
const candidate = scenario => createBarcodeNutritionCandidate({ status: 'found', identifier,
  food: normalizeOpenFoodFactsProduct(barcodeGradingRecord(scenario), BARCODE, RETRIEVED_AT) });

test.each(['production', 'test', undefined])('URL flag cannot enable grading in %s', environment => {
  expect(shouldLoadBarcodeGrading(environment, 'localhost', '?barcodeGrading=1')).toBe(false);
});
test('requires local development and explicit flag', () => {
  expect(shouldLoadBarcodeGrading('development', 'localhost', '?barcodeGrading=1')).toBe(true);
  expect(shouldLoadBarcodeGrading('development', '127.0.0.1', '?barcodeGrading=1')).toBe(true);
  expect(shouldLoadBarcodeGrading('development', 'example.com', '?barcodeGrading=1')).toBe(false);
  expect(shouldLoadBarcodeGrading('development', 'localhost', '')).toBe(false);
});
test('actual captured product data yields a whole number with public grading disabled', () => {
  const c = candidate(); const before = JSON.stringify(c);
  const result = assessBarcodeNutrition(c, identifier);
  expect(Number.isInteger(result.nutritionScore100)).toBe(true);
  expect(result).toMatchObject({ grade: null, scoreReady: false, scanMatchEligible: false });
  expect(result.confidence).toContain('not independently verified');
  expect(JSON.stringify(c)).toBe(before);
  expect(JSON.stringify(result)).not.toMatch(/"letters?":/);
});
test.each(['unresolved'])('%s inputs remain unresolved', scenario => {
  const result = assessBarcodeNutrition(candidate(scenario), identifier);
  expect(result.nutritionScore100).toBeNull(); expect(result.reasons.length).toBeGreaterThan(0);
});
test('legacy inputs do not prevent usable food logging', () => {
  const c = clone(candidate()); delete c.display.assessmentInputs;
  expect(c.canUse).toBe(true); expect(assessBarcodeNutrition(c, identifier).nutritionScore100).toBeNull();
});
test('custom edits cannot inherit a score from the retained provider snapshot', () => {
  const c = clone(candidate()); c.customFood = { id: 'user-food', nutrients: { calories: 99 } };
  expect(assessBarcodeNutrition(c, identifier).nutritionScore100).toBeNull();
});
test.each([
  input => { input.identity.gtin = '012000001291'; }, input => { input.identity.name = 'Other formulation'; },
  input => { input.source.url = 'https://world.openfoodfacts.org/product/012000001291'; },
  input => { input.categories[0].values = ['en:infant-formula']; },
  input => { input.categories[0].values = ['en:yogurts']; },
  input => { input.categories[0].values = ['en:yogurts', 'en:drinkable-yogurts']; },
  input => { input.categories[0].values = ['en:breakfast-cereals', 'en:nuts']; },
  input => { input.datasets[0].observations[0].rawUnit = 'unsupported'; },
  input => { input.datasets[0].observations[0].rawValue = -1; },
  input => { input.datasets[0].quantity = { amount: 100, unit: 'ml' }; input.datasets[0].basis = '100ml'; },
  input => { input.source.cacheStale = true; },
])('identity, provenance, category, units and formulation safeguards (%#)', change => {
  const c = clone(candidate()); change(c.display.assessmentInputs);
  expect(assessBarcodeNutrition(c, identifier).nutritionScore100).toBeNull();
});

test.each(['unknown-market', 'foreign', 'multi-market'])('%s assesses a coherent profile without claiming US formulation', scenario => {
  const c = clone(candidate(scenario === 'unknown-market' ? scenario : undefined));
  if (scenario === 'foreign') c.display.assessmentInputs.markets = [{ field: 'countries_tags', values: ['en:france'] }];
  if (scenario === 'multi-market') c.display.assessmentInputs.markets[0].values.push('en:france');
  const before = JSON.stringify(c);
  const result = assessBarcodeNutrition(c, identifier);
  expect(result.nutritionScore100).toBe(assessBarcodeNutrition(candidate(), identifier).nutritionScore100);
  expect(result.evidence.market.exactUsFormulationVerified).toBe(false);
  expect(result.confidence).toContain('not independently verified');
  expect(result.warnings.join(' ')).toMatch(/market|formulation/);
  expect(result).toMatchObject({ grade: null, scoreReady: false, scanMatchEligible: false });
  expect(JSON.stringify(c)).toBe(before);
});

test('unused total fat/carbohydrate absence does not block a settled general-food calculation', () => {
  const c = clone(candidate());
  c.display.assessmentInputs.datasets.forEach(dataset => {
    dataset.observations = dataset.observations.filter(entry => !['fat', 'carbohydrates'].includes(entry.nutrient));
  });
  const result = assessBarcodeNutrition(c, identifier);
  expect(result.nutritionScore100).toBe(assessBarcodeNutrition(candidate(), identifier).nutritionScore100);
  expect(result.warnings.join(' ')).toContain('no zero is substituted');
  expect(result.result.normalized.nutrients.fat).toBeNull();
});
test('older positive or estimated plant content is not reused as updated FVL', () => {
  for (const group of [{ identification: 'provider-reported', rawValue: 50 }, { identification: 'provider-estimated', rawValue: 0 }]) {
    const c = clone(candidate()); Object.assign(c.display.assessmentInputs.foodGroups[0], group);
    const result = assessBarcodeNutrition(c, identifier);
    expect(result.nutritionScore100).toBeNull(); expect(result.reasons.join(' ')).toContain('fraction is unknown');
  }
});
test('nut categories cannot reuse the old group zero because oil eligibility differs', () => {
  const c = clone(candidate()); c.display.assessmentInputs.categories[0].values = ['en:nuts'];
  expect(assessBarcodeNutrition(c, identifier).nutritionScore100).toBeNull();
});
test('complete single-grain evidence settles FVL without provider percentages or saved-record edits', () => {
  const c = clone(candidate());
  c.display.ingredients.text = 'Whole grain wheat. bht is added to the packaging material to preserve freshness.';
  c.display.assessmentInputs.foodGroups = [];
  const before = JSON.stringify(c), result = assessBarcodeNutrition(c, identifier);
  expect(Number.isInteger(result.nutritionScore100)).toBe(true);
  expect(result.evidence.plantContent).toMatchObject({ status: 'verified-zero', percent: 0,
    ingredientEvidence: { text: c.display.ingredients.text }, source: c.display.assessmentInputs.source });
  expect(result.result.normalized.plantPercent).toBe(0);
  expect(result).toMatchObject({ grade: null, scoreReady: false, scanMatchEligible: false });
  expect(JSON.stringify(c)).toBe(before);
});
test('conflicting provider plant quantities block scoring without blocking logging or mutating sources', () => {
  const c = clone(candidate()); c.display.ingredients.text = 'Whole grain wheat.';
  c.display.assessmentInputs.foodGroups[0].rawValue = 20;
  const before = JSON.stringify(c), result = assessBarcodeNutrition(c, identifier);
  expect(result.nutritionScore100).toBeNull();
  expect(result.evidence.plantContent.status).toBe('conflicting');
  expect(result.reasons.join(' ')).toContain('no quantity is overwritten');
  expect(c.canUse).toBe(true); expect(JSON.stringify(c)).toBe(before);
});
test('ingredient-derived zero does not fill missing scoring nutrients', () => {
  const c = clone(candidate('unresolved')); c.display.ingredients.text = 'Whole grain wheat.';
  c.display.assessmentInputs.foodGroups = [];
  const result = assessBarcodeNutrition(c, identifier);
  expect(result.evidence.plantContent.percent).toBe(0);
  expect(result.nutritionScore100).toBeNull();
  expect(result.reasons.join(' ')).toContain('Saturated fat is missing');
  expect(result.result.normalized.nutrients.saturatedFat).toBeNull();
});
test('beverages retain unknown sweetener evidence rather than assume absence', () => {
  const c = clone(candidate()); const input = c.display.assessmentInputs;
  input.categories[0].values = ['en:sodas']; input.datasets[0].basis = '100ml'; input.datasets[0].quantity.unit = 'ml';
  expect(assessBarcodeNutrition(c, identifier).reasons.join(' ')).toContain('sweetener evidence');
});

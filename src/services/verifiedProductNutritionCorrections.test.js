import label from '../data/teddyGrahamsHoneyLabel.json';
import archive from '../../docs/trace-nutrition-v2-teddy-2026-10-20.json';
import { createBarcodeNutritionCandidate } from './barcodeNutritionSelection';
import { scaleNutrition } from './nutritionCalculation';
import { getAppliedVerifiedNutritionCorrection, isVerifiedManufacturerNutritionPanel, resolveVerifiedNutritionCorrection } from './verifiedProductNutritionCorrections';
import { assessBarcodeNutrition } from '../development/barcodeNutritionAssessment';
import { assessOverallFoodQuality } from '../development/traceOverallFoodQuality';

const clone = value => JSON.parse(JSON.stringify(value));
const candidate = () => createBarcodeNutritionCandidate(archive.lookup);

test.each(['044000045586', '0044000045586', '00044000045586'])('equivalent UPC/EAN/GTIN forms apply the same fact correction: %s', value => {
  const lookup = clone(archive.lookup);
  lookup.identifier.value = value;
  const c = createBarcodeNutritionCandidate(lookup);
  expect(c.display.nutrients.addedSugar).toBe(7);
  expect(c.selection.nutrients.addedSugar).toBe(7);
  expect(c.selection.remote.nutrients.addedSugar).toBe(2.1);
  expect(getAppliedVerifiedNutritionCorrection(c, lookup.identifier).product.flavor).toBe('Honey');
  expect(assessBarcodeNutrition(c, lookup.identifier)).toMatchObject({ nutritionScore100: 20, grade: null, scoreReady: false, scanMatchEligible: false });
});

test('the complete manufacturer panel and original provider facts retain separate attribution', () => {
  const c = candidate(), correction = c.selection.nutritionCorrection;
  expect(correction.manufacturerPanel).toEqual(label);
  expect(correction.source).toMatchObject({ attribution: 'Teddy Grahams / Mondelez SmartLabel', updatedOn: '2023-12-14', verification: 'direct-manufacturer-panel' });
  expect(correction.originalProviderSource).toEqual(archive.lookup.food.provenance);
  expect(correction.originalProviderNutrients).toEqual(archive.lookup.food.nutrients);
  expect(c.selection.remote.assessmentInputs).toEqual(archive.lookup.food.assessmentInputs);
  expect(correction.manufacturerPanel.providerObservation.rawAddedSugars).toMatchObject({ 'added-sugars_100g': 7, 'added-sugars_serving': 2.1, 'added-sugars_modifier': '~' });
  expect(c.display.basisMessage).toContain('label edition 2023-12-14');
});

test('only factual inputs change: historical source score 46, current review and logging basis 20', () => {
  const historical = createBarcodeNutritionCandidate(archive.lookup, { applyVerifiedCorrections: false });
  const original = assessBarcodeNutrition(historical, archive.lookup.identifier);
  expect(original.nutritionScore100).toBe(46);
  expect(original.result.rawScore).toBeCloseTo(45.86458794977321, 10);
  const c = candidate(), current = assessBarcodeNutrition(c, archive.lookup.identifier);
  expect(current.result.normalized.originalNutrients).toEqual(label.nutrients);
  expect(current.result.rawScore).toBeCloseTo(19.650047483380824, 10);
  expect(current.evidence.originalProviderAssessment).toEqual(original);
  expect(current.result.sugarMode).toBe('addedSugar');
  expect(assessOverallFoodQuality(c, current)).toMatchObject({ overallScore100: 20, additiveDeduction: 0, provisional: true, grade: null, scoreReady: false });
});

test.each([0.5, 1, 1.25, 2, 1 / 3, 2.3456789])('serving precision is retained without intermediate rounding at %s servings', quantity => {
  const c = candidate();
  expect(scaleNutrition(c.selection.nutrients, quantity).addedSugar).toBe(7 * quantity);
  expect(scaleNutrition(c.selection.nutrients, quantity).totalSugar).toBe(7 * quantity);
  expect(c.selection.remote.nutrients.addedSugar).toBe(2.1);
});

test('input response, ingredient text and provider additive groups remain unchanged', () => {
  const before = JSON.stringify(archive.lookup), c = candidate(), candidateBefore = JSON.stringify(c);
  const assessment = assessBarcodeNutrition(c, archive.lookup.identifier), overall = assessOverallFoodQuality(c, assessment);
  expect(c.display.ingredients).toEqual(archive.lookup.food.ingredients);
  expect(c.display.additives).toEqual(archive.lookup.food.additives);
  expect([...overall.additiveAssessment.items.find(i => i.identifier === 'E322i').providerIdentifiers].sort()).toEqual(['en:e322', 'en:e322i']);
  expect([...overall.additiveAssessment.items.find(i => i.identifier === 'E500ii').providerIdentifiers].sort()).toEqual(['en:e500', 'en:e500ii']);
  expect(JSON.stringify(c)).toBe(candidateBefore);
  expect(JSON.stringify(archive.lookup)).toBe(before);
  expect(Object.isFrozen(c.selection.nutritionCorrection)).toBe(true);
});

test.each([
  ['a different UPC', food => { food.identifiers[0].value = '012345678905'; }],
  ['the wrong flavor/name', food => { food.name = 'Chocolate Graham Snacks'; }],
  ['a different package', food => { food.packageQuantity = '2.75 oz'; }],
  ['a different serving', food => { food.serving.amount = 28; food.serving.grams = 28; }],
  ['foreign formulation', food => { food.assessmentInputs.markets = [{ field: 'countries_tags', values: ['en:france'] }]; }],
  ['a mixed market', food => { food.assessmentInputs.markets[0].values.push('en:france'); }],
  ['an unknown market', food => { food.assessmentInputs.markets = []; }],
  ['missing ingredients', food => { food.ingredients = null; }],
  ['different ingredients', food => { food.ingredients.text += ' COCOA.'; }],
  ['an incomplete list', food => { food.ingredients.text = 'GRAHAM FLOUR, SUGAR...'; }],
  ['missing added sugar', food => { food.nutrients.addedSugar = null; }],
  ['a different nutrient panel', food => { food.nutrients.calories = 140; }],
  ['missing panel evidence', food => { delete food.assessmentInputs; }],
  ['an already corrected provider value', food => { food.nutrients.addedSugar = 7; }],
  ['invalid provenance', food => { food.assessmentInputs.source.url = 'https://example.com/unknown'; }],
])('does not substitute a label for %s', (_, mutate) => {
  const food = clone(archive.lookup.food);
  mutate(food);
  expect(resolveVerifiedNutritionCorrection(food)).toBeNull();
});
test('stale or manually edited candidates cannot inherit the correction', () => {
  expect(resolveVerifiedNutritionCorrection(archive.lookup.food, { stale: true })).toBeNull();
  const c = clone(candidate());
  c.customFood = {};
  expect(getAppliedVerifiedNutritionCorrection(c, archive.lookup.identifier)).toBeNull();
});
test('a fabricated correction flag or edited nutrient value cannot supply manufacturer assessment data', () => {
  const c = clone(candidate());
  c.display.nutrients.addedSugar = 3;
  expect(getAppliedVerifiedNutritionCorrection(c, archive.lookup.identifier)).toBeNull();
  c.display.nutrients.addedSugar = 7;
  c.display.nutritionCorrection.id = 'unreviewed';
  expect(getAppliedVerifiedNutritionCorrection(c, archive.lookup.identifier)).toBeNull();
});
test.each([
  source => { source.source.verification = 'unreviewed'; },
  source => { source.source.url = 'https://example.com/label'; },
  source => { source.source.nutritionUrl = 'https://example.com/panel'; },
  source => { source.source.nutritionUrl = 'https://user:password@smartlabel.mondelez.info/044000045586-0001-en-US/panel'; },
  source => { source.identity.gtin = '012345678905'; },
  source => { source.source.updatedOn = '2023-02-31'; },
  source => { source.source.updatedOn = '2027-12-14'; },
  source => { source.sourceArtifacts = []; },
  source => { source.corrections[0].unit = 'mg'; },
  source => { source.corrections[0].correctedValue = -7; },
  source => { source.corrections[0].correctedValue = 6; },
  source => { source.nutrients.fiber = null; },
  source => { source.corrections.push({ ...source.corrections[0] }); },
])('requires credible, dated manufacturer evidence (%#)', mutate => {
  const copy = clone(label);
  mutate(copy);
  expect(isVerifiedManufacturerNutritionPanel(copy)).toBe(false);
});

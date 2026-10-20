import { assessBarcodeNutrition } from './barcodeNutritionAssessment';
import { createBarcodeNutritionCandidate } from '../services/barcodeNutritionSelection';
import { shouldLoadBarcodeGrading } from './barcodeGradingMode';
import { evaluateTraceUsNutritionV2 } from './traceUsNutritionScoringV2';
const { normalizeOpenFoodFactsProduct } = require('../../api/nutrition/_barcodeGateway.cjs');
const { barcodeGradingRecord, BARCODE, RETRIEVED_AT } = require('./__fixtures__/barcodeGrading.cjs');
const identifier = { scheme: 'gtin', value: BARCODE };
const clone = value => JSON.parse(JSON.stringify(value));
const candidate = record => createBarcodeNutritionCandidate({ status: 'found', identifier,
  food: normalizeOpenFoodFactsProduct(record || barcodeGradingRecord(), BARCODE, RETRIEVED_AT) });

test.each(['production', 'test', undefined])('production grading stays disabled in %s', environment => {
  expect(shouldLoadBarcodeGrading(environment, 'localhost', '?barcodeGrading=1')).toBe(false);
});
test('requires explicit local development opt-in', () => {
  expect(shouldLoadBarcodeGrading('development', 'localhost', '?barcodeGrading=1')).toBe(true);
  expect(shouldLoadBarcodeGrading('development', 'remote.example', '?barcodeGrading=1')).toBe(false);
  expect(shouldLoadBarcodeGrading('development', 'localhost', '')).toBe(false);
});
test('a single attributed panel yields an isolated integer without mutating logging or provider data', () => {
  const c = candidate(), before = JSON.stringify(c), result = assessBarcodeNutrition(c, identifier);
  expect(Number.isInteger(result.nutritionScore100)).toBe(true);
  expect(result.result.methodId).toBe('trace-us-practical-nutrition');
  expect(result).toMatchObject({ grade: null, scoreReady: false, scanMatchEligible: false });
  expect(JSON.stringify(result)).not.toMatch(/"letters?":/);
  expect(JSON.stringify(c)).toBe(before);
});
test('no ingredient percentages, taxonomy tag, revision, review or US market verification is needed', () => {
  const c = clone(candidate());
  const input = c.display.assessmentInputs;
  input.foodGroups = []; input.categories = []; input.markets = [];
  input.source.revisionDate = null; input.source.publicationDate = null; input.source.dates = [];
  c.display.ingredients = { text: null, language: null };
  expect(Number.isInteger(assessBarcodeNutrition(c).nutritionScore100)).toBe(true);
  expect(assessBarcodeNutrition(c).confidence).toContain('market is unknown');
});
test.each([[], [{ field: 'countries_tags', values: ['en:france'] }], [{ field: 'countries_tags', values: ['en:france', 'en:united-states'] }]].map(markets => [markets]))('market affects confidence rather than nutritional math (%#)', markets => {
  const c = clone(candidate()); c.display.assessmentInputs.markets = markets;
  const result = assessBarcodeNutrition(c, identifier);
  expect(result.nutritionScore100).toBe(assessBarcodeNutrition(candidate(), identifier).nutritionScore100);
  expect(result.evidence.market.exactUsFormulationVerified).toBe(false);
  expect(result.confidence).toContain('not independently verified');
});
test('optional missing nutrients do not prevent scoring or earn positive credit', () => {
  const record = barcodeGradingRecord(); delete record.nutriments.fiber_100g; delete record.nutriments.proteins_100g;
  const result = assessBarcodeNutrition(candidate(record), identifier);
  expect(Number.isInteger(result.nutritionScore100)).toBe(true);
  expect(result.result.points.fiber.min).toBe(0); expect(result.result.points.proteinApplied.min).toBe(0);
  expect(result.result.normalized.nutrients.fiber).toBeNull();
});
test('missing essential saturated fat stays unavailable while food logging stays usable', () => {
  const record = barcodeGradingRecord(); delete record.nutriments['saturated-fat_100g'];
  const c = candidate(record), result = assessBarcodeNutrition(c, identifier);
  expect(result.nutritionScore100).toBeNull(); expect(result.reasons.join(' ')).toContain('Saturated fat');
  expect(c.canUse).toBe(true);
});
test('reported plant quantities cannot gate or alter the new score', () => {
  const c = clone(candidate()), baseline = assessBarcodeNutrition(c, identifier).nutritionScore100;
  for (const value of [0, 50, 100]) {
    c.display.assessmentInputs.foodGroups[0].rawValue = value;
    expect(assessBarcodeNutrition(c, identifier).nutritionScore100).toBe(baseline);
  }
});
test('protein-bar/supplement category claims do not block assessment of the captured nutrition', () => {
  const c = clone(candidate()); c.display.assessmentInputs.categories[0].values = ['en:dietary-supplements', 'en:protein-bars'];
  const result = assessBarcodeNutrition(c, identifier);
  expect(Number.isInteger(result.nutritionScore100)).toBe(true);
  expect(result.warnings.join(' ')).toContain('does not establish suitability');
});
test('contradictory added sugar is disclosed and excluded while total sugars remain separately identified', () => {
  const c = clone(candidate()); const input = c.display.assessmentInputs;
  input.datasets.forEach(d => d.observations.forEach(n => { if (n.nutrient === 'addedSugar') n.rawValue = 30; }));
  const result = assessBarcodeNutrition(c, identifier);
  expect(result.result.sugarMode).toBe('totalSugar');
  expect(result.result.excludedNutrients).toContain('addedSugar');
  expect(result.warnings.join(' ')).toContain('contradict');
  expect(input.datasets[0].observations.find(n => n.nutrient === 'addedSugar').rawValue).toBe(30);
});
test.each(['unknown-additives', 'empty-additives', 'eligible'])('%s does not introduce additive penalties', scenario => {
  const c = candidate(barcodeGradingRecord(scenario));
  expect(assessBarcodeNutrition(c, identifier).nutritionScore100).toBe(assessBarcodeNutrition(candidate(), identifier).nutritionScore100);
});
test.each([
  c => { c.customFood = { name: 'Edited values' }; },
  c => { c.display.assessmentInputs.identity.name = 'Another product'; },
  c => { c.display.assessmentInputs.source.url = 'https://world.openfoodfacts.org/product/012000001291'; },
  c => { c.display.assessmentInputs.datasets[0].quantity = null; c.display.assessmentInputs.datasets[0].basis = 'unknown'; },
])('genuine provenance or measurement problems remain unavailable (%#)', change => {
  const c = clone(candidate()); change(c);
  expect(assessBarcodeNutrition(c, identifier).nutritionScore100).toBeNull();
});
test('provider energy approximations remain evidence, not conflicting independent declarations', () => {
  const record = barcodeGradingRecord(); record.nutriments['energy-kj_100g'] = 2000; record.nutriments['energy-kj_modifier'] = '~';
  const result = assessBarcodeNutrition(candidate(record), identifier);
  expect(Number.isInteger(result.nutritionScore100)).toBe(true);
  expect(result.evidence.energy[0].excludedQualifiedFields).toContain('nutriments.energy-kj_100g');
});
test('genuine unqualified energy conflicts and unsupported required units still reject', () => {
  const record = barcodeGradingRecord(); record.nutriments['energy-kj_100g'] = 2000;
  expect(assessBarcodeNutrition(candidate(record), identifier).nutritionScore100).toBeNull();
  const c = clone(candidate()); c.display.assessmentInputs.datasets[0].observations.find(n => n.nutrient === 'sodium').rawUnit = 'IU';
  expect(assessBarcodeNutrition(c, identifier).nutritionScore100).toBeNull();
});
test('the actual archived Chobani catalog profile is assessed without requiring a newer metadata wrapper', () => {
  const archive = require('../../docs/barcode-grading-grocery-pilot-2026-10-20/results.json');
  const observation = archive.observations.find(row => row.barcode === '00894700010045');
  const c = createBarcodeNutritionCandidate(observation.lookup), before = JSON.stringify(c);
  expect(c.display.assessmentInputs).toBeUndefined();
  const result = assessBarcodeNutrition(c, observation.lookup.identifier);
  expect(result.nutritionScore100).toBe(80);
  expect(result.evidence.selectedDatasetId).toBe('catalog-label-serving');
  expect(result.result.normalized.nutrients.saturatedFat).toBeNull();
  expect(result.evidence.originalDataset.nutrients).toEqual(observation.lookup.food.nutrients);
  expect(result).toMatchObject({ grade: null, scoreReady: false, scanMatchEligible: false });
  expect(result.confidence).toContain('not independently verified');
  expect(JSON.stringify(c)).toBe(before);
});

const comparison = require('../../docs/trace-nutrition-v2-comparison-2026-10-20.json');
test.each(comparison.products.filter(row => row.after.result?.normalized))('replays the retained real nutrition profile: $selectedName', row => {
  expect(row.after).toMatchObject({ grade: null, scoreReady: false, scanMatchEligible: false, overallFoodQualityScore100: null });
  const saved = row.after.result;
  const units = { calories: 'kcal', sodium: 'mg' };
  const input = { category: saved.methodCategory, basis: saved.normalized.originalBasis,
    source: row.after.evidence.assessment.source, grainEvidence: saved.comparison.grainEvidence,
    usZeroFatLabelServing: Boolean(saved.comparison.saturatedFatBound),
    nutrients: Object.fromEntries(Object.entries(saved.normalized.originalNutrients).map(([key, value]) =>
      [key, { value, unit: units[key] || 'g' }])) };
  const before = JSON.stringify(input);
  expect(evaluateTraceUsNutritionV2(input).nutritionScore100).toBe(row.after.nutritionScore100);
  expect(row.after.additiveAssessment.additiveScore100).toBeNull();
  expect(JSON.stringify(input)).toBe(before);
});

test('the retained Diet Coke observation stays unresolved without a compatible measurement basis', () => {
  const row = comparison.products.find(product => product.selectedName === 'Diet Coke');
  expect(row.after).toMatchObject({ grade: null, scoreReady: false, scanMatchEligible: false, overallFoodQualityScore100: null });
  expect(row.after.nutritionScore100).toBeNull();
  expect(row.after.reasons.join(' ')).toContain('measurement basis');
});
test('the complete grocery replay retains coverage and sensible comparative rankings', () => {
  expect(comparison.originalTwenty).toEqual({ previousScores: 19, revisedScores: 19 });
  expect(comparison.products).toHaveLength(21);
  const score = name => comparison.products.find(row => row.selectedName.includes(name)).after.nutritionScore100;
  expect(score('Plain Greek')).toBeGreaterThan(score('Chobani'));
  expect(score('Shredded Wheat')).toBeGreaterThan(score('Frosted Flakes'));
  expect(score('Whole Wheat')).toBeGreaterThan(score('Hearty White'));
  expect(score('Almonds')).toBeGreaterThan(score('Skippy'));
  expect(score('Skippy')).toBeGreaterThan(score("Lay's"));
  expect(score('Teddy')).toBeLessThan(60);
  expect(score("Lay's")).toBeLessThan(50);
  expect(score('Wieners')).toBeLessThan(score('Santa Fe'));
});

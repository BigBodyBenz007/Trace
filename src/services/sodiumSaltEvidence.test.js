import fs from 'node:fs';
import path from 'node:path';
import { findSodiumSaltConflicts } from './sodiumSaltEvidence';
import { createBarcodeNutritionCandidate } from './barcodeNutritionSelection';
import { createRemoteBarcodeCache } from './remoteBarcodeCache';
import { createRemoteBarcodeLookup } from './remoteBarcodeLookup';
import { assessBarcodeNutrition } from '../development/barcodeNutritionAssessment';
import { assessLookupForGrading } from '../development/barcodeAssessmentFallback';
import { assessOverallFoodQuality } from '../development/traceOverallFoodQuality';
import teddyArchive from '../../docs/trace-nutrition-v2-teddy-2026-10-20.json';
import manufacturerLookups from './__fixtures__/manufacturerProviderLookups.json';

const { normalizeOpenFoodFactsProduct, normalizeUsdaFood } = require('../../api/nutrition/_barcodeGateway.cjs');
const captured = fs.readFileSync(path.join(__dirname, '../../docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const fairlife = captured.find(row => row.barcode === '0856312002757');
const rawFairlife = () => JSON.parse(JSON.stringify(fairlife.responses.find(r => r.body?.product).body.product));
const asLookup = (raw = rawFairlife()) => ({status: 'found', identifier: {scheme: 'gtin', value: raw.code},
  food: normalizeOpenFoodFactsProduct(raw, raw.code, fairlife.capturedAt), providerAttempts: [{provider: 'open-food-facts', status: 'found'}, {provider: 'usda-fdc', status: 'not-found'}]});
const clone = value => JSON.parse(JSON.stringify(value));
const memory = () => { const map = new Map(); return {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value)}; };
const clock = () => Date.parse('2026-10-22T12:00:00Z');
const observation = (nutrient, rawValue, rawUnit = 'g', suffix = '100g') => ({nutrient, rawValue, rawUnit,
  field: `nutriments.${nutrient}_${suffix}`, unitSource: 'provider-schema', enteredUnit: rawUnit, derivation: null});
const panel = (na, salt, sodiumUnit = 'g', saltUnit = 'g') => ({id: 'off-100g', basis: '100g', quantity: {amount: 100, unit: 'g'},
  observations: [observation('sodium', na, sodiumUnit), observation('salt', salt, saltUnit)]});
const input = (...datasets) => ({source: {provider: 'open-food-facts'}, datasets});

// Constructed US label controls only: not manufacturer facts or grocery records.
function constructedUsLabel(sodiumMg, saltG, amount = 100, measureUnit = 'g', enteredUnit = 'mg') {
  const enteredFactor = {mg: 1, g: .001, mcg: 1000}[enteredUnit];
  return asLookup({code: '012345678905', product_name: 'CONSTRUCTED US label rounding control', brands: 'Synthetic',
    countries_tags: ['en:united-states'], serving_size: `${amount} ${measureUnit}`, serving_quantity: amount,
    serving_quantity_unit: measureUnit, nutrition_data_per: 'serving', nutriments: {
      'energy-kcal_serving': 100, proteins_serving: 1, carbohydrates_serving: 10, fat_serving: 1,
      sodium_serving: sodiumMg / 1000, sodium_100g: sodiumMg / 1000 * 100 / amount,
      sodium_value: sodiumMg * enteredFactor, sodium_unit: enteredUnit,
      salt_serving: saltG, salt_100g: saltG * 100 / amount, salt_value: saltG, salt_unit: 'g',
    }});
}

test('constructed US 5 mg declaration stored as .005 g can correspond to 6 mg and .015 g salt', () => {
  const lookup = constructedUsLabel(5, .015), before = JSON.stringify(lookup);
  expect(findSodiumSaltConflicts(lookup.food.assessmentInputs)).toEqual([]);
  expect(createBarcodeNutritionCandidate(lookup).selection.nutrients.sodium).toBe(5);
  expect(JSON.stringify(lookup)).toBe(before);
});

test.each([
  [0, 4.9], [5, 6], [135, 137.4], [140, 144.9], [150, 154.9],
])('constructed FDA boundary: declaration %s mg permits underlying %s mg', (declared, underlying) => {
  const lookup = constructedUsLabel(declared, underlying / 1000 * 2.5);
  expect(findSodiumSaltConflicts(lookup.food.assessmentInputs)).toEqual([]);
});

test.each([[100, 'g', 'mg'], [250, 'g', 'g'], [240, 'ml', 'mcg']])('original label rounding propagates through %s %s and %s representations', (amount, unit, enteredUnit) => {
  const lookup = constructedUsLabel(5, .015, amount, unit, enteredUnit);
  expect(findSodiumSaltConflicts(lookup.food.assessmentInputs)).toEqual([]);
  expect(createBarcodeNutritionCandidate(lookup).selection.nutrients.sodium).toBe(5);
});

test('missing original rounding precision is indeterminate and does not erase sodium', () => {
  const lookup = clone(constructedUsLabel(5, .015));
  lookup.food.assessmentInputs.datasets = lookup.food.assessmentInputs.datasets.filter(d => d.id !== 'off-value');
  lookup.food.assessmentInputs.markets = [];
  expect(findSodiumSaltConflicts(lookup.food.assessmentInputs)).toEqual([]);
  expect(createBarcodeNutritionCandidate(lookup).selection.nutrients.sodium).toBe(5);
});

test('unknown serving basis cannot turn normalized digits into original label precision', () => {
  const data = input(panel(.005, .015));
  expect(findSodiumSaltConflicts(data)).toEqual([]);
});

test('a material disagreement outside FDA rounding remains a conflict', () => {
  const lookup = constructedUsLabel(5, .125);
  const conflicts = findSodiumSaltConflicts(lookup.food.assessmentInputs);
  expect(conflicts).toHaveLength(3);
  expect(conflicts[0].rounding.mode).toBe('reported-us-serving-declaration');
  expect(createBarcodeNutritionCandidate(lookup).selection.nutrients.sodium).toBeNull();
});

test.each([
  ['consistent', .12, .3, 'g', 'g'], ['zero', 0, 0, 'g', 'g'],
  ['low positive', .000001, .0000025, 'g', 'g'], ['compatible units', 120, .3, 'mg', 'g'],
  ['compatible rounded declarations', .003, .01, 'g', 'g'], ['ambiguous rounded zero', 0, .01, 'g', 'g'],
  ['retained decimal strings', '.12', '.30', 'g', 'g'],
])('%s is not a contradiction', (_name, sodium, salt, sodiumUnit, saltUnit) => {
  expect(findSodiumSaltConflicts(input(panel(sodium, salt, sodiumUnit, saltUnit)))).toEqual([]);
});

test('coarser equivalent serving precision prevents a false reference conflict', () => {
  const reference = panel(.1234, .3), serving = {id: 'off-serving', basis: 'serving', quantity: {amount: 20, unit: 'g'},
    observations: [observation('sodium', .02468, 'g', 'serving'), observation('salt', .06, 'g', 'serving')]};
  expect(findSodiumSaltConflicts(input(reference, serving))).toEqual([]);
});

test.each(['missing-salt', 'unknown-unit', 'qualified-salt', 'unknown-basis', 'different-bases', 'different-fields'])('%s does not demonstrate a compatible same-panel conflict', mode => {
  const p = panel(.00012, .12);
  if (mode === 'missing-salt') p.observations.pop();
  if (mode === 'unknown-unit') p.observations[1].rawUnit = 'ml';
  if (mode === 'qualified-salt') p.observations[1].derivation = 'off:modifier:~';
  if (mode === 'unknown-basis') p.basis = 'unknown';
  if (mode === 'different-fields') p.observations[1].field = 'nutriments.salt_serving';
  const data = mode === 'different-bases'
    ? input({...p, observations: [p.observations[0]]}, {...p, id: 'other', basis: '100ml', quantity: {amount: 100, unit: 'ml'}, observations: [p.observations[1]]}) : input(p);
  expect(findSodiumSaltConflicts(data)).toEqual([]);
});

test('captured raw Fairlife: salt and entered units survive normalization; original numbers are not repaired', () => {
  const raw = rawFairlife(), before = JSON.stringify(raw), lookup = asLookup(raw);
  const conflicts = findSodiumSaltConflicts(lookup.food.assessmentInputs);
  expect(conflicts.map(c => c.datasetId).sort()).toEqual(['off-100g', 'off-serving', 'off-value']);
  expect(conflicts[0].observations.find(o => o.nutrient === 'salt')).toMatchObject({rawValue: .288, rawUnit: 'g', enteredUnit: 'g'});
  expect(lookup.food.nutrients.sodium).toBeCloseTo(.288, 12);
  const candidate = createBarcodeNutritionCandidate(lookup), assessment = assessBarcodeNutrition(candidate, lookup.identifier);
  expect(candidate.display.nutrients.sodium).toBeNull();
  expect(candidate.selection.nutrients.sodium).toBeNull();
  expect(candidate.canUse).toBe(true);
  expect(candidate.selection.remote.nutrients.sodium).toBeCloseTo(.288, 12);
  expect(candidate.selection.nutritionConflicts).toEqual(conflicts);
  expect(assessment).toMatchObject({grade: null, scoreReady: false, nutritionScore100: null});
  expect(assessment.reasons[0]).toContain('sodium and salt disagree');
  expect(JSON.stringify(raw)).toBe(before);
});

test('non-exact sodium/salt modifiers remain evidence, not exact contradictory declarations', () => {
  const raw = rawFairlife(); raw.nutriments.salt_modifier = '~';
  const lookup = asLookup(raw);
  expect(lookup.food.assessmentInputs.datasets[0].observations.find(o => o.nutrient === 'salt').derivation).toBe('off:modifier:~');
  expect(findSodiumSaltConflicts(lookup.food.assessmentInputs)).toEqual([]);
});

test('fresh and retained-evidence caches agree; missing old salt capture alone is not a conflict or refresh trigger', async () => {
  const storage = memory(), lookup = asLookup(), cache = createRemoteBarcodeCache({storage, clock});
  cache.set(lookup.identifier.value, lookup);
  const fetchImpl = jest.fn();
  const service = createRemoteBarcodeLookup({storage, clock, fetchImpl, localLookup: () => ({status: 'not-found'}), runtime: () => ({isWeb: true, isOnline: true})});
  const result = await service.lookup(lookup.identifier.value, {assess: assessLookupForGrading});
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(createBarcodeNutritionCandidate(result).selection.nutrients.sodium).toBeNull();
  expect(result.food.assessmentInputs).toEqual(lookup.food.assessmentInputs);
  const old = clone(lookup); old.food.assessmentInputs.datasets.forEach(d => {d.observations = d.observations.filter(o => o.nutrient !== 'salt');});
  cache.set(old.identifier.value, old);
  const legacyResult = await service.lookup(old.identifier.value, {assess: assessLookupForGrading});
  expect(createBarcodeNutritionCandidate(legacyResult).selection.nutrients.sodium).toBeCloseTo(.288, 12);
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('existing fallback attempts no repeat provider after a known not-found; unknown sodium stays loggable', async () => {
  const lookup = asLookup(), fetchImpl = jest.fn().mockResolvedValue({ok: true, headers: {get: () => null}, text: async () => JSON.stringify(lookup)});
  const service = createRemoteBarcodeLookup({storage: memory(), clock, fetchImpl, localLookup: () => ({status: 'not-found'}), runtime: () => ({isWeb: true, isOnline: true})});
  const selected = await service.lookup(lookup.identifier.value, {assess: assessLookupForGrading});
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(selected.sourceSelection.outcome).toBe('no-usable-alternative');
  expect(createBarcodeNutritionCandidate(selected).canUse).toBe(true);
  expect(createBarcodeNutritionCandidate(selected).selection.nutrients.sodium).toBeNull();
});

test('existing fallback selects a coherent alternative, never salt-derived sodium or mixed ingredients', async () => {
  const lookup = clone(asLookup()); lookup.providerAttempts = [{provider: 'open-food-facts', status: 'found'}];
  // Constructed alternative control only: not an observed Fairlife USDA record.
  const raw = {gtinUpc: lookup.identifier.value, description: lookup.food.name, brandOwner: lookup.food.brand,
    marketCountry: 'United States', fdcId: 123456, servingSize: 240, servingSizeUnit: 'MLT', householdServingFullText: '1 cup',
    ingredients: 'MILK', labelNutrients: {calories: {value: 80}, protein: {value: 13}, carbohydrates: {value: 6}, fat: {value: 0},
      saturatedFat: {value: 0}, fiber: {value: 0}, sugars: {value: 6}, addedSugar: {value: 0}, sodium: {value: 90}}};
  const alternative = {status: 'found', identifier: lookup.identifier, food: normalizeUsdaFood(raw, lookup.identifier.value, fairlife.capturedAt), providerAttempts: [{provider: 'usda-fdc', status: 'found'}]};
  expect(alternative.food).not.toBeNull();
  const fetchImpl = jest.fn().mockImplementation(async (_url, options) => ({ok: true, headers: {get: () => null},
    text: async () => JSON.stringify(JSON.parse(options.body).provider ? alternative : lookup)}));
  const storage = memory(), service = createRemoteBarcodeLookup({storage, clock, fetchImpl, localLookup: () => ({status: 'not-found'}), runtime: () => ({isWeb: true, isOnline: true})});
  const selected = await service.lookup(lookup.identifier.value, {assess: assessLookupForGrading});
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({barcode: lookup.identifier.value, provider: 'usda-fdc'});
  expect(selected.sourceSelection.outcome).toBe('fallback-selected');
  const candidate = createBarcodeNutritionCandidate(selected);
  expect(candidate.selection.nutrients.sodium).toBe(90);
  expect(candidate.selection.ingredients.text).toBe('MILK');
  expect(candidate.selection.remote.provider.id).toBe('usda-fdc');
  expect(selected.sourceSelection.preferred.food.nutrients.sodium).toBeCloseTo(.288, 12);
  const cached = await service.lookup(lookup.identifier.value, {assess: assessLookupForGrading});
  expect(createBarcodeNutritionCandidate(cached).selection.nutrients).toEqual(candidate.selection.nutrients);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

test.each(['888849000012', '037600138727'])('complete %s manufacturer replacement supersedes old provider conflict without mixing sodium and salt', code => {
  const row = captured.find(r => r.barcode.endsWith(code)), raw = clone(row.responses.find(r => r.body?.product).body.product);
  raw.nutriments.sodium_100g = .00012; raw.nutriments.salt_100g = 20;
  delete raw.nutriments.salt_modifier; // Constructed unqualified conflict control.
  const lookup = asLookup(raw), before = JSON.stringify(lookup);
  expect(findSodiumSaltConflicts(lookup.food.assessmentInputs).length).toBeGreaterThan(0);
  const candidate = createBarcodeNutritionCandidate(lookup), assessment = assessBarcodeNutrition(candidate, lookup.identifier);
  expect(candidate.selection.nutrients.sodium).toBe(code === '888849000012' ? 220 : 770);
  expect(candidate.display.nutritionConflicts).toBeUndefined();
  expect(assessment.nutritionScore100).toBe(code === '888849000012' ? 54 : 21);
  expect(assessment.evidence.nutritionConflicts).toEqual([]);
  expect(assessment.evidence.originalProviderAssessment.evidence.nutritionConflicts.length).toBeGreaterThan(0);
  expect(JSON.stringify(lookup)).toBe(before);
});

test('Teddy partial sugar correction does not verify disputed provider sodium; reference assessment stays separate', () => {
  const lookup = clone(teddyArchive.lookup), d = lookup.food.assessmentInputs.datasets.find(d => d.id === 'off-100g');
  d.observations.push(observation('salt', 1000)); // Constructed conflict, not Teddy product evidence.
  const candidate = createBarcodeNutritionCandidate(lookup), assessment = assessBarcodeNutrition(candidate, lookup.identifier);
  expect(candidate.selection.nutrients.addedSugar).toBe(7);
  expect(candidate.selection.nutrients.sodium).toBeNull();
  expect(assessLookupForGrading(lookup)).toEqual({nutrition: false, overall: false});
  expect(assessment.evidence.correctionScope.manufacturerReferenceComparison).toBe(true);
  expect(assessment.evidence.originalProviderAssessment.nutritionScore100).toBeNull();
  expect(assessOverallFoodQuality(candidate, assessment).overallScore100).toBe(20);
});

test('missing logging macros keep the existing completion path with disputed sodium unknown', () => {
  const raw = rawFairlife();
  Object.keys(raw.nutriments).filter(key => key.startsWith('carbohydrates')).forEach(key => delete raw.nutriments[key]);
  const lookup = asLookup(raw); lookup.status = 'incomplete';
  const candidate = createBarcodeNutritionCandidate(lookup);
  expect(candidate.canUse).toBe(false);
  expect(candidate.recovery.food.nutrients.sodium).toBeNull();
  expect(candidate.recovery.providerSourceSnapshot.nutrients.sodium).toBeCloseTo(.288, 12);
});

test('unchanged captured USDA manufacturer corrections retain Quest sodium and Teddy sugars', () => {
  for (const row of manufacturerLookups.observations) {
    const candidate = createBarcodeNutritionCandidate(row.response);
    const quest = row.request.body.barcode === '888849000012';
    expect(candidate.selection.nutrients).toMatchObject(quest ? {sodium: 220} : {addedSugar: 7, totalSugar: 7});
    expect(assessOverallFoodQuality(candidate, assessBarcodeNutrition(candidate, row.response.identifier)).overallScore100).toBe(quest ? 52 : 20);
  }
});

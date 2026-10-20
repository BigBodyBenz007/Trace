// Local research inputs only. Synthetic profiles are not manufacturer data.
// All real measurements and attribution are bundled; no artifact/network reads.
const references = require('./__fixtures__/publishedNutritionReferences.json');
const { normalizeOpenFoodFactsAdditives } = require('../services/productAdditives');

const OBSERVATIONS = references.records;
const PRIOR_OBSERVATIONS = references.priorProfiles;
const clone = value => JSON.parse(JSON.stringify(value));

function synthetic(id, methodCategory, values, extra = {}) {
  const source = { provider: 'Trace synthetic control', kind: 'synthetic',
    id: `synthetic:${id}`, edition: 'published-method-controls-2026-10-19', url: null };
  const units = { calories: 'kcal', sodium: 'mg', energyKj: 'kJ' };
  return {
    id, synthetic: true,
    product: { name: `Synthetic: ${id.replace(/-/g, ' ')}`, category: methodCategory,
      market: 'US', gtin: null },
    methodCategory, source,
    basis: { kind: '100g', amount: 100, unit: 'g' },
    nutrients: Object.fromEntries(Object.entries(values).map(([key, value]) => [key,
      { value, unit: units[key] || 'g' }])),
    plantContent: { percent: 0, basis: 'Explicit synthetic control composition.',
      source: 'Trace synthetic fixture; not a real product.' },
    evidence: { market: { claim: 'US', verification: 'synthetic' },
      reviewerType: 'synthetic', reviewedOn: '2026-10-19' },
    sourceState: { unresolvedConflicts: [] },
    ingredients: null, additives: null, organicAssessment: null,
    baseline: null, previousDensity: null, grainEvidence: null,
    ...clone(extra),
  };
}

const starch = { calories: 360, saturatedFat: 0, totalSugar: 0, addedSugar: 0,
  sodium: 0, fiber: 0, protein: 0, fat: 0, carbohydrates: 90 };
const grain = { calories: 360, saturatedFat: 0.7, totalSugar: 3, addedSugar: 3,
  sodium: 200, fiber: 10, protein: 10, fat: 4, carbohydrates: 70 };
const drink = { calories: 42, saturatedFat: 0, totalSugar: 10.5, addedSugar: 10.5,
  sodium: 10, fiber: 0, protein: 0, fat: 0, carbohydrates: 10.5 };
const zeros = { calories: 0, saturatedFat: 0, totalSugar: 0, addedSugar: 0,
  sodium: 0, fiber: 0, protein: 0, fat: 0, carbohydrates: 0 };
const liquidBasis = { kind: '100ml', amount: 100, unit: 'ml' };
const providerEmpty = { status: 'reported', source: 'open-food-facts',
  sourceField: 'additives_tags', items: [] };
const assessmentSource = { kind: 'synthetic', attribution: 'Invented complete assessment for arithmetic testing only.' };

const SYNTHETIC = [
  synthetic('pure-starch', 'general', starch, {
    product: { name: 'Synthetic: pure starch', category: 'refined-starch', market: 'US', gtin: null },
    previousDensity: { score: 50, note: 'Historical density-control arithmetic.' },
  }),
  synthetic('whole-grain-evidence', 'general', grain, {
    grainEvidence: 'Synthetic whole-grain evidence; no extra points are invented.' }),
  synthetic('refined-grain-evidence', 'general', grain, {
    grainEvidence: 'Synthetic refined-grain evidence; identical nutrient vector.' }),
  synthetic('grain-evidence-unknown', 'general', grain),
  synthetic('nuts', 'general', { calories: 600, saturatedFat: 7, totalSugar: 4,
    addedSugar: 0, sodium: 5, fiber: 10, protein: 21, fat: 50, carbohydrates: 20 }, {
    plantContent: { percent: 100, basis: 'Synthetic single-nut control.', source: 'Trace synthetic fixture.' },
  }),
  synthetic('oil', 'added-fat', { calories: 900, saturatedFat: 14, totalSugar: 0,
    addedSugar: 0, sodium: 0, fiber: 0, protein: 0, fat: 100, carbohydrates: 0 }, {
    plantContent: { percent: 100, basis: 'Synthetic olive-oil control.', source: 'Trace synthetic fixture.' },
  }),
  synthetic('cheese', 'cheese', { calories: 400, saturatedFat: 20, totalSugar: 0,
    addedSugar: 0, sodium: 700, fiber: 0, protein: 25, fat: 33, carbohydrates: 1 }),
  synthetic('sugary-drink', 'beverage', drink, { basis: liquidBasis }),
  synthetic('diet-drink', 'beverage', { ...zeros, sodium: 10 }, { basis: liquidBasis,
    ingredients: { text: 'Synthetic flavored beverage with a hypothetical sweetener.', language: 'en' } }),
  synthetic('water', 'water', zeros, { basis: liquidBasis }),
  synthetic('milk-original-general-rule', 'general', { calories: 61, saturatedFat: 1.865,
    totalSugar: 5, addedSugar: 0, sodium: 43, fiber: 0, protein: 3.15, fat: 3.25,
    carbohydrates: 5 }, { basis: liquidBasis }),
  synthetic('missing-total-sugar', 'general', { ...grain, totalSugar: null }),
  synthetic('missing-added-sugar', 'general', { ...grain, addedSugar: null }),
  synthetic('unknown-plant-content', 'general', grain, { plantContent: null }),
  synthetic('unknown-market', 'general', grain, {
    product: { name: 'Synthetic: unknown market', category: 'general', market: null, gtin: null },
    evidence: { market: { claim: null } },
  }),
  synthetic('overseas-formulation', 'general', grain, {
    product: { name: 'Synthetic: overseas formulation', category: 'general', market: 'NZ', gtin: null },
    evidence: { market: { claim: 'NZ', verification: 'synthetic' } },
  }),
  synthetic('conflicting-panels', 'general', grain, {
    sourceState: { unresolvedConflicts: ['Synthetic: conflicting formulation panels.'] },
  }),
  synthetic('missing-additives', 'general', grain),
  synthetic('provider-empty-additives', 'general', grain, { additives: providerEmpty }),
  synthetic('reported-additives', 'general', grain, {
    ingredients: { text: 'SYNTHETIC ingredient list: oats, citric acid, xanthan gum.', language: 'en' },
    additives: normalizeOpenFoodFactsAdditives(['en:e330', 'en:e415', 'en:e9999']),
  }),
  synthetic('reviewed-composite', 'general', grain, { compositeAssessments: {
    additives: { status: 'reviewed', complete: true, scope: 'full-ingredient-list', items: [], source: assessmentSource },
    organic: { status: 'not-certified', source: assessmentSource },
    hydrogenatedOils: { status: 'reviewed', partialCount: 0, fullyCount: 0, source: assessmentSource },
  } }),
];

const PROFILES = [...OBSERVATIONS, ...SYNTHETIC];
module.exports = { OBSERVATIONS, PRIOR_OBSERVATIONS, SYNTHETIC, PROFILES, synthetic };

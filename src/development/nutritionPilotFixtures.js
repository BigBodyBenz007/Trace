// SYNTHETIC controls are invented test profiles, never manufacturer observations.
const observations = require('./nutritionPilotObservations.json');
const { evaluateNutritionPilot } = require('./nutritionPilotScoring');
const { normalizeOpenFoodFactsAdditives } = require('../services/productAdditives');

function synthetic(id, category, values, extra = {}) {
  const units = { calories: 'kcal', sodium: 'mg' };
  return { id, synthetic: true, product: { name: `Synthetic: ${id.replace(/-/g, ' ')}`, category, gtin: null },
    source: { provider: 'Trace synthetic test profile', kind: 'synthetic', edition: '0.2-local', url: null },
    basis: { kind: '100g', amount: 100, unit: 'g' },
    nutrients: Object.fromEntries(Object.entries(values).map(([k, value]) => [k, { value, unit: units[k] || 'g' }])),
    sourceState: { unresolvedConflicts: [] }, evidence: { market: { claim: 'US', verification: 'synthetic' }, reviewerType: 'synthetic' },
    ingredients: null, additives: null, baseline: null, grainEvidence: null, ...extra };
}

const starch = { calories: 360, saturatedFat: 0, addedSugar: 0, sodium: 0, fiber: 0, protein: 0 };
const grain = { calories: 360, saturatedFat: 0.7, addedSugar: 3, sodium: 200, fiber: 10, protein: 10 };
const protein = { calories: 120, saturatedFat: 0.5, addedSugar: 5, sodium: 300, fiber: 0, protein: 2 };
const drink = { calories: 42, saturatedFat: 0, addedSugar: 10.5, sodium: 10, fiber: 0, protein: 0 };
const SYNTHETIC = [
  synthetic('pure-starch', 'refined-starch', starch, { baseline: { score: 80, reasons: [], note: 'Baseline specification arithmetic' } }),
  synthetic('whole-grain-evidence', 'breakfast-cereal', grain, { grainEvidence: 'SYNTHETIC controlled evidence: whole grain; no quantity-based points.' }),
  synthetic('refined-grain-evidence', 'breakfast-cereal', grain, { grainEvidence: 'SYNTHETIC controlled evidence: refined grain; identical nutrient vector.' }),
  synthetic('grain-evidence-unknown', 'breakfast-cereal', grain),
  synthetic('unsalted-nuts', 'nuts', { calories: 600, saturatedFat: 7, addedSugar: 0, sodium: 5, fiber: 10, protein: 21, fat: 50 }),
  synthetic('oil', 'oil', { calories: 900, saturatedFat: 14, addedSugar: 0, sodium: 0, fiber: 0, protein: 0, fat: 100 }),
  synthetic('protein-control', 'frozen-meal', protein),
  synthetic('protein-plus', 'frozen-meal', { ...protein, calories: 160, protein: 12 }),
  synthetic('sugary-drink', 'sugar-sweetened-beverage', drink, { basis: { kind: 'serving', amount: 100, unit: 'ml' } }),
  synthetic('same-drink-plus-water', 'sugar-sweetened-beverage', drink, { basis: { kind: 'serving', amount: 200, unit: 'ml' } }),
  synthetic('unsweetened-drink', 'unsweetened-low-energy-beverage', { calories: 0, addedSugar: 0, sodium: 0 },
    { basis: { kind: 'serving', amount: 250, unit: 'ml' } }),
  synthetic('missing-added-sugar', 'refined-starch', { ...starch, addedSugar: null, totalSugar: 4 }),
  synthetic('conflicting-panels', 'refined-starch', starch, { sourceState: { unresolvedConflicts: ['SYNTHETIC: two different formulation panels'] } }),
  synthetic('unknown-market', 'refined-starch', starch, { evidence: { market: { claim: null } } }),
  synthetic('overseas-formulation', 'refined-starch', starch, { evidence: { market: { claim: 'NZ' } } }),
  synthetic('reported-additives', 'breakfast-cereal', grain, {
    ingredients: { text: 'SYNTHETIC ingredient list: oats, citric acid, xanthan gum.', language: 'en' },
    additives: normalizeOpenFoodFactsAdditives(['en:e330', 'en:e415', 'en:e9999']),
  }),
  synthetic('provider-empty-additives', 'breakfast-cereal', grain, { additives: normalizeOpenFoodFactsAdditives([]) }),
];
const PROFILES = [...observations.records, ...SYNTHETIC];

function comparisonRows() {
  return observations.records.map(profile => {
    const result = evaluateNutritionPilot(profile);
    const changes = result.eligible && profile.baseline.score === null
      ? ['Nutrition now calculated separately from identity/review metadata',
        ...(['bread', 'nuts', 'peanut-butter'].includes(profile.product.category) ? ['Category included in solid-food density pilot'] : []),
        ...(profile.basis.amount === null ? ['Gram serving quantity not needed for same-serving energy density'] : [])]
      : result.eligible ? ['Formula and reference basis changed'] : ['No score: ' + result.reasons.map(r => r.message).join(' ')];
    return { id: profile.id, name: profile.product.name, baselineScore: profile.baseline.score,
      baselineReasons: profile.baseline.reasons, pilotScore: result.experimental?.score ?? null,
      pilotRaw: result.experimental?.raw ?? null, eligible: result.eligible, reasons: result.reasons, changes,
      market: result.sourceConfidence.market, scanMatchEligible: false };
  });
}

module.exports = { PROFILES, SYNTHETIC, synthetic, comparisonRows };

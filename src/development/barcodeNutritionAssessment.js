import { canonicalGtinKey } from '../services/productIdentifiers';
import { normalizeNutritionAssessmentInputs, getAssessmentDatasetNutrients, getNutritionAssessmentQuality } from '../services/nutritionAssessmentInputs';
import { evaluateTraceNutrition } from './traceNutritionConversion';

// Exact provider category claims only. These are deliberately limited; names,
// ingredients, brand similarity and research observations never assign categories.
const CATEGORY = {
  'en:breakfast-cereals': 'general', 'en:breads': 'general', 'en:biscuits': 'general',
  'en:pastas': 'general', 'en:rice': 'general',
  'en:cheeses': 'cheese', 'en:sodas': 'beverage', 'en:soft-drinks': 'beverage',
  'en:nuts': 'fats-nuts-seeds', 'en:seeds': 'fats-nuts-seeds', 'en:olive-oils': 'fats-nuts-seeds',
  'Breakfast Cereals': 'general', 'Breads & Buns': 'general', 'Cheese': 'cheese',
};
const REQUIRED = ['calories', 'saturatedFat', 'totalSugar', 'sodium', 'fiber', 'protein', 'fat', 'carbohydrates'];
const LABELS = { calories: 'Energy', saturatedFat: 'Saturated fat', totalSugar: 'Total sugars', sodium: 'Sodium', fiber: 'Fiber', protein: 'Protein', fat: 'Total fat', carbohydrates: 'Carbohydrates' };
const UNITS = { g: [1, 'g'], mg: [.001, 'g'], kg: [1000, 'g'], oz: [28.349523125, 'g'], lb: [453.59237, 'g'], ml: [1, 'ml'], l: [1000, 'ml'] };
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

export function assessBarcodeNutrition(candidate, identifier) {
  const display = candidate?.display || {};
  const input = normalizeNutritionAssessmentInputs(display.assessmentInputs);
  const reasons = [];
  const add = message => { if (!reasons.includes(message)) reasons.push(message); };
  const base = { grade: null, scoreReady: false, scanMatchEligible: false, nutritionScore100: null,
    confidence: 'Source/formulation evidence incomplete; no exact US formulation verification.', reasons, result: null };
  if (candidate?.customFood) { add('Custom food edits do not establish a matching provider assessment.'); return freeze(base); }
  if (!input) { add('Nutrition assessment inputs were not captured for this product. Food logging remains available when its serving data is usable.'); return freeze(base); }
  const key = canonicalGtinKey(identifier?.value);
  const snapshot = candidate?.selection?.remote || candidate?.recovery?.providerSourceSnapshot;
  if (!key || key !== canonicalGtinKey(input.identity.gtin)
    || (input.identity.providerGtin !== null && key !== canonicalGtinKey(input.identity.providerGtin))
    || input.identity.name !== display.name || input.identity.brand !== display.brand
    || input.source.url !== display.sourceUrl || input.source.attribution !== display.attribution
    || (snapshot && (snapshot.provider?.id !== input.source.provider || snapshot.provider?.recordId !== input.source.recordId))) {
    add('Assessment provenance does not match the selected barcode product.'); return freeze(base);
  }
  const markets = input.markets.flatMap(entry => entry.values);
  const us = new Set(['en:united-states', 'United States', 'United States of America', 'US', 'USA']);
  if (!markets.length) add('Product market is unknown; a US formulation cannot be established.');
  else if (!markets.every(value => us.has(value))) add('A US-only product record is not established; foreign or multi-market formulations are not substituted.');
  const confidence = markets.length && markets.every(value => us.has(value))
    ? 'Provider reports US availability; exact regional formulation and current package contents are not independently verified.' : base.confidence;
  const quality = getNutritionAssessmentQuality(input, { stale: candidate?.stale });
  if (quality.states.some(state => ['conflicting-provider-information', 'conflicting-source-dates', 'conflicting-product-identifier', 'invalid', 'unsupported-unit'].includes(state))) add('Provider nutrient values, units or provenance conflict and need review.');
  if (candidate?.stale || input.source.cacheStale) add('Cached assessment evidence is stale; refresh and review the source.');
  const claims = input.categories.flatMap(entry => entry.values);
  const categories = [...new Set(claims.map(value => CATEGORY[value]).filter(Boolean))];
  // Processed nut products need a verified proportion. Drinkable yogurt and
  // medical/infant/supplement products must never inherit the general yogurt rule.
  const special = claims.some(value => /drinkable|drinking|red-meat|meat|infant|baby|supplement|sports|medical|meal-replacement|nut-bars|nut-butters/i.test(value));
  const category = !special && categories.length === 1 ? categories[0] : null;
  if (!category) add('A supported, unambiguous nutritional category is missing.');
  const datasets = input.datasets.filter(dataset => dataset.basis !== 'unknown' && UNITS[dataset.quantity?.unit?.toLowerCase()]);
  const ranked = datasets.map(dataset => ({ dataset, nutrients: getAssessmentDatasetNutrients(dataset) }))
    .sort((a, b) => REQUIRED.filter(key => b.nutrients[key].value !== null).length - REQUIRED.filter(key => a.nutrients[key].value !== null).length
      || Number(b.dataset.basis === '100g') - Number(a.dataset.basis === '100g'));
  if (!ranked.length) { add('A compatible nutrient measurement basis is missing.'); return freeze({ ...base, confidence }); }
  const { dataset, nutrients } = ranked[0];
  REQUIRED.forEach(key => { if (nutrients[key].value === null) add(`${LABELS[key]} is missing or unsupported.`); });
  const source = { id: `${input.source.provider}:${input.source.recordId}`, edition: input.source.revisionDate
    ? `provider revision ${input.source.revisionDate}` : `provider revision unknown; captured ${input.source.retrievedAt || 'date unknown'}`,
    provider: input.source.attribution, url: input.source.url, kind: 'provider-product' };
  const [factor, unit] = UNITS[dataset.quantity.unit.toLowerCase()];
  if ((category === 'beverage' && unit !== 'ml') || (category && category !== 'beverage' && unit !== 'g')) add('The category requires a compatible mass or volume basis; no density is assumed.');
  const profile = { id: input.identity.gtin, synthetic: false,
    product: { name: input.identity.name, brand: input.identity.brand, gtin: input.identity.gtin, market: null }, source,
    basis: { kind: 'serving', amount: dataset.quantity.amount * factor, unit, sourceId: source.id, sourceEdition: source.edition },
    nutrients: Object.fromEntries(Object.entries(nutrients).map(([key, n]) => [key, { value: n.value, unit: n.unit,
      sourceId: source.id, sourceEdition: source.edition }])),
    evidence: { reviewedOn: null }, updatedCategory: category, updatedFvlContent: null,
    nonNutritiveSweeteners: null, sourceState: { unresolvedConflicts: [] } };
  // A reported zero in the older, broader fruit/veg/nut group also bounds the
  // updated subset to zero. Positive values and provider estimates cannot do so.
  const groups = input.foodGroups.filter(entry => entry.identification === 'provider-reported'
    && entry.field === 'nutriments.fruits-vegetables-nuts_100g' && entry.rawUnit === '%');
  if (category !== 'fats-nuts-seeds' && groups.length === 1 && (groups[0].rawValue === 0 || groups[0].rawValue === '0')) profile.updatedFvlContent = {
    percent: 0, basis: 'Provider reports zero for the older broader fruit/vegetable/nut group; the updated subset cannot exceed it.', source };
  // Preserve directly reported kJ rather than round-trip it through kcal.
  const kj = dataset.observations.filter(entry => entry.nutrient === 'calories' && entry.rawUnit?.toLowerCase() === 'kj');
  if (kj.length === 1 && kj[0].rawValue != null && kj[0].rawValue !== '' && Number.isFinite(Number(kj[0].rawValue))
    && nutrients.calories.status === 'reported') profile.nutrients.energyKj = {
    value: Number(kj[0].rawValue), unit: 'kJ', sourceId: source.id, sourceEdition: source.edition };
  if (reasons.length) return freeze({ ...base, confidence });
  const result = evaluateTraceNutrition(profile);
  if (result.nutritionScore100 === null) {
    if (!profile.updatedFvlContent) add('The updated fruit/vegetable/legume fraction is unknown.');
    if (category === 'beverage') add('Beverage sweetener evidence is incomplete.');
    result.reasons.forEach(reason => add(reason.message));
  }
  return freeze({ ...base, confidence, result, nutritionScore100: result.nutritionScore100 });
}

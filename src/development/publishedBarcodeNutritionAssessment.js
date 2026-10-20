import { canonicalGtinKey } from '../services/productIdentifiers';
import { normalizeNutritionAssessmentInputs, getNutritionAssessmentQuality } from '../services/nutritionAssessmentInputs';
import { evaluateTraceNutrition } from './traceNutritionConversion';
import { reconcileBarcodeDatasets, resolveBarcodeCategory, resolveBarcodePlantContent } from './barcodeNutritionEvidence';

const REQUIRED = ['calories', 'saturatedFat', 'totalSugar', 'sodium', 'fiber', 'protein', 'fat', 'carbohydrates'];
const LABELS = { calories: 'Energy', saturatedFat: 'Saturated fat', totalSugar: 'Total sugars', sodium: 'Sodium', fiber: 'Fiber', protein: 'Protein', fat: 'Total fat', carbohydrates: 'Carbohydrates' };
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

export function assessBarcodeNutrition(candidate, identifier) {
  const display = candidate?.display || {};
  const input = normalizeNutritionAssessmentInputs(display.assessmentInputs);
  const reasons = [];
  const warnings = [];
  const add = message => { if (!reasons.includes(message)) reasons.push(message); };
  const base = { grade: null, scoreReady: false, scanMatchEligible: false, nutritionScore100: null,
    confidence: 'Source/formulation evidence incomplete; no exact US formulation verification.', reasons, warnings, evidence: {}, result: null };
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
  if (!markets.length) warnings.push('Product market is unknown; this assesses only the attributed profile, not a verified US formulation.');
  else if (!markets.every(value => us.has(value))) warnings.push('Foreign or multi-market availability is reported; this profile is not verified as the US formulation. No regional records are merged.');
  const confidence = markets.length && markets.every(value => us.has(value))
    ? 'Provider reports US availability; exact regional formulation and current package contents are not independently verified.'
    : markets.length ? 'Foreign or multi-market record: the score assesses this supplied profile only. The exact US formulation is not independently verified.'
      : 'Product market is unknown: the score assesses this supplied profile only. The exact US formulation is not independently verified.';
  base.evidence.market = { claims: input.markets, status: markets.length && markets.every(value => us.has(value)) ? 'provider-reported-us' : markets.length ? 'foreign-or-multi-market' : 'unknown', exactUsFormulationVerified: false };
  const quality = getNutritionAssessmentQuality(input, { stale: candidate?.stale });
  if (quality.states.some(state => ['conflicting-source-dates', 'conflicting-product-identifier', 'invalid', 'unsupported-unit'].includes(state))) add('Provider nutrient values, units or provenance conflict and need review.');
  if (candidate?.stale || input.source.cacheStale) add('Cached assessment evidence is stale; refresh and review the source.');
  const categoryEvidence = resolveBarcodeCategory(input, display);
  base.evidence.category = categoryEvidence;
  const categories = categoryEvidence.categories;
  const category = categories.length === 1 ? categories[0] : null;
  const plantEvidence = resolveBarcodePlantContent(input, display, categoryEvidence);
  base.evidence.plantContent = plantEvidence;
  warnings.push(...plantEvidence.warnings);
  if (plantEvidence.status === 'conflicting') add(plantEvidence.basis);
  if (!categories.length) add(categoryEvidence.excluded ? 'The supplied evidence places this product outside supported food scope.' : 'A supported nutritional category cannot be established from the captured evidence.');
  const reconciliation = reconcileBarcodeDatasets(input);
  reconciliation.reasons.forEach(add);
  warnings.push(...reconciliation.warnings);
  base.evidence.energy = reconciliation.records.map(record => record.energyEvidence);
  const ranked = reconciliation.records.filter(record => record.quantity)
    .sort((a, b) => REQUIRED.filter(key => b.nutrients[key].value !== null).length - REQUIRED.filter(key => a.nutrients[key].value !== null).length
      || Number(b.dataset.basis === '100g') - Number(a.dataset.basis === '100g'));
  if (!ranked.length) { add('A compatible nutrient measurement basis is missing.'); return freeze({ ...base, confidence }); }
  const compatible = ranked.filter(record => categories.every(value => value === 'beverage' ? record.quantity.unit === 'ml' : record.quantity.unit === 'g'));
  const { dataset, nutrients, quantity, energyKj } = compatible[0] || ranked[0];
  base.evidence.selectedDatasetId = dataset.id;
  REQUIRED.forEach(key => { if (nutrients[key].value === null) warnings.push(`${LABELS[key]} is missing or unsupported; no zero is substituted.`); });
  const source = { id: `${input.source.provider}:${input.source.recordId}`, edition: input.source.revisionDate
    ? `provider revision ${input.source.revisionDate}` : `provider revision unknown; captured ${input.source.retrievedAt || 'date unknown'}`,
    provider: input.source.attribution, url: input.source.url, kind: 'provider-product' };
  const { unit, amount } = quantity;
  if (categories.length && !compatible.length) add('The category requires a compatible mass or volume basis; no density is assumed.');
  const profile = { id: input.identity.gtin, synthetic: false,
    product: { name: input.identity.name, brand: input.identity.brand, gtin: input.identity.gtin, market: null }, source,
    basis: { kind: dataset.basis === '100g' || dataset.basis === '100ml' ? dataset.basis : 'serving', amount, unit, sourceId: source.id, sourceEdition: source.edition },
    nutrients: Object.fromEntries(Object.entries(nutrients).map(([key, n]) => [key, { value: n.value, unit: n.unit,
      sourceId: source.id, sourceEdition: source.edition }])),
    evidence: { reviewedOn: null }, updatedCategory: category, updatedFvlContent: null,
    nonNutritiveSweeteners: null, sourceState: { unresolvedConflicts: [] } };
  if (categories.length > 1) profile.updatedCategoryCandidates = categories;
  if (plantEvidence.status === 'verified-zero') profile.updatedFvlContent = {
    percent: 0, basis: plantEvidence.basis, source };
  // Preserve directly reported kJ rather than round-trip it through kcal.
  if (energyKj !== null) profile.nutrients.energyKj = {
    value: energyKj, unit: 'kJ', sourceId: source.id, sourceEdition: source.edition };
  if (reasons.length) return freeze({ ...base, confidence });
  const result = evaluateTraceNutrition(profile);
  if (result.nutritionScore100 === null) {
    REQUIRED.forEach(key => { if (nutrients[key].value === null) add(`${LABELS[key]} is missing or unsupported.`); });
    if (!profile.updatedFvlContent) add('The updated fruit/vegetable/legume fraction is unknown.');
    if (category === 'beverage') add('Beverage sweetener evidence is incomplete.');
    result.reasons.forEach(reason => add(reason.message));
  }
  return freeze({ ...base, confidence, result, nutritionScore100: result.nutritionScore100 });
}

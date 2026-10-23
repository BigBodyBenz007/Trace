import { resolveProteinSupplementBoundary } from './proteinSupplementBoundary';
import { canonicalGtinKey } from '../services/productIdentifiers';
import { normalizeNutritionAssessmentInputs } from '../services/nutritionAssessmentInputs';
import { reconcileBarcodeDatasets, resolveBarcodeCategory } from './barcodeNutritionEvidence';
import { evaluateTraceUsNutritionV2 as evaluatePracticalUsNutrition } from './traceUsNutritionScoringV2';
import { assessAdditiveEvidence, resolveGrainEvidence } from './traceFoodQualityEvidence';
import { applyVerifiedNutritionToAssessment } from './verifiedBarcodeNutritionAssessment';
import { getAppliedVerifiedNutritionCorrection } from '../services/verifiedProductNutritionCorrections';
import { findSodiumSaltConflicts, SODIUM_SALT_MESSAGE } from '../services/sodiumSaltEvidence';

const UNITS = { calories: 'kcal', saturatedFat: 'g', addedSugar: 'g', totalSugar: 'g', sodium: 'mg', fiber: 'g', protein: 'g', fat: 'g', carbohydrates: 'g' };
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

function assessCatalogProfile(candidate, identifier, base) {
  const food = candidate.selection;
  if (food?.sourceType !== 'packaged-food' || food.remote || !food.nutrients || !food.serving) return null;
  const display = candidate.display;
  const key = canonicalGtinKey(identifier?.value);
  if (food.name !== display.name || (key && food.identifiers?.length
    && !food.identifiers.some(id => canonicalGtinKey(id.value) === key))) return null;
  const serving = food.serving;
  const basis = Number.isFinite(serving.grams) && serving.grams > 0 ? { amount: serving.grams, unit: 'g' }
    : ['g', 'ml'].includes(serving.unit) ? { amount: serving.amount, unit: serving.unit } : null;
  const source = { attribution: display.attribution, url: display.sourceUrl };
  const nutrients = Object.fromEntries(Object.entries(UNITS).map(([key, unit]) => [key, { value: food.nutrients[key] ?? null, unit }]));
  const zeroFatLabel = food.provenance?.source === 'official-manufacturer' && food.nutrients.fat === 0;
  const result = evaluatePracticalUsNutrition({ basis, category: basis?.unit === 'ml' ? 'beverage' : 'general',
    nutrients, source, productEvidence: { name: food.name, categories: food.categories, source },
    usZeroFatLabelServing: zeroFatLabel, grainEvidence: resolveGrainEvidence(display.ingredients, source) });
  return freeze({ ...base, confidence: result.comparison?.saturatedFatBound
    ? 'Manufacturer-attributed catalog profile assessed using US zero-fat label rounding; current US formulation/package match is not independently verified.'
    : 'Existing manufacturer-attributed catalog profile; current US formulation and package match are not independently verified by this assessment.',
    nutritionScore100: result.nutritionScore100, result, reasons: result.reasons,
    warnings: [...result.warnings, 'Existing catalog nutrient facts are used directly; no newer assessment wrapper, barcode proof or source revision is required.'],
    evidence: { market: { claims: [], status: 'catalog-profile', exactUsFormulationVerified: false },
      selectedDatasetId: 'catalog-label-serving', originalDataset: { serving: food.serving, nutrients: food.nutrients, provenance: food.provenance },
      category: { categories: [basis?.unit === 'ml' ? 'beverage' : 'general'], basis: ['Existing catalog label-serving comparison.'] },
      assessment: { methodId: result.methodId, methodVersion: result.methodVersion, sugarMode: result.sugarMode ?? null,
        excludedNutrients: result.excludedNutrients ?? [], source, usZeroFatLabelServing: zeroFatLabel } } });
}

function assessProviderBarcodeNutrition(candidate, identifier) {
  const display = candidate?.display || {};
  const input = normalizeNutritionAssessmentInputs(display.assessmentInputs);
  const base = { grade: null, scoreReady: false, scanMatchEligible: false, nutritionScore100: null,
    additiveAssessment: assessAdditiveEvidence(display.additives), overallFoodQualityScore100: null,
    confidence: 'Source/formulation evidence incomplete; no exact US formulation verification.',
    reasons: [], warnings: [], evidence: {}, result: null };
  if (candidate?.customFood) return freeze({ ...base, reasons: ['Edited food values do not match the retained provider assessment.'] });
  if (!input) return (display.assessmentInputs == null && candidate && assessCatalogProfile(candidate, identifier, base))
    || freeze({ ...base, reasons: ['A usable nutrition profile was not captured. Food logging remains separate.'] });
  const key = canonicalGtinKey(identifier?.value);
  const snapshot = candidate?.selection?.remote || candidate?.recovery?.providerSourceSnapshot;
  // Optional barcode checks protect the selected record, not standalone scoring.
  if ((key && key !== canonicalGtinKey(input.identity.gtin))
    || (key && input.identity.providerGtin !== null && key !== canonicalGtinKey(input.identity.providerGtin))
    || input.identity.name !== display.name || input.identity.brand !== display.brand
    || input.source.url !== display.sourceUrl || input.source.attribution !== display.attribution
    || (snapshot && (snapshot.provider?.id !== input.source.provider || snapshot.provider?.recordId !== input.source.recordId))) {
    return freeze({ ...base, reasons: ['Nutrition provenance does not match the selected product.'] });
  }
  const claims = input.markets.flatMap(entry => entry.values);
  const us = new Set(['en:united-states', 'United States', 'United States of America', 'US', 'USA']);
  const usOnly = claims.length > 0 && claims.every(value => us.has(value));
  base.confidence = usOnly
    ? 'Provider reports US availability; exact regional formulation and current package contents are not independently verified.'
    : claims.length ? 'Foreign or multi-market record: this assesses only its supplied nutrition profile. The exact US formulation is not independently verified.'
      : 'Product market is unknown: this assesses only the supplied nutrition profile. The exact US formulation is not independently verified.';
  base.evidence.market = { claims: input.markets, status: usOnly ? 'provider-reported-us' : claims.length ? 'foreign-or-multi-market' : 'unknown', exactUsFormulationVerified: false };
  if (!usOnly) base.warnings.push('US formulation is unverified. No regional records or manufacturer panels are merged.');
  if (candidate?.stale || input.source.cacheStale) base.warnings.push('This is an older cached observation, not verified current package data.');
  const nutritionConflicts = findSodiumSaltConflicts(input);
  if (nutritionConflicts.length) return freeze({ ...base, reasons: [SODIUM_SALT_MESSAGE],
    evidence: { ...base.evidence, nutritionConflicts } });
  const categoryEvidence = resolveBarcodeCategory(input, display);
  const tags = input.categories.flatMap(entry => entry.values).join(' ');
  const name = input.identity.name.toLowerCase();
  const isOil = /en:(?:olive-oils|vegetable-oils|oils)(?:\s|$)/.test(tags) && /\boil\b/.test(name);
  const isNuts = !/en:chestnuts(?:\s|$)/.test(tags) && (/en:(?:nuts|seeds|peanut-butters|nut-butters)(?:\s|$)/.test(tags)
    || categoryEvidence.basis.includes('Complete single-nut ingredient declaration.'));
  // An unresolved reference must not erase the provider's mass evidence and
  // accidentally turn a food (e.g. soup) into a beverage. Keep the existing
  // volume-only fallback only when the captured measurement evidence agrees.
  const declaredMass = input.serving.some(entry => ['servingSizeUnit', 'serving_quantity_unit', 'product_quantity_unit'].includes(entry.field)
    && /^(g|grm|gram|grams)$/i.test(String(entry.value).trim()));
  const unresolvedMassReference = declaredMass && input.datasets.some(d => d.id === 'off-100g' && d.basis === 'unknown');
  const volumeOnly = !unresolvedMassReference && input.datasets.some(d => d.quantity?.unit === 'ml')
    && !input.datasets.some(d => d.quantity?.unit === 'g');
  const drinking = categoryEvidence.categories.includes('beverage') || (!isOil && !isNuts && volumeOnly);
  const category = drinking ? 'beverage' : isOil ? 'oil' : isNuts ? 'nuts' : 'general';
  base.evidence.category = { categories: [category], providerClaims: input.categories,
    basis: [`Trace ${category} comparison from available food-description/category and measurement evidence; exact taxonomy tags and plant percentages are not required.`] };
  if (categoryEvidence.excluded) base.warnings.push('Provider reports special-purpose/supplement scope. This score describes nutrients only; it does not establish suitability, food status or intended use.');
  const reconciliation = reconcileBarcodeDatasets(input);
  base.evidence.energy = reconciliation.records.map(record => record.energyEvidence);
  base.warnings.push(...reconciliation.warnings);
  // Select one whole reference panel, preferring explicit per-100 over derived
  // serving/entered aliases. Do not splice nutrients or convert g to ml.
  const rank = record => ['calories', 'saturatedFat', 'sodium'].filter(key => record.nutrients[key].value !== null).length * 100
    + Number(record.nutrients.addedSugar.value !== null || record.nutrients.totalSugar.value !== null) * 100
    + (['100g', '100ml'].includes(record.dataset.basis) ? 10 : 0);
  const records = reconciliation.records.filter(record => record.quantity
    && (category === 'oil' || record.quantity.unit === (category === 'beverage' ? 'ml' : 'g'))).sort((a, b) => rank(b) - rank(a));
  if (!records.length) return freeze({ ...base, reasons: ['A known compatible mass or volume measurement basis is missing; no density is assumed.'] });
  const selected = records[0];
  base.evidence.selectedDatasetId = selected.dataset.id;
  base.evidence.originalDataset = selected.dataset;
  if (reconciliation.reasons.length) base.warnings.push(...reconciliation.reasons.map(reason => `Provider consistency warning: ${reason}`));
  const reasons = [];
  const excludedFromPanel = [];
  if (!selected.energyEvidence.accepted) reasons.push('Selected energy declarations conflict beyond supported rounding.');
  const nutrients = {};
  for (const [key, unit] of Object.entries(UNITS)) {
    const value = selected.nutrients[key];
    if (['invalid', 'unsupported-unit', 'conflicting'].includes(value.status)) {
      const message = `${key} is ${value.status} in the selected panel.`;
      if (!['calories', 'saturatedFat', 'sodium'].includes(key)) { base.warnings.push(`${message} No benefit or value is inferred.`); excludedFromPanel.push(key); }
      else reasons.push(message);
    }
    nutrients[key] = { value: value.value, unit };
  }
  if (reasons.length) return freeze({ ...base, reasons });
  const result = evaluatePracticalUsNutrition({ category, basis: { ...selected.quantity }, nutrients, source: { ...input.source },
    productEvidence: { name: input.identity.name, categories: input.categories, source: { ...input.source } },
    grainEvidence: resolveGrainEvidence(display.ingredients, input.source) });
  base.warnings.push(...result.warnings);
  base.evidence.assessment = { methodId: result.methodId, methodVersion: result.methodVersion,
    sugarMode: result.sugarMode ?? null, excludedNutrients: [...new Set([...excludedFromPanel, ...(result.excludedNutrients ?? [])])], source: { ...input.source } };
  return freeze({ ...base, result, nutritionScore100: result.nutritionScore100, reasons: result.reasons });
}

export function assessBarcodeNutrition(candidate, identifier) {
  // Resolve the independent manufacturer panel even when an older cached
  // provider panel cannot be scored. Keep that entire original result separate.
  const replacement = getAppliedVerifiedNutritionCorrection(candidate, identifier)?.mode === 'replacement-panel';
  const original = replacement ? { ...candidate, display: { ...candidate.display,
    ingredients: candidate.selection.remote.ingredients, additives: candidate.selection.remote.additives } } : candidate;
  const assessment = applyVerifiedNutritionToAssessment(candidate, identifier, assessProviderBarcodeNutrition(original, identifier));
  const boundary = resolveProteinSupplementBoundary(candidate);
  if (boundary.status !== 'not-rated-category') return assessment;
  return freeze({ ...assessment, ratingStatus: boundary.status, ratingBoundary: boundary,
    nutritionScore100: null, result: null, reasons: [boundary.message],
    diagnostics: { nutrition: assessment } });
}

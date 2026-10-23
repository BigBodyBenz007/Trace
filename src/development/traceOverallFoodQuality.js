import { normalizeProductAdditives } from '../services/productAdditives';
import { LEGAL_EVENT_REGISTRY } from '../services/regulatoryLegalEvents';
import { getRegulatorySource } from '../services/regulatorySourceRegistry';
import { getBarcodeAdditiveInformation } from './barcodeReviewInformation';
import { screenIngredientDeclaration } from './additiveScreeningPolicy';

export const OVERALL_POLICY = Object.freeze({
  id: 'trace-overall-declared-profile', version: '4-general-evidence-experimental-2026-10-20',
  nutritionWeight: .8, maximumRelativeAdditiveDeduction: .2,
  exposureSource: 'https://www.fda.gov/consumers/consumer-updates/food-safe-if-it-has-chemicals',
});
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const text = value => typeof value === 'string' && value.trim().length > 0;

// Only exact, already-cited identifier bindings qualify. No E-number/name guess,
// date-based current-law inference, or legal-action-to-health-penalty conversion.
function historicalEvents(identifier) {
  if (!identifier) return [];
  return LEGAL_EVENT_REGISTRY.data.events.filter(event => event.substance.identifiers?.some(id =>
    id.scheme === 'EU-E-number' && id.value === identifier)).map(event => ({
    eventId: event.eventId, substance: event.substance.name, jurisdiction: event.jurisdiction,
    action: event.action.type, dates: { ...event.dates }, reviewedOn: event.evidence.lastReviewedOn,
    scope: event.evidence.scope, limitations: [...event.evidence.limitations],
    qualifications: event.qualifications.map(q => q.text),
    sources: event.sourceReferences.map(reference => {
      const source = getRegulatorySource(reference);
      return { sourceId: reference.sourceId, editionId: reference.editionId, provisions: [...reference.provisions],
        title: source.citation.title, url: source.citation.url,
        verification: { ...source.verification, limitations: [...source.verification.limitations] } };
    }),
  }));
}

export function assessAdditiveProfile(candidate) {
  const display = candidate?.display || {}, value = display.additives;
  const data = normalizeProductAdditives(value, value?.source);
  const reported = data?.status === 'reported';
  const source = { url: display.ingredientSource?.url || display.sourceUrl || null,
    attribution: display.ingredientSource?.attribution || display.attribution || null };
  const screen = screenIngredientDeclaration(display.ingredients?.text, reported ? data.items : []);
  const providerState = value == null ? 'not-collected' : !reported ? 'unknown'
    : data.items.length ? 'reported-identifiers' : 'provider-reported-empty';
  const attributed = text(source.url) && text(source.attribution) && !candidate?.customFood;
  const items = screen.items.map(item => {
    const info = getBarcodeAdditiveInformation(/^E322i{1,2}$/.test(item.id) ? 'E322' : item.id);
    const matches = reported ? data.items.filter(entry => item.origins.some(origin => origin.identifier === entry.providerIdentifier)) : [];
    const provider = matches.find(entry => entry.standardizedIdentifier === item.id) || matches[0];
    const weight = attributed ? item.concernBurden : null;
    return { identifier: item.id, providerIdentifier: provider?.providerIdentifier || null,
      providerIdentifiers: item.origins.filter(o => o.type === 'provider-tag').map(o => o.identifier),
      name: provider?.name || item.record?.name || null, nameVerified: Boolean(provider?.nameReference),
      provider: provider?.source || null, origins: item.origins, function: info?.function || item.record?.function || null,
      scientificContext: info?.concern || null, usProvision: info?.regulation || null,
      historicalEvents: historicalEvents(item.id), concernBurden: weight,
      classification: weight === null ? null : item.classification, exposure: 'unknown',
      conditionalPresence: Boolean(item.conditionalPresence), packagingOnly: Boolean(item.packagingOnly),
      conflict: Boolean(item.conflict), conditionResult: item.conditionResult, review: item.record };
  });
  const reasons = [...screen.warnings, ...screen.unresolved];
  if (display.ingredients?.language && display.ingredients.language !== 'en') reasons.push('This declaration language has only limited phrase matching; declaration review remains partial.');
  if (!attributed) reasons.push('An attributed ingredient source is required; no review is inferred from provider scores.');
  if (!screen.usable) reasons.push('Ingredient evidence is missing; empty or missing provider tags cannot replace it.');
  for (const item of items.filter(item => item.concernBurden === null)) reasons.push(
    `${item.name || item.identifier}: ${item.conflict ? 'Presence evidence conflicts or is not corroborated.'
      : item.conditionalPresence ? 'Alternative ingredient presence is unresolved.'
        : item.packagingOnly ? 'Packaging-only declaration; food presence and migration not established.'
          : item.review?.rationale || 'No reviewed identity or scientific classification.'}`);
  const someReview = screen.ordinary.length > 0 || items.some(item => item.concernBurden !== null);
  const canScreen = attributed && screen.usable && someReview;
  const reviewed = canScreen && reasons.length === 0;
  const status = !canScreen ? 'nutrition-only' : reviewed ? 'reviewed' : 'partial';
  return freeze({ status, providerState, concernBurden: canScreen ? screen.knownConcern : null, items, reasons, source,
    originalIngredientText: display.ingredients?.text || null, exposure: 'unknown', ordinaryIngredients: screen.ordinary,
    reviewRule: canScreen ? 'Closed ordinary-ingredient vocabulary plus sourced identity-specific scientific screening; no product-name defaults.' : null,
    summary: status === 'reviewed' ? 'Available declaration screened under this policy; no unresolved relevant identities. This is not a safety assurance.'
      : status === 'partial' ? 'Partially reviewed. Only supported deductions are included; unassessed items remain unknown.'
        : 'No usable reviewed ingredient assessment. Nutrition-only; unknown additives are not treated as harmless.',
    limitation: 'This screens the captured declaration, not independently verified package contents, chemical absence, exposure, safety or current legal compliance.' });
}

export function assessOverallFoodQuality(candidate, nutrition) {
  const additives = assessAdditiveProfile(candidate), score = nutrition?.nutritionScore100;
  const categoryBoundary = nutrition?.ratingStatus === 'not-rated-category';
  const usable = Number.isInteger(score) && score >= 0 && score <= 100;
  const supported = usable && additives.concernBurden !== null;
  const raw = supported ? score * (1 - OVERALL_POLICY.maximumRelativeAdditiveDeduction * additives.concernBurden) : null;
  const rounded = raw === null ? null : Math.round(raw);
  const provisional = supported && additives.status === 'partial';
  const totalWeight = additives.items.reduce((sum, item) => sum + (item.concernBurden ?? 0), 0);
  return freeze({ policy: OVERALL_POLICY, grade: null, scoreReady: false, scanMatchEligible: false,
    ...(categoryBoundary ? { ratingBoundary: nutrition.ratingBoundary } : {}),
    status: categoryBoundary ? 'not-rated-category' : !usable ? 'nutrition-unavailable' : !supported ? 'nutrition-only' : provisional ? 'provisional' : 'reviewed',
    nutritionScore100: usable ? score : null, overallScore100: rounded, provisional,
    rawOverall: raw, additiveDeduction: supported ? score - rounded : null,
    rawAdditiveDeduction: supported ? score - raw : null,
    possibleRange: provisional ? { min: Math.round(.8 * score), max: rounded } : null,
    deductions: supported ? additives.items.filter(item => item.concernBurden > 0).map(item => ({
      identifier: item.identifier, name: item.review.name, weight: item.concernBurden,
      summary: item.review.consumerSummary,
      // Allocate the capped budget proportionally, independent of item order.
      // These raw contributions are not separately rounded scores or risk estimates.
      rawDeduction: score * OVERALL_POLICY.maximumRelativeAdditiveDeduction * item.concernBurden / Math.max(1, totalWeight),
      rationale: item.review.rationale, conditions: item.review.conditions, sources: item.review.sources,
    })) : [], additiveAssessment: additives,
    reason: categoryBoundary ? nutrition.ratingBoundary.message : !usable ? 'A nutrition score is unavailable; the ingredient screen remains separate.'
      : !supported ? 'Nutrition-only. Overall assessment incomplete; usable ingredient review is unavailable.'
        : provisional ? 'Screening incomplete; further review could decrease this score.'
          : 'Declaration reviewed. No bonus or safety assurance.',
    limitation: 'Experimental precautionary screening policy, not a validated health score or measured probability/severity of harm. Unknown exposure remains unknown. No organic component.' });
}

import { normalizeProductAdditives } from '../services/productAdditives';
import { getBarcodeAdditiveInformation } from './barcodeReviewInformation';

export const ADDITIVE_ASSESSMENT_SOURCE = 'https://www.fda.gov/consumers/consumer-updates/food-safe-if-it-has-chemicals';

// A first-listed ingredient indicator, never a whole-grain percentage or an
// independent verification of the package. Original provider text is retained.
export function resolveGrainEvidence(ingredients, source = {}) {
  const originalText = ingredients?.text;
  const unknown = { status: 'not-established', firstIngredient: null, originalText: originalText || null };
  if (typeof originalText !== 'string' || !originalText.trim() || /\.\.\.|…/.test(originalText)
    || (ingredients.language && ingredients.language !== 'en') || !source.url || !source.attribution) return unknown;
  const text = originalText.trim();
  let depth = 0, end = text.length;
  for (let i = 0; i < text.length; i += 1) {
    if ('({['.includes(text[i])) depth += 1;
    if (')}]'.includes(text[i])) depth -= 1;
    if (depth < 0) return unknown;
    if (!depth && /[,.]/.test(text[i])) { end = i; break; }
  }
  if (depth) return unknown;
  const firstIngredient = text.slice(0, end).trim();
  const first = firstIngredient.toLowerCase().replace(/[_*]/g, '').replace(/-/g, ' ');
  const whole = /^(?:organic\s+)?whole\s+(?:grain\s+)?(?:wheat|oats?|rye|barley|corn|rice|sorghum|millet)\b/.test(first)
    || /^(?:organic\s+)?graham flour\s*\(whole grain wheat flour\)/.test(first);
  const refined = !whole && /^(?:(?:organic|unbleached|bleached|enriched)\s+)*(?:(?:wheat|white|rice)\s+)?flour\b/.test(first);
  return { status: whole ? 'whole-grain-first' : refined ? 'refined-grain-first' : 'not-established', firstIngredient,
    originalText, identification: 'provider-reported-first-ingredient', percentage: null,
    source: { url: source.url, attribution: source.attribution, provider: source.provider || null,
      revisionDate: source.revisionDate || null, retrievedAt: source.retrievedAt || null } };
}

// FDA assessment considers dose/exposure as well as hazard. Provider tags and
// general functions do not supply exposure or a product-specific risk score.
export function assessAdditiveEvidence(value) {
  const data = normalizeProductAdditives(value, value?.source);
  const reported = data?.status === 'reported';
  const items = reported ? data.items.map(item => {
    const information = item.nameReference ? getBarcodeAdditiveInformation(item.standardizedIdentifier) : null;
    return { identifier: item.standardizedIdentifier, providerIdentifier: item.providerIdentifier,
      source: item.source, nameVerified: Boolean(item.nameReference), functionAvailable: Boolean(information?.function),
      scientificContextAvailable: Boolean(information?.concern), regulatoryContextAvailable: Boolean(information?.regulation),
      assessment: 'incomplete', exposure: 'unknown' };
  }) : null;
  return { status: value == null ? 'not-collected' : !reported ? 'unknown' : items.length ? 'incomplete-assessment' : 'provider-reported-empty',
    additiveScore100: null, overallFoodQualityScore100: null, organicScore100: null, items,
    identification: reported ? 'provider-reported' : 'unknown', exposure: 'unknown',
    source: ADDITIVE_ASSESSMENT_SOURCE, reviewedOn: '2026-10-20',
    reason: 'Identity, legal conditions and scientific context do not establish product-specific exposure or risk. No combined score, automatic credit or penalty is assigned.' };
}

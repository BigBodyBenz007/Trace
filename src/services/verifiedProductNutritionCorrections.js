// Reviewed fact corrections only. No scoring code, storage writes or requests.
import teddyLabel from '../data/teddyGrahamsHoneyLabel.json';
import { canonicalGtinKey } from './productIdentifiers';
import { immutableCopy } from './remoteFoodModel';
import { NUTRITION_ENTRY_NUTRIENT_KEYS } from './nutritionCalculation';
import { getAssessmentDatasetNutrients, iso, normalizeNutritionAssessmentInputs } from './nutritionAssessmentInputs';

export const VERIFIED_NUTRITION_PANELS = immutableCopy([teddyLabel]);
const words = value => typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
const close = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-8;
const units = { calories: 'kcal', sodium: 'mg' };

export function isVerifiedManufacturerNutritionPanel(panel) {
  try {
    const source = panel.source, url = new URL(source.url);
    const officialUrl = value => {
      const section = new URL(value);
      return section.origin === url.origin && !section.username && !section.password
        && section.pathname.startsWith(`/${panel.identity.gtin}-`);
    };
    return source.verification === 'direct-manufacturer-panel'
      && url.protocol === 'https:' && !url.username && !url.password
      && url.hostname === 'smartlabel.mondelez.info'
      && officialUrl(source.url) && [source.nutritionUrl, source.ingredientsUrl].every(officialUrl)
      && iso(source.updatedOn) !== null && iso(source.verifiedAt) !== null
      && iso(source.updatedOn) <= iso(source.verifiedAt)
      && source.attribution && panel.identity.flavor && canonicalGtinKey(panel.identity.gtin)
      && Object.values(panel.nutrients).every(value => Number.isFinite(value) && value >= 0)
      && [source.nutritionUrl, source.ingredientsUrl].every(value => panel.sourceArtifacts.some(artifact =>
        artifact.url === value && /^[a-f0-9]{64}$/.test(artifact.sha256)))
      && panel.corrections.length > 0 && new Set(panel.corrections.map(change => change.nutrient)).size === panel.corrections.length
      && panel.corrections.every(change => NUTRITION_ENTRY_NUTRIENT_KEYS.includes(change.nutrient)
        && change.unit === (units[change.nutrient] || 'g')
        && Number.isFinite(change.originalValue) && change.originalValue >= 0
        && Number.isFinite(change.correctedValue) && change.correctedValue >= 0
        && change.correctedValue === panel.nutrients[change.nutrient]);
  } catch { return false; }
}

export function resolveVerifiedNutritionCorrection(food, { identifier, stale = false } = {}) {
  const key = canonicalGtinKey(food?.identifiers?.[0]?.value);
  const panel = VERIFIED_NUTRITION_PANELS.find(value => canonicalGtinKey(value.identity.gtin) === key);
  if (!panel || !isVerifiedManufacturerNutritionPanel(panel) || stale || food.identifiers.length !== 1
    || (identifier && canonicalGtinKey(identifier.value) !== key)
    || food.provider?.id !== panel.providerObservation.provider
    || canonicalGtinKey(food.provider.recordId) !== key
    || words(food.name) !== words(panel.matchingProviderName)
    || words(food.brand) !== words(panel.identity.brand)
    || words(food.packageQuantity) !== words(panel.identity.packageQuantity)
    || food.dataBasis !== 'serving' || food.serving?.unit !== panel.serving.unit
    || !close(food.serving.amount, panel.serving.amount) || !close(food.serving.grams, panel.serving.amount)
    || food.ingredients?.language !== panel.ingredients.language
    || words(food.ingredients?.text) !== words(panel.ingredients.text)) return null;
  const input = normalizeNutritionAssessmentInputs(food.assessmentInputs, food);
  const markets = input?.markets.flatMap(entry => entry.values) || [];
  if (!input || input.source.cacheStale || canonicalGtinKey(input.identity.providerGtin) !== key
    || !markets.length || !markets.every(value => ['en:united-states', 'United States', 'United States of America', 'US', 'USA'].includes(value))) return null;
  const reference = input.datasets.find(dataset => dataset.basis === '100g');
  if (!reference || panel.serving.unit !== 'g') return null;
  // Qualified OFF energy approximations are not independent label declarations.
  // Retain the originals; never suppress an unqualified conflicting energy fact.
  const reported = getAssessmentDatasetNutrients({ ...reference, observations: reference.observations.filter(entry =>
    entry.nutrient !== 'calories' || !entry.derivation?.startsWith('off:modifier:')) });
  const changes = new Map(panel.corrections.map(change => [change.nutrient, change]));
  // Match the entire known panel, including saturated fat. Missing, conflicting
  // or changed facts cannot silently inherit a historical label correction.
  for (const [nutrient, value] of Object.entries(panel.nutrients)) {
    const original = changes.get(nutrient)?.originalValue ?? value;
    const measurement = reported[nutrient];
    if (!measurement || measurement.status !== 'reported'
      || !close(measurement.value, original * 100 / panel.serving.amount)
      || (nutrient !== 'saturatedFat' && !close(food.nutrients?.[nutrient], original))) return null;
  }
  return immutableCopy({ schemaVersion: 1, id: panel.id, basis: panel.serving,
    product: panel.identity, changes: panel.corrections, source: panel.source,
    manufacturerPanel: panel, originalProviderNutrients: food.nutrients,
    originalProviderSource: food.provenance,
    scope: 'Verified nutrient correction for new selections and entries; not a score or proof of the physical package revision.' });
}

export function getAppliedVerifiedNutritionCorrection(candidate, identifier) {
  const selection = candidate?.selection, display = candidate?.display;
  if (candidate?.customFood || !selection?.remote || !display?.nutritionCorrection) return null;
  const correction = resolveVerifiedNutritionCorrection({ ...selection.remote,
    identifiers: selection.identifiers, name: display.name, brand: display.brand,
    packageQuantity: display.packageQuantity }, { identifier, stale: candidate.stale });
  if (!correction || display.nutritionCorrection.id !== correction.id || selection.nutritionCorrection?.id !== correction.id) return null;
  const expected = { ...correction.originalProviderNutrients,
    ...Object.fromEntries(correction.changes.map(change => [change.nutrient, change.correctedValue])) };
  return Object.entries(expected).every(([nutrient, value]) =>
    value === null ? display.nutrients[nutrient] === null && selection.nutrients[nutrient] === null
      : close(display.nutrients[nutrient], value) && close(selection.nutrients[nutrient], value)) ? correction : null;
}

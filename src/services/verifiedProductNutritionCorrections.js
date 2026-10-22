// Reviewed fact corrections only. No scoring code, storage writes or requests.
import teddyLabel from '../data/teddyGrahamsHoneyLabel.json';
import manufacturerLabels from '../data/questSpamManufacturerLabels.json';
import { canonicalGtinKey } from './productIdentifiers';
import { immutableCopy } from './remoteFoodModel';
import { NUTRITION_ENTRY_NUTRIENT_KEYS } from './nutritionCalculation';
import { getAssessmentDatasetNutrients, iso, normalizeNutritionAssessmentInputs } from './nutritionAssessmentInputs';
import { findSodiumSaltConflicts } from './sodiumSaltEvidence';

export const VERIFIED_NUTRITION_PANELS = immutableCopy([teddyLabel, ...manufacturerLabels]);
const words = value => typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
const close = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-8;
const units = { calories: 'kcal', sodium: 'mg' };

// Whole-panel replacements are separate from Teddy's single-fact correction.
// These exact official pages bind the US reference to the UPC, not to a package
// manufacture date. Older provider ingredients need not match the newer label.
const replacementSources = {
  'gtin:00888849000012': 'https://www.questnutrition.com/products/chocolate-chip-cookie-dough-protein-bar',
  'gtin:00037600138727': 'https://smartlabel.hormelfoods.com/product-info/00037600138727',
};
function isVerifiedReplacementPanel(panel) {
  const source = panel.source, observation = panel.providerObservation;
  const official = replacementSources[canonicalGtinKey(panel.identity.gtin)];
  return Boolean(official && source.url === official
    && [source.nutritionUrl, source.ingredientsUrl].every(value => value.split('#')[0] === official)
    && source.verification === 'direct-manufacturer-panel' && source.attribution && source.edition && source.dateScope
    && iso(source.verifiedAt) && (source.updatedOn === null || (iso(source.updatedOn) && iso(source.updatedOn) <= iso(source.verifiedAt)))
    && panel.sourceArtifacts.some(artifact => artifact.url === official && /^[a-f0-9]{64}$/.test(artifact.sha256))
    && panel.identity.market === 'US' && panel.identityEvidence && panel.identity.flavor && panel.identity.packageQuantity
    && panel.qualification && panel.qualifications?.length > 0 && panel.qualifications.every(value => typeof value === 'string' && value.length > 0)
    && panel.serving.unit === 'g' && panel.serving.amount > 0 && panel.ingredients.language === 'en' && panel.ingredients.text
    && [...NUTRITION_ENTRY_NUTRIENT_KEYS, 'saturatedFat'].every(key => Number.isFinite(panel.nutrients[key]) && panel.nutrients[key] >= 0)
    && panel.nutrients.addedSugar <= panel.nutrients.totalSugar && panel.nutrients.saturatedFat <= panel.nutrients.fat
    && observation.provider === 'open-food-facts' && canonicalGtinKey(observation.recordId) === canonicalGtinKey(panel.identity.gtin)
    && iso(observation.revisionDate) && observation.serving.unit === 'g'
    && NUTRITION_ENTRY_NUTRIENT_KEYS.every(key => observation.nutrients[key] === null
      || (Number.isFinite(observation.nutrients[key]) && observation.nutrients[key] >= 0)));
}

const nameTokens = value => [...new Set(String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  .split(' ').filter(token => token && !['made', 'with', 'real'].includes(token)))].sort().join(' ');
const brandWords = value => words(String(value || '').replace(/\b(?:nutrition|llc|inc|company|corporation)\b/gi, ''));

function packageMatches(value, panel) {
  if (!value) return true; // Missing packaging is not a different formulation.
  if ([panel.identity.packageQuantity, panel.providerObservation.packageQuantity].some(expected => words(value) === words(expected))) return true;
  const grams = [...String(value).matchAll(/(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/gi)].map(match => Number(match[1]));
  return grams.some(amount => close(amount, panel.identity.packageGrams ?? Number.parseFloat(panel.identity.packageQuantity)));
}

// Product identity is independent of the provider's display brand, record-id
// scheme (USDA uses FDC ids), revision and nutrient fingerprint. A different
// observed edition is retained, not relabeled as the manufacturer edition.
function productScope(food, panel, identifier) {
  const key = canonicalGtinKey(panel.identity.gtin), provider = food.provider?.id;
  const brands = [panel.identity.brand, panel.providerObservation.brand, ...(panel.matchingProviderBrands || [])];
  if (!['open-food-facts', 'usda-fdc'].includes(provider) || food.identifiers?.length !== 1
    || canonicalGtinKey(food.identifiers[0].value) !== key
    || (identifier && canonicalGtinKey(identifier.value) !== key)
    || (provider === 'open-food-facts' && canonicalGtinKey(food.provider.recordId) !== key)
    || food.provenance?.providerRecordId !== food.provider.recordId
    || (food.brand && !brands.some(brand => brand && brandWords(brand) === brandWords(food.brand)))
    || ![panel.identity.name, panel.matchingProviderName, panel.providerObservation.name].some(name => name && nameTokens(food.name) === nameTokens(name))
    || !packageMatches(food.packageQuantity, panel)
    || food.dataBasis !== 'serving' || food.serving?.unit !== 'g'
    || ![panel.serving.amount, panel.providerObservation.serving?.amount].some(amount => close(food.serving.amount, amount))
    || (food.serving.grams != null && !close(food.serving.amount, food.serving.grams))) return null;
  try {
    const url = new URL(food.provenance.sourceUrl);
    if (url.protocol !== 'https:' || url.username || url.password
      || !(provider === 'usda-fdc' ? url.hostname === 'fdc.nal.usda.gov' : url.hostname === 'world.openfoodfacts.org')) return null;
  } catch { return null; }
  const input = normalizeNutritionAssessmentInputs(food.assessmentInputs, food);
  // An absent legacy wrapper is different from a present invalid capture. The
  // remote normalizer retains malformed captures as null; do not erase that
  // provenance conflict by treating it as ordinary legacy absence.
  if (food.assessmentInputs !== undefined && !input) return null;
  if (input?.identity.providerGtin && canonicalGtinKey(input.identity.providerGtin) !== key) return null;
  const us = new Set(['unitedstates', 'unitedstatesofamerica', 'us', 'usa']);
  const markets = input?.markets.flatMap(entry => entry.values) || [];
  // A multi-market sales list including the US does not establish a distinct
  // foreign formulation. Foreign-only claims remain an explicit contradiction.
  if (markets.length && !markets.some(value => us.has(words(value.replace(/^en:/, ''))))) return null;
  return { input };
}

function originalObservation(food, panel, changes) {
  return { schemaVersion: 1, id: panel.id, basis: panel.serving, product: panel.identity, changes,
    source: panel.source, manufacturerPanel: panel, originalProviderNutrients: food.nutrients,
    originalProviderServing: food.serving, originalProviderSource: food.provenance,
    originalProviderIdentifiers: food.identifiers,
    originalProviderIngredients: food.ingredients, originalProviderAdditives: food.additives,
    scope: panel.qualification };
}

export function isVerifiedManufacturerNutritionPanel(panel) {
  try {
    if (panel.mode === 'replacement-panel') return isVerifiedReplacementPanel(panel);
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

export function resolveVerifiedNutritionCorrection(food, { identifier } = {}) {
  const key = canonicalGtinKey(food?.identifiers?.[0]?.value);
  const panel = VERIFIED_NUTRITION_PANELS.find(value => canonicalGtinKey(value.identity.gtin) === key);
  if (!panel || !isVerifiedManufacturerNutritionPanel(panel)) return null;
  const scope = productScope(food, panel, identifier);
  if (!scope) return null;
  if (panel.mode === 'replacement-panel') return immutableCopy({
    ...originalObservation(food, panel, NUTRITION_ENTRY_NUTRIENT_KEYS.map(nutrient => ({ nutrient, unit: units[nutrient] || 'g',
      originalValue: food.nutrients[nutrient], correctedValue: panel.nutrients[nutrient] }))), mode: 'replacement-panel' });

  // A nutrient-only correction cannot replace a different ingredient edition.
  // Absent language metadata is not contradictory when the declaration matches.
  if (!food.ingredients?.text || words(food.ingredients.text) !== words(panel.ingredients.text)) return null;
  const correctedKeys = new Set(panel.corrections.map(change => change.nutrient));
  const labelCompatible = (value, labelValue) => close(value, labelValue) || Math.round(value) === labelValue;
  // USDA references can carry rounding from per-100 values (129.9 kcal, 6.99 g
  // sugar, etc.). This checks compatibility with this existing integer label,
  // not whether the entire provider panel has been independently verified.
  for (const [nutrient, value] of Object.entries(food.nutrients)) {
    if (value !== null && !correctedKeys.has(nutrient) && !labelCompatible(value, panel.nutrients[nutrient])) return null;
  }
  for (const dataset of scope.input?.datasets || []) {
    if (dataset.quantity?.unit !== 'g') continue;
    const saturatedFat = getAssessmentDatasetNutrients(dataset).saturatedFat;
    if (saturatedFat.status === 'reported' && !labelCompatible(saturatedFat.value * panel.serving.amount / dataset.quantity.amount, panel.nutrients.saturatedFat)) return null;
  }
  const changes = panel.corrections.map(change => ({ ...change, originalValue: food.nutrients[change.nutrient] }));
  const addedSugar = changes.find(change => change.nutrient === 'addedSugar')?.correctedValue;
  // 7 g added sugar must not be logged above a rounded USDA total of 6.99 g.
  // Use the separately verified total-sugar fact, explicitly, rather than
  // weakening sugar validation, rounding all nutrients, or replacing the panel.
  if (food.nutrients.totalSugar !== null && addedSugar > food.nutrients.totalSugar) changes.push({
    nutrient: 'totalSugar', unit: 'g', originalValue: food.nutrients.totalSugar, correctedValue: panel.nutrients.totalSugar,
    reason: 'Supporting manufacturer total-sugar fact preserves added/total coherence after provider reference rounding.' });
  return immutableCopy({ ...originalObservation(food, panel, changes), mode: 'nutrient-correction',
    scope: 'Only the listed sugar facts are corrected from the reviewed manufacturer label. Other provider values and the matching ingredient declaration are retained; the physical package revision is unconfirmed.' });
}

export function getAppliedVerifiedNutritionCorrection(candidate, identifier) {
  const selection = candidate?.selection, display = candidate?.display;
  if (candidate?.customFood || !selection?.remote || !display?.nutritionCorrection) return null;
  if (display.sourceUrl !== selection.remote.provenance.sourceUrl
    || display.attribution !== selection.remote.provenance.attribution
    || JSON.stringify(display.assessmentInputs) !== JSON.stringify(selection.remote.assessmentInputs)) return null;
  const correction = resolveVerifiedNutritionCorrection({ ...selection.remote,
    identifiers: selection.identifiers, name: display.name, brand: display.brand,
    packageQuantity: display.packageQuantity }, { identifier, stale: candidate.stale });
  if (!correction || display.nutritionCorrection.id !== correction.id || selection.nutritionCorrection?.id !== correction.id) return null;
  if (correction.mode === 'replacement-panel' && (
    display.ingredients?.text !== correction.manufacturerPanel.ingredients.text
    || selection.ingredients?.text !== correction.manufacturerPanel.ingredients.text
    || display.additives !== undefined || selection.additives !== undefined
    || display.ingredientSource?.url !== correction.source.url
    || !close(selection.serving?.amount, correction.basis.amount)
    || !close(selection.serving?.grams, correction.basis.amount) || selection.serving?.unit !== correction.basis.unit)) return null;
  const expected = { ...correction.originalProviderNutrients,
    ...Object.fromEntries(correction.changes.map(change => [change.nutrient, change.correctedValue])) };
  // A partial sugar overlay still applies when separate provider evidence makes
  // sodium unresolved. Recompute that evidence; never trust a cached conflict flag.
  if (correction.mode !== 'replacement-panel' && !correction.changes.some(change => change.nutrient === 'sodium')
    && findSodiumSaltConflicts(selection.remote.assessmentInputs).length) expected.sodium = null;
  return Object.entries(expected).every(([nutrient, value]) =>
    value === null ? display.nutrients[nutrient] === null && selection.nutrients[nutrient] === null
      : close(display.nutrients[nutrient], value) && close(selection.nutrients[nutrient], value)) ? correction : null;
}

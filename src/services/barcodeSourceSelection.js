import { canonicalGtinKey } from './productIdentifiers';
import { createBarcodeNutritionCandidate } from './barcodeNutritionSelection';
import { immutableCopy } from './remoteFoodModel';

const tokens = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);
const brand = value => tokens(value).filter(word => !['inc', 'llc', 'company', 'nutrition', 'foods', 'food'].includes(word)).join(' ');
const markets = result => result.food?.assessmentInputs?.markets.flatMap(entry => entry.values).map(value =>
  value.toLowerCase().replace(/^en:/, '').replace(/[^a-z]/g, '').replace(/^usa?$/, 'unitedstates').replace('unitedstatesofamerica', 'unitedstates')) || [];
const flavors = ['plain', 'vanilla', 'chocolate', 'strawberry', 'blueberry', 'raspberry', 'cherry', 'honey', 'lemon', 'lime', 'orange', 'grape', 'maple', 'cinnamon'];

export function bareBarcodeLookup(result) {
  return { status: result.status, identifier: result.identifier, food: result.food,
    ...(result.source ? { source: result.source } : {}), ...(result.stale ? { stale: true } : {}),
    ...(result.gatewayStatus ? { gatewayStatus: result.gatewayStatus } : {}) };
}

export function barcodeSourceKey(result) {
  const food = result.food;
  return food ? JSON.stringify([food.provider?.id || food.sourceType, food.provider?.recordId || food.id,
    food.provenance?.revisionDate, food.name, food.nutrients, food.serving, food.ingredients, food.additives, food.assessmentInputs]) : result.status;
}

// Exact GTIN is necessary but does not excuse an explicitly conflicting brand,
// flavor or region. Missing metadata is uncertainty, not an invented match.
export function compatibleBarcodeSource(preferred, alternative) {
  const key = canonicalGtinKey(preferred.identifier?.value);
  if (!key || canonicalGtinKey(alternative.identifier?.value) !== key || !alternative.food
    || !createBarcodeNutritionCandidate(alternative)) return false;
  const first = createBarcodeNutritionCandidate(preferred), second = createBarcodeNutritionCandidate(alternative);
  const aCorrection = first?.display.nutritionCorrection, bCorrection = second?.display.nutritionCorrection;
  if (aCorrection && bCorrection && aCorrection.id === bCorrection.id) return true;
  const a = preferred.food, b = alternative.food;
  if (!a) return true;
  const aBrand = brand(a.brand), bBrand = brand(b.brand);
  const aName = tokens(a.name).join(' '), bName = tokens(b.name).join(' ');
  if (aBrand && bBrand && aBrand !== bBrand && !aBrand.includes(bBrand) && !bBrand.includes(aBrand)
    && !aName.includes(bBrand) && !bName.includes(aBrand)) return false;
  const aNames = tokens(a.name), bNames = tokens(b.name);
  const aFlavors = flavors.filter(value => aNames.includes(value)), bFlavors = flavors.filter(value => bNames.includes(value));
  if (aFlavors.length && bFlavors.length && !aFlavors.some(value => bFlavors.includes(value))) return false;
  for (const [positive, negative] of [['sweetened', 'unsweetened'], ['salted', 'unsalted'], ['whole', 'nonfat'], ['regular', 'diet']]) {
    if ((aNames.includes(positive) && bNames.includes(negative)) || (bNames.includes(positive) && aNames.includes(negative))) return false;
  }
  const identityWords = names => names.filter(word => !['original', 'classic', 'food', 'foods', 'large', 'size', 'g', 'oz'].includes(word));
  const aWords = identityWords(aNames), bWords = identityWords(bNames);
  if (aWords.length && bWords.length && !aWords.some(word => bWords.includes(word))) return false;
  const aMarkets = markets(preferred), bMarkets = markets(alternative);
  return !aMarkets.length || !bMarkets.length || aMarkets.some(value => bMarkets.includes(value));
}

export function barcodeAssessmentTier(result, assess) {
  try {
    const value = assess(result);
    // An intentional category boundary is resolved, not a missing-score trigger.
    if (value?.ratingStatus === 'not-rated-category') return 2;
    return value?.nutrition === true ? value.overall === true ? 2 : 1 : 0;
  } catch { return 0; }
}

export function chooseBarcodeSource(preferred, candidates, assess, providerAttempts = [], offline = false) {
  let chosen = preferred, tier = barcodeAssessmentTier(preferred, assess);
  const considered = [], seen = new Set();
  for (const result of [preferred, ...candidates]) {
    if (!result?.food || seen.has(barcodeSourceKey(result))) continue;
    seen.add(barcodeSourceKey(result)); considered.push(bareBarcodeLookup(result));
    if (result === preferred || tier === 2 || !compatibleBarcodeSource(preferred, result)) continue;
    const nextTier = barcodeAssessmentTier(result, assess);
    if (nextTier > tier) { chosen = result; tier = nextTier; }
  }
  const selected = chosen !== preferred;
  const unavailable = ['unavailable', 'unconfigured', 'rate-limited'].includes(preferred.gatewayStatus)
    || providerAttempts.some(entry => ['unavailable', 'unconfigured', 'rate-limited'].includes(entry.status));
  return immutableCopy({ ...chosen, sourceSelection: {
    outcome: selected ? 'fallback-selected' : offline ? 'offline' : unavailable ? 'provider-unavailable' : 'no-usable-alternative',
    reason: selected ? 'The preferred record lacked usable assessment evidence. One complete matching source record was selected; panels were not combined.'
      : offline ? 'Offline: available cached evidence is retained; no provider was requested.'
        : unavailable ? 'A provider check was unavailable. Available food is retained; this does not establish that no matching record exists.'
          : 'No matching alternative supplied more usable assessment evidence; the preferred food is retained.',
    preferred: bareBarcodeLookup(preferred), candidates: considered, providerAttempts,
  } });
}

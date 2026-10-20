// Independent development experiment. FDA reference amounts inform this model;
// the weights, comparison portions and 0–100 equation are Trace choices.
export const TRACE_US_METHOD = 'trace-us-practical-nutrition';
export const TRACE_US_VERSION = '1-development-2026-10-20';
export const TRACE_US_GUIDANCE = Object.freeze({
  dailyValues: 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels',
  label: 'https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label',
  zeroFatRounding: 'https://www.ecfr.gov/current/title-21/section-101.9#p-101.9(c)(2)',
});
const DV = { addedSugar: 50, saturatedFat: 20, sodium: 2300, fiber: 28, protein: 50 };
const UNITS = { calories: 'kcal', addedSugar: 'g', totalSugar: 'g', saturatedFat: 'g', sodium: 'mg', fiber: 'g', protein: 'g', fat: 'g', carbohydrates: 'g' };
const LABELS = { calories: 'Energy', saturatedFat: 'Saturated fat', sodium: 'Sodium' };
const clamp = value => Math.max(0, Math.min(1, value));
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

// A standalone attributed or unattributed profile needs no GTIN, market, review
// record, source revision, ingredient percentage or additive assessment.
export function evaluatePracticalUsNutrition(input) {
  const reasons = [], warnings = [], excluded = [];
  const output = { methodId: TRACE_US_METHOD, methodVersion: TRACE_US_VERSION,
    grade: null, scoreReady: false, scanMatchEligible: false, nutritionScore100: null,
    rawScore: null, reasons, warnings, points: {}, normalized: null, guidance: TRACE_US_GUIDANCE };
  if (!input || typeof input !== 'object') return freeze({ ...output, reasons: ['A nutrition profile is required.'] });
  if (!input.source?.attribution || !input.source?.url) warnings.push('Source attribution is incomplete; these calculations do not verify a product or US formulation.');
  const nutrients = {};
  for (const [key, unit] of Object.entries(UNITS)) {
    const entry = input.nutrients?.[key];
    if (entry?.value == null) { nutrients[key] = null; continue; }
    if (!finite(entry.value) || entry.unit !== unit) {
      const message = `${key} has an invalid value or unsupported unit (expected ${unit}).`;
      if (!['calories', 'saturatedFat', 'sodium'].includes(key)) { warnings.push(`${message} It is excluded, not replaced with zero.`); excluded.push(key); }
      else reasons.push(message);
      nutrients[key] = null;
    } else nutrients[key] = entry.value;
  }
  const basis = input.basis;
  if (!basis || !finite(basis.amount) || basis.amount <= 0 || !['g', 'ml'].includes(basis.unit)) reasons.push('A known mass or volume measurement basis is required.');
  const knownCategory = ['general', 'beverage', 'nuts', 'oil'].includes(input.category);
  const category = knownCategory ? input.category : basis?.unit === 'ml' ? 'beverage' : 'general';
  if (input.category && !knownCategory) warnings.push(`Unrecognized comparison category uses the ${category} measurement rule; no special category benefit is inferred.`);
  if (nutrients.calories === null) {
    if (['general', 'nuts'].includes(category)) reasons.push('Energy is missing or unsupported for the calorie-capped comparison.');
    else warnings.push('Calories are unknown; the fixed beverage/oil comparison does not require an energy estimate.');
  }
  if (basis && ((category === 'beverage' && basis.unit !== 'ml') || (['general', 'nuts'].includes(category) && basis.unit !== 'g'))) reasons.push('Category and measurement dimension disagree; no density conversion is assumed.');
  // A contradictory optional added-sugar declaration is retained, but cannot
  // supply the calculation. Total sugars can still support the explicit fallback.
  let sugarMode = 'addedSugar', sugar = nutrients.addedSugar;
  if (sugar !== null && ((nutrients.totalSugar !== null && sugar > nutrients.totalSugar + 1e-8)
    || (nutrients.carbohydrates !== null && sugar > nutrients.carbohydrates + 1e-8))) {
    excluded.push('addedSugar'); sugar = null;
    warnings.push('Added sugars contradict total sugars/carbohydrates and are excluded. Original values are retained; they are not repaired.');
  }
  if (sugar === null) {
    sugarMode = 'totalSugar'; sugar = nutrients.totalSugar;
    if (sugar !== null) warnings.push('Using total sugars, including naturally occurring sugars, because usable added sugars are unavailable. This is a separate Trace screening rule, not an added-sugar estimate or FDA total-sugar Daily Value.');
  }
  if (sugar === null) sugarMode = 'unknown';
  if (nutrients.totalSugar !== null && nutrients.carbohydrates !== null && nutrients.totalSugar > nutrients.carbohydrates + 1e-8) reasons.push('Total sugars exceed carbohydrates in the selected profile.');
  if (nutrients.saturatedFat !== null && nutrients.fat !== null && nutrients.saturatedFat > nutrients.fat + 1e-8) reasons.push('Saturated fat exceeds total fat in the selected profile.');
  for (const key of ['fiber', 'protein']) if (nutrients[key] === null) warnings.push(`${key} is missing: no positive credit is awarded; its value remains unknown.`);
  if (reasons.length) return freeze(output);

  const per100 = Object.fromEntries(Object.entries(nutrients).map(([key, value]) => [key, value === null ? null : value * 100 / basis.amount]));
  if (Object.values(per100).some(value => value !== null && !finite(value))) return freeze({ ...output, reasons: ['Measurement conversion overflow.'] });
  if (basis.unit === 'g' && (per100.calories > 1000 || Object.entries(per100).some(([key, value]) => value !== null
    && (UNITS[key] === 'g' ? value > 100.5 : key === 'sodium' && value > 100500)))) {
    return freeze({ ...output, reasons: ['Nutrient quantities exceed the physical mass or energy bounds of this food.'] });
  }
  // Standard comparison portions, NOT recommended serving sizes or FDA RACCs.
  // The 200-kcal cap avoids a blanket energy-density penalty for nuts and oils.
  const cap = category === 'beverage' ? 250 : category === 'nuts' ? 30 : category === 'oil' ? basis.unit === 'ml' ? 15 : 14 : 100;
  const amount = ['beverage', 'oil'].includes(category) || per100.calories === 0 ? cap : Math.min(cap, 200 * 100 / per100.calories);
  const compared = Object.fromEntries(Object.entries(per100).map(([key, value]) => [key, value === null ? null : value * amount / 100]));
  // FDA 5%/20% guides motivate the ramp for limiting nutrients. Applying it to
  // these comparison portions is Trace-specific. Total sugars have NO FDA DV;
  // their independent 100-g screening benchmark is intentionally distinguished.
  const sugarBenchmark = sugarMode === 'addedSugar' ? DV.addedSugar : sugarMode === 'totalSugar' ? 100 : null;
  const burden = (value, reference) => clamp((value / reference - .05) / .15);
  const burdens = { sugar: sugar === null ? null : burden(sugar * amount / basis.amount, sugarBenchmark),
    saturatedFat: compared.saturatedFat === null ? null : burden(compared.saturatedFat, DV.saturatedFat),
    salt: compared.sodium === null ? null : burden(compared.sodium, DV.sodium) };
  const weights = { sugar: .4, saturatedFat: .3, salt: .3 };
  const missingLimitingNutrients = Object.keys(burdens).filter(key => burdens[key] === null);
  const burdenUpperBounds = { sugar: 1, saturatedFat: 1, salt: 1 };
  let saturatedFatBound = null;
  // Explicit US label-serving evidence only; never apply this to a derived
  // per-100 zero or infer an actual saturated-fat measurement of zero.
  if (input.usZeroFatLabelServing === true && nutrients.fat === 0 && nutrients.saturatedFat === null) {
    const upper = .5 * amount / basis.amount;
    burdenUpperBounds.saturatedFat = burden(upper, DV.saturatedFat);
    saturatedFatBound = { upper, unit: 'g', scope: 'comparison amount',
      basis: 'Manufacturer-attributed serving declares zero total fat. Under the US label-rounding interpretation, saturated fat cannot exceed the total-fat bound of 0.5 g per serving.',
      jurisdiction: 'US', currentLabelApplicabilityVerified: false,
      source: TRACE_US_GUIDANCE.zeroFatRounding };
    warnings.push('Saturated fat remains unknown. Applying the US zero-total-fat rounding convention to this manufacturer-attributed label serving supplies only a conditional upper bound. Current US label/formulation applicability is not independently verified.');
  }
  // Burdens are bounded by the formula itself, not by invented nutrient values.
  // A missing measurement is unnecessary only when ALL its possible burdens
  // leave B unchanged. Otherwise the result stays unavailable.
  const at = bound => {
    const values = Object.entries(burdens).map(([key, value]) => [key, value === null ? bound * burdenUpperBounds[key] : value]);
    const weighted = values.reduce((sum, [key, value]) => sum + weights[key] * value, 0);
    const strongest = Math.max(...values.map(([, value]) => value));
    return { weighted, strongest, limiting: Math.max(weighted, .8 * strongest) };
  };
  const low = at(0), high = at(1);
  if (Math.abs(low.limiting - high.limiting) > 1e-12) return freeze({ ...output, reasons: [
    ...missingLimitingNutrients.map(key => key === 'sugar' ? 'Added sugars and total sugars are missing or unsupported.' : `${LABELS[key === 'salt' ? 'sodium' : key]} is missing or unsupported.`),
    'Unmeasured limiting nutrients can change this score.' ] });
  const { weighted, strongest, limiting } = low;
  if (missingLimitingNutrients.length) warnings.push('Unmeasured limiting nutrients cannot change the result across their full possible burden range. They remain unknown; no nutrient value is filled in.');
  const deductions = {};
  const dominant = Object.keys(burdens).filter(key => burdens[key] === strongest);
  for (const key of Object.keys(burdens)) deductions[key] = weighted >= .8 * strongest
    ? 85 * weights[key] * burdens[key] : dominant.includes(key) ? 85 * .8 * strongest / dominant.length : 0;
  const fiberCredit = compared.fiber === null ? 0 : 10 * clamp(compared.fiber / (.2 * DV.fiber)) * (1 - limiting);
  const proteinCredit = compared.protein === null ? 0 : 5 * clamp(compared.protein / (.2 * DV.protein)) * (1 - limiting);
  const rawScore = 85 * (1 - limiting) + fiberCredit + proteinCredit;
  const point = value => ({ min: value, max: value, possible: [value] });
  return freeze({ ...output, rawScore, nutritionScore100: Math.round(Math.max(0, Math.min(100, rawScore))),
    sugarMode, sugarBenchmark: { amount: sugarBenchmark, unit: 'g', type: sugarMode === 'unknown' ? 'unavailable' : sugarMode === 'addedSugar' ? 'FDA-Daily-Value' : 'Trace-total-sugar-screening-reference' },
    excludedNutrients: excluded, methodCategory: category,
    normalized: { basis: { amount, unit: basis.unit }, nutrients: compared, per100, originalBasis: { ...basis }, originalNutrients: nutrients },
    comparison: { category, maxAmount: cap, energyCapKcal: ['beverage', 'oil'].includes(category) ? null : 200,
      limitingBurden: limiting, weightedBurden: weighted, strongestBurden: strongest, burdens, missingLimitingNutrients,
      burdenUpperBounds, saturatedFatBound },
    points: { ...Object.fromEntries(Object.entries(deductions).map(([key, value]) => [key, point(value)])),
      fiber: point(fiberCredit), proteinApplied: point(proteinCredit) } });
}

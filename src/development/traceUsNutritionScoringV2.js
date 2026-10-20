// Independent development experiment. FDA reference amounts inform this model;
// the density ramps, weights and 0–100 equation are Trace choices.
export const TRACE_US_METHOD = 'trace-us-practical-nutrition';
export const TRACE_US_VERSION = '2-density-development-2026-10-20';
export const TRACE_US_GUIDANCE = Object.freeze({
  dailyValues: 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels',
  label: 'https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label',
  zeroFatRounding: 'https://www.ecfr.gov/current/title-21/section-101.9#p-101.9(c)(2)',
});
const UNITS = { calories: 'kcal', addedSugar: 'g', totalSugar: 'g', saturatedFat: 'g', sodium: 'mg', fiber: 'g', protein: 'g', fat: 'g', carbohydrates: 'g' };
const clamp = value => Math.max(0, Math.min(1, value));
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

// A standalone attributed or unattributed profile needs no GTIN, market, review
// record, source revision, ingredient percentage or additive assessment.
export function evaluateTraceUsNutritionV2(input) {
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
    if (category === 'general' || category === 'beverage') reasons.push('Energy is missing or unsupported for the density calculation.');
    else warnings.push('Calories are unknown; the nut/oil rule uses measured saturated-fat energy instead of inventing calories.');
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
    if (sugar !== null) warnings.push('Usable added sugars are unavailable. Measured total sugars use a separate density screen, not an added-sugar estimate or FDA total-sugar Daily Value.');
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
  // Per-100 density comparisons prevent energy-rich snacks being assessed as
  // increasingly tiny portions. Fat-rich foods use fat quality instead.
  const fatRich = category === 'nuts' || category === 'oil';
  const ramp = (value, low, high) => clamp((value - low) / (high - low));
  const total = nutrients.totalSugar !== null ? per100.totalSugar : null;
  const added = sugarMode === 'addedSugar' ? per100.addedSugar : null;
  const addedBurden = added === null ? null : ramp(added, category === 'beverage' ? 0 : 2.5, category === 'beverage' ? 10 : 25);
  const totalBurden = total === null ? null : ramp(total, category === 'beverage' ? 0 : 4.5, category === 'beverage' ? 10 : 45);
  const measuredSugar = [addedBurden, totalBurden].filter(value => value !== null);
  const sugarBurden = measuredSugar.length ? Math.max(...measuredSugar) : null;
  sugarMode = addedBurden !== null && (totalBurden === null || addedBurden >= totalBurden) ? 'addedSugar' : totalBurden !== null ? 'totalSugar' : 'unknown';
  if (sugarMode === 'totalSugar' && addedBurden !== null) warnings.push('Total-sugar density drives the sugar component even though added sugars are reported; both original measurements remain separate.');
  const ratio = per100.saturatedFat === null || per100.fat === null || per100.fat === 0 ? null : per100.saturatedFat / per100.fat;
  const saturatedBurden = fatRich ? ratio === null ? null : ramp(ratio, .10, .64)
    : per100.saturatedFat === null ? null : ramp(per100.saturatedFat, 1, 10);
  const energyInput = fatRich ? per100.saturatedFat === null ? null : 9 * per100.saturatedFat : per100.calories;
  const energyBurden = energyInput === null ? null : category === 'beverage' ? ramp(energyInput, 0, 60) : ramp(energyInput, 80, 600);
  const burdens = { sugar: sugarBurden, saturatedFat: saturatedBurden,
    salt: per100.sodium === null ? null : ramp(per100.sodium, 90, 900) };
  const weights = { sugar: .4, saturatedFat: .3, salt: .3 };
  const missingLimitingNutrients = Object.keys(burdens).filter(key => burdens[key] === null);
  const burdenUpperBounds = { sugar: 1, saturatedFat: 1, salt: 1 };
  let saturatedFatBound = null;
  if (!fatRich && input.usZeroFatLabelServing === true && nutrients.fat === 0 && nutrients.saturatedFat === null) {
    const upper = .5 * 100 / basis.amount;
    burdenUpperBounds.saturatedFat = ramp(upper, 1, 10);
    saturatedFatBound = { upper, unit: 'g', scope: '100-g/ml comparison', jurisdiction: 'US',
      currentLabelApplicabilityVerified: false, source: TRACE_US_GUIDANCE.zeroFatRounding };
    warnings.push('Saturated fat remains unknown. The manufacturer-attributed US zero-total-fat serving supplies only a conditional rounding upper bound; current label/formulation applicability is unverified.');
  }
  const grainEvidence = input.grainEvidence ? { ...input.grainEvidence, source: { ...input.grainEvidence.source } } : { status: 'not-established' };
  const grainSupported = category === 'general' && grainEvidence.status === 'whole-grain-first' && grainEvidence.firstIngredient
    && grainEvidence.source?.url && grainEvidence.source?.attribution
    && grainEvidence.source?.url === input.source?.url && grainEvidence.source?.attribution === input.source?.attribution;
  const credits = { fiber: per100.fiber === null ? 0 : 8 * clamp(per100.fiber / 5.6),
    proteinApplied: per100.protein === null ? 0 : 2 * clamp(per100.protein / 10), wholeGrain: grainSupported ? 5 : 0 };
  const at = bound => {
    const values = Object.entries(burdens).map(([key, value]) => [key, value === null ? bound * burdenUpperBounds[key] : value]);
    const weighted = values.reduce((sum, [key, value]) => sum + weights[key] * value, 0);
    const strongest = Math.max(...values.map(([, value]) => value));
    const limiting = Math.max(weighted, .8 * strongest);
    const raw = 85 - 60 * limiting - 35 * (energyBurden === null ? bound : energyBurden)
      + Object.values(credits).reduce((sum, value) => sum + value, 0) * (1 - limiting);
    return { weighted, strongest, limiting, raw, score: Math.round(Math.max(0, Math.min(100, raw))) };
  };
  const best = at(0), worst = at(1);
  if (best.score !== worst.score) return freeze({ ...output, reasons: [
    ...missingLimitingNutrients.map(key => key === 'sugar' ? 'Added sugars and total sugars are missing or unsupported.' : key === 'salt' ? 'Sodium is missing or unsupported.'
      : fatRich ? 'Saturated fat or fat-quality evidence is missing or unsupported.' : 'Saturated fat is missing or unsupported.'),
    ...(energyBurden === null ? ['Energy or saturated-fat energy is missing.'] : []),
    'Unmeasured components can change the numerical score.' ], scoreRange: [worst.score, best.score] });
  if (missingLimitingNutrients.length || energyBurden === null) warnings.push('Unknown components remain unknown; every value within their supported burden bounds gives the same whole-number score.');
  const { weighted, strongest, limiting } = best;
  const point = (value, max = value) => ({ min: value, max, possible: value === max ? [value] : [value, max] });
  const dominant = Object.keys(burdens).filter(key => burdens[key] === strongest);
  const deductions = Object.fromEntries(Object.keys(burdens).map(key => [key,
    weighted >= .8 * strongest ? 60 * weights[key] * (burdens[key] ?? 0)
      : dominant.includes(key) ? 60 * .8 * strongest / dominant.length : 0]));
  return freeze({ ...output, rawScore: best.raw === worst.raw ? best.raw : null,
    rawScoreRange: [worst.raw, best.raw], nutritionScore100: best.score, sugarMode,
    excludedNutrients: excluded, methodCategory: category,
    sugarBenchmark: { type: 'Trace-density-screens', addedThresholds: category === 'beverage' ? [0, 10] : [2.5, 25], totalThresholds: category === 'beverage' ? [0, 10] : [4.5, 45], unit: 'g per 100 g/ml' },
    normalized: { basis: { amount: 100, unit: basis.unit }, nutrients: per100, per100, originalBasis: { ...basis }, originalNutrients: nutrients },
    comparison: { category, maxAmount: 100, energyCapKcal: null, limitingBurden: limiting, weightedBurden: weighted,
      strongestBurden: strongest, burdens, missingLimitingNutrients, burdenUpperBounds, saturatedFatBound,
      energyBurden, energyInput, energyRule: fatRich ? 'saturated-fat energy and fat ratio' : category === 'beverage' ? 'beverage density' : 'food energy density', grainEvidence },
    points: { energy: energyBurden === null ? point(0, 35) : point(35 * energyBurden),
      ...Object.fromEntries(Object.entries(deductions).map(([key, value]) => [key,
        burdens[key] === null ? point(0, 48 * burdenUpperBounds[key]) : point(value)])),
      ...Object.fromEntries(Object.entries(credits).map(([key, value]) => [key, point(value * (1 - worst.limiting), value * (1 - limiting))])) } });
}

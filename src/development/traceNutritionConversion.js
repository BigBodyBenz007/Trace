// Development research presentation only. Published nutrient calculations live
// in updatedNutritionScoring; every interpolation choice below belongs to Trace.
const { evaluateUpdatedNutrition, VERSION: RAW_VERSION } = require('./updatedNutritionScoring');
const VERSION = `${RAW_VERSION}+trace-boundary-calibration-v2`;
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
// [inclusive raw minimum, inclusive raw maximum, display ceiling]. Mathematical
// component envelopes only bound the outer tails; categories determine calibration.
const FOOD = [-17, 55, 99];
const DOMAINS = freeze({ general: FOOD, cheese: FOOD, 'red-meat': FOOD,
  'fats-nuts-seeds': FOOD, beverage: [-18, 54, 79] });
// Edges lie halfway between neighboring integer raw totals. Numerical edges
// (80/60/40/20) and linear interpolation are Trace presentation conventions.
// Flooring keeps every whole-number result inside its category's display range.
const GENERAL = [[-17, 99], [0.5, 80], [2.5, 60], [10.5, 40], [18.5, 20], [55, 0]];
const ANCHORS = freeze({ general: GENERAL, cheese: GENERAL, 'red-meat': GENERAL,
  'fats-nuts-seeds': [[-17, 99], [-5.5, 80], [2.5, 60], [10.5, 40], [18.5, 20], [55, 0]],
  beverage: [[-18, 79], [2.5, 60], [6.5, 40], [9.5, 20], [54, 0]] });

function convertRawScore(raw, category) {
  if (category === 'water') {
    if (raw !== null) throw new RangeError('Plain water has no published raw point total.');
    return 100;
  }
  if (!Number.isInteger(raw) || !Object.prototype.hasOwnProperty.call(DOMAINS, category)) {
    throw new RangeError('An integer raw point total and supported food category are required.');
  }
  const [lo, hi] = DOMAINS[category];
  if (raw < lo || raw > hi) throw new RangeError('Raw point total is outside this version’s component envelope.');
  const anchors = ANCHORS[category];
  const index = anchors.findIndex(([point], i) => i > 0 && raw <= point);
  const [a, high] = anchors[index - 1], [b, low] = anchors[index];
  return Math.floor(high + (low - high) * (raw - a) / (b - a));
}

function evaluateTraceNutrition(profile) {
  const published = evaluateUpdatedNutrition(profile);
  const possibleScores = [...new Set(published.rawCandidates.flatMap(({ category, rawScores }) =>
    rawScores.map(raw => convertRawScore(raw, category))))].sort((a, b) => a - b);
  const calculated = possibleScores.length === 1;
  const reasons = published.reasons.filter(reason => reason.code !== 'band-not-determined');
  if (possibleScores.length > 1) reasons.push({ code: 'score-not-determined', path: 'nutrients',
    message: 'Missing inputs or category evidence allow several numerical scores; no single score is assigned.' });
  // Original classifications remain in the raw module only. The consumer-style
  // preview receives no classification labels, including in expandable details.
  const result = Object.fromEntries(Object.entries(published).filter(([key]) => !['letter', 'letters'].includes(key)));
  return freeze({ ...result, methodId: 'trace-experimental-updated-nutrition-numeric', methodVersion: VERSION,
    grade: null, scoreReady: false, scanMatchEligible: false,
    status: calculated ? 'calculated' : published.status === 'invalid' ? 'invalid' : 'incomplete',
    eligible: calculated, nutritionScore100: calculated ? possibleScores[0] : null,
    scoreRange: possibleScores.length ? [possibleScores[0], possibleScores[possibleScores.length - 1]] : null,
    possibleScores, reasons,
    warnings: published.warnings.filter(message => !message.includes('same official letter band')),
    categoryRules: published.categoryRules.map(rule => rule
      .replace('Plain water receives A categorically;', 'Plain water receives the categorical reference score;')
      .replace('only plain water can receive A.', 'plain water has a separate reference score.')),
    displayScale: 'Experimental Trace 0–100 presentation; not a health percentage or validated risk measurement' });
}

module.exports = { VERSION, DOMAINS, ANCHORS, convertRawScore, evaluateTraceNutrition };

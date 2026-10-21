// Offline comparison of existing captured profiles; original archives are read-only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
global.fetch = () => { throw new Error('Overall replay prohibits network requests.'); };
const loader = require.extensions['.js'];
require.extensions['.js'] = (module, filename) => {
  if (!filename.startsWith(path.join(root, 'src') + path.sep)) return loader(module, filename);
  module._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code, filename);
};
const { createBarcodeNutritionCandidate } = require('../src/services/barcodeNutritionSelection');
const { assessOverallFoodQuality } = require('../src/development/traceOverallFoodQuality');
const { evaluateTraceUsNutritionV2 } = require('../src/development/traceUsNutritionScoringV2');
const { evaluatePublishedNutrition } = require('../src/development/publishedNutritionScoring');
const { assessBarcodeNutrition } = require('../src/development/barcodeNutritionAssessment');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const comparison = read('docs/trace-nutrition-v2-comparison-2026-10-20.json');
const first = read('docs/barcode-grading-grocery-pilot-2026-10-20/results.json');
const follow = read('docs/barcode-grading-grocery-pilot-2026-10-20/follow-up-results.json');
const teddy = read('docs/trace-nutrition-v2-teddy-2026-10-20.json');
const units = { calories: 'kcal', sodium: 'mg' };
const products = comparison.products.map(row => {
  const observation = row.additionalComparison ? teddy : follow.observations.find(r => r.barcode === row.barcode)
    || first.observations.find(r => r.barcode === row.barcode);
  const lookup = JSON.parse(JSON.stringify(observation.lookup));
  // Use the same, already-approved qualifier recovery as the v2 replay. The
  // earliest lookup archive predates that recovery; never relabel its computed
  // kJ as a fresh label fact, or change a nutrient/serving value to gain a score.
  const approved = row.qualificationReview && row.after.evidence.originalDataset;
  if (approved) {
    const retained = lookup.food.assessmentInputs.datasets.find(d => d.id === approved.id);
    assert(retained, 'Approved source dataset must still exist.');
    for (const entry of retained.observations) {
      const verified = approved.observations.find(o => o.field === entry.field);
      assert(verified); assert.deepEqual(entry.rawValue, verified.rawValue);
      assert.equal(entry.enteredUnit, verified.enteredUnit);
      entry.derivation = verified.derivation;
    }
  }
  const candidate = createBarcodeNutritionCandidate(lookup);
  const before = JSON.stringify(candidate);
  const result = row.after.result;
  if (result?.normalized) {
    const rerun = evaluateTraceUsNutritionV2({ category: result.methodCategory,
      basis: result.normalized.originalBasis, source: row.after.evidence.assessment.source,
      grainEvidence: result.comparison.grainEvidence, usZeroFatLabelServing: Boolean(result.comparison.saturatedFatBound),
      nutrients: Object.fromEntries(Object.entries(result.normalized.originalNutrients).map(([key, value]) =>
        [key, { value, unit: units[key] || 'g' }])) });
    assert.equal(rerun.nutritionScore100, row.after.nutritionScore100);
  }
  const overall = assessOverallFoodQuality(candidate, row.after);
  assert.equal(assessBarcodeNutrition(candidate, lookup.identifier).nutritionScore100, row.after.nutritionScore100,
    'Integrated adapter must retain the approved nutrition score with the approved energy qualifiers.');
  assert.equal(JSON.stringify(candidate), before);
  assert.equal(overall.nutritionScore100, row.after.nutritionScore100);
  assert.equal(overall.grade, null); assert.equal(overall.scoreReady, false);
  return { name: row.selectedName, barcode: row.barcode, nutritionScore100: overall.nutritionScore100,
    overallScore100: overall.overallScore100, status: overall.status, reason: overall.reason,
    concernKnown: overall.additiveAssessment.concernBurden, rawOverall: overall.rawOverall,
    rawAdditiveDeduction: overall.rawAdditiveDeduction, additiveDeduction: overall.additiveDeduction,
    possibleRange: overall.possibleRange, deductions: overall.deductions,
    confidence: row.after.confidence, additives: overall.additiveAssessment };
});
const observedPanel = { calories: 340, totalSugar: 5, saturatedFat: 7, sodium: 760, protein: 16, fiber: 2 };
const nutrients = Object.fromEntries(Object.entries(observedPanel).map(([key, value]) => [key, { value, unit: units[key] || 'g' }]));
const observed = { product: { name: "Stouffer's Meat Lovers Lasagna, Large Size", gtin: null },
  methodCategory: 'general', basis: { kind: 'serving', amount: 215, unit: 'g' }, nutrients,
  source: { attribution: 'User-provided Yuka screenshot observation; not a verified manufacturer panel' } };
const v2 = evaluateTraceUsNutritionV2({ ...observed, category: 'general' });
const published = evaluatePublishedNutrition({ ...observed, plantContent: { percent: 51,
  basis: 'Yuka-reported vegetables; conditional assumption, not independently verified', source: 'User screenshot observation' } });
assert.equal(v2.nutritionScore100, 66); assert.equal(published.nutritionScore100, 75);
const report = { version: '2-screening-experimental-2026-10-20', offline: true, originalProfiles: 20, additionalComparisons: 1,
  nutritionScores: products.filter(p => p.nutritionScore100 !== null).length,
  originalNutritionScores: products.slice(0, 20).filter(p => p.nutritionScore100 !== null).length,
  overallScores: products.filter(p => p.overallScore100 !== null).length,
  reviewedOverall: products.filter(p => p.status === 'reviewed').length,
  provisionalOverall: products.filter(p => p.status === 'provisional').length,
  nutritionOnly: products.filter(p => p.status === 'nutrition-only' && p.nutritionScore100 !== null).length,
  nutritionUnavailable: products.filter(p => p.nutritionScore100 === null).length,
  supportedDeductionProfiles: products.filter(p => p.rawAdditiveDeduction > 0).length,
  roundedScoreDecreases: products.filter(p => p.additiveDeduction > 0).length, products,
  stouffersComparison: { matchingProductEvidence: false, classicGtin: '00013800103215', classicNutritionV2: 70,
    meatLovers: { source: 'User-provided Yuka screenshot observations', gtin: null, organicStatus: 'unknown',
      servingGrams: 215, observedPanel, nutritionV2: v2.nutritionScore100,
      publishedNutrition: published.nutritionScore100, conditionalVegetablePercent: 51,
      vegetableVerification: 'Yuka-reported assumption only', yukaOverallObserved: 45, traceOverall: null,
      additivesObserved: 7, yukaHighRiskObservations: ['sodium nitrite', 'BHA', 'BHT'],
      limitation: 'No independently verified additive classifications or complete assessment; no comparison of matched overall scores.' } },
  teddyYukaComparison: { ...teddy.yukaBenchmark, matchingProductEvidence: false,
    limitation: 'User-reported Yuka 36 does not establish its GTIN, formulation or matching source edition; no matched overall-score comparison.' } };
fs.writeFileSync(path.join(root, 'docs/trace-overall-food-quality-2026-10-20.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ nutrition: report.nutritionScores, originalNutrition: report.originalNutritionScores,
  overall: report.overallScores, reviewed: report.reviewedOverall, provisional: report.provisionalOverall,
  nutritionOnly: report.nutritionOnly, unavailable: report.nutritionUnavailable,
  supportedDeductions: report.supportedDeductionProfiles, roundedDecreases: report.roundedScoreDecreases,
  products: products.map(p => ({ name: p.name, nutrition: p.nutritionScore100, overall: p.overallScore100 })) }));

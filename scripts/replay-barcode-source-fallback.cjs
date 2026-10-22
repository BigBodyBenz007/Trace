// Offline replay of the existing frozen 100-product corpus. No provider calls,
// browser profile, saved food records or original evidence files are modified.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'docs/barcode-source-fallback-2026-10-21');
const originalFolder = path.join(root, 'docs/barcode-grade-coverage-2026-10-21');
const requestedMode = process.argv[2] || 'all';
if (!['implementation-only', 'after', 'cached-after', 'all'].includes(requestedMode)) {
  throw new Error('Use implementation-only, after, cached-after or all. before.json is the preserved pre-edit baseline.');
}
let mode = requestedMode;
const loader = require.extensions['.js'];
require.extensions['.css'] = () => {};
const compile = (module, filename) => module._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, babelrc: false, configFile: false,
  presets: [[require.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code, filename);
require.extensions['.js'] = (module, filename) => filename.startsWith(path.join(root, 'src') + path.sep)
  ? compile(module, filename) : loader(module, filename);
require.extensions['.jsx'] = compile;
global.fetch = () => { throw new Error('Offline source-fallback replay cannot make network requests.'); };
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { normalizeOpenFoodFactsProduct } = require('../api/nutrition/_barcodeGateway.cjs');
const { createRemoteBarcodeLookup } = require('../src/services/remoteBarcodeLookup');
const { createRemoteBarcodeCache } = require('../src/services/remoteBarcodeCache');
const { createBarcodeNutritionCandidate } = require('../src/services/barcodeNutritionSelection');
const { assessBarcodeNutrition } = require('../src/development/barcodeNutritionAssessment');
const { assessOverallFoodQuality } = require('../src/development/traceOverallFoodQuality');
const { assessLookupForGrading } = require('../src/development/barcodeAssessmentFallback');
const { shouldLoadBarcodeGrading } = require('../src/development/barcodeGradingMode');
const Review = require('../src/development/BarcodeNutritionReview.jsx').default;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const lines = file => fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const baseline = read(path.join(folder, 'before.json'));
const captures = lines(path.join(originalFolder, 'raw-responses.jsonl'));
const alternatives = new Map(lines(path.join(folder, 'alternative-responses.jsonl'))
  .filter(row => row.response?.food?.provider?.id === 'usda-fdc').map(row => [row.barcode, row]));
const preferredOff = row => {
  const raw = row.responses.find(response => response.body?.product)?.body.product;
  assert(raw, 'Every original selected product has a captured raw OFF response.');
  const food = normalizeOpenFoodFactsProduct(raw, row.barcode, row.capturedAt);
  return { status: food ? food.logReady ? 'found' : 'incomplete' : 'not-found',
    identifier: { scheme: 'gtin', value: row.barcode }, food };
};
const tagless = value => value.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
function causes(candidate, nutrition, overall) {
  const result = [];
  const reasons = nutrition.reasons.join(' ');
  if (nutrition.nutritionScore100 === null) {
    if (/measurement basis|mass or volume|dimension|quantity/i.test(reasons)) result.push('unknown-or-incompatible-basis');
    if (/energy.*conflict/i.test(reasons)) result.push('energy-source-conflict');
    if (/Energy is missing/i.test(reasons)) result.push('missing-energy');
    if (/Sodium is missing/i.test(reasons)) result.push('missing-sodium');
    if (/Saturated fat.*missing|fat-quality.*missing/i.test(reasons)) result.push('missing-saturated-fat-or-fat-quality');
    if (/Added sugars and total sugars.*missing/i.test(reasons)) result.push('missing-sugars');
    if (/invalid|unsupported unit|conflicting/i.test(reasons)) result.push('invalid-or-conflicting-nutrient');
    if (!result.length) result.push('other-nutrition-block');
  }
  if (!candidate.display.ingredients?.text?.trim()) result.push('missing-ingredient-declaration');
  if (overall.additiveAssessment.status === 'nutrition-only' && candidate.display.ingredients?.text?.trim()) {
    result.push('no-supported-ingredient-review');
  }
  return result;
}
async function assess(row) {
  const original = baseline.products.find(product => product.barcode === row.barcode);
  const result = { barcode: row.barcode, selectedName: original.selectedName, selectionGroup: row.selectionGroup,
    before: { nutrition: original.nutritionScore, overall: original.overallScore, status: original.overallStatus }, requests: [] };
  try {
    const preferred = preferredOff(row), data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    const clock = () => Date.parse(row.capturedAt) + 1000;
    if (mode === 'cached-after') createRemoteBarcodeCache({ storage, clock }).set(row.barcode, row.lookup);
    const browser = createRemoteBarcodeLookup({ storage, clock, runtime: () => ({ isWeb: true, isOnline: true }),
      fetchImpl: async (url, options) => {
        const request = JSON.parse(options.body);
        assert.equal(request.barcode, row.barcode);
        const supplied = alternatives.get(row.barcode);
        const canSupplyUsda = request.provider === 'usda-fdc' && mode !== 'implementation-only' && supplied;
        const payload = request.provider === 'usda-fdc'
          ? canSupplyUsda ? supplied.response : { status: 'unavailable', identifier: preferred.identifier, food: null }
          : preferred;
        result.requests.push({ provider: request.provider || 'preferred-OFF-corpus', status: payload.status,
          evidence: canSupplyUsda ? 'captured-live-normalized-USDA-gateway-record'
            : request.provider === 'usda-fdc' ? 'USDA-outcome-not-captured-unavailable-control' : 'original-captured-raw-OFF',
          constructedTransport: true });
        return { ok: true, headers: { get: () => null }, text: async () => JSON.stringify(payload) };
      } });
    const chosen = await browser.lookup(row.barcode, { assess: assessLookupForGrading });
    const candidate = createBarcodeNutritionCandidate(chosen);
    assert(candidate, 'Lookup must retain a usable review candidate.');
    const nutrition = assessBarcodeNutrition(candidate, chosen.identifier);
    const overall = assessOverallFoodQuality(candidate, nutrition);
    assert.equal(nutrition.grade, null); assert.equal(nutrition.scoreReady, false);
    assert.equal(overall.grade, null); assert.equal(overall.scoreReady, false);
    const html = renderToStaticMarkup(React.createElement(Review, { candidate, identifier: chosen.identifier }));
    const headline = html.match(/<strong[^>]*aria-label="(Experimental (?:overall|nutrition) rating)"[^>]*>([\s\S]*?)<\/strong>/);
    const expected = overall.overallScore100 ?? nutrition.nutritionScore100;
    assert(expected === null ? html.includes('Score unavailable') : tagless(headline?.[2] || '').startsWith(String(expected)),
      'Computed result must survive the real development review.');
    Object.assign(result, { selectedName: candidate.display.name, brand: candidate.display.brand,
      provider: candidate.display.assessmentInputs?.source.provider || chosen.food?.sourceType,
      source: candidate.display.assessmentInputs?.source || null, logReady: candidate.canUse,
      nutritionScore: nutrition.nutritionScore100, nutritionReasons: nutrition.reasons,
      nutritionWarnings: nutrition.warnings, overallScore: overall.overallScore100, overallStatus: overall.status,
      overallReasons: [overall.reason, ...overall.additiveAssessment.reasons],
      ingredientReview: overall.additiveAssessment.status, causes: causes(candidate, nutrition, overall),
      correctionId: candidate.display.nutritionCorrection?.id || null,
      sourceSelection: chosen.sourceSelection || null, display: { rendered: true, matchesComputed: true },
      newNutrition: original.nutritionScore === null && nutrition.nutritionScore100 !== null,
      newOverall: original.overallScore === null && overall.overallScore100 !== null,
      withdrawnNutrition: original.nutritionScore !== null && nutrition.nutritionScore100 === null,
      withdrawnOverall: original.overallScore !== null && overall.overallScore100 === null });
  } catch (error) { result.error = error.message; }
  return result;
}
(async () => {
  for (const runMode of requestedMode === 'all' ? ['implementation-only', 'after', 'cached-after'] : [requestedMode]) {
  mode = runMode;
  const products = [];
  for (const row of captures) products.push(await assess(row));
  const causeCounts = {};
  for (const product of products) for (const cause of product.causes || []) causeCounts[cause] = (causeCounts[cause] || 0) + 1;
  const report = { mode, startingHead: '8fd1803291f073b5c2b6d3bdb9ab817cae876c48',
    codeEdition: 'working-tree', evaluated: products.length, loggingReady: products.filter(product => product.logReady).length,
    nutritionScores: products.filter(product => Number.isInteger(product.nutritionScore)).length,
    overallScores: products.filter(product => Number.isInteger(product.overallScore)).length,
    overallReviewed: products.filter(product => product.overallStatus === 'reviewed').length,
    overallProvisional: products.filter(product => product.overallStatus === 'provisional').length,
    newNutrition: products.filter(product => product.newNutrition).map(product => product.barcode),
    newOverall: products.filter(product => product.newOverall).map(product => product.barcode),
    withdrawnNutrition: products.filter(product => product.withdrawnNutrition).map(product => product.barcode),
    withdrawnOverall: products.filter(product => product.withdrawnOverall).map(product => product.barcode),
    reviewRendered: products.filter(product => product.display?.rendered).length, errors: products.filter(product => product.error).length,
    sourceSelections: products.filter(product => product.sourceSelection?.outcome === 'fallback-selected').length,
    interceptedRequests: products.reduce((total, product) => total + product.requests.length, 0), causeCounts,
    productionGating: { grade: null, scoreReady: false,
      productionWithFlags: shouldLoadBarcodeGrading('production', 'localhost', '?barcodeGrading=1&nutritionPilot=1') },
    evidence: { corpus: 'docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl',
      alternatives: 'docs/barcode-source-fallback-2026-10-21/alternative-responses.jsonl',
      interpretation: 'Same frozen products and original OFF observations. Reconstructed offline transport preserves that corpus preference; explicit USDA alternatives use captured normalized gateway records, not upstream USDA responses. Other USDA attempt outcomes are unobserved and are modeled as unavailable, never not-found. These are implementation experiments, not a live configured-provider coverage or US market estimate. Whole source records are selected without nutrient/ingredient splicing; source differences and uncertainty remain.' }, products };
  assert.equal(report.evaluated, 100); assert.equal(report.errors, 0); assert.equal(report.reviewRendered, 100);
  fs.writeFileSync(path.join(folder, mode + '.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report, products: undefined }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

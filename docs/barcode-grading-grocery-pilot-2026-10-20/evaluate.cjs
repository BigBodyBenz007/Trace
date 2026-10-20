/* Research runner only. Public product data; no browser, storage or application writes.
 * Run from the repository root: node docs/barcode-grading-grocery-pilot-2026-10-20/evaluate.cjs
 * Existing results are replayed offline. --online explicitly requests missing lookups.
 * Results checkpoint after each product; resuming does not repeat completed requests.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '../..');
const selection = require('./selection.json');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
assert.equal(head, selection.head, 'Review the research revision before running at another HEAD.');
const originalLoader = require.extensions['.js'];
require.extensions['.js'] = (module, filename) => {
  if (!filename.startsWith(path.join(root, 'src') + path.sep)) return originalLoader(module, filename);
  const transformed = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  module._compile(transformed.code, filename);
};
const { createRemoteBarcodeLookup } = require(path.join(root, 'src/services/remoteBarcodeLookup'));
const { createBarcodeNutritionCandidate } = require(path.join(root, 'src/services/barcodeNutritionSelection'));
const { assessBarcodeNutrition } = require(path.join(root, 'src/development/barcodeNutritionAssessment'));
const { explainNutritionPoints, getBarcodeAdditiveInformation } = require(path.join(root, 'src/development/barcodeReviewInformation'));
const { getAssessmentDatasetNutrients, getNutritionAssessmentQuality } = require(path.join(root, 'src/services/nutritionAssessmentInputs'));
const required = ['calories', 'saturatedFat', 'totalSugar', 'sodium', 'fiber', 'protein', 'fat', 'carbohydrates'];
const followUp = process.argv.includes('--follow-up-rate-limited');
const output = path.join(__dirname, followUp ? 'follow-up-results.json' : 'results.json');
const products = followUp ? selection.products.filter(product =>
  require('./results.json').observations.some(row => row.barcode === product.barcode && row.lookup.status === 'rate-limited'))
  : selection.products;
const archive = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : {
  head, endpoint: 'https://trace-umber.vercel.app/api/nutrition/barcode',
  selection: 'selection.json', method: 'Existing lookup -> candidate -> development assessment, without data supplementation.',
  observations: [],
};
assert.equal(archive.head, head);
const online = process.argv.includes('--online');
let http = null;
const lookup = createRemoteBarcodeLookup({
  storage: null, runtime: { isWeb: true, isOnline: true },
  fetchImpl: async (relative, options) => {
    assert.equal(relative, '/api/nutrition/barcode');
    const response = await fetch(new URL(relative, archive.endpoint), options);
    http = { status: response.status, date: response.headers.get('date'),
      vercelId: response.headers.get('x-vercel-id') };
    return response;
  },
});
function evaluate(result) {
  const candidate = createBarcodeNutritionCandidate(result);
  const before = JSON.stringify(candidate);
  const assessment = assessBarcodeNutrition(candidate, result.identifier);
  assert.equal(JSON.stringify(candidate), before, 'Assessment mutated a product selection.');
  assert.equal(assessment.grade, null);
  assert.equal(assessment.scoreReady, false);
  assert.equal(assessment.scanMatchEligible, false);
  const input = candidate?.display?.assessmentInputs;
  const datasets = (input?.datasets || []).map(dataset => {
    const nutrients = getAssessmentDatasetNutrients(dataset);
    return { id: dataset.id, basis: dataset.basis, quantity: dataset.quantity, nutrients,
      missingScoringNutrients: required.filter(key => nutrients[key].value === null) };
  });
  const additiveData = candidate?.display?.additives;
  return {
    product: candidate ? { name: candidate.display.name, brand: candidate.display.brand,
      packageQuantity: candidate.display.packageQuantity, serving: candidate.display.servingDescription,
      attribution: candidate.display.attribution, sourceUrl: candidate.display.sourceUrl } : null,
    provider: result.food?.provider || null,
    markets: input?.markets || [], categories: input?.categories || [],
    quality: input ? getNutritionAssessmentQuality(input) : null,
    datasets, completeScoringProfile: datasets.some(dataset => !dataset.missingScoringNutrients.length),
    loggingUsable: candidate?.canUse === true,
    ingredientsAvailable: Boolean(candidate?.display?.ingredients?.text),
    ingredientLanguage: candidate?.display?.ingredients?.language || null,
    additiveStatus: additiveData?.status || 'legacy-missing',
    additives: additiveData?.items?.map(item => ({ ...item,
      information: getBarcodeAdditiveInformation(item.standardizedIdentifier) })) ?? null,
    assessment, explanation: explainNutritionPoints(assessment.result),
  };
}
async function main() {
  for (const product of products) {
    const prior = archive.observations.find(row => row.barcode === product.barcode);
    if (prior) {
      assert.deepEqual(evaluate(prior.lookup), prior.evaluation, `Offline replay differs: ${product.barcode}`);
      continue;
    }
    assert(online, 'Missing archived lookup; rerun with --online to request public product data.');
    http = null;
    const startedAt = new Date().toISOString();
    const result = await lookup.lookup(product.barcode);
    const row = { barcode: product.barcode, selectedName: product.name, startedAt,
      retrievedAt: new Date().toISOString(), http, lookup: result, evaluation: evaluate(result) };
    archive.observations.push(row);
    const temporary = output + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(archive, null, 2) + '\n');
    fs.renameSync(temporary, output);
    console.log(JSON.stringify({ barcode: row.barcode, selected: row.selectedName, status: result.status,
      provider: row.evaluation.provider?.id, returned: row.evaluation.product?.name,
      score: row.evaluation.assessment.nutritionScore100, reasons: row.evaluation.assessment.reasons }));
    await new Promise(resolve => setTimeout(resolve, followUp ? 10000 : 500));
  }
  console.log(`Verified ${archive.observations.length} archived products; grade=null and scoreReady=false throughout.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

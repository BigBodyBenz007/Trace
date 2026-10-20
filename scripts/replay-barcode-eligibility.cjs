// Offline replay only. Never refreshes or rewrites the original grocery archive.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const babel = require('@babel/core');
global.fetch = () => { throw new Error('This replay prohibits network requests.'); };
const root = path.resolve(__dirname, '..');
const loader = require.extensions['.js'];
require.extensions['.js'] = (module, filename) => {
  if (!filename.startsWith(path.join(root, 'src') + path.sep)) return loader(module, filename);
  module._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code, filename);
};
const { createBarcodeNutritionCandidate } = require('../src/services/barcodeNutritionSelection');
const { assessBarcodeNutrition } = require('../src/development/barcodeNutritionAssessment');
const { explainNutritionPoints } = require('../src/development/barcodeReviewInformation');
const { offEnergyDerivation } = require('../api/nutrition/_assessmentInputs.cjs');
const plantAudit = process.argv.includes('--plant-audit');
const energyAudit = plantAudit || process.argv.includes('--energy-audit');
const approvedReplay = energyAudit ? require('../docs/barcode-eligibility-replay-2026-10-20.json') : null;
const plantBaseline = plantAudit ? require('../docs/barcode-energy-replay-2026-10-20.json') : null;
const energySources = energyAudit ? require('../docs/barcode-energy-provider-evidence-2026-10-20.json') : null;
const folder = path.join(root, 'docs/barcode-grading-grocery-pilot-2026-10-20');
const read = filename => JSON.parse(fs.readFileSync(path.join(folder, filename), 'utf8'));
const first = read('results.json'), follow = read('follow-up-results.json');
const originalHashes = Object.fromEntries(['selection.json', 'results.json', 'follow-up-results.json', 'summary.json', 'README.md', 'evaluate.cjs'].map(filename =>
  [filename, crypto.createHash('sha256').update(fs.readFileSync(path.join(folder, filename))).digest('hex')]));
const products = first.observations.map(row => follow.observations.find(next => next.barcode === row.barcode) || row).map(row => {
  const legacyAssessment = energyAudit ? assessBarcodeNutrition(createBarcodeNutritionCandidate(row.lookup), row.lookup.identifier) : null;
  if (energyAudit) assert.equal(legacyAssessment.nutritionScore100,
    approvedReplay.products.find(product => product.barcode === row.barcode).after.nutritionScore100,
    'Legacy inputs without recovered qualifiers must not gain a score silently.');
  const lookup = JSON.parse(JSON.stringify(row.lookup));
  const energySource = energySources?.products.find(product => product.barcode === row.barcode);
  let qualificationReview = null;
  if (energySource) {
    const original = lookup.food.assessmentInputs, provider = energySource.body.product;
    assert.equal(provider.code.padStart(14, '0'), row.barcode);
    assert.equal(new Date(provider.last_modified_t * 1000).toISOString(), original.source.revisionDate);
    const structured = energySource.structured.body.product;
    assert.equal(structured.code.padStart(14, '0'), row.barcode);
    assert.equal(structured.last_modified_t, provider.last_modified_t);
    const kjSource = structured.nutrition.aggregated_set.nutrients['energy-kj'];
    const sourceKj = structured.nutrition.input_sets[kjSource.source_index].nutrients['energy-kj'];
    assert.equal(sourceKj.value, undefined, 'Do not relabel an entered kJ declaration as a computation.');
    assert.equal(typeof sourceKj.value_computed, 'number');
    for (const entry of original.serving) assert.deepEqual(entry.value, provider[entry.field]);
    for (const dataset of original.datasets) for (const entry of dataset.observations) {
      // Recover only omitted qualifiers from an independently retrieved identical
      // revision. Every originally captured nutrient must match before use.
      assert.deepEqual(entry.rawValue, provider.nutriments[entry.field.replace('nutriments.', '')]);
      const field = /^nutriments\.(energy-kcal|energy-kj|energy)_(serving|100g|100ml|value)$/.exec(entry.field);
      if (field) {
        assert.equal(entry.enteredUnit, provider.nutriments[`${field[1]}_unit`] ?? null);
        entry.derivation = offEnergyDerivation(provider.nutriments, field[1], field[2]);
      }
    }
    qualificationReview = { url: energySource.url, retrievedAt: energySource.retrievedAt,
      sameRevision: true, originalNutrientValuesAndServingMetadataUnchanged: true,
      computedKjConfirmedInOfficialInputSet: true, structuredSourceUrl: energySource.structured.url,
      change: 'Recover only omitted energy modifiers; no nutrient, market, ingredient or category values replaced.' };
  }
  const candidate = createBarcodeNutritionCandidate(lookup);
  assert.equal(candidate?.canUse === true, row.evaluation.loggingUsable, 'Logging eligibility changed.');
  const before = JSON.stringify(candidate);
  const revised = assessBarcodeNutrition(candidate, row.lookup.identifier);
  assert.equal(JSON.stringify(candidate), before);
  assert.equal(revised.grade, null); assert.equal(revised.scoreReady, false); assert.equal(revised.scanMatchEligible, false);
  const product = { barcode: row.barcode, selectedName: row.selectedName, retrievedAt: row.retrievedAt,
    before: (plantBaseline || approvedReplay)?.products.find(product => product.barcode === row.barcode)?.after || row.evaluation.assessment,
    after: revised, qualificationReview, legacyScore100: legacyAssessment?.nutritionScore100 ?? null, loggingUsable: candidate?.canUse === true,
    explanation: explainNutritionPoints(revised.result) };
  console.log(JSON.stringify({ name: product.selectedName, score: revised.nutritionScore100,
    category: revised.result?.categoryCandidates || revised.evidence.category?.categories, reasons: revised.reasons }));
  return product;
});
const output = { sourceHead: first.head, originalArchiveSha256: originalHashes, offline: true, energyAudit,
  ...(plantAudit ? { plantAudit: true } : {}),
  previousScores: products.filter(product => product.before.nutritionScore100 !== null).length,
  revisedScores: products.filter(product => product.after.nutritionScore100 !== null).length, products };
const destination = path.join(root, plantAudit ? 'docs/barcode-plant-replay-2026-10-20.json'
  : energyAudit ? 'docs/barcode-energy-replay-2026-10-20.json' : 'docs/barcode-eligibility-replay-2026-10-20.json');
fs.writeFileSync(destination, JSON.stringify(output, null, 2) + '\n');
console.log(`Previous: ${output.previousScores}; revised: ${output.revisedScores}; original observations unchanged.`);

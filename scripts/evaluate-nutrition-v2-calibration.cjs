// Offline, fixed-batch policy comparison. No application files, product records,
// caches or network are modified. node scripts/evaluate-nutrition-v2-calibration.cjs
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'docs/nutrition-v2-calibration-2026-10-21.json');
const batch = JSON.parse(fs.readFileSync(file, 'utf8'));
const engineFile = path.join(root, 'src/development/traceUsNutritionScoringV2.js');
const activeSource = fs.readFileSync(engineFile, 'utf8');
// Preserve the evaluated, committed v2 baseline after implementing the scoped
// adjustment. This read-only Git dependency is pinned by the frozen batch.
assert.match(batch.startingHead, /^[0-9a-f]{40}$/);
const engineSource = execFileSync('git', ['show', batch.startingHead + ':src/development/traceUsNutritionScoringV2.js'], { cwd: root, encoding: 'utf8' });
const originalLoader = require.extensions['.js'];
const compile = source => babel.transformSync(source, { filename: engineFile, babelrc: false, configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code;
require.extensions['.js'] = (module, filename) => filename.startsWith(path.join(root, 'src') + path.sep)
  ? module._compile(compile(fs.readFileSync(filename, 'utf8')), filename) : originalLoader(module, filename);
global.fetch = () => { throw Error('Calibration replay is offline.'); };
const { evaluateTraceUsNutritionV2: implemented } = require(engineFile);
const { resolveGrainEvidence } = require('../src/development/traceFoodQualityEvidence');
const { assessOverallFoodQuality } = require('../src/development/traceOverallFoodQuality');
const { shouldLoadBarcodeGrading } = require('../src/development/barcodeGradingMode');
const clone = value => JSON.parse(JSON.stringify(value));
const close = (a, b) => Math.abs(a - b) < 1e-9;
function substitute(source, old, replacement) {
  assert.equal(source.split(old).length, 2, 'Candidate must bind exactly one unchanged engine expression');
  return source.replace(old, replacement);
}
function candidateEngine(addedFirst, dairyEnergy, milkOnly = false) {
  let source = engineSource;
  if (addedFirst) {
    source = substitute(source, 'const sugarBurden = measuredSugar.length ? Math.max(...measuredSugar) : null;',
      milkOnly ? 'const sugarBurden = input.calibrationDairyDrink === true ? addedBurden !== null ? addedBurden : totalBurden : measuredSugar.length ? Math.max(...measuredSugar) : null;'
        : 'const sugarBurden = addedBurden !== null ? addedBurden : totalBurden;');
    source = substitute(source, "sugarMode = addedBurden !== null && (totalBurden === null || addedBurden >= totalBurden) ? 'addedSugar' : totalBurden !== null ? 'totalSugar' : 'unknown';",
      milkOnly ? "sugarMode = addedBurden !== null && (input.calibrationDairyDrink === true || totalBurden === null || addedBurden >= totalBurden) ? 'addedSugar' : totalBurden !== null ? 'totalSugar' : 'unknown';"
        : "sugarMode = addedBurden !== null ? 'addedSugar' : totalBurden !== null ? 'totalSugar' : 'unknown';");
  }
  if (dairyEnergy) source = substitute(source,
    "const energyBurden = energyInput === null ? null : category === 'beverage' ? ramp(energyInput, 0, 60) : ramp(energyInput, 80, 600);",
    "const energyBurden = energyInput === null ? null : category === 'beverage' && input.calibrationDairyDrink !== true ? ramp(energyInput, 0, 60) : ramp(energyInput, 80, 600);");
  const instance = new Module(engineFile, module);
  instance.filename = engineFile; instance.paths = Module._nodeModulePaths(path.dirname(engineFile));
  instance._compile(compile(source), engineFile);
  return instance.exports.evaluateTraceUsNutritionV2;
}
const current = candidateEngine(false, false);
const methods = { current, addedFirst: candidateEngine(true, false), dairyEnergy: candidateEngine(false, true),
  both: candidateEngine(true, true), milkOnly: candidateEngine(true, true, true), implemented };
function inputFor(ref) {
  const source = { url: ref.source.url, attribution: ref.source.attribution || ref.source.provider };
  // These sections are present in the archived official milk-page URLs. This
  // is source product-classification evidence, not a milk-ingredient inference
  // or an individual barcode exception. No nutrient or source edition changes.
  const milkSection = /\/milk-cream\/(?:regular-milk|flavored-milk)\//.test(ref.source.url) && ref.source.documentTitle;
  const productEvidence = milkSection ? { name: ref.source.documentTitle, source,
    categories: [{ field: 'official-product-page.section', values: ['fluid-dairy-milk'] }] } : null;
  return { source, basis: ref.basis, nutrients: ref.nutrients, category: ref.category,
    productEvidence,
    grainEvidence: resolveGrainEvidence(ref.ingredients, source),
    usZeroFatLabelServing: ref.usZeroFatLabelServing === true, calibrationDairyDrink: ref.foodGroup === 'dairy-drink' };
}
function combined(ref, nutrition) {
  const source = { url: ref.source.url, attribution: ref.source.attribution || ref.source.provider };
  const value = assessOverallFoodQuality({ display: { ingredients: ref.ingredients, attribution: source.attribution,
    sourceUrl: source.url } }, nutrition);
  assert.equal(value.grade, null); assert.equal(value.scoreReady, false);
  return { policy: value.policy, grade: value.grade, scoreReady: value.scoreReady, status: value.status,
    overallScore100: value.overallScore100, rawOverall: value.rawOverall, additiveDeduction: value.additiveDeduction,
    rawAdditiveDeduction: value.rawAdditiveDeduction, provisional: value.provisional, possibleRange: value.possibleRange,
    concernKnown: value.additiveAssessment.concernBurden, source: value.additiveAssessment.source,
    reasons: value.additiveAssessment.reasons, limitation: value.limitation,
    findings: value.additiveAssessment.items.map(item => ({ identifier: item.identifier, name: item.name,
      concernBurden: item.concernBurden, classification: item.classification, conditionResult: item.conditionResult,
      packagingOnly: item.packagingOnly, conflict: item.conflict, rationale: item.review?.rationale || null,
      sources: item.review?.sources || [], conditions: item.review?.conditions || [], conflicts: item.review?.conflicts || [] })) };
}
function summary(value) {
  return { score: value.nutritionScore100, raw: value.rawScore, rawRange: value.rawScoreRange,
    category: value.methodCategory, normalized: value.normalized, sugarMode: value.sugarMode,
    comparison: value.comparison, points: value.points, warnings: value.warnings, reasons: value.reasons };
}
assert.equal(batch.referenceBatchFrozenBeforeScoring, true);
assert.equal(batch.references.length, 16);
assert.deepEqual(batch.references.map(ref => ref.id), batch.selection.map(ref => ref.id));
const results = batch.references.map(ref => {
  for (const [key, entry] of Object.entries(ref.nutrients)) assert.equal(entry.unit, key === 'calories' ? 'kcal' : key === 'sodium' ? 'mg' : 'g');
  const input = inputFor(ref), outputs = Object.fromEntries(Object.entries(methods).map(([name, method]) => [name, method(input)]));
  for (const output of Object.values(outputs)) { assert.equal(output.grade, null); assert.equal(output.scoreReady, false); }
  const overall = Object.fromEntries(Object.entries(outputs).map(([name, result]) => [name, combined(ref, result)]));
  return { id: ref.id, input, ...Object.fromEntries(Object.entries(outputs).map(([name, value]) => [name, summary(value)])), overall };
});

const controls = [], refById = id => batch.references.find(ref => ref.id === id);
for (const ref of batch.references) {
  const input = inputFor(ref), base = current(input);
  for (const factor of [.5, 1.25, 2, 100 / input.basis.amount]) {
    const represented = clone(input);
    represented.basis.amount *= factor;
    for (const entry of Object.values(represented.nutrients)) if (entry.value !== null) entry.value *= factor;
    for (const [methodName, method] of Object.entries(methods)) {
      const expected = methodName === 'current' ? base : method(input), output = method(represented);
      assert.equal(output.nutritionScore100, expected.nutritionScore100, ref.id + ': representation');
      assert(close(output.rawScoreRange[0], expected.rawScoreRange[0]));
      assert(close(output.rawScoreRange[1], expected.rawScoreRange[1]));
    }
  }
  controls.push({ type: 'constructed-equivalent-representations', reference: ref.id, factors: [.5, 1.25, 2, '100-unit-basis'], passed: true });
}
for (const [id, nutrient, values] of [
  ['nonfat-milk', 'addedSugar', [0, 3, 6, 9, 12]],
  ['whole-milk', 'saturatedFat', [5, 6, 7, 8]],
  ['nonfat-milk', 'sodium', [130, 300, 600, 1000]],
  ['prepared-meal', 'sodium', [680, 800, 1000, 1200]],
]) {
  const ref = refById(id), scores = {};
  for (const [name, method] of Object.entries(methods)) {
    const outputs = values.map(value => {
      const input = clone(inputFor(ref)); input.nutrients[nutrient].value = value;
      return method(input);
    });
    for (let index = 1; index < outputs.length; index++) {
      assert(outputs[index].nutritionScore100 <= outputs[index - 1].nutritionScore100, name + ': no improvement from added burden');
      assert(outputs[index].rawScoreRange[1] <= outputs[index - 1].rawScoreRange[1] + 1e-9);
    }
    scores[name] = outputs.map(value => value.nutritionScore100);
  }
  controls.push({ type: 'constructed-one-variable-increase', reference: id, nutrient, values, otherInputsUnchanged: true, scores });
}
const unknownAdded = clone(inputFor(refById('nonfat-milk'))); unknownAdded.nutrients.addedSugar.value = null;
controls.push({ type: 'constructed-missing-added-sugar', originalUnknownPreserved: true,
  scores: Object.fromEntries(Object.entries(methods).map(([name, method]) => [name, method(unknownAdded).nutritionScore100])) });
const milkAudit = require('../docs/barcode-grade-coverage-2026-10-21/dairy-calculations.json');
const capturedMilk = milkAudit.products.map(product => {
  const evaluated = current(product.normalizedV2Input);
  assert.equal(evaluated.nutritionScore100, product.actualV2Output.nutritionScore100);
  return { barcode: product.barcode, name: product.name, source: product.source, raw: product.raw,
    selectedDatasetId: product.selectedDatasetId, originalInput: product.normalizedV2Input,
    baseline: summary(evaluated), baselineEdition: batch.startingHead, sourceCaveats: product.sourceCaveats,
    evidenceConclusion: 'Unverified captured provider observation. Its supported reference unit is retained; comparison to another product does not establish a corrected quantity or manufacturer match.' };
});
assert.equal(shouldLoadBarcodeGrading('production', 'localhost', '?barcodeGrading=1&nutritionPilot=1'), false);
assert.equal(shouldLoadBarcodeGrading('production', 'trace-umber.vercel.app', '?barcodeGrading=1&nutritionPilot=1'), false);
batch.candidatePolicies = {
  addedFirst: 'Use usable declared added sugars when known; otherwise retain existing total-sugar fallback. Same ramps/weights/unknown handling.',
  dairyEnergy: 'For explicitly identified milk drinks only, apply the existing 80–600 energy-density ramp per 100 mL instead of 0–60. Preserve volume and all sugar/saturated-fat/sodium/credit rules. This transfer is an experimental Trace choice, not an FDA cutoff or g/mL conversion.',
  both: 'Original evaluation: GLOBAL added-sugar preference plus milk-only energy change. No other equation/category/ingredient/additive changes.',
  milkOnly: 'Both changes restricted to source-identified fluid dairy milk. Reproduced before implementation: same 16 scores as the original global-sugar joint candidate; the 13 non-milk references do not distinguish the two policies.',
  implemented: '2.1-milk-development-2026-10-21: source-bound fluid-dairy classification and measured mL required; retain old policy for excluded/ambiguous/mass-only records. Added-first preference (zero included), total fallback, 80–600 kcal per 100 mL. No density or lactose inference.',
  activePolicyChanged: true,
};
for (const row of results) {
  assert.equal(row.milkOnly.score, row.both.score, row.id + ': scope reproduction');
  assert.equal(row.implemented.score, row.milkOnly.score, row.id + ': implemented joint candidate');
  if (!['nonfat-milk', 'whole-milk', 'sweetened-milk'].includes(row.id)) assert.equal(row.implemented.raw, row.current.raw);
}
assert.deepEqual(results.filter(row => row.id.endsWith('-milk')).map(row => row.implemented.score), [86, 80, 72]);
batch.results = { references: results, controls, capturedMilk, productionGating: { grade: null, scoreReady: false, previewFlagEnabled: false },
  validation: { coherentReferences: 16, equivalentRepresentations: 64,
    methodRepresentationChecks: 64 * Object.keys(methods).length, oneVariableSeries: 4 * Object.keys(methods).length,
    replayChangesApplicationFiles: false, baselineEdition: batch.startingHead } };
// Optional: retain a compact, complete comparison from the ONE corpus run.
// Generate it with the existing source-fallback replay's optional output path;
// never overwrite its historical before/after evidence or fetch new products.
const corpusArg = process.argv.find(arg => arg.startsWith('--corpus='));
if (corpusArg) {
  const after = JSON.parse(fs.readFileSync(path.resolve(root, corpusArg.slice('--corpus='.length)), 'utf8'));
  const before = require('../docs/barcode-source-fallback-2026-10-21/after.json');
  assert.equal(after.evaluated, 100); assert.equal(after.errors, 0); assert.equal(after.reviewRendered, 100);
  const products = after.products.map(row => {
    const original = before.products.find(product => product.barcode === row.barcode);
    assert(original);
    assert.equal(row.provider, original.provider);
    assert.equal(row.correctionId, original.correctionId);
    assert.equal(row.logReady, original.logReady);
    assert.equal(row.overallStatus, original.overallStatus);
    const changed = row.nutritionScore !== original.nutritionScore || row.overallScore !== original.overallScore;
    if (changed) assert.equal(row.milkDrinkPolicyApplied, true);
    return { barcode: row.barcode, name: row.selectedName, provider: row.provider,
      before: { nutrition: original.nutritionScore, overall: original.overallScore, status: original.overallStatus },
      after: { nutrition: row.nutritionScore, overall: row.overallScore, status: row.overallStatus },
      changed, milkDrinkPolicyApplied: row.milkDrinkPolicyApplied,
      milkDrinkEvidence: row.milkDrinkEvidence, nutritionWarnings: row.nutritionWarnings,
      logReady: row.logReady, correctionId: row.correctionId };
  });
  const counts = report => Object.fromEntries(['evaluated', 'nutritionScores', 'overallScores', 'overallReviewed', 'overallProvisional', 'loggingReady', 'reviewRendered', 'errors'].map(key => [key, report[key]]));
  assert.deepEqual(counts(after), counts(before));
  batch.corpusReplay = { baseline: 'docs/barcode-source-fallback-2026-10-21/after.json',
    startingHead: after.startingHead, methodVersion: '2.1-milk-development-2026-10-21', runs: 1,
    evidence: after.evidence, before: counts(before), after: counts(after),
    changedBarcodes: products.filter(row => row.changed).map(row => row.barcode), products,
    interpretation: 'Captured, unverified observations, separate from the reliable reference batch. No panel correction, manufacturer verification, live coverage claim or category-specific target follows from these new scores.' };
}
assert.equal(fs.readFileSync(engineFile, 'utf8'), activeSource);
fs.writeFileSync(file, JSON.stringify(batch, null, 2) + '\n');
console.log(JSON.stringify(results.map(row => ({ id: row.id, current: row.current.score, addedFirst: row.addedFirst.score,
  dairyEnergy: row.dairyEnergy.score, both: row.both.score, milkOnly: row.milkOnly.score, implemented: row.implemented.score,
  overallBefore: row.overall.current.overallScore100, overallAfter: row.overall.implemented.overallScore100, status: row.overall.implemented.status })), null, 2));

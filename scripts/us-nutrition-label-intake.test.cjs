// Synthetic mutations below are contract tests, not new manufacturer evidence.
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const { analyzeCollection, scoringInput, canonicalValue } = require("./lib/us-nutrition-label-intake.cjs");
const { importArchive, digest } = require("./lib/us-nutrition-label-archive.cjs");
const { evaluateExperimentalUsNutrition: evaluate } = require("../src/services/experimentalUsNutritionScoring");
const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "docs/nutrition-validation/2026-10-19");
const read = name => JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8").replace(/^\uFEFF/, ""));
const archive = { catalog: read("products.json"), captures: read("source-captures.json"), results: read("results.json"),
  engineSource: fs.readFileSync(path.join(ROOT, "src/services/experimentalUsNutritionScoring.js"), "utf8") };
const initial = importArchive(archive);
const clone = v => JSON.parse(JSON.stringify(v));
const single = () => ({ ...clone(initial), records: [clone(initial.records.find(r => r.id === "sugary-cereal-frosted-flakes"))] });
const analyze = collection => analyzeCollection(collection).records[0];
const synthetic = mutate => { const c = single(); mutate(c.records[0], c); return analyze(c); };
const codes = r => r.issues.map(i => i.code);
const rejected = r => {
  assert.equal(r.eligibility.eligible, false); assert.equal(r.result.experimentalScore, null);
  assert.equal(r.result.experimentalRawScore, null); assert.equal(r.result.contributions, null);
  assert.equal(r.grade, null); assert.equal(r.scoreReady, false);
};

test("initial 18 preserve every rejection reason, score and disabled public result", () => {
  const report = analyzeCollection(initial);
  assert.deepEqual(report.summary, { observations: 18, completeNineNutrients: 12, missingNutrition: 6,
    eligible: 3, rejected: 15, invalidIntake: 0, formulationRejected: 12, unsupportedCategory: 7, conflictingObservations: 2 });
  assert.equal(initial.records.find(r => r.id === "plain-almonds").serving.servingsPerContainer.qualifier, null);
  for (const row of report.records) {
    const prior = archive.results.results.find(r => r.productId === row.id).result;
    assert.deepEqual(row.eligibility.engineRejectionReasons, prior.reasons);
    assert.equal(row.result.experimentalRawScore, prior.experimentalRawScore);
    assert.equal(row.result.experimentalScore, prior.experimentalScore);
    assert.equal(row.grade, null); assert.equal(row.scoreReady, false);
  }
});

test("complete label is deterministic, isolated and never mutates input", () => {
  const input = single(), before = clone(input), result = analyzeCollection(input);
  assert.deepEqual(result, analyzeCollection(input)); assert.deepEqual(input, before);
  assert.equal(result.records[0].eligibility.eligible, true);
  assert.equal(result.records[0].coverage.numericProfileComplete, true);
  assert.deepEqual(result.records[0].coverage.missing, []);
  assert.equal(result.records[0].result.experimentalScore, 15);
});

for (const nutrient of Object.keys(initial.records[0].datasets[0].nutrients)) {
  test(`explicitly missing ${nutrient} never becomes zero or receives a score`, () => {
    const r = synthetic(v => Object.assign(v.datasets[0].nutrients[nutrient], { value: null, state: "missing" }));
    rejected(r); assert(r.coverage.missing.includes(nutrient)); assert(!r.coverage.present.includes(nutrient));
    assert(r.eligibility.engineReasonCodes.includes(nutrient === "addedSugar" ? "added-sugars-missing" : "required-nutrient-missing"));
  });
}

test("not-significant-source declarations remain ambiguous, not numeric zeros", () => {
  const r = analyzeCollection(initial).records.find(r => r.id === "regular-soda");
  assert.deepEqual(r.coverage.missing, ["saturatedFat", "fiber"]);
  assert.deepEqual(r.coverage.ambiguous, ["saturatedFat", "fiber"]);
  assert(r.coverage.recovery.some(r => r.status === "not-numeric-in-observed-source")); rejected(r);
});

for (const [name, mutation, expected] of [
  ["unsupported units", r => { r.datasets[0].nutrients.sodium.unit = "%DV"; }, "unsupported-nutrient-conversion"],
  ["invalid value", r => { r.datasets[0].nutrients.fiber.value = -1; }, "invalid-nutrient-value"],
  ["numeric string", r => { r.datasets[0].nutrients.fiber.value = "1"; }, "invalid-nutrient-value"],
  ["unknown value state", r => { r.datasets[0].nutrients.fiber.state = "assumed"; }, "invalid-nutrient-state"],
  ["reported null", r => { r.datasets[0].nutrients.fiber.value = null; }, "nutrient-state-value-mismatch"],
  ["missing explicit nutrient", r => { delete r.datasets[0].nutrients.fiber; }, "explicit-nutrient-unknown-required"],
  ["added sugar contradiction", r => { r.datasets[0].nutrients.addedSugar.value = 13; }, "contradictory-nutrient-values"],
  ["saturate contradiction", r => { r.datasets[0].nutrients.saturatedFat.value = 1; }, "contradictory-nutrient-values"],
  ["wrong serving basis", r => { r.datasets[0].basis.amount = 38; }, "serving-basis-mismatch"],
  ["missing dataset", r => { r.datasets = null; }, "datasets-missing"],
  ["null dataset", r => { r.datasets = [null]; }, "dataset-not-object"],
  ["wrong dataset selection", r => { r.selectedDatasetId = "unknown"; }, "selected-dataset-missing"],
  ["unbound nutrient", r => { r.datasets[0].nutrients.fiber.sourceEdition = "another-edition"; }, "source-binding-invalid"],
  ["invalid GTIN", r => { r.product.gtin = "00038000196561"; }, "invalid-gtin"],
  ["source attribution missing", r => { r.source.attribution = null; }, "source-attribution-incomplete"],
  ["non-HTTPS source", r => { r.source.url = "http://example.com"; }, "invalid-source-url"],
  ["missing hash", r => { r.source.artifact.sha256 = null; }, "artifact-provenance-incomplete"],
  ["unknown version", r => { r.schemaVersion = 2; }, "unsupported-intake-version"],
  ["missing servings unknown", r => { delete r.serving.servingsPerContainer; }, "explicit-unknown-required"],
  ["invalid container count", r => { r.serving.servingsPerContainer = { value: 0, qualifier: "exact" }; }, "invalid-servings-per-container"],
]) test(`synthetic rejection: ${name}`, () => {
  const r = synthetic(mutation); rejected(r); assert(codes(r).includes(expected), codes(r).join(","));
});

test("supported g serving scales to 100g without intermediate rounding", () => {
  const c = single(), r = analyze(c), s = clone(c), d = s.records[0].datasets[0];
  for (const m of Object.values(d.nutrients)) m.value *= 100 / d.basis.amount;
  Object.assign(d.basis, { kind: "100g", amount: 100, unit: "g" });
  const other = analyze(s);
  assert.equal(other.eligibility.eligible, true);
  assert.equal(other.result.experimentalRawScore, r.result.experimentalRawScore);
  assert.equal(other.result.explanationInputs.originalBasis.amount, 100);
  assert.equal(r.result.explanationInputs.originalBasis.amount, 37);
});

test("supported nutrient conversions retain original quantities and units", () => {
  const r = synthetic(v => { v.datasets[0].nutrients.sodium.value = .19; v.datasets[0].nutrients.sodium.unit = "g"; });
  assert.equal(r.eligibility.eligible, true); assert.equal(r.result.experimentalScore, 15);
  assert.equal(r.result.explanationInputs.originalNutrients.sodium.value, .19);
  assert.equal(r.result.explanationInputs.originalNutrients.sodium.unit, "g");
  assert(Math.abs(canonicalValue("calories", { value: 418.4, unit: "kJ" }) - 100) < 1e-12);
});

test("no household, package-weight or cross-dimensional reference conversion", () => {
  for (const unit of ["cup", "fl oz", "oz", "kg", "ml"]) {
    const r = synthetic(v => { v.datasets[0].basis.unit = unit; v.serving.quantity.unit = unit; });
    rejected(r); assert(r.eligibility.engineReasonCodes.some(c => ["unsupported-reference-unit", "category-basis-mismatch"].includes(c)));
  }
});

test("equivalent independently declared datasets are supported without merging", () => {
  const c = single(), v = c.records[0], d = clone(v.datasets[0]);
  d.id = "per-100g"; d.basis.kind = "100g"; d.basis.amount = 100;
  for (const m of Object.values(d.nutrients)) m.value *= 100 / 37;
  v.datasets.push(d);
  assert.equal(analyze(c).eligibility.eligible, true);
  d.nutrients.protein.value += 1;
  const r = analyze(c); rejected(r); assert(codes(r).includes("cross-dataset-reconciliation-required"));
});

test("US brand or country claim cannot replace missing market/formulation evidence", () => {
  for (const market of [null, "GB", "XX"]) {
    const r = synthetic(v => {
      for (const p of [v.product, v.source.product, v.review.product]) p.market = market;
      v.marketEvidence.claim = market;
      v.marketEvidence.verification = market === null ? "unknown" : "us-oriented-observation";
      v.review.decision = null;
    });
    rejected(r); assert.equal(r.coverage.formulationAcceptedByScorer, false);
  }
  rejected(synthetic(v => { v.marketEvidence = { claim: "US", statement: "US brand", verification: "unknown" }; }));
});

test("optional unknown GTIN is valid intake but remains ineligible for scoring", () => {
  const r = synthetic(v => { for (const p of [v.product, v.source.product, v.review.product]) p.gtin = null; });
  assert.equal(r.validIntake, true); rejected(r);
  assert(r.eligibility.engineReasonCodes.includes("product-identity-incomplete"));
});

for (const revision of ["2026-02-30", "2026-10-20", "not-a-date", undefined]) {
  test(`synthetic malformed/future revision ${String(revision)} rejected`, () => {
    const r = synthetic(v => { v.source.revisionOn = revision; }); rejected(r);
    assert(codes(r).some(c => ["invalid-source-date", "future-source-date"].includes(c)));
  });
}

test("unknown revision is preserved; new retrieval does not renew observation", () => {
  const c = single(), r = analyze(c);
  assert.equal(r.coverage.freshness.revisionOn, null);
  assert.equal(r.coverage.freshness.currentRetailFormulationEstablished, false);
  c.asOf = "2027-10-19"; c.records[0].source.retrievedOn = "2027-10-19";
  const expired = analyze(c); rejected(expired);
  assert(expired.eligibility.engineReasonCodes.includes("review-expired"));
});

test("revision preceding publication and revision after observation require review", () => {
  rejected(synthetic(v => { v.source.publishedOn = "2026-10-18"; v.source.revisionOn = "2026-10-17"; }));
  const c = single(); c.asOf = "2026-10-21";
  c.records[0].source.revisionOn = "2026-10-20"; c.records[0].source.retrievedOn = "2026-10-21";
  const r = analyze(c); rejected(r); assert(r.eligibility.engineReasonCodes.includes("source-edition-postdates-observation"));
});

test("source/review identity and artifact bindings remain strict", () => {
  for (const mutate of [v => { v.source.product.brand = "Synthetic different brand"; },
    v => { v.review.artifactSha256 = "a".repeat(64); }, v => { v.sourceState.cacheStale = true; },
    v => { v.sourceState.superseded = true; }, v => { delete v.review.reviewerId; }]) rejected(synthetic(mutate));
});

test("duplicate/conflicting IDs and same-GTIN observations reject all participants", () => {
  for (const variant of ["same", "changed-id", "changed-values", "changed-edition"]) {
    const c = single(), d = clone(c.records[0]); c.records.push(d);
    if (variant !== "same") d.id += "-synthetic";
    if (variant === "changed-values") d.datasets[0].nutrients.protein.value += 1;
    if (variant === "changed-edition") d.source.edition += "-synthetic";
    const r = analyzeCollection(c); assert.equal(r.valid, false);
    r.records.forEach(rejected);
    assert(r.records.every(v => codes(v).some(c => /duplicate|conflict/.test(c))));
  }
});

test("conflicting reused source editions are rejected across different product IDs", () => {
  const c = clone(initial), first = c.records[1], second = c.records[4];
  second.source.id = first.source.id; second.source.edition = first.source.edition;
  const r = analyzeCollection(c);
  assert(codes(r.records[1]).includes("conflicting-source-edition"));
  assert(codes(r.records[4]).includes("conflicting-source-edition"));
});

test("whole-grain marketing evidence is preserved but never relabeled as FDA equivalents", () => {
  const v = initial.records.find(r => r.id === "whole-wheat-bread");
  assert.equal(v.wholeGrains[0].value, 25);
  assert.equal(v.wholeGrains[0].provenance.verification, "archived-note-unverified");
  assert.equal(v.wholeGrains[0].provenance.artifactSha256, null);
  assert.equal(v.foodGroups.length, 0);
  const c = single(); c.records = [clone(v)];
  assert(codes(analyze(c)).includes("supplemental-claim-not-independently-bound"));
  c.records[0].wholeGrains[0].provenance.verification = "source-bound";
  const r = analyze(c); rejected(r); assert(codes(r).includes("source-binding-invalid"));
});

test("fat-quality quantities retain units, serving basis and exact provenance", () => {
  const almonds = initial.records.find(r => r.id === "plain-almonds");
  assert.deepEqual(almonds.fatQuality.map(r => r.value), [3.5, 9]);
  assert(almonds.fatQuality.every(r => r.datasetId === almonds.selectedDatasetId && r.provenance.artifactSha256 === almonds.source.artifact.sha256));
  const c = single(); c.records = [clone(almonds)];
  c.records[0].fatQuality[0].unit = "%";
  assert(codes(analyze(c)).includes("unsupported-fat-quality-unit"));
});

test("ingredient transcription requires a bound source; absent text stays unknown", () => {
  assert.equal(initial.records[0].ingredients.text, null);
  const r = synthetic(v => { v.ingredients = { status: "transcribed", text: "SYNTHETIC INGREDIENT", language: "en", provenance: null }; });
  rejected(r); assert(codes(r).includes("source-binding-invalid"));
});

test("supplemental ingredient/food-group/fat metadata cannot change arithmetic", () => {
  const c = single(), expected = analyze(c).result.experimentalRawScore, v = c.records[0];
  v.ingredients = { status: "transcribed", text: "SYNTHETIC INGREDIENT", language: "en",
    provenance: { sourceId: v.source.id, sourceEdition: v.source.edition, field: "synthetic-controlled-field" } };
  const e = { sourceId: v.source.id, sourceEdition: v.source.edition, field: "synthetic-controlled-field",
    artifactSha256: v.source.artifact.sha256, url: v.source.url, verification: "source-bound" };
  v.foodGroups = [{ description: "SYNTHETIC, NOT A REAL LABEL CLAIM", value: 10, unit: "g", basisDescription: "per serving", provenance: e }];
  const r = analyze(c); assert.equal(r.eligibility.eligible, true); assert.equal(r.result.experimentalRawScore, expected);
});

test("recovery claims are explicitly differentiated and never populate nutrients", () => {
  const before = clone(initial), r = analyzeCollection(initial);
  assert(r.records.some(r => r.coverage.recoverableFromExistingSource.length));
  assert(r.records.every(r => r.coverage.recoverableFromExistingSource.every(v => v.status === "documented-not-transcribed")));
  assert.deepEqual(initial, before);
  const malformed = synthetic(v => { v.recovery = [{ field: "fiber", reason: "guess", url: v.source.url, status: "assumed-zero" }]; });
  rejected(malformed);
});

test("malformed collections reject without score or exception", () => {
  for (const input of [null, [], {}, { schemaVersion: 2, asOf: "2026-10-19", records: [] }]) assert.equal(analyzeCollection(input).valid, false);
  for (const record of [null, [], "bad", 1]) {
    const c = single(); c.records = [record]; rejected(analyze(c));
  }
  const c = single(); c.methodVersion = "unapproved"; rejected(analyze(c));
});

test("import refuses engine drift and mismatched source captures", () => {
  assert.throws(() => importArchive({ ...archive, engineSource: `${archive.engineSource}\n// synthetic drift` }));
  const bad = clone(archive); bad.captures.captures[0].sha256 = "b".repeat(64);
  assert.throws(() => importArchive(bad));
});

test("adapter invokes unchanged scoring and preserves controlled input", () => {
  const c = single(), input = scoringInput(c.records[0], c.asOf);
  assert.equal(evaluate(input).experimentalRawScore, analyze(c).result.experimentalRawScore);
  assert.equal(evaluate(input).grade, null); assert.equal(evaluate(input).scoreReady, false);
});

test("reviewed physical package observations can bind local captured artifacts", () => {
  const r = synthetic(v => {
    v.source.kind = "package-label"; v.source.url = null;
    v.source.artifact.locator = "synthetic-captures/controlled-label.png";
  });
  assert.equal(r.eligibility.eligible, true);
  assert.equal(r.result.explanationInputs.sourceBindings.artifact.locator, "synthetic-captures/controlled-label.png");
});

test("no network, application, storage or public grading consumers are introduced", () => {
  const source = fs.readFileSync(path.join(ROOT, "scripts/lib/us-nutrition-label-intake.cjs"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|\bXMLHttpRequest\b|\blocalStorage\b|Date\.now\s*\(/);
  const input = single();
  input.records[0].sourceState.unresolvedConflicts.push("SYNTHETIC unresolved observation");
  const r = analyze(input); rejected(r);
  assert(r.eligibility.engineReasonCodes.includes("conflicting-data"));
});

test("offline CLI round-trips v1 and refuses overwrite of evidence", () => {
  const parent = path.join(ROOT, "artifacts/us-nutrition-label-intake-20261019");
  fs.mkdirSync(parent, { recursive: true });
  const dir = fs.mkdtempSync(path.join(parent, "test-")), output = path.join(dir, "output");
  const cli = path.join(ROOT, "scripts/validate-us-nutrition-labels.cjs");
  const first = JSON.parse(execFileSync(process.execPath, [cli, "--output-dir", output], { cwd: ROOT, encoding: "utf8" }));
  assert.equal(first.eligible, 3); assert.equal(first.validIntake, true);
  const intakePath = path.join(output, "intake.json"), hash = digest(fs.readFileSync(intakePath));
  const roundTrip = JSON.parse(execFileSync(process.execPath, [cli, "--input", intakePath], { cwd: ROOT, encoding: "utf8" }));
  assert.deepEqual(roundTrip, first);
  const repeat = spawnSync(process.execPath, [cli, "--output-dir", output], { cwd: ROOT, encoding: "utf8" });
  assert.equal(repeat.status, 1); assert.match(repeat.stderr, /exists/);
  assert.equal(digest(fs.readFileSync(intakePath)), hash);
  const malformed = path.join(dir, "synthetic-invalid.json");
  fs.writeFileSync(malformed, JSON.stringify({ engineNormalizedSourceSha256: initial.engineNormalizedSourceSha256, schemaVersion: 99 }));
  const invalidDir = path.join(dir, "invalid-report");
  const invalid = spawnSync(process.execPath, [cli, "--input", malformed, "--output-dir", invalidDir], { cwd: ROOT, encoding: "utf8" });
  assert.equal(invalid.status, 1); assert.equal(JSON.parse(invalid.stdout).issues[0].code, "invalid-intake-collection");
  assert.equal(JSON.parse(fs.readFileSync(path.join(invalidDir, "coverage.json"))).valid, false);
});

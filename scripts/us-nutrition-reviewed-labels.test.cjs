// Real archived observations are read-only. All mutations are synthetic cases.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { execFileSync } = require("node:child_process");
const { applyReviewedLabelReviews } = require("./lib/us-nutrition-reviewed-labels.cjs");
const { assertEngineCompatibility, normalizedHash } = require("./lib/us-nutrition-engine-compatibility.cjs");
const { analyzeCollection } = require("./lib/us-nutrition-label-intake.cjs");
const read = file => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const clone = v => JSON.parse(JSON.stringify(v));
const original = read("docs/nutrition-label-intake/2026-10-19/intake.json");
const originalReport = read("docs/nutrition-label-intake/2026-10-19/coverage.json");
const manifest = read("docs/reviewed-us-manufacturer-labels/2026-10-19/reviews.json");
const engine = fs.readFileSync("src/services/experimentalUsNutritionScoring.js", "utf8");
const apply = (input = original, reviews = manifest) => applyReviewedLabelReviews(input, reviews, engine);
const reviewed = () => analyzeCollection(apply());

test("explicit individual reviews demonstrate exactly two additional eligible observations", () => {
  const report = reviewed();
  assert.deepEqual(report.summary, { observations: 18, completeNineNutrients: 12, missingNutrition: 6,
    eligible: 5, rejected: 13, invalidIntake: 0, formulationRejected: 10, unsupportedCategory: 7, conflictingObservations: 2 });
  const additional = report.records.filter(r => r.eligibility.eligible && !originalReport.records.find(p => p.id === r.id).eligibility.eligible);
  assert.deepEqual(additional.map(r => r.id), ["plain-yogurt", "sweetened-yogurt"]);
  for (const r of additional) {
    assert.equal(r.result.explanationInputs.product.gtin, null);
    assert.equal(r.result.assessmentIdentity.scanMatch.eligible, false);
    assert.equal(r.result.assessmentIdentity.review.reviewerType, "automated-document-review");
    assert.equal(r.grade, null); assert.equal(r.scoreReady, false);
  }
  assert.equal(report.records.find(r => r.id === "whole-grain-cereal").eligibility.eligible, false);
});

test("no review overlay means no automatic promotion or historical output drift", () => {
  const { inputFiles, ...prior } = originalReport;
  assert(inputFiles.length > 0);
  assert.deepEqual(analyzeCollection(original), prior);
  const next = apply(original, { ...manifest, reviews: [] });
  assert.equal(analyzeCollection(next).summary.eligible, 3);
  assert.equal(next.records.find(r => r.id === "plain-yogurt").identity, undefined);
});

test("all 16 records without completed reviews retain exact legacy results", () => {
  const next = reviewed();
  for (const r of next.records.filter(r => !["plain-yogurt", "sweetened-yogurt"].includes(r.id))) {
    assert.deepEqual(r.result, originalReport.records.find(p => p.id === r.id).result);
  }
});

test("review application is deterministic, read-only and retains unknown GTIN/provenance history", () => {
  const old = clone(original), reviews = clone(manifest), next = apply();
  assert.deepEqual(next, apply()); assert.deepEqual(original, old); assert.deepEqual(manifest, reviews);
  assert.equal(next.schemaVersion, 2); assert.equal(next.engineNormalizedSourceSha256, normalizedHash(engine));
  assert.equal(next.priorEngineNormalizedSourceSha256, original.engineNormalizedSourceSha256);
  assert.equal(next.reviewApplication.automaticPromotion, false);
  assert.equal(next.reviewApplication.untouchedObservations, 16);
  for (const r of next.records.filter(r => r.schemaVersion === 2)) {
    assert.equal(r.product.gtin, null); assert.equal(r.source.product.gtin, null); assert.equal(r.review.product.gtin, null);
    assert.equal(r.source.revisionOn, null); assert.equal(r.lineage.reviewedLabel.independentHumanReview, false);
    assert.equal(r.lineage.reviewedLabel.priorSource.id, original.records.find(p => p.id === r.id).source.id);
    assert(r.lineage.reviewedLabel.candidateDispositions.length);
    assert.equal(r.ingredients.provenance.sourceId, r.source.id);
  }
  const syntheticHuman = clone(manifest);
  syntheticHuman.reviews[0].identity.review.reviewerType = "human";
  assert.equal(apply(original, syntheticHuman).records.find(r => r.id === "plain-yogurt").lineage.reviewedLabel.independentHumanReview, false);
});

test("pending label reviews cannot become eligible through status-free metadata", () => {
  const reviews = clone(manifest); reviews.reviews.forEach(r => { r.status = "pending"; });
  const report = analyzeCollection(apply(original, reviews));
  assert.equal(report.summary.eligible, 3);
});

test("curation cannot fabricate GTINs, change nutrients/basis or clear known conflicts", () => {
  for (const mutate of [
    reviews => { reviews.reviews[0].product.gtin = "00012345600012"; },
    reviews => { reviews.reviews[0].observedNutrients.protein.value += 1; },
    reviews => { reviews.reviews[0].observedBasis.amount = 170; },
    reviews => { delete reviews.reviews[0].observedNutrients.addedSugar; },
    reviews => { reviews.reviews.push(clone(reviews.reviews[0])); },
  ]) { const reviews = clone(manifest); mutate(reviews); assert.throws(() => apply(original, reviews)); }
  const input = clone(original); input.records.find(r => r.id === "plain-yogurt").sourceState.unresolvedConflicts.push("SYNTHETIC conflict");
  assert.throws(() => apply(input));
});

test("v1 cannot silently reinterpret explicit reviewed identities", () => {
  const collection = apply(); collection.schemaVersion = 1;
  const report = analyzeCollection(collection);
  assert.equal(report.summary.eligible, 3);
  const row = report.records.find(r => r.id === "plain-yogurt");
  assert(row.eligibility.intakeRejectionReasons.some(r => r.code === "collection-version-mismatch"));
  assert.equal(row.result.assessmentIdentity.assessmentEligible, false);
  assert.equal(row.result.experimentalRawScore, null);
});

test("v2 ingredients and market declarations must agree with reviewed panel evidence", () => {
  for (const mutate of [r => { r.ingredients.status = "unknown"; r.ingredients.text = null; },
    r => { r.ingredients.provenance.field = "another-flavor.ingredients"; },
    r => { r.marketEvidence.statement = "SYNTHETIC brand-derived market"; }]) {
    const c = apply(), r = c.records.find(r => r.id === "plain-yogurt"); mutate(r);
    const row = analyzeCollection(c).records.find(v => v.id === r.id);
    assert.equal(row.eligibility.eligible, false); assert.equal(row.result.experimentalRawScore, null);
    assert.equal(row.result.assessmentIdentity.assessmentEligible, false);
  }
});

test("duplicate no-GTIN label observations require reconciliation", () => {
  const c = apply(), row = clone(c.records.find(r => r.id === "plain-yogurt"));
  row.id += "-synthetic-duplicate"; c.records.push(row);
  const rows = analyzeCollection(c).records.filter(r => r.id.startsWith("plain-yogurt"));
  assert.equal(rows.length, 2);
  for (const r of rows) {
    assert(r.issues.some(i => i.code === "duplicate-reviewed-label-observation"));
    assert.equal(r.result.experimentalRawScore, null);
  }
});

test("edition compatibility is explicit, bounded and sensitive to source changes", () => {
  assertEngineCompatibility(engine, original.engineNormalizedSourceSha256, 1);
  assertEngineCompatibility(engine, normalizedHash(engine), 2);
  assert.throws(() => assertEngineCompatibility(engine + "\n// SYNTHETIC drift", original.engineNormalizedSourceSha256, 1));
  assert.throws(() => assertEngineCompatibility(engine, "a".repeat(64), 1));
  assert.throws(() => assertEngineCompatibility(engine, original.engineNormalizedSourceSha256, 2));
});

test("CLI replays original intake and applies reviews only on explicit request", () => {
  const cli = path.resolve("scripts/validate-us-nutrition-labels.cjs");
  const base = [cli, "--input", "docs/nutrition-label-intake/2026-10-19/intake.json"];
  const first = JSON.parse(execFileSync(process.execPath, base, { encoding: "utf8" }));
  const second = JSON.parse(execFileSync(process.execPath, [...base, "--reviews", "docs/reviewed-us-manufacturer-labels/2026-10-19/reviews.json"], { encoding: "utf8" }));
  assert.equal(first.eligible, 3); assert.equal(second.eligible, 5);
  assert.equal(first.grade, null); assert.equal(second.grade, null);
  assert.equal(first.scoreReady, false); assert.equal(second.scoreReady, false);
});

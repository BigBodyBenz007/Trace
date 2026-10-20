// Explicit, offline curation overlays. Never a provider enrichment or scan match.
const assert = require("node:assert/strict");
const { normalizedHash } = require("./us-nutrition-engine-compatibility.cjs");
const { KEYS } = require("./us-nutrition-label-intake.cjs");
const clone = value => JSON.parse(JSON.stringify(value));

function applyReviewedLabelReviews(collection, manifest, engineSource) {
  assert.equal(manifest.schemaVersion, 1, "Unsupported review manifest");
  assert(Array.isArray(manifest.reviews), "Explicit reviews required");
  assert.equal(manifest.asOf, collection.asOf, "Review and collection assessment dates must agree");
  assert.equal(new Set(manifest.reviews.map(r => r.productId)).size, manifest.reviews.length, "Duplicate product reviews");
  const next = clone(collection), dispositions = [];
  for (const entry of manifest.reviews) {
    const record = next.records.find(r => r.id === entry.productId);
    assert(record, `Unknown reviewed observation: ${entry.productId}`);
    assert(["completed", "pending"].includes(entry.status), "Unknown review status");
    dispositions.push({ productId: entry.productId, status: entry.status, reason: entry.reason });
    if (entry.status !== "completed") continue;
    assert.equal(entry.identity?.review?.status, "completed", "Completed curation must include completed identity review");
    assert.deepEqual(entry.product, record.product, "Review cannot silently replace product identity or invent a GTIN");
    const dataset = record.datasets.find(d => d.id === record.selectedDatasetId);
    assert(dataset, "Selected original dataset required");
    assert.equal(record.datasets.length, 1, "Multi-dataset curation needs a separately reviewed reconciliation");
    assert.deepEqual(entry.observedBasis, { kind: dataset.basis.kind, amount: dataset.basis.amount, unit: dataset.basis.unit });
    assert.deepEqual(Object.keys(entry.observedNutrients).sort(), [...KEYS].sort(), "Review must include all nine original declarations");
    for (const key of KEYS) {
      assert.deepEqual(entry.observedNutrients[key], { value: dataset.nutrients[key].value, unit: dataset.nutrients[key].unit },
        `Primary label differs from original ${key}; keep a separate observation rather than silently replacing it`);
    }
    assert.equal(record.sourceState.unresolvedConflicts.length, 0, "Review must not clear historical unresolved conflicts");
    assert.equal(entry.source.kind, "manufacturer-label");
    assert(entry.ingredients?.text && entry.ingredients?.language, "Transcribed ingredient evidence required");
    const priorSource = clone(record.source);
    record.schemaVersion = 2;
    record.identity = clone(entry.identity);
    record.source = { ...clone(entry.source), product: clone(record.product), formulationId: entry.identity.formulationId };
    const ref = field => ({ sourceId: record.source.id, sourceEdition: record.source.edition, field });
    const panel = entry.identity.panel;
    record.review = { ...record.review, id: entry.reviewId, reviewerId: entry.identity.review.reviewerId,
      kind: "independent-label-review", decision: "label-suitable-for-research-assessment",
      notes: entry.identity.review.notes, reviewedOn: entry.identity.review.reviewedOn,
      labelObservedOn: entry.labelObservedOn, reviewDueOn: entry.reviewDueOn,
      sourceId: record.source.id, sourceEdition: record.source.edition,
      artifactId: record.source.artifact.id, artifactSha256: record.source.artifact.sha256,
      formulationId: entry.identity.formulationId, product: clone(record.product) };
    const servingField = `${panel.nutritionField}.serving`;
    dataset.basis = { ...dataset.basis, ...ref(servingField) };
    for (const key of KEYS) Object.assign(dataset.nutrients[key], ref(`${panel.nutritionField}.${key}`));
    record.serving.quantity = { ...record.serving.quantity, ...ref(servingField) };
    record.serving.servingsPerContainer = entry.servingsPerContainer === null ? null
      : { ...clone(entry.servingsPerContainer), ...ref(`${panel.nutritionField}.servingsPerContainer`) };
    record.marketEvidence = { claim: "US", verification: "matched-formulation", statement: panel.marketStatement, ...ref(panel.marketField) };
    record.ingredients = { status: "transcribed", text: entry.ingredients.text, language: entry.ingredients.language,
      provenance: ref(panel.ingredientsField) };
    record.lineage = { ...record.lineage, reviewedLabel: { reviewId: entry.reviewId, priorSource,
      candidateDispositions: clone(entry.candidateDispositions || []), physicalPackageInspected: false,
      // Reviewer kind does not establish reviewer independence or a second review.
      independentHumanReview: false } };
  }
  next.schemaVersion = 2;
  next.engineNormalizedSourceSha256 = normalizedHash(engineSource);
  next.priorEngineNormalizedSourceSha256 = collection.engineNormalizedSourceSha256;
  next.reviewApplication = { automaticPromotion: false, dispositions,
    untouchedObservations: collection.records.filter(r => !manifest.reviews.some(e => e.productId === r.id && e.status === "completed")).length };
  return next;
}

module.exports = { applyReviewedLabelReviews };

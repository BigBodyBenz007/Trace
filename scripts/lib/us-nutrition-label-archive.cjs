// Explicit import of the reviewed research archive, not an HTML/label parser.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { METHOD_ID, METHOD_VERSION } = require("../../src/services/experimentalUsNutritionScoring");
const { analyzeCollection, scoringInput } = require("./us-nutrition-label-intake.cjs");
const { assertEngineCompatibility } = require("./us-nutrition-engine-compatibility.cjs");
const clone = v => JSON.parse(JSON.stringify(v));
const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

function importArchive({ catalog, captures, results, engineSource }) {
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(captures.schemaVersion, 1);
  assert.equal(results.schemaVersion, 1);
  assert.equal(captures.capturedOn, catalog.researchAsOf);
  assert.equal(results.asOf, catalog.researchAsOf);
  assertEngineCompatibility(engineSource, catalog.engineNormalizedSourceSha256, 1);
  assert.equal(results.engineNormalizedSourceSha256, catalog.engineNormalizedSourceSha256);
  assert.equal(new Set(catalog.products.map(r => r.id)).size, catalog.products.length);
  assert.equal(new Set(results.results.map(r => r.productId)).size, catalog.products.length);
  assert.equal(new Set(captures.captures.map(r => r.productId)).size, catalog.products.length);
  assert.deepEqual(catalog.nutrientOrder, ["calories", "saturatedFat", "addedSugar", "totalSugar", "sodium", "fiber", "protein", "fat", "carbohydrates"]);
  assert.deepEqual(catalog.nutrientUnits, ["kcal", "g", "g", "g", "mg", "g", "g", "g", "g"]);
  const records = catalog.products.map(row => {
    const prior = results.results.find(r => r.productId === row.id);
    const capture = captures.captures.find(r => r.productId === row.id);
    assert(prior && capture);
    const input = clone(prior.input), { product, source, review, sourceState, basis, nutrients } = input;
    assert.equal(input.methodId, METHOD_ID); assert.equal(input.methodVersion, METHOD_VERSION);
    assert.equal(input.asOf, catalog.researchAsOf);
    assert.equal(source.id, row.source.id); assert.equal(capture.sourceId, source.id);
    assert.equal(capture.fetchedOn, source.retrievedOn); assert.equal(source.retrievedOn, catalog.researchAsOf);
    assert.equal(source.artifact.sha256, capture.sha256); assert.equal(source.artifact.locator, capture.url);
    assert.deepEqual(product, { gtin: row.gtin, name: row.name, brand: row.brand, variant: row.name,
      packageDescription: row.package, preparation: "as-sold",
      preparationDescription: "Declared product composition without additions; no guessed cooking yield",
      market: row.market, category: row.category });
    assert.deepEqual([basis.amount, basis.unit], [row.serving.amount, row.serving.unit]);
    assert.deepEqual(sourceState.unresolvedConflicts, row.conflicts);
    assert.equal(review.decision === "matched-product-market-and-label", row.identityReviewed);
    const ref = field => ({ sourceId: source.id, sourceEdition: source.edition, field });
    catalog.nutrientOrder.forEach((key, index) => {
      assert.equal(nutrients[key].value, row.nutrients[index]);
      assert.equal(nutrients[key].unit, catalog.nutrientUnits[index]);
      nutrients[key].state = nutrients[key].value !== null ? "reported"
        : ["olive-oil", "regular-soda", "diet-soda", "unsweetened-tea"].includes(row.id)
          ? "not-numerically-declared" : "missing";
    });
    const evidence = (field, url = source.artifact.locator) => ({ ...ref(field), url,
      artifactSha256: source.artifact.sha256, verification: "source-bound" });
    const recovery = [];
    if (/ingredient/i.test(row.source.provision)) recovery.push({ field: "ingredients.text",
      sourceId: source.id, sourceEdition: source.edition,
      status: "documented-not-transcribed", url: row.source.url,
      reason: `Archived provision identifies an ingredient field: ${row.source.provision}. Transcribe and bind it before use.` });
    if (!row.identityReviewed && row.brand !== null) recovery.push({ field: "product.gtin/formulation",
      status: "candidate-requires-verification", url: row.source.url,
      reason: "Review an exact US package barcode and matching label edition; this source observation does not establish that binding." });
    if (row.serving.amount === null || row.serving.unit === "fl oz") recovery.push({ field: "serving.quantity",
      status: "candidate-requires-verification", url: row.source.url,
      reason: "Find a declared gram/mL serving on the matching package/primary label. No box-weight division, density or household-unit conversion." });
    const missing = catalog.nutrientOrder.filter((key, index) => row.nutrients[index] === null);
    if (missing.length) recovery.push({ field: missing.join(","), url: row.source.url,
      status: row.brand === null ? "candidate-requires-verification" : "not-numeric-in-observed-source",
      reason: row.brand === null
        ? "A separate reviewed USDA generic composition record is a research candidate, not a branded replacement. Do not splice its nutrients into this FDA table."
        : "No numeric declarations in this observed source. A not-significant-source statement is not zero; require a matching authoritative numeric edition." });
    if (row.conflicts.length) recovery.push({ field: row.id === "protein-bar" ? "calories/product-edition" : "package/servingsPerContainer",
      status: "candidate-requires-verification", url: row.source.url,
      reason: "Adjudicate the documented contradiction against an exact package/label edition; do not choose whichever value permits scoring." });
    if (row.id === "white-bread") recovery.push({ field: "source.primaryLabel", status: "candidate-requires-verification",
      url: row.source.url, reason: "Use this retailer listing only to locate a matching manufacturer/package label. It does not pass the engine's primary-label gate." });
    const fatQuality = Object.entries(row.additionalNutrition || {}).map(([key, value]) => ({
      description: key.replace(/_g$/, ""), value, unit: "g", basisDescription: row.serving.description, datasetId: "declared-serving",
      provenance: evidence(`products.${row.id}.additionalNutrition.${key}`) }));
    // This marketing callout was archived as a note, not as captured NFP bytes.
    // In particular, never claim that the separate NFP image proves 25 g grain.
    const wholeGrains = row.additionalFoodEvidence ? [{ description: row.additionalFoodEvidence.sourceField,
      value: row.additionalFoodEvidence.wholeGrains_g_per_slice, unit: "g", basisDescription: "per slice (manufacturer marketing callout)",
      provenance: { sourceId: null, sourceEdition: null, artifactSha256: null,
        url: row.source.url, field: `products.${row.id}.additionalFoodEvidence`, verification: "archived-note-unverified" } }]
      : row.id === "whole-grain-cereal" ? [{ description: "Whole grain statement; no quantitative food-group equivalent verified",
        value: null, unit: null, basisDescription: null, provenance: evidence(row.source.provision) }] : [];
    // The old transcription preserves counts, not their exact/about qualifier.
    const counts = { "plain-almonds": [6, null, "Nutrition Facts: six servings"],
      "white-bread": [14, null, row.serving.description] };
    const count = counts[row.id];
    return { schemaVersion: 1, id: row.id, role: row.role, product,
      source: { ...source, url: row.source.url, documentTitle: null, description: `Archived nutrition observation: ${row.name}`,
        provision: row.source.provision, labelVersion: row.source.version }, review, sourceState,
      marketEvidence: { claim: row.market, statement: row.marketEvidence,
        verification: row.identityReviewed ? "matched-formulation" : "us-oriented-observation", ...ref(`products.${row.id}.marketEvidence`) },
      serving: { description: row.serving.description,
        quantity: { amount: row.serving.amount, unit: row.serving.unit, ...ref(basis.field) },
        servingsPerContainer: count ? { value: count[0], qualifier: count[1], ...ref(count[2]) } : null },
      selectedDatasetId: "declared-serving", datasets: [{ id: "declared-serving", basis, nutrients }],
      ingredients: { status: recovery.some(r => r.field === "ingredients.text") ? "not-transcribed" : "unknown",
        text: null, language: null, provenance: null }, foodGroups: [], wholeGrains, fatQuality, recovery,
      limitations: clone(row.limitations),
      lineage: { archiveProductId: row.id, archiveSourceVerification: row.source.verification,
        sourceObservationOnly: true, reviewLimitation: catalog.reviewer,
        rawCapture: { localOriginal: capture.localOriginal, sha256: capture.sha256, bytes: capture.bytes } } };
  });
  const collection = { schemaVersion: 1, asOf: catalog.researchAsOf, methodId: METHOD_ID, methodVersion: METHOD_VERSION,
    engineNormalizedSourceSha256: catalog.engineNormalizedSourceSha256,
    collection: "Initial 18 archived observations; purposive, not national coverage",
    reviewLimitation: catalog.reviewer, records };
  const report = analyzeCollection(collection);
  records.forEach((record, i) => {
    const original = results.results.find(r => r.productId === record.id);
    const adapted = scoringInput(record, collection.asOf);
    Object.values(adapted.nutrients).forEach(m => delete m.state);
    for (const key of ["url", "documentTitle", "description", "provision", "labelVersion"]) delete adapted.source[key];
    assert.deepEqual(adapted, original.input, `Archive adapter drift: ${record.id}`);
    assert.deepEqual(report.records[i].eligibility.engineRejectionReasons, original.result.reasons);
    assert.equal(report.records[i].eligibility.eligible, original.result.eligible);
    assert.equal(report.records[i].result.experimentalRawScore, original.result.experimentalRawScore);
  });
  return collection;
}

module.exports = { importArchive, digest };

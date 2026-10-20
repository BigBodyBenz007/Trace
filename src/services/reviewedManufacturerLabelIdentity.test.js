// Every product, publisher, review and label in these tests is SYNTHETIC.
const { evaluateExperimentalUsNutrition: evaluate } = require("./experimentalUsNutritionScoring");
const { REVIEWED_US_LABEL } = require("./reviewedManufacturerLabelIdentity");
const { createSyntheticInput } = require("./__fixtures__/experimentalUsNutritionScoring.cjs");

function label() {
  const input = createSyntheticInput("plain-yogurt");
  input.product.gtin = null;
  input.source.product = { ...input.product };
  input.review.product = { ...input.product };
  input.source.kind = "manufacturer-label";
  input.source.provider = "SYNTHETIC manufacturer";
  input.source.artifact.locator = "https://manufacturer.example/synthetic-label";
  input.review.kind = "independent-label-review";
  input.review.decision = "label-suitable-for-research-assessment";
  input.source.formulationId = input.review.formulationId = "synthetic-US-plain-yogurt-as-sold";
  const prefix = "synthetic-panel.nutrition";
  input.basis.field = `${prefix}.serving`;
  for (const [key, m] of Object.entries(input.nutrients)) m.field = `${prefix}.${key}`;
  input.identity = { schemaVersion: 1, type: REVIEWED_US_LABEL, observationId: "synthetic-observation-1",
    formulationId: input.source.formulationId,
    manufacturer: { name: input.source.provider, officialUrl: "https://manufacturer.example/", status: "reviewed-official-source" },
    panel: { id: "synthetic-panel", nutritionField: prefix, ingredientsField: "synthetic-panel.ingredients",
      presentationField: "synthetic-panel.presentation", presentationStatus: "reviewed-specific-presentation",
      ingredientsStatus: "reviewed-same-formulation", market: "US", marketField: "synthetic-regional-source.market",
      marketStatement: "SYNTHETIC controlled US source evidence, not a real manufacturer claim", marketStatus: "reviewed-US-formulation",
      sourceId: input.source.id, sourceEdition: input.source.edition,
      artifactId: input.source.artifact.id, artifactSha256: input.source.artifact.sha256 },
    review: { status: "completed", reviewerId: input.review.reviewerId, reviewerType: "automated-document-review",
      reviewedOn: input.review.reviewedOn, evidenceStatus: "direct-manufacturer-label",
      notes: "SYNTHETIC test evidence; no real label, review or manufacturer verification asserted" } };
  return input;
}

function rejected(input, code) {
  const result = evaluate(input);
  expect(result.eligible).toBe(false);
  if (code) expect(result.reasonCodes).toContain(code);
  expect(result.experimentalRawScore).toBeNull(); expect(result.experimentalScore).toBeNull();
  expect(result.components).toBeNull(); expect(result.contributions).toBeNull();
  expect(result.grade).toBeNull(); expect(result.scoreReady).toBe(false);
  if (input.identity?.type === REVIEWED_US_LABEL) {
    expect(result.assessmentIdentity.assessmentEligible).toBe(false);
    expect(result.assessmentIdentity.scanMatch.eligible).toBe(false);
  }
  return result;
}

test("reviewed synthetic US label with explicit unknown GTIN qualifies only for research assessment", () => {
  const input = label(), before = JSON.stringify(input), result = evaluate(input);
  expect(result.eligible).toBe(true);
  expect(result.grade).toBeNull(); expect(result.scoreReady).toBe(false);
  expect(result.explanationInputs.product.gtin).toBeNull();
  expect(result.assessmentIdentity).toMatchObject({ type: REVIEWED_US_LABEL, assessmentEligible: true,
    scanMatch: { eligible: false, status: "not-established" } });
  expect(result.explanationInputs.reviewedLabelIdentity).toEqual(input.identity);
  expect(JSON.stringify(input)).toBe(before);
  expect(Object.isFrozen(input.identity)).toBe(false);
  expect(Object.isFrozen(result.explanationInputs.reviewedLabelIdentity)).toBe(true);
  expect(evaluate(input)).toEqual(result);
});

test("a supplied valid GTIN never promotes a label review to scan matching", () => {
  const input = label();
  for (const product of [input.product, input.source.product, input.review.product]) product.gtin = "00012345600012";
  input.scanMatch = { eligible: true, barcode: "00012345600012" };
  input.identity.scanMatchEligible = true;
  const result = evaluate(input);
  expect(result.eligible).toBe(true); expect(result.assessmentIdentity.scanMatch.eligible).toBe(false);
});

test("legacy identity is unchanged and cannot gain a null-GTIN route implicitly", () => {
  const original = createSyntheticInput("plain-yogurt"), oldResult = evaluate(original);
  expect(oldResult.eligible).toBe(true); expect(oldResult.assessmentIdentity).toBeUndefined();
  const input = label(); delete input.identity;
  input.review.decision = "matched-product-market-and-label";
  rejected(input, "product-identity-incomplete");
});

test("same nutrition produces exactly the same arithmetic across identity routes", () => {
  const result = evaluate(label()), legacy = evaluate(createSyntheticInput("plain-yogurt"));
  for (const key of ["experimentalRawScore", "experimentalScore", "components", "contributions", "fiberAdjustment", "categoryRules"]) {
    expect(result[key]).toEqual(legacy[key]);
  }
});

test.each([
  ["unreviewed page", i => { i.identity.review.status = "pending"; }, "manufacturer-label-review-incomplete"],
  ["review status omitted", i => { delete i.identity.review; }, "manufacturer-label-review-incomplete"],
  ["source missing", i => { delete i.source; }, "reviewed-manufacturer-source-missing"],
  ["provider only", i => { i.source.kind = "provider-observation"; }, "reviewed-manufacturer-source-missing"],
  ["retailer only", i => { i.source.kind = "retailer-label"; }, "reviewed-manufacturer-source-missing"],
  ["package only", i => { i.source.kind = "package-label"; }, "reviewed-manufacturer-source-missing"],
  ["manufacturer unverified", i => { i.identity.manufacturer.status = "accessible-url-only"; }, "reviewed-manufacturer-source-missing"],
  ["manufacturer mismatch", i => { i.identity.manufacturer.name = "another manufacturer"; }, "reviewed-manufacturer-source-missing"],
  ["insecure publisher", i => { i.identity.manufacturer.officialUrl = "http://manufacturer.example"; }, "invalid-manufacturer-url"],
  ["unbound external asset", i => { i.source.artifact.locator = "https://other.example/label"; }, "official-artifact-link-unverified"],
  ["GTIN omitted", i => { delete i.product.gtin; }, "product-identity-incomplete"],
  ["fabricated GTIN", i => { i.product.gtin = "label:something"; }, "invalid-gtin"],
  ["variant missing", i => { i.product.variant = null; }, "product-identity-incomplete"],
  ["presentation missing", i => { i.product.packageDescription = null; }, "product-identity-incomplete"],
  ["formulation missing", i => { i.identity.formulationId = null; }, "label-identity-incomplete"],
  ["formulation mismatched", i => { i.source.formulationId += ":different"; }, "label-formulation-binding-mismatch"],
  ["unknown market", i => { i.product.market = null; }, "us-label-market-unverified"],
  ["international formulation", i => { i.product.market = "NZ"; }, "outside-initial-US-product-scope"],
  ["unknown market evidence", i => { i.identity.panel.marketStatus = "unknown"; }, "us-label-market-unverified"],
  ["ingredients unreviewed", i => { i.identity.panel.ingredientsStatus = "unknown"; }, "label-formulation-unverified"],
  ["presentation unreviewed", i => { i.identity.panel.presentationStatus = "unknown"; }, "label-formulation-unverified"],
  ["ingredient evidence absent", i => { delete i.identity.panel.ingredientsField; }, "label-panel-evidence-incomplete"],
  ["source edition mismatch", i => { i.identity.panel.sourceEdition = "another-edition"; }, "label-panel-source-mismatch"],
  ["artifact mismatch", i => { i.identity.panel.artifactSha256 = "a".repeat(64); }, "label-panel-source-mismatch"],
  ["reviewer absent", i => { i.identity.review.reviewerId = null; }, "manufacturer-label-review-incomplete"],
  ["reviewer mismatch", i => { i.identity.review.reviewerId += ":different"; }, "label-review-binding-mismatch"],
  ["wrong review date binding", i => { i.identity.review.reviewedOn = "2026-10-18"; }, "label-review-binding-mismatch"],
  ["unverified evidence", i => { i.identity.review.evidenceStatus = "provider-reported"; }, "manufacturer-label-review-incomplete"],
  ["mixed nutrient panel", i => { i.nutrients.sodium.field = "another-panel.nutrition.sodium"; }, "label-nutrition-panel-mismatch"],
  ["mixed serving panel", i => { i.basis.field = "another-panel.nutrition.serving"; }, "label-nutrition-panel-mismatch"],
  ["different source product", i => { i.source.product.variant = "different flavor"; }, "source-product-mismatch"],
  ["different review product", i => { i.review.product.market = "CA"; }, "review-product-mismatch"],
  ["future identity schema", i => { i.identity.schemaVersion = 99; }, "unsupported-label-identity"],
  ["conflicts", i => { i.sourceState.unresolvedConflicts.push("SYNTHETIC competing panel conflict"); }, "conflicting-data"],
  ["unknown unit", i => { i.nutrients.sodium.unit = "%DV"; }, "unsupported-unit"],
  ["bad serving conversion", i => { i.basis.unit = "cup"; }, "unsupported-reference-unit"],
  ["cross dimension", i => { i.basis.unit = "ml"; }, "category-basis-mismatch"],
  ["unsupported category", i => { i.product.category = "nuts"; }, "unsupported-category"],
  ["contradictory sugar", i => { i.nutrients.addedSugar.value = 10; }, "added-sugars-exceed-total"],
  ["expired review", i => { i.asOf = "2027-10-19"; }, "review-expired"],
  ["stale source", i => { i.sourceState.cacheStale = true; }, "stale-source"],
])("synthetic reviewed-label rejection: %s", (_, mutate, code) => {
  const input = label(); mutate(input); rejected(input, code);
});

test.each(["calories", "saturatedFat", "addedSugar", "totalSugar", "sodium", "fiber", "protein", "fat", "carbohydrates"])(
  "reviewed identity never supplies missing %s", key => {
    const input = label(); input.nutrients[key].value = null;
    rejected(input, key === "addedSugar" ? "added-sugars-missing" : "required-nutrient-missing");
  });

test("reviewed CDN evidence supports an explicit official page-to-artifact link", () => {
  const input = label(); input.source.artifact.locator = "https://cdn.example/synthetic-label.png";
  input.identity.officialArtifactLink = { officialPageUrl: "https://manufacturer.example/product",
    artifactUrl: input.source.artifact.locator, field: "synthetic-page.manufacturer-label-link",
    status: "reviewed-manufacturer-linked-artifact" };
  expect(evaluate(input).eligible).toBe(true);
  input.identity.officialArtifactLink.officialPageUrl = "https://other.example/product";
  rejected(input, "official-artifact-link-unverified");
});

test("bad scalar metadata cannot freeze input objects through rejected outputs", () => {
  const input = label(); input.identity.observationId = { malformed: true };
  input.identity.review.reviewerId = { malformed: true };
  rejected(input, "label-identity-incomplete");
  expect(Object.isFrozen(input.identity.observationId)).toBe(false);
  expect(Object.isFrozen(input.identity.review.reviewerId)).toBe(false);
});

test("unknown route cannot silently fall back to the legacy GTIN route", () => {
  const input = createSyntheticInput(); input.identity = { type: "unreviewed" };
  rejected(input, "unsupported-identity-type");
});

test("non-JSON identity metadata rejects without leaking a score or throwing", () => {
  const input = label(); input.identity.circular = input.identity;
  rejected(input, "non-json-label-identity");
  expect(Object.isFrozen(input.identity)).toBe(false);
});

// Pure research identity validation. No lookup, network, storage or scan matcher.
const REVIEWED_US_LABEL = "reviewed_us_manufacturer_label";
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = value => typeof value === "string" && value.trim().length > 0 && value.length <= 2048;
const hash = value => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

function officialUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch { return null; }
}

function validateReviewedManufacturerLabelIdentity(input) {
  const reasons = [];
  const add = (status, code, path) => reasons.push({ status, code, path });
  const missing = (code, path) => add("not-enough-data", code, path);
  const invalid = (code, path) => add("invalid-data", code, path);
  const reviewNeeded = (code, path) => add("needs-review", code, path);
  const identity = object(input.identity) ? input.identity : {};
  const source = object(input.source) ? input.source : {};
  const review = object(input.review) ? input.review : {};
  const product = object(input.product) ? input.product : {};
  const panel = object(identity.panel) ? identity.panel : {};
  const manufacturer = object(identity.manufacturer) ? identity.manufacturer : {};
  const identityReview = object(identity.review) ? identity.review : {};
  try { JSON.stringify(identity); }
  catch { invalid("non-json-label-identity", "identity"); }
  if (identity.schemaVersion !== 1 || identity.type !== REVIEWED_US_LABEL) invalid("unsupported-label-identity", "identity");
  for (const key of ["observationId", "formulationId"]) {
    if (!text(identity[key])) missing("label-identity-incomplete", `identity.${key}`);
  }
  if (source.kind !== "manufacturer-label" || manufacturer.status !== "reviewed-official-source"
    || !text(manufacturer.name) || manufacturer.name !== source.provider) {
    missing("reviewed-manufacturer-source-missing", "identity.manufacturer");
  }
  const publisher = officialUrl(manufacturer.officialUrl), artifact = officialUrl(source.artifact?.locator);
  if (!publisher) invalid("invalid-manufacturer-url", "identity.manufacturer.officialUrl");
  // External hosted assets need a separately reviewed publisher-to-asset link.
  // A URL's accessibility or domain name alone never grants review status.
  if (publisher && artifact && publisher.origin !== artifact.origin) {
    const link = identity.officialArtifactLink;
    const page = officialUrl(link?.officialPageUrl);
    if (!object(link) || !page || page.origin !== publisher.origin || link.artifactUrl !== source.artifact.locator
      || link.status !== "reviewed-manufacturer-linked-artifact" || !text(link.field)) {
      missing("official-artifact-link-unverified", "identity.officialArtifactLink");
    }
  }
  for (const key of ["id", "nutritionField", "ingredientsField", "presentationField", "marketField", "marketStatement"]) {
    if (!text(panel[key])) missing("label-panel-evidence-incomplete", `identity.panel.${key}`);
  }
  if (panel.market !== "US" || product.market !== "US" || panel.marketStatus !== "reviewed-US-formulation") {
    missing("us-label-market-unverified", "identity.panel.market");
  }
  if (panel.ingredientsStatus !== "reviewed-same-formulation" || panel.presentationStatus !== "reviewed-specific-presentation") {
    missing("label-formulation-unverified", "identity.panel");
  }
  if (panel.sourceId !== source.id || panel.sourceEdition !== source.edition || panel.artifactId !== source.artifact?.id
    || !hash(panel.artifactSha256) || panel.artifactSha256?.toLowerCase() !== source.artifact?.sha256?.toLowerCase()) {
    reviewNeeded("label-panel-source-mismatch", "identity.panel");
  }
  if (!text(identity.formulationId) || identity.formulationId !== source.formulationId || identity.formulationId !== review.formulationId) {
    reviewNeeded("label-formulation-binding-mismatch", "identity.formulationId");
  }
  if (text(panel.nutritionField)) {
    const prefix = `${panel.nutritionField}.`;
    if (!text(input.basis?.field) || !input.basis.field.startsWith(prefix)) {
      reviewNeeded("label-nutrition-panel-mismatch", "basis.field");
    }
    // Completeness/amounts/units still belong to the unchanged nutrient checks.
    for (const [key, nutrient] of Object.entries(object(input.nutrients) ? input.nutrients : {})) {
      if (!text(nutrient?.field) || !nutrient.field.startsWith(prefix)) {
        reviewNeeded("label-nutrition-panel-mismatch", `nutrients.${key}.field`);
      }
    }
  }
  if (identityReview.status !== "completed" || identityReview.evidenceStatus !== "direct-manufacturer-label"
    || !["human", "automated-document-review"].includes(identityReview.reviewerType)
    || !text(identityReview.reviewerId) || !text(identityReview.notes)) {
    missing("manufacturer-label-review-incomplete", "identity.review");
  }
  if (identityReview.reviewerId !== review.reviewerId || identityReview.reviewedOn !== review.reviewedOn) {
    reviewNeeded("label-review-binding-mismatch", "identity.review");
  }
  if (review.decision !== "label-suitable-for-research-assessment") missing("manufacturer-label-review-incomplete", "review.decision");
  return reasons;
}

function labelIdentityResult(input, eligible) {
  const scalar = value => typeof value === "string" ? value : null;
  return { type: REVIEWED_US_LABEL, schemaVersion: 1, observationId: scalar(input.identity?.observationId),
    formulationId: scalar(input.identity?.formulationId), assessmentEligible: eligible,
    scanMatch: { eligible: false, status: "not-established", reason: "label-review-does-not-establish-scanned-product-match" },
    review: { reviewerId: scalar(input.identity?.review?.reviewerId),
      reviewerType: scalar(input.identity?.review?.reviewerType), status: scalar(input.identity?.review?.status) } };
}

module.exports = { REVIEWED_US_LABEL, validateReviewedManufacturerLabelIdentity, labelIdentityResult };

// INTERNAL RESEARCH ONLY. No imports, storage, I/O, runtime clock or public grade.
const METHOD_ID = "trace-us-nutrient-profile";
const METHOD_VERSION = "0.1-research-A";
const UNITS = Object.freeze({ calories: "kcal", saturatedFat: "g", addedSugar: "g",
  totalSugar: "g", sodium: "mg", fiber: "g", protein: "g", fat: "g", carbohydrates: "g" });
const PRODUCT_FIELDS = ["gtin", "name", "brand", "variant", "packageDescription",
  "preparation", "preparationDescription", "market", "category"];
const CATEGORIES = Object.freeze({
  produce: "solid", "breakfast-cereal": "solid", "spoonable-yogurt": "solid",
  "conventional-protein-bar": "solid", "frozen-meal": "solid", "processed-meat": "solid",
  legumes: "solid", "refined-starch": "solid", "sugar-sweetened-beverage": "beverage",
  juice: "beverage", "dairy-beverage": "beverage", "plant-beverage": "beverage",
});
const MASS_GRAMS = new Map([["g", 1], ["mg", .001], ["mcg", .000001],
  ["ug", .000001], ["µg", .000001], ["μg", .000001]]);
const DAY = 86400000;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value, max = 512) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const hash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

function freeze(value) {
  if (object(value) || Array.isArray(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function date(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}

function gtin(value) {
  if (typeof value !== "string" || !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return null;
  let sum = 0;
  for (let index = value.length - 2, weight = 3; index >= 0; index--, weight = 4 - weight) {
    sum += Number(value[index]) * weight;
  }
  return (10 - sum % 10) % 10 === Number(value[value.length - 1]) ? value.padStart(14, "0") : null;
}

function sameProduct(left, right) {
  return object(left) && object(right) && gtin(left.gtin) !== null && gtin(left.gtin) === gtin(right.gtin)
    && PRODUCT_FIELDS.filter((key) => key !== "gtin").every((key) => left[key] === right[key]);
}

function productCopy(product) {
  return Object.fromEntries(PRODUCT_FIELDS.map((key) => [key, product[key]]));
}

function completeProduct(product) {
  return object(product) && PRODUCT_FIELDS.every((key) => text(product[key])) && gtin(product.gtin) !== null;
}

function assess(input) {
  const reasons = [];
  const add = (status, code, path) => reasons.push({ status, code, path });
  const missing = (code, path) => add("not-enough-data", code, path);
  const invalid = (code, path) => add("invalid-data", code, path);
  const reviewNeeded = (code, path) => add("needs-review", code, path);
  const requireText = (value, path) => { if (!text(value)) missing("provenance-incomplete", path); };
  const requireDate = (value, path) => {
    if (value === null || value === undefined) missing("review-date-missing", path);
    else if (date(value) === null) invalid("invalid-date", path);
  };
  if (!object(input)) return { reasons: [{ status: "invalid-data", code: "input-not-object", path: "input" }] };
  if (input.methodId !== METHOD_ID || input.methodVersion !== METHOD_VERSION) invalid("unsupported-method", "methodVersion");
  requireDate(input.asOf, "asOf");
  const product = object(input.product) ? input.product : {};
  for (const key of PRODUCT_FIELDS) {
    if (!text(product[key])) missing(key === "market" ? "us-formulation-unverified"
      : ["category", "preparation", "preparationDescription"].includes(key)
        ? "category-or-preparation-unknown" : "product-identity-incomplete", `product.${key}`);
  }
  if (text(product.gtin) && gtin(product.gtin) === null) invalid("invalid-gtin", "product.gtin");
  if (text(product.market) && product.market !== "US") {
    if (/^[A-Z]{2}$/.test(product.market) && !["XX", "ZZ"].includes(product.market)) {
      add("not-applicable", "outside-initial-US-product-scope", "product.market");
    } else missing("us-formulation-unverified", "product.market");
  }
  const category = own(CATEGORIES, product.category) ? CATEGORIES[product.category] : null;
  if (text(product.category) && !category) {
    if (["unknown", "unresolved"].includes(product.category)) missing("category-or-preparation-unknown", "product.category");
    else add("not-applicable", "unsupported-category", "product.category");
  }
  if (text(product.preparation) && !["as-sold", "as-prepared"].includes(product.preparation)) {
    missing("category-or-preparation-unknown", "product.preparation");
  }

  const source = object(input.source) ? input.source : {};
  const review = object(input.review) ? input.review : {};
  for (const field of ["id", "provider", "recordId", "edition", "attribution"]) requireText(source[field], `source.${field}`);
  const artifact = object(source.artifact) ? source.artifact : {};
  for (const field of ["id", "locator"]) requireText(artifact[field], `source.artifact.${field}`);
  if (!hash(artifact.sha256)) missing("provenance-incomplete", "source.artifact.sha256");
  if (!["synthetic-reference", "package-label", "manufacturer-label"].includes(source.kind)) {
    missing("primary-label-evidence-missing", "source.kind");
  }
  if (source.kind === "manufacturer-label") {
    try {
      const url = new URL(artifact.locator);
      if (url.protocol !== "https:" || url.username || url.password) invalid("invalid-source-locator", "source.artifact.locator");
    } catch (error) { invalid("invalid-source-locator", "source.artifact.locator"); }
  }
  if (!completeProduct(source.product)) missing("provenance-incomplete", "source.product");
  else if (completeProduct(product) && !sameProduct(product, source.product)) reviewNeeded("source-product-mismatch", "source.product");
  for (const field of ["id", "reviewerId", "notes", "sourceId", "sourceEdition", "artifactId"]) requireText(review[field], `review.${field}`);
  if (!hash(review.artifactSha256)) missing("provenance-incomplete", "review.artifactSha256");
  if ([review.sourceId, review.sourceEdition, review.artifactId, source.id, source.edition, artifact.id].every((value) => text(value))
    && hash(review.artifactSha256) && hash(artifact.sha256)
    && (review.sourceId !== source.id || review.sourceEdition !== source.edition || review.artifactId !== artifact.id
    || review.artifactSha256.toLowerCase() !== artifact.sha256.toLowerCase())) {
    reviewNeeded("review-source-binding-mismatch", "review");
  }
  if (!completeProduct(review.product)) missing("provenance-incomplete", "review.product");
  else if (completeProduct(product) && !sameProduct(product, review.product)) reviewNeeded("review-product-mismatch", "review.product");
  const expectedReview = source.kind === "synthetic-reference" ? "synthetic-controlled" : "independent-label-review";
  if (review.kind !== expectedReview || review.decision !== "matched-product-market-and-label") {
    missing("us-formulation-unverified", "review.decision");
  }
  if (review.consistency !== "reviewed-no-unresolved-conflict") missing("consistency-review-missing", "review.consistency");
  if (product.preparation === "as-prepared") {
    const preparation = source.preparationEvidence;
    if (!object(preparation) || !text(preparation.instructions) || preparation.includesAllAdditions !== true
      || !Number.isFinite(preparation.finalAmount) || preparation.finalAmount <= 0
      || preparation.finalUnit !== (category === "beverage" ? "ml" : "g")) {
      missing("preparation-evidence-incomplete", "source.preparationEvidence");
    }
  }

  requireDate(source.retrievedOn, "source.retrievedOn");
  for (const field of ["publishedOn", "revisionOn"]) {
    if (source[field] === undefined) missing("provenance-incomplete", `source.${field}`);
    else if (source[field] !== null && date(source[field]) === null) invalid("invalid-date", `source.${field}`);
  }
  if (date(source.publishedOn) !== null && date(source.revisionOn) !== null
    && date(source.revisionOn) < date(source.publishedOn)) reviewNeeded("inconsistent-source-dates", "source.revisionOn");
  for (const field of ["labelObservedOn", "reviewedOn", "reviewDueOn"]) requireDate(review[field], `review.${field}`);
  const observed = date(review.labelObservedOn), reviewed = date(review.reviewedOn);
  const due = date(review.reviewDueOn), asOf = date(input.asOf), retrieved = date(source.retrievedOn);
  if (observed !== null && reviewed !== null && observed > reviewed) reviewNeeded("inconsistent-review-dates", "review.reviewedOn");
  if (observed !== null && due !== null && (due < observed || due > observed + 365 * DAY)) invalid("invalid-review-deadline", "review.reviewDueOn");
  if (asOf !== null) {
    for (const [path, time] of [["review.labelObservedOn", observed], ["review.reviewedOn", reviewed], ["source.retrievedOn", retrieved]]) {
      if (time !== null && time > asOf) reviewNeeded("future-source-or-review-date", path);
    }
    if (due !== null && asOf >= due) reviewNeeded("review-expired", "review.reviewDueOn");
  }
  if (observed !== null && retrieved !== null && retrieved < observed) reviewNeeded("inconsistent-source-dates", "source.retrievedOn");
  for (const field of ["publishedOn", "revisionOn"]) {
    const time = date(source[field]);
    if (time !== null && observed !== null && time > observed) reviewNeeded("source-edition-postdates-observation", `source.${field}`);
    if (time !== null && asOf !== null && time > asOf) reviewNeeded("future-source-or-review-date", `source.${field}`);
  }
  const state = object(input.sourceState) ? input.sourceState : {};
  for (const field of ["cacheStale", "superseded"]) {
    if (typeof state[field] !== "boolean") missing("source-state-unknown", `sourceState.${field}`);
    else if (state[field]) reviewNeeded(field === "cacheStale" ? "stale-source" : "superseded-source", `sourceState.${field}`);
  }
  if (!Array.isArray(state.unresolvedConflicts)) missing("source-state-unknown", "sourceState.unresolvedConflicts");
  else if (state.unresolvedConflicts.length) reviewNeeded("conflicting-data", "sourceState.unresolvedConflicts");

  const basis = object(input.basis) ? input.basis : {};
  if (basis.sourceId !== source.id || basis.sourceEdition !== source.edition || !text(basis.field)) missing("basis-provenance-incomplete", "basis");
  let referenceScale = null;
  if (!["100g", "100ml", "serving"].includes(basis.kind)) missing("reference-basis-unknown", "basis.kind");
  if (basis.amount === null || basis.amount === undefined) missing("reference-basis-unknown", "basis.amount");
  else if (!Number.isFinite(basis.amount) || basis.amount <= 0) invalid("invalid-reference-quantity", "basis.amount");
  const dimension = basis.unit === "g" ? "solid" : basis.unit === "ml" ? "beverage" : null;
  if (!dimension) missing("unsupported-reference-unit", "basis.unit");
  if (category && dimension && category !== dimension) invalid("category-basis-mismatch", "basis.unit");
  if ((basis.kind === "100g" && (basis.amount !== 100 || basis.unit !== "g"))
    || (basis.kind === "100ml" && (basis.amount !== 100 || basis.unit !== "ml"))) invalid("inconsistent-reference-basis", "basis");
  if (Number.isFinite(basis.amount) && basis.amount > 0) referenceScale = 100 / basis.amount;

  const nutrients = {}, originals = {}, transformations = [];
  const measurements = object(input.nutrients) ? input.nutrients : {};
  for (const [key, target] of Object.entries(UNITS)) {
    const path = `nutrients.${key}`, measurement = measurements[key];
    if (!object(measurement) || measurement.value === null || measurement.value === undefined) {
      missing(key === "addedSugar" ? "added-sugars-missing" : "required-nutrient-missing", path);
      continue;
    }
    if (!Number.isFinite(measurement.value) || measurement.value < 0) { invalid("invalid-nutrient-value", `${path}.value`); continue; }
    if (measurement.sourceId !== source.id || measurement.sourceEdition !== source.edition || !text(measurement.field)) missing("nutrient-provenance-incomplete", path);
    const unit = typeof measurement.unit === "string" ? measurement.unit.trim().toLowerCase() : "";
    const factor = target === "kcal" ? (unit === "kcal" ? 1 : unit === "kj" ? 1 / 4.184 : null)
      : MASS_GRAMS.has(unit) ? MASS_GRAMS.get(unit) * (target === "mg" ? 1000 : 1) : null;
    if (factor === null) { missing("unsupported-unit", `${path}.unit`); continue; }
    const amount = measurement.value * factor * referenceScale;
    if (referenceScale === null) continue;
    if (!Number.isFinite(amount) || (measurement.value > 0 && amount === 0)) { invalid("unrepresentable-transformation", path); continue; }
    nutrients[key] = amount;
    originals[key] = { value: measurement.value, unit: measurement.unit, sourceId: measurement.sourceId,
      sourceEdition: measurement.sourceEdition, field: measurement.field };
    transformations.push({ nutrient: key, unitFactor: factor, referenceFactor: referenceScale, value: amount, unit: target });
  }
  if (nutrients.addedSugar > nutrients.totalSugar) invalid("added-sugars-exceed-total", "nutrients.addedSugar");
  if (nutrients.saturatedFat > nutrients.fat) invalid("saturates-exceed-total-fat", "nutrients.saturatedFat");
  return { reasons, product, source, review, artifact, category, basis, nutrients, originals, transformations };
}

function calculate(nutrients) {
  const clip = (value) => Math.min(1, Math.max(0, value));
  const a = clip(nutrients.addedSugar / 10), s = clip(nutrients.saturatedFat / 4);
  const n = clip(nutrients.sodium / 460), f = clip(nutrients.fiber / 5.6);
  const weight = 1 / 3;
  const meanBurden = weight * a + weight * s + weight * n, worstBurden = Math.max(a, s, n);
  const R = .5 * meanBurden + .5 * worstBurden, fiberFactor = .8 + .2 * f;
  const exact = 100 * (1 - R) * fiberFactor;
  return {
    experimentalRawScore: exact, experimentalScore: Math.floor(exact + .5),
    components: { addedSugarBurden: a, saturatedFatBurden: s, sodiumBurden: n,
      fiberFraction: f, meanBurden, worstBurden, combinedBurden: R,
      strongestComponents: [["addedSugar", a], ["saturatedFat", s], ["sodium", n]]
        .filter(([, value]) => value === worstBurden).map(([key]) => key) },
    fiberAdjustment: { factor: fiberFactor, maximumFactor: 1, pointsAboveNoFiber: 20 * (1 - R) * f },
    contributions: { start: 100, fiberGap: 20 * (1 - f), addedSugarLoss: 50 * fiberFactor * weight * a,
      saturatedFatLoss: 50 * fiberFactor * weight * s, sodiumLoss: 50 * fiberFactor * weight * n,
      strongestComponentLoss: 50 * fiberFactor * worstBurden },
  };
}

function evaluateExperimentalUsNutrition(input) {
  let assessment;
  try { assessment = assess(input); } catch (error) {
    assessment = { reasons: [{ status: "invalid-data", code: "malformed-input", path: "input" }] };
  }
  const { reasons } = assessment;
  const status = ["invalid-data", "needs-review", "not-enough-data", "not-applicable"]
    .find((value) => reasons.some((reason) => reason.status === value)) || "eligible-for-research";
  const warnings = ["experimental-not-scientifically-validated", "not-a-complete-food-quality-assessment",
    "food-matrix-and-fat-quality-not-scored", "no-consumer-grade"];
  const output = { methodId: METHOD_ID, methodVersion: METHOD_VERSION, methodStatus: "research-not-frozen",
    grade: null, scoreReady: false, inputStatus: status, eligible: reasons.length === 0,
    reasons, reasonCodes: [...new Set(reasons.map((reason) => reason.code))], warnings,
    experimentalRawScore: null, experimentalScore: null, components: null, fiberAdjustment: null,
    contributions: null, explanationInputs: null, categoryRules: null };
  if (!output.eligible) return freeze(output);
  const { product, source, review, artifact, category, basis, nutrients, originals, transformations } = assessment;
  warnings.push(source.kind === "synthetic-reference" ? "explicitly-synthetic-input" : "reported-label-values-may-be-rounded");
  if (category === "beverage") warnings.push("beverage-dilution-and-portion-limitations");
  if (product.category === "juice") warnings.push("added-sugar-profile-does-not-assess-whole-fruit-equivalence");
  if (product.category === "spoonable-yogurt") warnings.push("fiber-adjustment-has-dairy-category-limitations");
  return freeze({ ...output, ...calculate(nutrients),
    categoryRules: { category: product.category, comparisonClass: category === "solid" ? "solid-per-100g" : "beverage-per-100ml",
      method: "candidate-A-unmodified", consumerApproved: false, energyPenalty: false, proteinCredit: false, additivePenalty: false },
    explanationInputs: {
      asOf: input.asOf, product: productCopy(product),
      basis: { kind: category === "solid" ? "100g" : "100ml", amount: 100, unit: category === "solid" ? "g" : "ml" },
      originalBasis: { kind: basis.kind, amount: basis.amount, unit: basis.unit, sourceId: basis.sourceId,
        sourceEdition: basis.sourceEdition, field: basis.field },
      canonicalNutrients: { ...nutrients }, originalNutrients: originals, transformations,
      sourceBindings: { sourceId: source.id, provider: source.provider, recordId: source.recordId,
        edition: source.edition, kind: source.kind, attribution: source.attribution,
        artifact: { id: artifact.id, locator: artifact.locator, sha256: artifact.sha256 },
        retrievedOn: source.retrievedOn, revisionOn: source.revisionOn, publishedOn: source.publishedOn,
        reviewId: review.id, reviewerId: review.reviewerId, reviewNotes: review.notes,
        labelObservedOn: review.labelObservedOn, reviewedOn: review.reviewedOn, reviewDueOn: review.reviewDueOn,
        ...(product.preparation === "as-prepared" ? { preparationEvidence: {
          instructions: source.preparationEvidence.instructions, finalAmount: source.preparationEvidence.finalAmount,
          finalUnit: source.preparationEvidence.finalUnit, includesAllAdditions: true,
        } } : {}) },
    },
  });
}

module.exports = { METHOD_ID, METHOD_VERSION, REQUIRED_NUTRIENT_UNITS: UNITS, evaluateExperimentalUsNutrition };

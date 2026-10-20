// Offline research contract only. Never imported by application code.
const { METHOD_ID, METHOD_VERSION, REQUIRED_NUTRIENT_UNITS, evaluateExperimentalUsNutrition } =
  require("../../src/services/experimentalUsNutritionScoring");

const VERSION = 1;
const KEYS = Object.keys(REQUIRED_NUTRIENT_UNITS);
const MASS = new Map([["g", 1], ["mg", .001], ["mcg", .000001], ["ug", .000001], ["µg", .000001], ["μg", .000001]]);
const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const text = v => typeof v === "string" && v.trim().length > 0;
const own = (v, k) => Object.prototype.hasOwnProperty.call(v || {}, k);
const copy = v => JSON.parse(JSON.stringify(v));
const hash = v => typeof v === "string" && /^[a-f0-9]{64}$/i.test(v);
const nonnegative = v => typeof v === "number" && Number.isFinite(v) && v >= 0;

function date(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const t = Date.parse(`${v}T00:00:00.000Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v ? t : null;
}

function canonicalGtin(v) {
  if (typeof v !== "string" || !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(v)) return null;
  let sum = 0;
  for (let i = v.length - 2, w = 3; i >= 0; i--, w = 4 - w) sum += Number(v[i]) * w;
  return (10 - sum % 10) % 10 === Number(v.at(-1)) ? v.padStart(14, "0") : null;
}

function https(v) {
  try { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password; }
  catch { return false; }
}

// Only the engine's documented nutrient conversions. No reference quantity,
// density, salt, percent-DV or sugar-type inference is performed here.
function canonicalValue(key, measurement) {
  if (!object(measurement) || !nonnegative(measurement.value)) return null;
  const factor = key === "calories" ? ({ kcal: 1, kJ: 1 / 4.184 })[measurement.unit]
    : MASS.get(measurement.unit) * (key === "sodium" ? 1000 : 1);
  const value = measurement.value * factor;
  return Number.isFinite(value) && !(measurement.value > 0 && value === 0) ? value : null;
}

function scoringInput(record, asOf) {
  const dataset = Array.isArray(record.datasets) ? record.datasets.find(d => object(d) && d.id === record.selectedDatasetId) : null;
  return { methodId: METHOD_ID, methodVersion: METHOD_VERSION, asOf,
    product: copy(record.product || {}), source: copy(record.source || {}),
    review: copy(record.review || {}), sourceState: copy(record.sourceState || {}),
    basis: copy(dataset?.basis || {}), nutrients: copy(dataset?.nutrients || {}) };
}

function validateRecord(record, asOf) {
  const issues = [];
  const add = (severity, code, path) => issues.push({ severity, code, path });
  const error = (code, path) => add("error", code, path);
  const warning = (code, path) => add("warning", code, path);
  const nullableText = (v, path) => { if (v !== null && !text(v)) error("expected-text-or-explicit-null", path); };
  const binding = (v, path) => {
    if (!object(v) || v.sourceId !== record.source?.id || v.sourceEdition !== record.source?.edition || !text(v.field)) {
      error("source-binding-invalid", path);
    }
  };
  if (!object(record)) return [{ severity: "error", code: "record-not-object", path: "record" }];
  if (record.schemaVersion !== VERSION) error("unsupported-intake-version", "schemaVersion");
  if (!text(record.id)) error("record-id-missing", "id");
  if (date(asOf) === null) error("invalid-as-of", "asOf");
  const p = record.product || {};
  if (!text(p.name)) error("product-name-missing", "product.name");
  for (const key of ["brand", "gtin", "packageDescription", "variant", "market", "category", "preparation", "preparationDescription"]) {
    nullableText(p[key], `product.${key}`);
  }
  if (p.gtin !== null && !canonicalGtin(p.gtin)) error("invalid-gtin", "product.gtin");
  if (p.gtin === null) warning("optional-gtin-unknown-scoring-still-requires-it", "product.gtin");
  const s = record.source || {};
  for (const key of ["id", "edition", "provider", "recordId", "kind", "attribution", "description", "provision"]) {
    if (!text(s[key])) error("source-attribution-incomplete", `source.${key}`);
  }
  nullableText(s.documentTitle, "source.documentTitle");
  if (!["manufacturer-label", "package-label", "retailer-label", "government-composition", "provider-observation", "synthetic-reference"].includes(s.kind)) {
    error("unsupported-source-kind", "source.kind");
  }
  if (!(s.kind === "package-label" && s.url === null) && !https(s.url)) error("invalid-source-url", "source.url");
  const locatorValid = s.kind === "package-label" ? text(s.artifact?.locator) : https(s.artifact?.locator);
  if (!object(s.artifact) || !text(s.artifact.id) || !locatorValid || !hash(s.artifact.sha256)) {
    error("artifact-provenance-incomplete", "source.artifact");
  }
  nullableText(s.labelVersion, "source.labelVersion");
  for (const key of ["retrievedOn", "publishedOn", "revisionOn"]) {
    if (s[key] === null && key !== "retrievedOn") warning("source-date-unknown", `source.${key}`);
    else if (date(s[key]) === null) error("invalid-source-date", `source.${key}`);
    else if (date(asOf) !== null && s[key] > asOf) error("future-source-date", `source.${key}`);
  }
  if (date(s.retrievedOn) !== null && [s.publishedOn, s.revisionOn].some(v => date(v) !== null && v > s.retrievedOn)) {
    error("source-date-after-retrieval", "source.retrievedOn");
  }
  const market = record.marketEvidence || {};
  if (!["matched-formulation", "us-oriented-observation", "unknown"].includes(market.verification)) {
    error("market-evidence-status-invalid", "marketEvidence.verification");
  }
  nullableText(market.statement, "marketEvidence.statement");
  if (market.verification !== "unknown") {
    binding(market, "marketEvidence");
    if (!text(market.statement) || market.claim !== p.market) error("market-evidence-inconsistent", "marketEvidence");
  } else if (market.claim !== null || p.market !== null) error("market-claim-without-evidence", "marketEvidence");
  if (record.review?.decision === "matched-product-market-and-label" && market.verification !== "matched-formulation") {
    error("formulation-review-unsupported", "marketEvidence.verification");
  }
  const serving = record.serving || {};
  nullableText(serving.description, "serving.description");
  const q = serving.quantity;
  if (!object(q) || (q.amount !== null && (!nonnegative(q.amount) || q.amount === 0))) error("invalid-serving-quantity", "serving.quantity");
  else { nullableText(q.unit, "serving.quantity.unit"); binding(q, "serving.quantity"); }
  if (!own(serving, "servingsPerContainer")) error("explicit-unknown-required", "serving.servingsPerContainer");
  else if (serving.servingsPerContainer !== null) {
    const c = serving.servingsPerContainer;
    if (!object(c) || !nonnegative(c.value) || c.value === 0 || !["exact", "about", null].includes(c.qualifier)) {
      error("invalid-servings-per-container", "serving.servingsPerContainer");
    } else binding(c, "serving.servingsPerContainer");
  }
  const datasets = record.datasets;
  if (!Array.isArray(datasets) || !datasets.length) error("datasets-missing", "datasets");
  const ids = new Set();
  for (const [i, d] of (Array.isArray(datasets) ? datasets : []).entries()) {
    const path = `datasets.${i}`;
    if (!object(d)) { error("dataset-not-object", path); continue; }
    if (!text(d.id) || ids.has(d.id)) error("duplicate-or-missing-dataset-id", `${path}.id`);
    ids.add(d.id);
    binding(d.basis, `${path}.basis`);
    const b = d.basis || {};
    if (!["serving", "100g", "100ml"].includes(b.kind)) error("unknown-reference-basis", `${path}.basis.kind`);
    if (b.amount !== null && (!nonnegative(b.amount) || b.amount === 0)) error("invalid-reference-amount", `${path}.basis.amount`);
    nullableText(b.unit, `${path}.basis.unit`);
    if (b.amount === null || !["g", "ml"].includes(b.unit)) warning("reference-conversion-unavailable", `${path}.basis`);
    if (b.kind === "serving" && object(q) && (b.amount !== q.amount || b.unit !== q.unit)) {
      error("serving-basis-mismatch", `${path}.basis`);
    }
    if (["100g", "100ml"].includes(b.kind) && (b.amount !== 100 || b.unit !== (b.kind === "100g" ? "g" : "ml"))) {
      error("inconsistent-reference-basis", `${path}.basis`);
    }
    if (!object(d.nutrients)) { error("nutrients-not-object", `${path}.nutrients`); continue; }
    for (const key of KEYS) {
      const m = d.nutrients[key], mp = `${path}.nutrients.${key}`;
      if (!object(m)) { error("explicit-nutrient-unknown-required", mp); continue; }
      binding(m, mp);
      if (!["reported", "missing", "not-numerically-declared", "ambiguous"].includes(m.state)) error("invalid-nutrient-state", `${mp}.state`);
      if (m.value !== null && !nonnegative(m.value)) error("invalid-nutrient-value", `${mp}.value`);
      if ((m.state === "reported") !== nonnegative(m.value)) error("nutrient-state-value-mismatch", mp);
      if (nonnegative(m.value) && canonicalValue(key, m) === null) error("unsupported-nutrient-conversion", `${mp}.unit`);
      if (!text(m.unit)) error("nutrient-unit-missing", `${mp}.unit`);
    }
    for (const [part, total] of [["addedSugar", "totalSugar"], ["saturatedFat", "fat"]]) {
      const a = canonicalValue(part, d.nutrients[part]), z = canonicalValue(total, d.nutrients[total]);
      if (a !== null && z !== null && a > z) error("contradictory-nutrient-values", `${path}.nutrients.${part}`);
    }
  }
  // Independently supplied datasets must reconcile before one is selected.
  // No unstated rounding tolerance is used to adjudicate different declarations.
  const comparable = (Array.isArray(datasets) ? datasets : []).filter(d => object(d) && object(d.basis)
    && nonnegative(d.basis.amount) && d.basis.amount > 0 && ["g", "ml"].includes(d.basis.unit));
  for (let i = 0; i < comparable.length; i++) for (let j = i + 1; j < comparable.length; j++) {
    const a = comparable[i], b = comparable[j];
    if (a.basis.unit !== b.basis.unit) { warning("cross-dimensional-datasets-not-compared", "datasets"); continue; }
    if (KEYS.some(k => {
      const x = canonicalValue(k, a.nutrients?.[k]), y = canonicalValue(k, b.nutrients?.[k]);
      return x !== null && y !== null && x * (100 / a.basis.amount) !== y * (100 / b.basis.amount);
    })) error("cross-dataset-reconciliation-required", "datasets");
  }
  if (!text(record.selectedDatasetId) || !ids.has(record.selectedDatasetId)) error("selected-dataset-missing", "selectedDatasetId");
  const ingredients = record.ingredients;
  if (!object(ingredients) || !["transcribed", "not-transcribed", "unknown"].includes(ingredients.status)) error("ingredients-state-invalid", "ingredients");
  else {
    nullableText(ingredients.text, "ingredients.text"); nullableText(ingredients.language, "ingredients.language");
    if (ingredients.status === "transcribed") {
      if (!text(ingredients.text)) error("ingredient-text-missing", "ingredients.text");
      binding(ingredients.provenance, "ingredients.provenance");
    } else if (ingredients.text !== null) error("ingredient-state-text-mismatch", "ingredients.text");
  }
  for (const key of ["foodGroups", "wholeGrains", "fatQuality"]) {
    if (!Array.isArray(record[key])) { error("evidence-array-required", key); continue; }
    record[key].forEach((claim, i) => {
      const path = `${key}.${i}`, e = claim?.provenance;
      if (!object(claim) || !text(claim.description) || !object(e) || !https(e.url) || !text(e.field)) {
        error("supplemental-evidence-incomplete", path); return;
      }
      if (!["source-bound", "archived-note-unverified"].includes(e.verification)) error("supplemental-verification-invalid", path);
      if (e.verification === "source-bound") {
        binding(e, path);
        if (e.artifactSha256 !== s.artifact?.sha256 || ![s.url, s.artifact?.locator].includes(e.url)) error("supplemental-artifact-mismatch", path);
      } else warning("supplemental-claim-not-independently-bound", path);
      if (claim.value !== null && (!nonnegative(claim.value) || !text(claim.unit) || !text(claim.basisDescription))) error("invalid-supplemental-quantity", path);
      if (!own(claim, "value") || !own(claim, "unit") || !own(claim, "basisDescription")) error("supplemental-explicit-unknown-required", path);
      if (key === "fatQuality" && claim.value !== null && canonicalValue("fat", claim) === null) error("unsupported-fat-quality-unit", path);
      if (key === "fatQuality" && !ids.has(claim.datasetId)) error("fat-quality-basis-unbound", path);
    });
  }
  if (!Array.isArray(record.recovery)) error("recovery-array-required", "recovery");
  else record.recovery.forEach((item, i) => {
    if (!object(item) || !text(item.field) || !text(item.reason) || !https(item.url)
      || !["documented-not-transcribed", "candidate-requires-verification", "not-numeric-in-observed-source"].includes(item.status)) {
      error("recovery-evidence-incomplete", `recovery.${i}`);
    } else if (item.status === "documented-not-transcribed") binding(item, `recovery.${i}`);
  });
  return issues;
}

function analyzeCollection(collection) {
  const rootIssues = [];
  if (!object(collection) || collection.schemaVersion !== VERSION || date(collection.asOf) === null || !Array.isArray(collection.records)) {
    return { schemaVersion: VERSION, grade: null, scoreReady: false, valid: false,
      issues: [{ severity: "error", code: "invalid-intake-collection", path: "collection" }], summary: null, records: [] };
  }
  if (collection.methodId !== METHOD_ID || collection.methodVersion !== METHOD_VERSION) {
    rootIssues.push({ severity: "error", code: "unsupported-method", path: "methodVersion" });
  }
  const reports = collection.records.map(record => ({
    id: record?.id ?? null, issues: validateRecord(record, collection.asOf),
    input: scoringInput(object(record) ? record : {}, collection.asOf),
  }));
  const flag = (i, code, path) => reports[i].issues.push({ severity: "error", code, path });
  const seen = new Map(), editions = new Map(), products = new Map();
  collection.records.forEach((record, i) => {
    if (!object(record)) return;
    if (seen.has(record.id)) {
      const j = seen.get(record.id);
      const code = JSON.stringify(record) === JSON.stringify(collection.records[j]) ? "duplicate-record" : "conflicting-record-id";
      flag(i, code, "id"); flag(j, code, "id");
    } else seen.set(record.id, i);
    const s = record.source || {}, sourceKey = JSON.stringify([s.id, s.edition]);
    const j = editions.get(sourceKey);
    if (j !== undefined && JSON.stringify(s) !== JSON.stringify(collection.records[j].source)) {
      flag(i, "conflicting-source-edition", "source"); flag(j, "conflicting-source-edition", "source");
    } else editions.set(sourceKey, i);
    const p = record.product || {}, gtin = canonicalGtin(p.gtin);
    if (gtin) {
      const key = JSON.stringify([gtin, p.market, p.preparation]);
      const previous = products.get(key) || [];
      previous.forEach(j => {
        const other = reports[j].input;
        // Different editions are observations, never silently replacements.
        // A repeated identity requires reconciliation, even if values coincide.
        const code = JSON.stringify([other.basis, other.nutrients, other.product.packageDescription]) ===
          JSON.stringify([reports[i].input.basis, reports[i].input.nutrients, p.packageDescription])
          ? "duplicate-product-observation" : "conflicting-product-observations";
        flag(i, code, "product.gtin"); flag(j, code, "product.gtin");
      });
      products.set(key, [...previous, i]);
    }
  });
  const records = reports.map((report, i) => {
    const record = collection.records[i] || {}, input = report.input;
    const result = evaluateExperimentalUsNutrition(input);
    const errors = [...rootIssues, ...report.issues.filter(v => v.severity === "error")];
    const nutrients = input.nutrients;
    const present = KEYS.filter(k => canonicalValue(k, nutrients[k]) !== null);
    const missing = KEYS.filter(k => !object(nutrients[k]) || nutrients[k].value === null || nutrients[k].value === undefined);
    const ambiguous = KEYS.filter(k => ["ambiguous", "not-numerically-declared"].includes(nutrients[k]?.state));
    const eligible = errors.length === 0 && result.eligible;
    // Never leak a numeric score when extra intake checks reject a record.
    const safeResult = eligible ? result : { ...result, eligible: false,
      inputStatus: errors.length ? "invalid-intake" : result.inputStatus,
      experimentalRawScore: null, experimentalScore: null,
      components: null, contributions: null, fiberAdjustment: null, explanationInputs: null, categoryRules: null };
    return { id: report.id, name: input.product.name ?? null, role: record.role ?? null,
      validIntake: errors.length === 0, issues: report.issues,
      coverage: { present, missing, ambiguous,
        conflicting: [...(Array.isArray(record.sourceState?.unresolvedConflicts) ? record.sourceState.unresolvedConflicts : []),
          ...report.issues.filter(v => /conflict|contradict/.test(v.code))],
        numericProfileComplete: present.length === KEYS.length,
        freshness: { retrievedOn: input.source.retrievedOn ?? null, publishedOn: input.source.publishedOn ?? null,
          revisionOn: input.source.revisionOn ?? null, labelVersion: input.source.labelVersion ?? null,
          labelObservedOn: input.review.labelObservedOn ?? null, reviewedOn: input.review.reviewedOn ?? null,
          reviewDueOn: input.review.reviewDueOn ?? null,
          engineFreshnessReasons: result.reasons.filter(r => /date|expired|stale|supersed/.test(r.code)),
          currentRetailFormulationEstablished: false },
        marketClaim: input.product.market ?? null, formulationEvidence: record.marketEvidence?.verification ?? "unknown",
        formulationAcceptedByScorer: !result.reasonCodes.some(c => ["us-formulation-unverified", "product-identity-incomplete", "source-product-mismatch", "review-product-mismatch"].includes(c)),
        recovery: copy(Array.isArray(record.recovery) ? record.recovery : []),
        recoverableFromExistingSource: copy((Array.isArray(record.recovery) ? record.recovery : []).filter(v => v.status === "documented-not-transcribed")),
        unknowns: { ingredients: record.ingredients?.status ?? "unknown", foodGroups: !record.foodGroups?.length,
          wholeGrains: !record.wholeGrains?.length, fatQuality: !record.fatQuality?.length,
          sourceRevision: input.source.revisionOn === null } },
      eligibility: { eligible, engineEligible: result.eligible, inputStatus: errors.length ? "invalid-intake" : result.inputStatus,
        intakeRejectionReasons: errors, engineRejectionReasons: result.reasons, engineReasonCodes: result.reasonCodes },
      result: safeResult, grade: null, scoreReady: false };
  });
  return { schemaVersion: VERSION, asOf: collection.asOf, methodId: METHOD_ID, methodVersion: METHOD_VERSION,
    grade: null, scoreReady: false, valid: rootIssues.length === 0 && records.every(r => r.validIntake), issues: rootIssues,
    summary: { observations: records.length, completeNineNutrients: records.filter(r => r.coverage.numericProfileComplete).length,
      missingNutrition: records.filter(r => r.coverage.missing.length).length, eligible: records.filter(r => r.eligibility.eligible).length,
      rejected: records.filter(r => !r.eligibility.eligible).length, invalidIntake: records.filter(r => !r.validIntake).length,
      formulationRejected: records.filter(r => !r.coverage.formulationAcceptedByScorer).length,
      unsupportedCategory: records.filter(r => r.eligibility.engineReasonCodes.includes("unsupported-category")).length,
      conflictingObservations: records.filter(r => r.coverage.conflicting.length).length },
    samplingCaution: "Purposive observations only; no national coverage estimate or scientific validation.", records };
}

module.exports = { VERSION, KEYS, canonicalValue, canonicalGtin, scoringInput, validateRecord, analyzeCollection };

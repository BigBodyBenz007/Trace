// Optional, provider-reported evidence shared by the gateway and browser.
// This contract never participates in logging math or declares a score ready.
const ASSESSMENT_INPUT_VERSION = 1;
const MAX_ASSESSMENT_BYTES = 12 * 1024;
const NUTRIENT_UNITS = Object.freeze({
  calories: "kcal", saturatedFat: "g", addedSugar: "g", totalSugar: "g",
  sodium: "mg", fiber: "g", protein: "g", fat: "g", carbohydrates: "g",
  freeSugar: "g", salt: "g",
});
// Salt is optional consistency evidence, never another required scoring input.
const PROFILE_NUTRIENTS = Object.freeze(Object.keys(NUTRIENT_UNITS).filter((key) => !["freeSugar", "salt"].includes(key)));
const ESSENTIAL_PROFILE_NUTRIENTS = Object.freeze(["saturatedFat", "addedSugar", "sodium"]);
const PROVIDERS = new Set(["usda-fdc", "open-food-facts"]);
const BASES = new Set(["serving", "100g", "100ml", "package", "unknown"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value, limit = 256) {
  return value === null || (typeof value === "string" && value.length <= limit);
}

function fieldName(value, limit = 128) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}

function scalar(value) {
  return value === null || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value)) || text(value, 128);
}

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function byteLength(value) {
  return Array.from(JSON.stringify(value)).reduce((sum, char) => {
    const code = char.codePointAt(0);
    return sum + (code < 128 ? 1 : code < 2048 ? 2 : code < 65536 ? 3 : 4);
  }, 0);
}

function iso(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  // Date.parse accepts rollover dates such as February 30; those are not evidence.
  const calendar = value.slice(0, 10);
  const day = new Date(`${calendar}T00:00:00.000Z`);
  return day.toISOString().slice(0, 10) === calendar ? date.toISOString() : null;
}

function validDate(value) {
  return value === null || iso(value) === value;
}

function fieldValues(value) {
  return Array.isArray(value) && value.length <= 12 && value.every((entry) =>
    object(entry) && fieldName(entry.field)
    && Array.isArray(entry.values) && entry.values.length <= 20
    && entry.values.every((item) => fieldName(item, 256)));
}

function validQuantity(value) {
  return value === null || (object(value) && Number.isFinite(value.amount)
    && value.amount > 0 && typeof value.unit === "string" && value.unit.length <= 32);
}

function validObservation(entry) {
  return object(entry) && Object.prototype.hasOwnProperty.call(NUTRIENT_UNITS, entry.nutrient)
    && scalar(entry.rawValue) && text(entry.rawUnit, 32) && text(entry.enteredUnit, 32)
    && ["provider", "provider-schema", "unknown"].includes(entry.unitSource)
    && fieldName(entry.field, 160)
    && text(entry.derivation, 256);
}

function sameGtin(left, right) {
  return typeof left === "string" && typeof right === "string"
    && /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(left) && /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(right)
    && left.padStart(14, "0") === right.padStart(14, "0");
}

function matchesFood(value, food) {
  if (!food) return true;
  return sameGtin(value.identity.gtin, food.identifiers?.[0]?.value)
    && value.identity.name === food.name && value.identity.brand === food.brand
    && value.source.provider === food.provider?.id
    && value.source.recordId === food.provider?.recordId
    && value.source.url === food.provenance?.sourceUrl
    && value.source.attribution === food.provenance?.attribution
    && value.source.retrievedAt === food.provenance?.retrievedAt;
}

function normalizeNutritionAssessmentInputs(value, food) {
  if (value === undefined) return undefined; // Preserve legacy absence without migration.
  try {
    if (!object(value) || byteLength(value) > MAX_ASSESSMENT_BYTES
      || value.schemaVersion !== ASSESSMENT_INPUT_VERSION
      || value.identification !== "provider-reported"
      || !object(value.identity) || !object(value.source)
      || !sameGtin(value.identity.gtin, value.identity.gtin)
      || !(value.identity.providerGtin === null || text(value.identity.providerGtin, 32))
      || !fieldName(value.identity.name, 512) || !text(value.identity.brand, 512)
      || !PROVIDERS.has(value.source.provider)
      || !fieldName(value.source.recordId)
      || typeof value.source.url !== "string" || value.source.url.length > 2048
      || !fieldName(value.source.attribution, 512)
      || !validDate(value.source.revisionDate) || !validDate(value.source.publicationDate)
      || !validDate(value.source.retrievedAt)
      || typeof value.source.cacheStale !== "boolean"
      || !Array.isArray(value.source.dates) || value.source.dates.length > 8
      || !value.source.dates.every((entry) => object(entry) && fieldName(entry.field, 64) && scalar(entry.value))
      || !fieldValues(value.markets) || !fieldValues(value.categories)
      || !Array.isArray(value.serving) || value.serving.length > 8
      || !value.serving.every((entry) => object(entry) && fieldName(entry.field, 64) && scalar(entry.value))
      || !object(value.ingredients) || !fieldName(value.ingredients.field, 64)
      || !text(value.ingredients.language, 35) || typeof value.ingredients.textAvailable !== "boolean"
      || !Array.isArray(value.datasets) || value.datasets.length > 5
      || !value.datasets.every((entry) => object(entry)
        && fieldName(entry.id, 64)
        && BASES.has(entry.basis) && validQuantity(entry.quantity)
        && (entry.basis !== "100g" || (entry.quantity?.amount === 100 && entry.quantity.unit === "g"))
        && (entry.basis !== "100ml" || (entry.quantity?.amount === 100 && entry.quantity.unit === "ml"))
        && Array.isArray(entry.observations) && entry.observations.length <= 32
        && entry.observations.every(validObservation))
      || new Set(value.datasets.map((entry) => entry.id)).size !== value.datasets.length
      || !Array.isArray(value.foodGroups) || value.foodGroups.length > 8
      || !value.foodGroups.every((entry) => object(entry)
        && fieldName(entry.field)
        && scalar(entry.rawValue) && text(entry.rawUnit, 32)
        && ["provider-reported", "provider-estimated"].includes(entry.identification))
      || !Array.isArray(value.limitations) || value.limitations.length > 12
      || !value.limitations.every((entry) => typeof entry === "string" && entry.length <= 128)
      || !matchesFood(value, food)) return null;
    const url = new URL(value.source.url);
    const trusted = value.source.provider === "usda-fdc"
      ? url.hostname === "fdc.nal.usda.gov" : /(^|\.)openfoodfacts\.org$/i.test(url.hostname);
    if (url.protocol !== "https:" || !trusted) return null;
    // Reconstruct; do not trust cached quality, score, or verification claims.
    return freeze({
      schemaVersion: ASSESSMENT_INPUT_VERSION, identification: "provider-reported",
      identity: { gtin: value.identity.gtin, providerGtin: value.identity.providerGtin,
        name: value.identity.name, brand: value.identity.brand },
      source: { provider: value.source.provider, recordId: value.source.recordId,
        url: value.source.url, attribution: value.source.attribution,
        revisionDate: value.source.revisionDate, publicationDate: value.source.publicationDate,
        retrievedAt: value.source.retrievedAt, cacheStale: value.source.cacheStale,
        dates: value.source.dates.map(({ field, value: item }) => ({ field, value: item })) },
      markets: value.markets.map(({ field, values }) => ({ field, values: [...values] })),
      categories: value.categories.map(({ field, values }) => ({ field, values: [...values] })),
      serving: value.serving.map(({ field, value: item }) => ({ field, value: item })),
      ingredients: { field: value.ingredients.field, language: value.ingredients.language,
        textAvailable: value.ingredients.textAvailable },
      datasets: value.datasets.map(({ id, basis, quantity, observations }) => ({
        id, basis, quantity: quantity === null ? null : { amount: quantity.amount, unit: quantity.unit },
        observations: observations.map((entry) => ({ nutrient: entry.nutrient,
          rawValue: entry.rawValue, rawUnit: entry.rawUnit, unitSource: entry.unitSource,
          enteredUnit: entry.enteredUnit, field: entry.field, derivation: entry.derivation })),
      })),
      foodGroups: value.foodGroups.map(({ field, rawValue, rawUnit, identification }) =>
        ({ field, rawValue, rawUnit, identification })),
      limitations: [...value.limitations],
    });
  } catch (error) {
    return null; // Bad optional evidence must not block otherwise usable food logging.
  }
}

function converted(entry) {
  if (entry.rawValue === null || entry.rawValue === "") return { status: "unknown", value: null };
  if (!["string", "number"].includes(typeof entry.rawValue)
    || (typeof entry.rawValue === "string" && !/^\s*(?:\d+(?:\.\d*)?|\.\d+)\s*$/.test(entry.rawValue))) {
    return { status: "invalid", value: null };
  }
  const amount = Number(entry.rawValue);
  if (!Number.isFinite(amount) || amount < 0) return { status: "invalid", value: null };
  const unit = (entry.rawUnit || "").trim().toLowerCase();
  const target = NUTRIENT_UNITS[entry.nutrient];
  let factor;
  if (target === "kcal") factor = unit === "kcal" ? 1 : unit === "kj" ? 1 / 4.184 : null;
  else {
    const grams = { g: 1, mg: 0.001, mcg: 0.000001, ug: 0.000001, "µg": 0.000001, "μg": 0.000001 }[unit];
    factor = grams === undefined ? null : grams * (target === "mg" ? 1000 : 1);
  }
  if (factor === null) return { status: "unsupported-unit", value: null };
  const result = amount * factor;
  return Number.isFinite(result) ? { status: "reported", value: result } : { status: "invalid", value: null };
}

function different(left, right) {
  return Math.abs(left - right) > Math.max(1, Math.abs(left), Math.abs(right)) * 1e-9;
}

function getAssessmentDatasetNutrients(dataset) {
  return freeze(Object.fromEntries(Object.keys(NUTRIENT_UNITS).map((key) => {
    const unit = NUTRIENT_UNITS[key];
    const entries = (dataset?.observations || []).filter((entry) => entry.nutrient === key);
    const results = entries.map(converted);
    const reported = results.filter((result) => result.status === "reported");
    const conflict = reported.some((result) => different(result.value, reported[0].value));
    const invalid = results.find((result) => ["invalid", "unsupported-unit"].includes(result.status));
    const status = conflict ? "conflicting" : invalid?.status || (reported.length ? "reported" : "unknown");
    return [key, { status, value: status === "reported" ? reported[0].value : null,
      unit, sourceFields: entries.map((entry) => entry.field) }];
  })));
}

function quantity(value) {
  const factors = { g: [1, "mass"], mg: [0.001, "mass"], kg: [1000, "mass"],
    oz: [28.349523125, "mass"], lb: [453.59237, "mass"],
    ml: [1, "volume"], l: [1000, "volume"] };
  const unit = factors[value?.unit?.toLowerCase()];
  return unit ? { amount: value.amount * unit[0], dimension: unit[1] } : null;
}

function getNutritionAssessmentQuality(value, { stale = false } = {}) {
  const input = normalizeNutritionAssessmentInputs(value);
  if (!input) return freeze({ nutrientCapture: "missing", states: [value === undefined
    ? "legacy-not-captured" : "invalid-or-oversized-inputs"], marketStatus: "unknown",
    sourceDateStatus: stale ? "stale" : "undated", scoreReady: false,
    scoreReadiness: "method-not-approved", missingEssentialNutrients: [...ESSENTIAL_PROFILE_NUTRIENTS] });
  const states = new Set();
  const records = input.datasets.map((dataset) => ({ dataset, nutrients: getAssessmentDatasetNutrients(dataset) }));
  const knownBasis = records.filter(({ dataset }) => dataset.basis !== "unknown");
  if (records.some(({ dataset }) => dataset.basis === "unknown") || !knownBasis.length) states.add("unknown-measurement-basis");
  let conflict = false;
  for (const { nutrients } of records) {
    for (const entry of Object.values(nutrients)) {
      if (entry.status === "conflicting") conflict = true;
      if (["invalid", "unsupported-unit"].includes(entry.status)) states.add(entry.status);
    }
    if ((nutrients.addedSugar.value !== null && nutrients.totalSugar.value !== null
      && nutrients.addedSugar.value > nutrients.totalSugar.value)
      || (nutrients.freeSugar.value !== null && nutrients.totalSugar.value !== null
      && nutrients.freeSugar.value > nutrients.totalSugar.value)
      || (nutrients.saturatedFat.value !== null && nutrients.fat.value !== null
      && nutrients.saturatedFat.value > nutrients.fat.value)) conflict = true;
  }
  // Compare only provider-declared compatible quantities. Never bridge mass and volume.
  knownBasis.forEach((left, index) => knownBasis.slice(index + 1).forEach((right) => {
    const a = quantity(left.dataset.quantity), b = quantity(right.dataset.quantity);
    if (!a || !b || a.dimension !== b.dimension) return;
    PROFILE_NUTRIENTS.forEach((key) => {
      const l = left.nutrients[key].value, r = right.nutrients[key].value;
      if (l !== null && r !== null && different(l / a.amount, r / b.amount)) conflict = true;
    });
  }));
  if (conflict) states.add("conflicting-provider-information");
  const complete = knownBasis.filter(({ nutrients }) => PROFILE_NUTRIENTS.every((key) => nutrients[key].value !== null));
  const hasData = records.some(({ nutrients }) => PROFILE_NUTRIENTS.some((key) => nutrients[key].value !== null));
  const nutrientCapture = complete.length && !conflict && !states.has("invalid") && !states.has("unsupported-unit")
    ? "complete" : hasData ? "partial" : "missing";
  const best = [...knownBasis].sort((a, b) => ESSENTIAL_PROFILE_NUTRIENTS.filter((key) => b.nutrients[key].value !== null).length
    - ESSENTIAL_PROFILE_NUTRIENTS.filter((key) => a.nutrients[key].value !== null).length)[0];
  const missingEssentialNutrients = ESSENTIAL_PROFILE_NUTRIENTS.filter((key) => !best || best.nutrients[key].value === null);
  states.add(`${nutrientCapture}-nutrient-capture`);
  if (missingEssentialNutrients.length) states.add("missing-essential-profile-nutrients");
  const marketStatus = input.markets.some((entry) => entry.values.length) ? "provider-reported" : "unknown";
  if (marketStatus === "unknown") states.add("unknown-product-market");
  if (!input.categories.some((entry) => entry.values.length)) states.add("unknown-product-category");
  const sourceDateStatus = stale || input.source.cacheStale ? "stale"
    : input.source.revisionDate === null ? "undated" : "dated-not-currentness-verified";
  if (sourceDateStatus !== "dated-not-currentness-verified") states.add(`${sourceDateStatus}-source`);
  if (input.source.revisionDate && input.source.retrievedAt
    && input.source.revisionDate > input.source.retrievedAt) states.add("conflicting-source-dates");
  if (input.identity.providerGtin !== null && !sameGtin(input.identity.providerGtin, input.identity.gtin)) states.add("conflicting-product-identifier");
  input.limitations.forEach((entry) => states.add(entry));
  return freeze({ nutrientCapture, states: [...states], completeDatasetIds: complete.map(({ dataset }) => dataset.id),
    missingEssentialNutrients, marketStatus, sourceDateStatus,
    scoreReady: false, scoreReadiness: "method-not-approved" });
}

module.exports = { ASSESSMENT_INPUT_VERSION, MAX_ASSESSMENT_BYTES, NUTRIENT_UNITS,
  PROFILE_NUTRIENTS, ESSENTIAL_PROFILE_NUTRIENTS, iso,
  normalizeNutritionAssessmentInputs, getAssessmentDatasetNutrients, getNutritionAssessmentQuality };

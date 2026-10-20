const { iso, normalizeNutritionAssessmentInputs } = require("../../src/services/nutritionAssessmentInputs");
const OWN = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const USDA_NAMES = {
  energy: "calories", "fatty acids, total saturated": "saturatedFat",
  "added sugars": "addedSugar", "sugars, added": "addedSugar",
  "total sugars": "totalSugar", "sugars, total including nlea": "totalSugar",
  "sodium, na": "sodium", "fiber, total dietary": "fiber", protein: "protein",
  "total lipid (fat)": "fat", "carbohydrate, by difference": "carbohydrates",
  "free sugars": "freeSugar",
};
const LABEL_NAMES = { calories: "calories", saturatedFat: "saturatedFat", addedSugar: "addedSugar",
  addedSugars: "addedSugar", sugars: "totalSugar", totalSugar: "totalSugar", sodium: "sodium",
  fiber: "fiber", protein: "protein", fat: "fat", carbohydrates: "carbohydrates" };
const OFF_NAMES = { "energy-kcal": "calories", "energy-kj": "calories", energy: "calories",
  "saturated-fat": "saturatedFat", "added-sugars": "addedSugar", sugars: "totalSugar",
  sodium: "sodium", fiber: "fiber", proteins: "protein", fat: "fat",
  carbohydrates: "carbohydrates", "free-sugars": "freeSugar" };

function raw(value, limit = 128) {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && value.length <= limit) return value;
  throw new Error("Unsupported optional assessment evidence");
}

function string(value, limit = 256) {
  return typeof value === "string" && value.trim() && value.length <= limit ? value : null;
}

function fields(record, names) {
  return names.filter((key) => OWN(record, key)).map((field) => ({ field, value: raw(record[field]) }));
}

function metadata(record, names, limitations) {
  return names.filter((key) => OWN(record, key)).map((field) => {
    const value = record[field];
    const items = Array.isArray(value) ? value : [value];
    const values = items.filter((item) => string(item) !== null);
    if (values.length !== items.length || values.length > 20) limitations.push(`incomplete-${field}`);
    return { field, values: values.slice(0, 20) };
  });
}

function servingQuantity(amount, unit) {
  if (!["number", "string"].includes(typeof amount) || String(amount).trim() === "") return null;
  if (typeof amount === "string" && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(amount.trim())) return null;
  const number = Number(amount);
  return Number.isFinite(number) && number > 0 && string(unit, 32)
    ? { amount: number, unit } : null;
}

function observation(nutrient, value, unit, field, {
  unitSource = "provider", enteredUnit = null, derivation = null,
} = {}) {
  return { nutrient, rawValue: raw(value), rawUnit: string(unit, 32), unitSource,
    enteredUnit: string(enteredUnit, 32), field, derivation: string(derivation) };
}

function offEnergyDerivation(nutrients, key, suffix) {
  if (!["energy", "energy-kj", "energy-kcal"].includes(key)) return null;
  let modifier = string(nutrients[`${key}_modifier`], 32);
  // energy is the legacy kJ alias, not an independent label declaration. A
  // missing alias qualifier must not upgrade the same approximate kJ value.
  if (!modifier && key === "energy" && suffix
    && OWN(nutrients, `energy-kj_${suffix}`)
    && nutrients[`energy_${suffix}`] === nutrients[`energy-kj_${suffix}`]
    && (suffix !== "value" || nutrients.energy_unit === nutrients["energy-kj_unit"])) {
    modifier = string(nutrients["energy-kj_modifier"], 32);
  }
  if (!modifier && key === "energy" && suffix
    && !OWN(nutrients, `energy-kj_${suffix}`) && OWN(nutrients, `energy-kcal_${suffix}`)) {
    modifier = string(nutrients["energy-kcal_modifier"], 32);
  }
  return modifier ? `off:modifier:${modifier.trim()}` : null;
}

function usdaDatasets(record, limitations) {
  const serving = [];
  Object.entries(LABEL_NAMES).forEach(([field, nutrient]) => {
    const value = record.labelNutrients?.[field];
    if (!value || !OWN(value, "value")) return;
    const explicitUnit = value.unitName ?? value.unit;
    const schemaUnit = nutrient === "calories" ? "kcal" : nutrient === "sodium" ? "mg" : "g";
    serving.push(observation(nutrient, value.value, explicitUnit ?? schemaUnit, `labelNutrients.${field}.value`,
      { unitSource: explicitUnit === undefined ? "provider-schema" : "provider" }));
  });
  const reference = [];
  const entries = Array.isArray(record.foodNutrients) ? record.foodNutrients : [];
  entries.forEach((entry, index) => {
    const name = entry?.nutrientName ?? entry?.nutrient?.name;
    const nutrient = typeof name === "string" ? USDA_NAMES[name.trim().toLowerCase()] : null;
    if (!nutrient) return;
    if (reference.length >= 32) { limitations.push("excess-nutrient-observations"); return; }
    const field = OWN(entry, "value") ? "value" : "amount";
    reference.push(observation(nutrient, entry[field], entry.unitName ?? entry.nutrient?.unitName,
      `foodNutrients[${index}].${field}`, { derivation: entry.derivationDescription
        ?? entry.foodNutrientDerivation?.description ?? entry.derivationCode ?? null }));
  });
  // GBFPD reference values can use grams or milliliters. A mass serving in
  // grams establishes the mass convention; other responses need better evidence.
  const massReference = String(record.servingSizeUnit || "").trim().toLowerCase() === "g";
  if (reference.length && !massReference) limitations.push("unconfirmed-usda-reference-dimension");
  return [
    ...(serving.length ? [{ id: "usda-label-serving", basis: "serving",
      quantity: servingQuantity(record.servingSize, record.servingSizeUnit), observations: serving }] : []),
    ...(reference.length ? [{ id: "usda-reference", basis: massReference ? "100g" : "unknown",
      quantity: massReference ? { amount: 100, unit: "g" } : null,
      observations: reference }] : []),
  ];
}

function offDatasets(record) {
  const nutrients = record.nutriments || {};
  const declared = typeof record.nutrition_data_per === "string"
    ? record.nutrition_data_per.trim().toLowerCase() : null;
  return ["serving", "100g", "100ml", "value"].map((suffix) => {
    let basis = suffix === "value" ? declared : suffix;
    // OFF's _100g means 100 g OR 100 mL for liquids. Do not guess that dimension.
    if (suffix === "100g") basis = ["100g", "100ml"].includes(declared) ? declared : "unknown";
    if (!["serving", "100g", "100ml", "package"].includes(basis)) basis = "unknown";
    const amount = basis === "100g" ? { amount: 100, unit: "g" }
      : basis === "100ml" ? { amount: 100, unit: "ml" }
        : basis === "serving" ? servingQuantity(record.serving_quantity, record.serving_quantity_unit) : null;
    const observations = [];
    Object.entries(OFF_NAMES).forEach(([key, nutrient]) => {
      const field = `${key}_${suffix}`;
      if (!OWN(nutrients, field)) return;
      const enteredUnit = nutrients[`${key}_unit`];
      // Standardized fields have schema units; _unit belongs to the entered _value.
      const standardUnit = key === "energy-kcal" ? "kcal"
        : ["energy", "energy-kj"].includes(key) ? "kJ" : "g";
      const explicit = nutrients[`${field}_unit`];
      const unit = suffix === "value" ? explicit ?? enteredUnit : standardUnit;
      observations.push(observation(nutrient, nutrients[field], unit, `nutriments.${field}`, {
        unitSource: suffix === "value" ? (unit == null ? "unknown" : "provider") : "provider-schema",
        enteredUnit,
        derivation: offEnergyDerivation(nutrients, key, suffix),
      }));
    });
    return { id: `off-${suffix}`, basis, quantity: amount, observations };
  }).filter((dataset) => dataset.observations.length);
}

function buildInputs(record, food) {
  const usda = food.provider.id === "usda-fdc";
  const limitations = [];
  const dates = fields(record, usda ? ["modifiedDate", "publicationDate", "publishedDate", "availableDate"]
    : ["last_modified_datetime", "last_modified_t"]);
  let revisionDate = iso(usda ? record.modifiedDate : record.last_modified_datetime);
  const unix = typeof record.last_modified_t === "number" ? record.last_modified_t
    : typeof record.last_modified_t === "string" && /^\d+$/.test(record.last_modified_t)
      ? Number(record.last_modified_t) : NaN;
  if (!usda && revisionDate === null && Number.isSafeInteger(unix) && unix >= 0) {
    const date = new Date(unix * 1000);
    revisionDate = Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  const datasets = usda ? usdaDatasets(record, limitations) : offDatasets(record);
  const groupFields = ["fruits-vegetables-nuts_100g", "whole-grain_100g",
    "fruits-vegetables-nuts-estimate_100g", "fruits-vegetables-nuts-estimate-from-ingredients_100g"];
  const input = {
    schemaVersion: 1, identification: "provider-reported",
    identity: { gtin: food.identifiers[0].value,
      providerGtin: string(String((usda ? record.gtinUpc : record.code) ?? ""), 32),
      name: food.name, brand: food.brand },
    source: { provider: food.provider.id, recordId: food.provider.recordId,
      url: food.provenance.sourceUrl, attribution: food.provenance.attribution,
      revisionDate, publicationDate: usda ? iso(record.publicationDate ?? record.publishedDate) : null,
      retrievedAt: food.provenance.retrievedAt, cacheStale: false, dates },
    markets: metadata(record, usda ? ["marketCountry"] : ["countries_tags", "countries"], limitations),
    categories: metadata(record, usda ? ["foodCategory", "brandedFoodCategory"] : ["categories_tags", "categories"], limitations),
    serving: fields(record, usda ? ["servingSize", "servingSizeUnit", "householdServingFullText"]
      : ["serving_quantity", "serving_quantity_unit", "serving_size", "nutrition_data_per"]),
    ingredients: { field: usda ? "ingredients" : "ingredients_text",
      language: food.ingredients?.language ?? null, textAvailable: typeof food.ingredients?.text === "string" },
    datasets,
    foodGroups: usda ? [] : groupFields.filter((field) => OWN(record.nutriments, field)).map((field) => ({
      field: `nutriments.${field}`, rawValue: raw(record.nutriments[field]), rawUnit: "%",
      identification: field.includes("estimate") ? "provider-estimated" : "provider-reported",
    })),
    limitations: [...new Set(limitations)],
  };
  return normalizeNutritionAssessmentInputs(input, food);
}

function captureNutritionAssessmentInputs(record, food) {
  try {
    const input = buildInputs(record, food);
    // Keep headroom for completeness/result wrappers inside the browser's
    // existing 64-KiB response limit. Optional evidence must not displace logging.
    return input && Buffer.byteLength(JSON.stringify({ ...food, assessmentInputs: input }), "utf8") <= 60 * 1024
      ? input : null;
  } catch (error) {
    return null;
  }
}

module.exports = { captureNutritionAssessmentInputs, offEnergyDerivation };

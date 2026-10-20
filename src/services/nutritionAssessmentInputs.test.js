const { normalizeUsdaFood, normalizeOpenFoodFactsProduct } = require("../../api/nutrition/_barcodeGateway.cjs");
const { normalizeNutritionAssessmentInputs, getAssessmentDatasetNutrients,
  getNutritionAssessmentQuality, MAX_ASSESSMENT_BYTES } = require("./nutritionAssessmentInputs");
const { BARCODE, RETRIEVED_AT, usdaRecord, offRecord, COVERAGE_FIXTURES } = require("./__fixtures__/nutritionAssessmentInputs.cjs");

const usda = (record = usdaRecord()) => normalizeUsdaFood(record, BARCODE, RETRIEVED_AT);
const off = (record = offRecord()) => normalizeOpenFoodFactsProduct(record, BARCODE, RETRIEVED_AT);
const data = (food, id = 0) => getAssessmentDatasetNutrients(food.assessmentInputs.datasets[id]);
const copy = (value) => JSON.parse(JSON.stringify(value));

test.each(COVERAGE_FIXTURES)("source-attributed $fixtureType coverage fixture: $id", (fixture) => {
  const food = (fixture.provider === "usda-fdc" ? usda : off)(fixture.product);
  expect(fixture.attribution).toContain("synthetic");
  expect(fixture.schemaSources).toHaveLength(2);
  expect(food.assessmentInputs).not.toBeNull();
  expect(food.assessmentInputs.source.provider).toBe(fixture.provider);
  expect(food.assessmentInputs.source.attribution).toBe(food.provenance.attribution);
  expect(getNutritionAssessmentQuality(food.assessmentInputs).scoreReady).toBe(false);
});

test("captures saturated fat and complete nutrients without adding them to the logging contract", () => {
  const food = usda();
  expect(data(food).saturatedFat).toMatchObject({ value: 0.6, unit: "g", status: "reported" });
  expect(food.nutrients).not.toHaveProperty("saturatedFat");
  expect(getNutritionAssessmentQuality(food.assessmentInputs)).toMatchObject({
    nutrientCapture: "complete", missingEssentialNutrients: [],
    scoreReady: false, scoreReadiness: "method-not-approved",
  });
  expect(Object.isFrozen(food.assessmentInputs.datasets[0].observations)).toBe(true);
});

test("keeps reference added sugars when serving label lacks them, without splicing logging values", () => {
  const record = usdaRecord();
  delete record.labelNutrients.addedSugar;
  const food = usda(record);
  expect(food.nutritionBasis.source).toBe("labelNutrients");
  expect(food.nutrients.addedSugar).toBeNull();
  expect(data(food).addedSugar.value).toBeNull();
  expect(data(food, 1).addedSugar.value).toBe(15);
  expect(food.assessmentInputs.datasets[1].basis).toBe("100g");
  expect(food.logReady).toBe(true);
});

test("total, added and free sugars remain separate, including zero versus absence", () => {
  const record = offRecord();
  record.nutriments["added-sugars_100g"] = 0;
  record.nutriments["free-sugars_100g"] = 4;
  const food = off(record);
  expect(data(food).addedSugar.value).toBe(0);
  expect(data(food).totalSugar.value).toBe(20);
  expect(data(food).freeSugar.value).toBe(4);
  delete record.nutriments["added-sugars_100g"];
  expect(data(off(record)).addedSugar).toMatchObject({ status: "unknown", value: null });
});

test("OFF standardized grams are distinct from the original contributor-entered mg", () => {
  const record = offRecord();
  record.nutriments.sodium_unit = "mg";
  record.nutriments.sodium_value = 500;
  const input = off(record).assessmentInputs;
  const reference = input.datasets.find((entry) => entry.id === "off-100g");
  const entered = input.datasets.find((entry) => entry.id === "off-value");
  expect(reference.observations.find((entry) => entry.nutrient === "sodium")).toMatchObject({
    rawValue: 0.5, rawUnit: "g", enteredUnit: "mg", unitSource: "provider-schema",
  });
  expect(entered.observations[0]).toMatchObject({ rawValue: 500, rawUnit: "mg", unitSource: "provider" });
  expect(getAssessmentDatasetNutrients(reference).sodium.value).toBe(500);
  expect(getAssessmentDatasetNutrients(entered).sodium.value).toBe(500);
});

test("OFF energy qualifications survive capture and reconstruction without changing logging", () => {
  const record = offRecord();
  record.nutriments["energy-kj_100g"] = 1800;
  record.nutriments.energy_100g = 1800;
  record.nutriments["energy-kj_unit"] = "kJ";
  const baseline = off(record);
  record.nutriments["energy-kj_modifier"] = "~";
  const food = off(record);
  const input = normalizeNutritionAssessmentInputs(copy(food.assessmentInputs), food);
  const reference = input.datasets.find(entry => entry.id === "off-100g");
  expect(reference.observations.find(entry => entry.field === "nutriments.energy-kj_100g")).toMatchObject({ rawValue: 1800, derivation: "off:modifier:~" });
  // The generic energy alias cannot silently turn the same estimate into an
  // independent unqualified measurement when its own modifier is omitted.
  expect(reference.observations.find(entry => entry.field === "nutriments.energy_100g")).toMatchObject({ rawValue: 1800, derivation: "off:modifier:~" });
  expect(reference.observations.find(entry => entry.field === "nutriments.energy-kcal_100g").derivation).toBeNull();
  const logging = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== "assessmentInputs"));
  expect(logging(food)).toEqual(logging(baseline));
  expect(getNutritionAssessmentQuality(input).scoreReady).toBe(false);
});

test.each(["<", ">", "~"])("OFF retains energy modifier %s rather than promoting a qualified value", modifier => {
  const record = offRecord();
  record.nutriments["energy-kcal_modifier"] = modifier;
  const input = off(record).assessmentInputs;
  const energy = input.datasets.flatMap(entry => entry.observations).filter(entry => entry.field.startsWith("nutriments.energy-kcal_"));
  expect(energy.length).toBeGreaterThan(0);
  expect(energy.every(entry => entry.derivation === `off:modifier:${modifier}`)).toBe(true);
});

test("generic energy cannot upgrade an approximate kcal-only source through its converted kJ alias", () => {
  const record = offRecord();
  record.nutriments["energy-kcal_100g"] = 200;
  record.nutriments["energy-kcal_modifier"] = "~";
  record.nutriments.energy_100g = 836.8;
  delete record.nutriments["energy-kj_100g"];
  const input = off(record).assessmentInputs;
  expect(input.datasets.find(entry => entry.id === "off-100g").observations
    .filter(entry => entry.nutrient === "calories").every(entry => entry.derivation === "off:modifier:~")).toBe(true);
});

test.each(["%DV", "IU", "teaspoon", ""])("unsupported units stay visible and unusable: %s", (unit) => {
  const record = usdaRecord();
  record.labelNutrients.saturatedFat.unitName = unit;
  const food = usda(record);
  expect(data(food).saturatedFat).toMatchObject({ status: "unsupported-unit", value: null });
  expect(food.assessmentInputs.datasets[0].observations[1].rawUnit).toBe(unit || null);
  expect(getNutritionAssessmentQuality(food.assessmentInputs).states).toContain("unsupported-unit");
  expect(food.logReady).toBe(true);
});

test.each([-1, true, ">3", " ", "NaN"])("invalid measurements are not coerced into known zero: %p", (value) => {
  const record = usdaRecord();
  record.labelNutrients.saturatedFat.value = value;
  const food = usda(record);
  expect(data(food).saturatedFat).toMatchObject({ status: "invalid", value: null });
  expect(food.assessmentInputs.datasets[0].observations[1].rawValue).toBe(value);
});

test("preserves kJ and original derivation while projecting kcal without premature rounding", () => {
  const record = usdaRecord({ labelNutrients: undefined });
  record.foodNutrients[0] = { nutrientName: "Energy", unitName: "kJ", value: 418.4,
    derivationDescription: "Synthetic analytical derivation" };
  const food = usda(record);
  expect(data(food).calories.value).toBeCloseTo(100, 12);
  expect(food.assessmentInputs.datasets[0].observations[0]).toMatchObject({
    rawValue: 418.4, rawUnit: "kJ", derivation: "Synthetic analytical derivation",
  });
});

test("serving and reference dimensions are preserved; ambiguous OFF references stay unknown", () => {
  const record = offRecord({ nutrition_data_per: "100ml", serving_quantity: 250, serving_quantity_unit: "ml" });
  expect(off(record).assessmentInputs.datasets[0]).toMatchObject({ basis: "100ml", quantity: { amount: 100, unit: "ml" } });
  record.nutrition_data_per = "serving";
  const food = off(record);
  expect(food.assessmentInputs.datasets[0]).toMatchObject({ basis: "unknown", quantity: null });
  expect(getNutritionAssessmentQuality(food.assessmentInputs).states).toContain("unknown-measurement-basis");
  expect(getNutritionAssessmentQuality(food.assessmentInputs).missingEssentialNutrients).toHaveLength(3);
});

test("unknown entered-value basis and missing units never inherit reference assumptions", () => {
  const food = off(offRecord({ nutrition_data_per: "unrecognized", nutriments: { "saturated-fat_value": 3 } }));
  expect(food.assessmentInputs.datasets[0].basis).toBe("unknown");
  expect(data(food).saturatedFat.status).toBe("unsupported-unit");
});

test("USDA volume or undeclared reference dimensions remain unknown without a density assumption", () => {
  const food = usda(usdaRecord({ servingSize: 250, servingSizeUnit: "ml" }));
  expect(food.assessmentInputs.datasets[0]).toMatchObject({ basis: "serving", quantity: { amount: 250, unit: "ml" } });
  expect(food.assessmentInputs.datasets[1]).toMatchObject({ basis: "unknown", quantity: null });
  expect(getNutritionAssessmentQuality(food.assessmentInputs).states).toContain("unconfirmed-usda-reference-dimension");
});

test("unrepresentable optional observations fail closed without interrupting food lookup", () => {
  const record = usdaRecord();
  record.labelNutrients.saturatedFat.value = { unrecognized: "provider structure" };
  const food = usda(record);
  expect(food.assessmentInputs).toBeNull();
  expect(food.logReady).toBe(true);
  expect(getNutritionAssessmentQuality(food.assessmentInputs).states).toContain("invalid-or-oversized-inputs");
});

test("US and overseas market evidence is separate even for identical GTIN/name/brand", () => {
  const first = usda();
  const overseas = usda(usdaRecord({ marketCountry: "New Zealand" }));
  expect(first.assessmentInputs.identity).toEqual(overseas.assessmentInputs.identity);
  expect(first.assessmentInputs.markets).not.toEqual(overseas.assessmentInputs.markets);
  expect(first.assessmentInputs.markets[0].values).toEqual(["United States"]);
  const unknown = usda(usdaRecord({ marketCountry: undefined }));
  expect(getNutritionAssessmentQuality(unknown.assessmentInputs).states).toContain("unknown-product-market");
  expect(getNutritionAssessmentQuality(first.assessmentInputs).marketStatus).toBe("provider-reported");
});

test("captures quantitative provider estimates without promoting them to verified food-group amounts", () => {
  const record = offRecord();
  record.nutriments["fruits-vegetables-nuts-estimate-from-ingredients_100g"] = 40;
  record.nutriments["whole-grain_100g"] = 20;
  const food = off(record);
  expect(food.assessmentInputs.foodGroups).toEqual(expect.arrayContaining([
    expect.objectContaining({ rawValue: 40, rawUnit: "%", identification: "provider-estimated" }),
    expect.objectContaining({ rawValue: 20, identification: "provider-reported" }),
  ]));
  expect(food.assessmentInputs.categories[0]).toEqual({ field: "categories_tags", values: ["en:breakfast-cereals"] });
  expect(food.assessmentInputs.ingredients).toEqual({ field: "ingredients_text", language: "en", textAvailable: true });
});

test("missing, partial and complete capture are not grading readiness", () => {
  const missing = usda(usdaRecord({ foodNutrients: [], labelNutrients: undefined }));
  const partial = usda(usdaRecord({ foodNutrients: [], labelNutrients: { calories: { value: 100 } } }));
  expect(getNutritionAssessmentQuality(missing.assessmentInputs).nutrientCapture).toBe("missing");
  expect(getNutritionAssessmentQuality(partial.assessmentInputs).nutrientCapture).toBe("partial");
  expect(getNutritionAssessmentQuality(partial.assessmentInputs).states).toContain("missing-essential-profile-nutrients");
  expect(getNutritionAssessmentQuality(usda().assessmentInputs).scoreReady).toBe(false);
});

test("does not fill a profile by combining complementary incomplete datasets", () => {
  const record = usdaRecord({ labelNutrients: { saturatedFat: { value: 1 } } });
  record.foodNutrients = record.foodNutrients.filter((entry) => !entry.nutrientName.includes("saturated"));
  const quality = getNutritionAssessmentQuality(usda(record).assessmentInputs);
  expect(quality.nutrientCapture).toBe("partial");
  expect(quality.completeDatasetIds).toEqual([]);
  expect(quality.missingEssentialNutrients).toContain("saturatedFat");
});

test("conflicting duplicates, sugar totals, and incompatible provider datasets are explicit", () => {
  const duplicate = usdaRecord({ labelNutrients: undefined });
  duplicate.foodNutrients.push({ nutrientName: "Sodium, Na", unitName: "MG", value: 800 });
  expect(data(usda(duplicate)).sodium.status).toBe("conflicting");
  const sugar = usdaRecord();
  sugar.labelNutrients.addedSugar.value = 99;
  expect(getNutritionAssessmentQuality(usda(sugar).assessmentInputs).states).toContain("conflicting-provider-information");
  const inconsistent = usdaRecord();
  inconsistent.labelNutrients.sodium.value = 900;
  expect(getNutritionAssessmentQuality(usda(inconsistent).assessmentInputs).nutrientCapture).toBe("partial");
});

test("publication, retrieval, revision and observed staleness retain distinct meanings", () => {
  const undated = usda(usdaRecord({ modifiedDate: "2026-02-30" }));
  expect(undated.assessmentInputs.source.revisionDate).toBeNull();
  expect(undated.assessmentInputs.source.publicationDate).toBe("2026-09-01T00:00:00.000Z");
  expect(undated.assessmentInputs.source.dates[0].value).toBe("2026-02-30");
  expect(getNutritionAssessmentQuality(undated.assessmentInputs).sourceDateStatus).toBe("undated");
  expect(getNutritionAssessmentQuality(usda().assessmentInputs, { stale: true }).sourceDateStatus).toBe("stale");
  const future = usda(usdaRecord({ modifiedDate: "2026-11-01" }));
  expect(getNutritionAssessmentQuality(future.assessmentInputs).states).toContain("conflicting-source-dates");
});

test.each([false, " ", "", -1])("invalid OFF Unix timestamps do not manufacture a revision: %p", (value) => {
  const food = off(offRecord({ last_modified_datetime: null, last_modified_t: value }));
  expect(food.assessmentInputs.source.revisionDate).toBeNull();
  expect(getNutritionAssessmentQuality(food.assessmentInputs).sourceDateStatus).toBe("undated");
});

test("unknown serving amounts remain raw evidence without hexadecimal or fraction coercion", () => {
  const food = off(offRecord({ serving_quantity: "0x100" }));
  expect(food.assessmentInputs.serving).toContainEqual({ field: "serving_quantity", value: "0x100" });
  const serving = off(offRecord({ serving_quantity: "0x100", nutrition_data_per: "serving",
    nutriments: { "energy-kcal_serving": 100 } }));
  expect(serving.assessmentInputs.datasets[0].quantity).toBeNull();
});

test("legacy absence, malformed or unbound optional metadata cannot manufacture evidence", () => {
  const food = usda();
  expect(normalizeNutritionAssessmentInputs(undefined, food)).toBeUndefined();
  expect(normalizeNutritionAssessmentInputs({ schemaVersion: 999 }, food)).toBeNull();
  for (const mutate of [
    (value) => { value.identity.name = "Another formulation"; },
    (value) => { value.identity.gtin = "11111111111111"; },
    (value) => { value.source.provider = "other"; },
    (value) => { value.source.url = "https://example.com"; },
    (value) => { value.source.retrievedAt = "2026-02-30T00:00:00.000Z"; },
    (value) => { value.markets[0].values = [""]; },
    (value) => { value.datasets[0].observations[0].field = null; },
    (value) => { value.datasets.push(value.datasets[0]); },
  ]) {
    const value = copy(food.assessmentInputs);
    mutate(value);
    expect(normalizeNutritionAssessmentInputs(value, food)).toBeNull();
  }
  const tampered = { ...food.assessmentInputs, scoreReady: true, score: 100 };
  expect(normalizeNutritionAssessmentInputs(tampered, food)).not.toHaveProperty("score");
  expect(getNutritionAssessmentQuality(tampered).scoreReady).toBe(false);
});

test("oversized metadata fails closed as optional evidence, without accepting claimed grades", () => {
  const input = copy(usda().assessmentInputs);
  input.extra = "x".repeat(MAX_ASSESSMENT_BYTES);
  expect(normalizeNutritionAssessmentInputs(input)).toBeNull();
  expect(getNutritionAssessmentQuality(input).states).toContain("invalid-or-oversized-inputs");
});

const { METHOD_ID, METHOD_VERSION, REQUIRED_NUTRIENT_UNITS, evaluateExperimentalUsNutrition: evaluate } = require("./experimentalUsNutritionScoring");
const { CASES, SPECIFICATION, createSyntheticInput: create } = require("./__fixtures__/experimentalUsNutritionScoring.cjs");
const { getNutritionAssessmentQuality } = require("./nutritionAssessmentInputs");

function change(mutate, id) {
  const input = create(id);
  mutate(input);
  return evaluate(input);
}

function rebindProduct(input, fields) {
  Object.assign(input.product, fields);
  input.source.product = { ...input.product };
  input.review.product = { ...input.product };
}

function blocked(result, code) {
  expect(result.eligible).toBe(false);
  expect(result.reasonCodes).toContain(code);
  expect(result.experimentalRawScore).toBeNull();
  expect(result.experimentalScore).toBeNull();
  expect(result.components).toBeNull();
  expect(result.contributions).toBeNull();
  expect(result.grade).toBeNull();
  expect(result.scoreReady).toBe(false);
}

function values(input, replacements) {
  Object.entries(replacements).forEach(([key, value]) => { input.nutrients[key].value = value; });
}

test.each(CASES.filter(fixture => fixture.rejection === null))("eligible synthetic specification example: $id", (fixture) => {
  expect(fixture.synthetic).toBe(true);
  expect(fixture.specification.locator).toBe(SPECIFICATION.locator);
  const result = evaluate(create(fixture.id));
  expect(result).toMatchObject({ methodId: METHOD_ID, methodVersion: METHOD_VERSION,
    methodStatus: "research-not-frozen", grade: null, scoreReady: false });
  expect(result.eligible).toBe(true);
  expect(Math.abs(result.experimentalRawScore - fixture.specificationRawA)).toBeLessThan(.000050001);
  expect(result.experimentalScore).toBe(Math.floor(fixture.specificationRawA + .5));
  expect(result.warnings).toContain("explicitly-synthetic-input");
  const { start, ...losses } = result.contributions;
  expect(start - Object.values(losses).reduce((sum, amount) => sum + amount, 0)).toBeCloseTo(result.experimentalRawScore, 12);
});

test.each(CASES.filter(fixture => fixture.rejection !== null))("excluded synthetic specification diagnostic: $id", fixture => {
  const result = evaluate(create(fixture.id));
  expect(fixture.synthetic).toBe(true);
  blocked(result,fixture.rejection);
  expect(result.inputStatus).toBe("not-applicable");
  // The raw worksheet number is deliberately not exposed by the strict engine.
});

test("bounds, inclusive caps, fiber limit, and final-only rounding match exact equations", () => {
  const input = create("refined-starch");
  expect(evaluate(input).experimentalRawScore).toBe(80);
  values(input, { fiber: 5.6 });
  expect(evaluate(input).experimentalRawScore).toBe(100);
  values(input, { fiber: 20 });
  expect(evaluate(input).experimentalRawScore).toBe(100);
  values(input, { saturatedFat: 4, fat: 8, addedSugar: 10, totalSugar: 12, sodium: 460 });
  expect(evaluate(input).experimentalRawScore).toBe(0);
  const rounded = create("refined-starch");
  values(rounded, { fiber: .14 });
  expect(evaluate(rounded).experimentalRawScore).toBeCloseTo(80.5, 12);
  expect(evaluate(rounded).experimentalScore).toBe(81);
  values(rounded, { fiber: .14 - 1e-8 });
  expect(evaluate(rounded).experimentalScore).toBe(80);
});

test.each([["addedSugar",10], ["saturatedFat",4], ["sodium",460], ["fiber",5.6]])(
  "%s boundary is inclusive and caps without early rounding", (key, cap) => {
    const input = create("refined-starch");
    values(input, { totalSugar: 15, fat: 8, [key]: cap });
    const at = evaluate(input).experimentalRawScore;
    input.nutrients[key].value = cap + 1e-6;
    expect(evaluate(input).experimentalRawScore).toBe(at);
    input.nutrients[key].value = cap - 1e-6;
    const direction = key === "fiber" ? 1 : -1;
    expect((evaluate(input).experimentalRawScore-at)*direction).toBeLessThan(0);
  }
);

test.each(["addedSugar", "saturatedFat", "sodium"])("strongest safeguard limits a capped %s despite maximum fiber", (key) => {
  const input = create("refined-starch");
  values(input, { totalSugar: 15, fat: 8, fiber: 5.6, [key]: key === "addedSugar" ? 10 : key === "sodium" ? 460 : 4 });
  const result = evaluate(input);
  expect(result.components.combinedBurden).toBeCloseTo(2/3, 14);
  expect(result.experimentalRawScore).toBeCloseTo(100/3, 12);
  expect(result.fiberAdjustment.pointsAboveNoFiber).toBeCloseTo(20/3, 12);
  expect(result.components.strongestComponents).toEqual([key]);
});

test("ties charge the strongest safeguard once", () => {
  const input = create("refined-starch");
  values(input, { addedSugar: 10, totalSugar: 12, saturatedFat: 4, fat: 8, fiber: 5.6 });
  const result = evaluate(input);
  expect(result.components.strongestComponents).toEqual(["addedSugar", "saturatedFat"]);
  expect(result.contributions.strongestComponentLoss).toBe(50);
});

test("monotonicity, bounds, and protein/energy invariance on controlled profiles", () => {
  for (const added of [0,3,10]) for (const sat of [0,1,4]) for (const sodium of [0,200,460]) {
    const input = create("whole-grain-cereal");
    values(input, { addedSugar: added, totalSugar: 15, saturatedFat: sat, fat: 8, sodium, fiber: 3 });
    const current = evaluate(input).experimentalRawScore;
    expect(current).toBeGreaterThanOrEqual(0);
    expect(current).toBeLessThanOrEqual(100);
    for (const key of ["addedSugar","saturatedFat","sodium"]) {
      const previous = input.nutrients[key].value;
      input.nutrients[key].value = previous + .1;
      expect(evaluate(input).experimentalRawScore).toBeLessThanOrEqual(current);
      input.nutrients[key].value = previous;
    }
    input.nutrients.fiber.value = 4;
    expect(evaluate(input).experimentalRawScore).toBeGreaterThanOrEqual(current);
    values(input, { fiber: 3, protein: 25, calories: 420 });
    expect(evaluate(input).experimentalRawScore).toBeCloseTo(current, 12);
  }
});

test.each(Object.keys(REQUIRED_NUTRIENT_UNITS))("missing or null %s never becomes zero or a reduced formula", (key) => {
  for (const missing of [undefined, null]) {
    const result = change(input => { input.nutrients[key].value = missing; });
    blocked(result, key === "addedSugar" ? "added-sugars-missing" : "required-nutrient-missing");
    expect(result.inputStatus).toBe("not-enough-data");
  }
  blocked(change(input => { delete input.nutrients[key]; }), key === "addedSugar" ? "added-sugars-missing" : "required-nutrient-missing");
});

test("explicit zero, total sugar and optional free sugar never substitute for added sugar", () => {
  const zero = change(input => { input.nutrients.addedSugar.value = 0; });
  expect(zero.components.addedSugarBurden).toBe(0);
  const result = change(input => {
    input.nutrients.addedSugar.value = null;
    input.nutrients.totalSugar.value = 10;
    input.nutrients.freeSugar = { value: 10, unit: "g" };
  });
  blocked(result, "added-sugars-missing");
});

test.each(["%DV", "IU", "teaspoon", "cal", "", "constructor", null])("unsupported unit %p cannot enter the formula", unit => {
  blocked(change(input => { input.nutrients.saturatedFat.unit = unit; }), "unsupported-unit");
});

test.each([-1, NaN, Infinity, -Infinity, true, false, "3", " "])("invalid value %p is rejected before clipping", value => {
  const result = change(input => { input.nutrients.addedSugar.value = value; });
  blocked(result, "invalid-nutrient-value");
  expect(result.inputStatus).toBe("invalid-data");
});

test("fat/sugar contradictions and transformed overflow cannot be scored", () => {
  blocked(change(input => { input.nutrients.addedSugar.value = 6; }), "added-sugars-exceed-total");
  blocked(change(input => { input.nutrients.saturatedFat.value = 6; }), "saturates-exceed-total-fat");
  blocked(change(input => { input.basis.kind = "serving"; input.basis.amount = Number.MIN_VALUE; }), "unrepresentable-transformation");
});

test("units, kJ and known serving transformations retain original source values and full precision", () => {
  const baseline = evaluate(create());
  const input = create();
  input.nutrients.calories.value *= 4.184;
  input.nutrients.calories.unit = "kJ";
  input.nutrients.sodium.value /= 1000;
  input.nutrients.sodium.unit = "g";
  input.nutrients.fiber.value *= 1000000;
  input.nutrients.fiber.unit = "mcg";
  const result = evaluate(input);
  expect(result.experimentalRawScore).toBeCloseTo(baseline.experimentalRawScore, 12);
  expect(result.explanationInputs.originalNutrients.sodium).toMatchObject({ value: .2, unit: "g" });
  expect(result.explanationInputs.canonicalNutrients.sodium).toBe(200);
  expect(result.explanationInputs.transformations.find(item => item.nutrient === "calories").unitFactor).toBe(1/4.184);
  input.basis.kind = "serving";
  input.basis.amount = 30;
  Object.values(input.nutrients).forEach(measurement => { measurement.value *= .3; });
  expect(evaluate(input).experimentalRawScore).toBeCloseTo(baseline.experimentalRawScore, 12);
});

test("reference dimensions and unknown quantities reject unsupported basis conversion", () => {
  blocked(change(input => { input.basis.kind = "unknown"; }), "reference-basis-unknown");
  blocked(change(input => { input.basis.kind = "serving"; input.basis.amount = null; input.basis.unit = "cup"; }), "reference-basis-unknown");
  blocked(change(input => { input.basis.unit = "ml"; input.basis.kind = "100ml"; }), "category-basis-mismatch");
  blocked(change(input => { input.basis.amount = 50; }), "inconsistent-reference-basis");
  blocked(change(input => { input.basis.amount = 0; }), "invalid-reference-quantity");
  blocked(change(input => { input.basis.unit = "kg"; }), "unsupported-reference-unit");
});

test("beverages retain volume reference, warnings and declared serving equivalence", () => {
  const input = create("sugary-beverage");
  const original = evaluate(input);
  expect(original.categoryRules.comparisonClass).toBe("beverage-per-100ml");
  expect(original.warnings).toContain("beverage-dilution-and-portion-limitations");
  input.basis.kind = "serving";
  input.basis.amount = 355;
  Object.values(input.nutrients).forEach(measurement => { measurement.value *= 3.55; });
  expect(evaluate(input).experimentalRawScore).toBeCloseTo(original.experimentalRawScore,12);
  expect(evaluate(create("beverage-diluted-half")).experimentalRawScore).toBeGreaterThan(original.experimentalRawScore);
});

test.each(["nuts","seeds","oil","water","supplement","alcohol","medical-food","condiment","constructor"])("unsupported category %s has no diagnostic bypass", category => {
  const result = change(input => { rebindProduct(input,{category}); });
  blocked(result,"unsupported-category");
  expect(result.inputStatus).toBe("not-applicable");
});

test("category uncertainty, preparations and source-bound prepared yields are explicit", () => {
  for (const category of [null, "", "unknown", "unresolved"]) {
    const result = change(input => { rebindProduct(input, { category }); });
    blocked(result, "category-or-preparation-unknown");
    expect(result.inputStatus).toBe("not-enough-data");
  }
  blocked(change(input => { rebindProduct(input,{preparation:"as-prepared"}); }), "preparation-evidence-incomplete");
  const result = change(input => {
    rebindProduct(input,{preparation:"as-prepared", preparationDescription:"Synthetic complete preparation with final yield"});
    input.source.preparationEvidence = { instructions:"Synthetic instructions including all additions", finalAmount:300,
      finalUnit:"g", includesAllAdditions:true };
  });
  expect(result.eligible).toBe(true);
});

test.each([null,"",undefined,"unknown","ZZ","??"])("unknown market %p is never inferred from GTIN or provider", market => {
  blocked(change(input => { rebindProduct(input,{market}); }), "us-formulation-unverified");
});

test("regional identity and provider claims cannot stand in for reviewed US formulation", () => {
  const us = create("regional-US"), nz = create("regional-NZ-diagnostic-only");
  expect(us.product.gtin).toBe(nz.product.gtin);
  expect(us.product.name).toBe(nz.product.name);
  blocked(evaluate(nz),"outside-initial-US-product-scope");
  blocked(change(input => { input.source.kind = "provider-record"; input.review.verified = true; }),"primary-label-evidence-missing");
  blocked(change(input => { input.review = {verified:true}; }),"us-formulation-unverified");
  blocked(change(input => { input.source.product.market = "NZ"; }),"source-product-mismatch");
  blocked(change(input => { input.review.product.variant = "overseas formula"; }),"review-product-mismatch");
});

test("synthetic reviewed-label schema examples require a primary source and artifact-bound review", () => {
  // Contract-shape tests only. No real package or manufacturer data is asserted.
  const input=create();
  input.source.kind="package-label";
  blocked(evaluate(input),"us-formulation-unverified");
  input.review.kind="independent-label-review";
  expect(evaluate(input).eligible).toBe(true);
  expect(evaluate(input).warnings).toContain("reported-label-values-may-be-rounded");
  input.source.kind="manufacturer-label";
  input.source.artifact.locator="https://example.invalid/explicitly-synthetic-label";
  expect(evaluate(input).eligible).toBe(true);
  input.source.artifact.locator="http://example.invalid/explicitly-synthetic-label";
  blocked(evaluate(input),"invalid-source-locator");
});

test("multiple independent rejection reasons survive without a fabricated number", () => {
  const result=change(input=>{
    input.nutrients.addedSugar.value=null;
    input.nutrients.sodium.unit="%DV";
    input.sourceState.cacheStale=true;
  });
  blocked(result,"added-sugars-missing");
  expect(result.reasonCodes).toEqual(expect.arrayContaining(["unsupported-unit","stale-source"]));
});

test.each(["id","provider","recordId","edition","attribution"])("missing provenance source.%s blocks scoring", field => {
  blocked(change(input => { delete input.source[field]; }),"provenance-incomplete");
});

test("exact artifact, source edition, review and per-nutrient bindings are enforced", () => {
  blocked(change(input => { delete input.source.artifact.sha256; }),"provenance-incomplete");
  blocked(change(input => { input.review.sourceEdition = "older"; }),"review-source-binding-mismatch");
  blocked(change(input => { input.review.artifactSha256 = "f".repeat(64); }),"review-source-binding-mismatch");
  blocked(change(input => { input.nutrients.addedSugar.sourceId = "another-provider"; }),"nutrient-provenance-incomplete");
  blocked(change(input => { input.nutrients.addedSugar.sourceEdition = "older"; }),"nutrient-provenance-incomplete");
  blocked(change(input => { input.basis.sourceEdition = "older"; }),"basis-provenance-incomplete");
  blocked(change(input => { delete input.review.consistency; }),"consistency-review-missing");
  blocked(change(input => { input.product.gtin = "00012345600013"; }),"invalid-gtin");
});

test.each(["cacheStale","superseded"])("known %s and unknown source state cannot be silently cleared", field => {
  blocked(change(input => { input.sourceState[field] = true; }),field === "cacheStale"?"stale-source":"superseded-source");
  blocked(change(input => { delete input.sourceState[field]; }),"source-state-unknown");
});

test("conflicts are retained as review reasons and no provider merge is attempted", () => {
  const result = change(input => { input.sourceState.unresolvedConflicts.push({description:"Synthetic sodium observations disagree"}); });
  blocked(result,"conflicting-data");
  expect(result.inputStatus).toBe("needs-review");
});

test.each(["asOf","labelObservedOn","reviewedOn","reviewDueOn"])("missing and invalid %s dates block scoring", field => {
  blocked(change(input => { if(field === "asOf") delete input.asOf; else delete input.review[field]; }),"review-date-missing");
  blocked(change(input => { if(field === "asOf") input.asOf="2026-02-30"; else input.review[field]="2026-02-30"; }),"invalid-date");
});

test("365-day expiry equality, earlier deadlines, leap-day arithmetic and stale observations", () => {
  const input = create();
  Object.assign(input.review,{labelObservedOn:"2025-10-19",reviewedOn:"2025-10-19",reviewDueOn:"2026-10-19"});
  blocked(evaluate(input),"review-expired");
  Object.assign(input.review,{labelObservedOn:"2025-10-20",reviewedOn:"2025-10-20",reviewDueOn:"2026-10-20"});
  expect(evaluate(input).eligible).toBe(true);
  input.review.reviewDueOn="2026-10-21";
  blocked(evaluate(input),"invalid-review-deadline");
  Object.assign(input.review,{labelObservedOn:"2024-02-29",reviewedOn:"2024-02-29",reviewDueOn:"2025-02-28"});
  input.asOf="2025-02-28";
  input.source.retrievedOn="2025-02-28";
  blocked(evaluate(input),"review-expired");
  input.asOf="2025-02-27";
  input.source.retrievedOn="2025-02-27";
  expect(evaluate(input).eligible).toBe(true);
});

test("chronology, superseding revisions and absent source dates are not repaired by retrieval", () => {
  blocked(change(input => { input.source.revisionOn="2026-10-20"; }),"source-edition-postdates-observation");
  blocked(change(input => { input.review.reviewedOn="2026-10-20"; }),"future-source-or-review-date");
  blocked(change(input => { input.review.reviewedOn="2026-10-18"; }),"inconsistent-review-dates");
  blocked(change(input => { input.review.reviewDueOn="2026-10-18"; }),"invalid-review-deadline");
  blocked(change(input => { input.source.retrievedOn="2026-10-18"; }),"inconsistent-source-dates");
  blocked(change(input => { delete input.source.retrievedOn; }),"review-date-missing");
  blocked(change(input => { delete input.source.revisionOn; }),"provenance-incomplete");
  blocked(change(input => { input.source.publishedOn="2026-10-10"; input.source.revisionOn="2026-10-09"; }),"inconsistent-source-dates");
  expect(evaluate(create()).explanationInputs.sourceBindings.revisionOn).toBeNull();
});

test("known counterintuitive outcomes remain visible without category bonuses or energy penalties", () => {
  expect(evaluate(create("refined-starch")).experimentalRawScore).toBe(80);
  expect(evaluate(create("whole-grain-control")).experimentalRawScore)
    .toBe(evaluate(create("fortified-refined-control")).experimentalRawScore);
  expect(evaluate(create("protein-offset-control")).experimentalRawScore)
    .toBe(evaluate(create("protein-offset-plus-10g")).experimentalRawScore);
  blocked(evaluate(create("unsalted-nuts")),"unsupported-category");
});

test("deterministic immutable outputs do not mutate inputs, read the clock or touch storage/network", () => {
  const input = create(), before=JSON.stringify(input);
  const fetchBefore = global.fetch;
  global.fetch = jest.fn(() => { throw new Error("Network forbidden"); });
  const storageGet=jest.spyOn(Storage.prototype,"getItem");
  const storageSet=jest.spyOn(Storage.prototype,"setItem");
  const now=jest.spyOn(Date,"now").mockImplementation(() => { throw new Error("Clock forbidden"); });
  try {
    const first=evaluate(input), second=evaluate(input);
    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(first.explanationInputs.canonicalNutrients)).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(storageGet).not.toHaveBeenCalled();
    expect(storageSet).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
    input.nutrients.sodium.value=999;
    expect(first.explanationInputs.originalNutrients.sodium.value).toBe(200);
  } finally { global.fetch=fetchBefore; storageGet.mockRestore(); storageSet.mockRestore(); now.mockRestore(); }
});

test("additives, legal/marketing metadata, logging portions, and claimed grades do not alter results", () => {
  const original = evaluate(create());
  const result = change(input => {
    input.additives={status:"reported",items:["synthetic:E171"]};
    input.legalEvents=["synthetic historical event"];
    input.portion=5;
    input.organic=true;
    input.grade=100;
    input.scoreReady=true;
  });
  expect(result).toEqual(original);
  expect(getNutritionAssessmentQuality(undefined).scoreReady).toBe(false);
  expect(getNutritionAssessmentQuality(undefined).grade ?? null).toBeNull();
});

test.each([null,undefined,[],"food",42])("malformed input %p returns structured rejection", input => {
  blocked(evaluate(input),"input-not-object");
});

test("a future method version has no silent fallback", () => {
  blocked(change(input => { input.methodVersion="0.2"; }),"unsupported-method");
});

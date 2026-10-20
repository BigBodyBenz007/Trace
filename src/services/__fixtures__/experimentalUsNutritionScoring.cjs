// ALL names, product/formulation evidence and numbers are SYNTHETIC, not labels.
// Independently transcribed from the specification, not from the old worksheet.
const SPECIFICATION = Object.freeze({
  locator: "docs/us-nutrition-grade-specification-2026-10-19.md",
  edition: "2026-10-19", sha256: "4c93151f8cae914a084dbc0f145f140fbf85ebd8dfd6f546f7572e28ddfb0f21",
  attribution: "Trace synthetic specification cases; no real manufacturer data or label verification",
});
const KEYS = ["calories", "saturatedFat", "addedSugar", "totalSugar", "sodium", "fiber", "protein", "fat", "carbohydrates"];
const UNITS = ["kcal", "g", "g", "g", "mg", "g", "g", "g", "g"];
// Expected decimals are specification reference observations, not computed here.
const CASES = [
  ["produce", "produce", "100g", [35,.1,0,3,30,3,2,.3,6], 86.3922],
  ["sugary-beverage", "sugar-sweetened-beverage", "100ml", [42,0,10.5,10.5,10,0,0,0,10.5], 26.3768],
  ["whole-grain-cereal", "breakfast-cereal", "100g", [360,.7,3,5,200,10,10,5,70], 63.0978],
  ["sweet-cereal", "breakfast-cereal", "100g", [390,1,25,30,450,3,7,4,82], 11.6680],
  ["plain-yogurt", "spoonable-yogurt", "100g", [70,1,0,4,45,0,6,2,6], 65.3623],
  ["sweet-yogurt", "spoonable-yogurt", "100g", [115,1,12,16,50,0,5,2,20], 21.8841],
  ["protein-bar", "conventional-protein-bar", "100g", [400,6,15,20,300,10,30,15,35], 5.7971],
  ["unsalted-nuts", "nuts", "100g", [600,7,0,4,5,10,21,50,20], 33.1522, "unsupported-category"],
  ["frozen-meal", "frozen-meal", "100g", [140,1.5,1.5,3,250,2.5,8,4,18], 48.9268],
  ["processed-meat", "processed-meat", "100g", [280,8,1,2,900,0,18,22,3], 12.0000],
  ["plain-legumes", "legumes", "100g", [120,.2,0,1,5,7,8,.6,20], 96.4855],
  ["refined-starch", "refined-starch", "100g", [360,0,0,0,0,0,0,0,90], 80.0000],
  ["whole-grain-control", "breakfast-cereal", "100g", [360,.7,3,5,200,10,10,5,70], 63.0978],
  ["fortified-refined-control", "breakfast-cereal", "100g", [360,.7,3,5,200,10,10,5,70], 63.0978],
  ["juice-no-added-sugar", "juice", "100ml", [46,0,0,10,3,.2,.2,.1,11], 80.3634],
  ["water-diagnostic-only", "water", "100ml", [0,0,0,0,0,0,0,0,0], 80.0000, "unsupported-category"],
  ["oil-diagnostic-only", "oil", "100g", [900,14,0,0,0,0,0,100,0], 26.6667, "unsupported-category"],
  ["protein-offset-control", "conventional-protein-bar", "100g", [120,.5,5,5,300,0,2,1,25], 36.8841],
  ["protein-offset-plus-10g", "conventional-protein-bar", "100g", [160,.5,5,5,300,0,12,1,25], 36.8841],
  ["beverage-diluted-half", "sugar-sweetened-beverage", "100ml", [21,0,5.25,5.25,5,0,0,0,5.25], 51.8551],
  ["regional-US", "breakfast-cereal", "100g", [390,1,25,30,450,3,7,4,82], 11.6680],
  ["regional-NZ-diagnostic-only", "breakfast-cereal", "100g", [370,1,6,11,450,3,7,4,78], 18.7016, "outside-initial-US-product-scope"],
].map(([id, category, basis, values, specificationRawA, rejection]) => Object.freeze({
  id, category, basis, values: Object.freeze(values), specificationRawA, rejection: rejection || null,
  synthetic: true, specification: SPECIFICATION,
}));

function createSyntheticInput(id = "whole-grain-cereal") {
  const row = CASES.find((item) => item.id === id);
  if (!row) throw new Error(`Unknown synthetic reference: ${id}`);
  const regional = id.startsWith("regional-");
  const product = { gtin: "00012345600012", name: regional ? "Synthetic regional formulation" : `Synthetic ${id}`,
    brand: "Trace synthetic research", variant: "controlled example", packageDescription: "synthetic reference package",
    preparation: "as-sold", preparationDescription: "Synthetic as-sold reference, no preparation additions",
    market: id === "regional-NZ-diagnostic-only" ? "NZ" : "US", category: row.category };
  const sourceId = `synthetic:${id}:2026-10-19`;
  return {
    methodId: "trace-us-nutrient-profile", methodVersion: "0.1-research-A", asOf: "2026-10-19",
    product,
    basis: { kind: row.basis, amount: 100, unit: row.basis === "100g" ? "g" : "ml",
      sourceId, sourceEdition: SPECIFICATION.edition, field: `specification.${id}.basis` },
    nutrients: Object.fromEntries(KEYS.map((key, index) => [key, { value: row.values[index], unit: UNITS[index],
      sourceId, sourceEdition: SPECIFICATION.edition, field: `specification.${id}.${key}` }])),
    source: { id: sourceId, provider: "trace-synthetic-specification", recordId: id, edition: SPECIFICATION.edition,
      kind: "synthetic-reference", attribution: SPECIFICATION.attribution,
      artifact: { id: "trace-synthetic-grade-specification", locator: SPECIFICATION.locator, sha256: SPECIFICATION.sha256 },
      product: { ...product }, retrievedOn: "2026-10-19", publishedOn: null, revisionOn: null },
    review: { id: `synthetic-review:${id}`, kind: "synthetic-controlled", reviewerId: "trace-synthetic-fixture-author",
      decision: "matched-product-market-and-label", consistency: "reviewed-no-unresolved-conflict",
      notes: "Synthetic controlled evidence only; no real package or manufacturer label was verified",
      sourceId, sourceEdition: SPECIFICATION.edition,
      artifactId: "trace-synthetic-grade-specification", artifactSha256: SPECIFICATION.sha256,
      product: { ...product }, labelObservedOn: "2026-10-19", reviewedOn: "2026-10-19", reviewDueOn: "2027-10-19" },
    sourceState: { cacheStale: false, superseded: false, unresolvedConflicts: [] },
  };
}

module.exports = { SPECIFICATION, CASES, createSyntheticInput };

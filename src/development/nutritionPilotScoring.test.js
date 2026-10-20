const { evaluateNutritionPilot: evaluate, REQUIRED } = require('./nutritionPilotScoring');
const { PROFILES, synthetic, comparisonRows } = require('./nutritionPilotFixtures');
const clone = value => JSON.parse(JSON.stringify(value));
const sample = () => synthetic('arithmetic-control', 'frozen-meal', {
  calories: 100, addedSugar: 2, saturatedFat: 1, sodium: 115, fiber: 0.7, protein: 1.25,
});
const reason = (input, code) => {
  const result = evaluate(input);
  expect(result.eligible).toBe(false); expect(result.experimental).toBeNull();
  expect(result.reasons.map(r => r.code)).toContain(code);
  expect(result.grade).toBeNull(); expect(result.scoreReady).toBe(false);
};

test('independent hand calculation: 75 * (1 - (7/30 + 1/4)/2) = 56.875', () => {
  const r = evaluate(sample());
  expect(r.experimental.raw).toBeCloseTo(56.875, 12);
  expect(r.experimental.score).toBe(57);
  const c = r.experimental.contributions;
  expect(c.base + c.fiberCredit + c.proteinCredit - c.addedSugarLoss - c.saturatedFatLoss - c.sodiumLoss - c.strongestLoss).toBeCloseTo(56.875, 12);
  expect(r.experimental.strongest).toEqual(['saturatedFat', 'sodium']);
});

test('deterministic, immutable independent results, public grading disabled', () => {
  const input = sample(), before = clone(input), first = evaluate(input);
  expect(evaluate(input)).toEqual(first); expect(input).toEqual(before);
  expect(Object.isFrozen(input)).toBe(false); expect(Object.isFrozen(first.experimental)).toBe(true);
  expect(first.grade).toBeNull(); expect(first.scoreReady).toBe(false);
  expect(first.sourceConfidence.scanMatchEligible).toBe(false);
});

test.each(REQUIRED)('essential nutrient %s cannot be absent', key => {
  const input = sample(); delete input.nutrients[key]; reason(input, 'missing-nutrient');
});

test('optional nutrients, GTIN, reviewer, hash, revision, market and serving mass do not gate arithmetic', () => {
  const input = sample(); delete input.source; delete input.evidence; delete input.product.gtin;
  input.basis = { kind: 'serving', amount: null, unit: null };
  const result = evaluate(input);
  expect(result.experimental.raw).toBeCloseTo(56.875, 12);
  expect(result.quantities.declared.totalSugar).toBeNull();
  expect(result.sourceConfidence.market).toMatch(/Unknown market/);
  expect(result.sourceConfidence.warnings).toContain('No label review date supplied.');
});

test('serving and reference scaling is invariant; no density or volume assumption', () => {
  const input = sample(), doubled = clone(input);
  doubled.basis = { kind: 'serving', amount: 200, unit: 'g' };
  Object.values(doubled.nutrients).forEach(n => { n.value *= 2; });
  expect(evaluate(doubled).experimental).toEqual(evaluate(input).experimental);
  doubled.basis = { kind: 'serving', amount: 1, unit: 'cup' };
  expect(evaluate(doubled).experimental).toEqual(evaluate(input).experimental);
  expect(evaluate(doubled).quantities.per100Reference).toBeNull();
});

test('supported nutrient unit conversions preserve the independent answer', () => {
  const input = sample(); input.nutrients.calories = { value: 418.4, unit: 'kJ' };
  input.nutrients.saturatedFat = { value: 1000, unit: 'mg' };
  input.nutrients.sodium = { value: 0.115, unit: 'g' };
  expect(evaluate(input).experimental.raw).toBeCloseTo(56.875, 10);
});

test.each([
  ['missing basis', p => { delete p.basis; }, 'basis-unknown'],
  ['wrong reference dimension', p => { p.basis.unit = 'ml'; }, 'basis-inconsistent'],
  ['zero serving', p => { p.basis = { kind: 'serving', amount: 0, unit: 'g' }; }, 'invalid-serving'],
  ['negative', p => { p.nutrients.protein.value = -1; }, 'invalid-value'],
  ['string', p => { p.nutrients.protein.value = '1'; }, 'invalid-value'],
  ['NaN', p => { p.nutrients.protein.value = NaN; }, 'invalid-value'],
  ['infinite', p => { p.nutrients.protein.value = Infinity; }, 'invalid-value'],
  ['percent DV', p => { p.nutrients.sodium.unit = '%DV'; }, 'unsupported-unit'],
  ['total sugar lower than added', p => { p.nutrients.totalSugar = { value: 1, unit: 'g' }; }, 'contradictory-nutrients'],
  ['total fat lower than saturated', p => { p.nutrients.fat = { value: 0, unit: 'g' }; }, 'contradictory-nutrients'],
  ['fiber above carbs', p => { p.nutrients.carbohydrates = { value: 0.5, unit: 'g' }; }, 'contradictory-nutrients'],
  ['conflicting panels', p => { p.sourceState.unresolvedConflicts = ['Other formulation']; }, 'conflicting-formulation'],
  ['mixed measurement editions', p => { p.nutrients.protein.sourceEdition = 'different'; }, 'mixed-source-bindings'],
  ['overseas formulation', p => { p.evidence.market.claim = 'NZ'; }, 'outside-us-pilot'],
  ['zero calories', p => { p.nutrients.calories.value = 0; }, 'zero-energy'],
  ['numeric overflow', p => { p.nutrients.calories.value = Number.MIN_VALUE; }, 'density-overflow'],
  ['unknown category', p => { p.product.category = null; }, 'category-not-scored'],
])('structured rejection: %s', (_, change, code) => { const input = sample(); change(input); reason(input, code); });

test('total and free sugars never supply missing added sugar', () => {
  const input = sample(); delete input.nutrients.addedSugar;
  input.nutrients.totalSugar = input.nutrients.freeSugar = { value: 2, unit: 'g' };
  reason(input, 'missing-nutrient');
});

test('known overseas product metadata cannot disappear behind absent or conflicting market evidence', () => {
  const input = sample(); input.product.market = 'NZ'; delete input.evidence;
  reason(input, 'outside-us-pilot');
  expect(evaluate(input).sourceConfidence.market).toContain('NZ formulation');
  input.evidence = { market: { claim: 'US', verification: 'matched-formulation' } };
  reason(input, 'conflicting-market');
  expect(evaluate(input).sourceConfidence.market).toContain('Conflicting market');
});

test('declared zero is preserved; missing does not receive a benefit', () => {
  const input = sample(); input.nutrients.addedSugar.value = 0;
  expect(evaluate(input).quantities.declared.addedSugar).toBe(0);
  input.nutrients.addedSugar.value = null; reason(input, 'missing-nutrient');
});

test('exact caps, rounding and strongest guard are bounded', () => {
  const input = synthetic('bounds', 'refined-starch', { calories: 100, addedSugar: 0, saturatedFat: 0, sodium: 0, fiber: 1.4, protein: 2.5 });
  expect(evaluate(input).experimental.score).toBe(100);
  input.nutrients.fiber.value = 14; input.nutrients.protein.value = 25;
  expect(evaluate(input).experimental.score).toBe(100);
  input.nutrients.addedSugar.value = 10; input.nutrients.saturatedFat.value = 4; input.nutrients.sodium.value = 460;
  expect(evaluate(input).experimental.raw).toBe(0);
  expect(evaluate(input).experimental.contributions.strongestLoss).toBe(50);
  input.nutrients.saturatedFat.value = input.nutrients.sodium.value = 0;
  // One maximum burden alone limits even maximum credits to 33 1/3.
  expect(evaluate(input).experimental.raw).toBeCloseTo(100 / 3, 12);
});

test('solid starch baseline is 50; identical whole/refined profiles tie', () => {
  const find = id => evaluate(PROFILES.find(p => p.id === id));
  expect(find('pure-starch').experimental.score).toBe(50);
  expect(find('whole-grain-evidence').experimental).toEqual(find('refined-grain-evidence').experimental);
  expect(find('whole-grain-evidence').experimental).toEqual(find('grain-evidence-unknown').experimental);
  expect(find('unsalted-nuts').experimental.raw).toBeCloseTo(80.52536231884058, 10);
});

test('protein credit and its energy denominator effects are explicit', () => {
  const low = evaluate(PROFILES.find(p => p.id === 'protein-control'));
  const high = evaluate(PROFILES.find(p => p.id === 'protein-plus'));
  expect(high.experimental.contributions.proteinCredit).toBeGreaterThan(low.experimental.contributions.proteinCredit);
  expect(high.quantities.per100Calories.sodium).toBeLessThan(low.quantities.per100Calories.sodium);
  expect(high.experimental.score).toBeGreaterThan(low.experimental.score);
});

test('beverage dilution changes concentration, not total sugar; no fabricated drink score', () => {
  const full = evaluate(PROFILES.find(p => p.id === 'sugary-drink'));
  const diluted = evaluate(PROFILES.find(p => p.id === 'same-drink-plus-water'));
  expect(full.experimental).toBeNull(); expect(diluted.experimental).toBeNull();
  expect(full.quantities.declared.addedSugar).toBe(10.5);
  expect(diluted.quantities.declared.addedSugar).toBe(10.5);
  expect(diluted.quantities.per100Reference.addedSugar).toBe(5.25);
  expect(evaluate(PROFILES.find(p => p.id === 'unsweetened-drink')).experimental).toBeNull();
  expect(evaluate(PROFILES.find(p => p.id === 'oil')).experimental).toBeNull();
});

test('ingredients, additive identifiers and source metadata do not alter nutrition', () => {
  const input = sample(), before = evaluate(input).experimental;
  input.additives = { status: 'reported', items: [{ name: 'SYNTHETIC' }] };
  input.evidence.reviewerId = 'someone'; input.product.gtin = '00012345600012';
  input.ingredients = { text: 'SYNTHETIC' }; input.sourceState.cacheStale = true;
  expect(evaluate(input).experimental).toEqual(before);
  expect(evaluate(input).sourceConfidence.scanMatchEligible).toBe(false);
});

test('the self-contained 18-observation fixture preserves baseline and reports exact remaining barriers', () => {
  const rows = comparisonRows();
  expect(rows).toHaveLength(18); expect(rows.filter(r => r.baselineScore !== null)).toHaveLength(5);
  expect(rows.filter(r => r.eligible)).toHaveLength(10);
  expect(rows.find(r => r.id === 'whole-grain-cereal').eligible).toBe(true);
  expect(rows.find(r => r.id === 'white-bread').eligible).toBe(true);
  for (const id of ['refined-cereal-rice-krispies', 'protein-bar']) expect(rows.find(r => r.id === id).reasons.map(r => r.code)).toContain('conflicting-formulation');
  for (const r of PROFILES) { const result = evaluate(r); expect(result.grade).toBeNull(); expect(result.scoreReady).toBe(false); }
});

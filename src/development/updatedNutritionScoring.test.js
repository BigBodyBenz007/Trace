const { evaluateUpdatedNutrition: evaluate, BAND_SCORES, letterFor } = require('./updatedNutritionScoring');
const original = require('./publishedNutritionScoring');

// Synthetic controlled inputs unless explicitly labelled official workbook examples.
function synthetic(values = {}, category = 'general') {
  const units = { energyKj: 'kJ', calories: 'kcal', sodium: 'mg' };
  return { synthetic: true, updatedCategory: category,
    basis: { amount: 100, unit: category === 'beverage' || category === 'water' ? 'ml' : 'g' },
    nutrients: Object.fromEntries(Object.entries({ energyKj: 0, saturatedFat: 0, totalSugar: 0, salt: 0,
      fiber: 0, protein: 0, ...values }).map(([key, value]) => [key, { value, unit: units[key] || 'g' }])),
    updatedFvlContent: { percent: 0, basis: 'Explicit synthetic composition', source: 'Synthetic control' },
    nonNutritiveSweeteners: { present: false, basis: 'Explicit synthetic composition', source: 'Synthetic control' } };
}
const codes = result => result.reasons.map(r => r.code);

describe('official updated calculator cached examples, 2024-04-04 edition', () => {
  // Independently extracted cached OOXML cells, not calculated with this engine.
  // Full cells, source hashes and provenance are in the ignored research archive;
  // these five small numeric reference cases keep the test self-contained.
  test.each([
    ['General foods AD3/AE3: apple sauce', 'general', { energyKj: 321, totalSugar: 17.1, saturatedFat: 0, salt: 0.025, fiber: 1.9, protein: 0.2 }, 90, 5, 0, 'A'],
    ['Red meat AB3/AC3: tenderloin', 'red-meat', { energyKj: 489, totalSugar: 0, saturatedFat: 0.9, salt: 0.125, fiber: 0, protein: 23.7 }, 0, 1, -1, 'A'],
    ['Cheese AB3/AC3', 'cheese', { energyKj: 1523, totalSugar: 0.5, saturatedFat: 19.8, salt: 1.8, fiber: 0.1, protein: 24.1 }, 0, 22, 15, 'D'],
    ['Fats oils nuts seeds AI3/AJ3: animal fats', 'fats-nuts-seeds', { energyKj: 3036, totalSugar: 0.9, saturatedFat: 54.7, fat: 81.3, salt: 0.6, fiber: 0, protein: 0.7 }, 0, 22, 22, 'E'],
    ['Beverages AG3/AH3: orange juice', 'beverage', { energyKj: 201, totalSugar: 9, saturatedFat: 0, salt: 0, fiber: 0, protein: 0.5 }, 100, 10, 4, 'C'],
  ])('%s', (name, category, nutrients, fvl, negative, raw, letter) => {
    const input = synthetic(nutrients, category); input.updatedFvlContent.percent = fvl;
    const result = evaluate(input);
    expect(result.status).toBe('calculated');
    expect(result.points.negative.possible).toEqual([negative]);
    expect(result.rawScore).toBe(raw); expect(result.letter).toBe(letter);
    expect(result.nutritionScore100).toBe(BAND_SCORES[letter]);
  });
});

describe('updated nutrient boundaries and published category rules', () => {
  test.each([
    ['energyKj', 'energy', 335, 0], ['energyKj', 'energy', 3350, 9],
    ...[3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51].map((v, i) => ['totalSugar', 'sugar', v, i]),
    ...[0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4].map((v, i) => ['salt', 'salt', v, i]),
    ...[3, 4.1, 5.2, 6.3, 7.4].map((v, i) => ['fiber', 'fiber', v, i]),
    ...[2.4, 4.8, 7.2, 9.6, 12, 14, 17].map((v, i) => ['protein', 'protein', v, i]),
    ['saturatedFat', 'saturatedFat', 1, 0], ['saturatedFat', 'saturatedFat', 10, 9],
  ])('%s exact boundary %s uses the lower point band', (nutrient, key, value, expected) => {
    expect(evaluate(synthetic({ [nutrient]: value })).points[key].possible).toEqual([expected]);
    expect(evaluate(synthetic({ [nutrient]: value + 0.00001 })).points[key].possible).toEqual([expected + 1]);
  });
  test.each([
    ...[30, 90, 150, 210, 240, 270, 300, 330, 360, 390].map((v, i) => ['energyKj', 'energy', v, i]),
    ...[0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11].map((v, i) => ['totalSugar', 'sugar', v, i]),
    ...[1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3].map((v, i) => ['protein', 'protein', v, i]),
    ['salt', 'salt', 3.2, 15],
  ])('beverage %s boundary %s follows FAQ, including 3.2 g salt', (nutrient, key, value, expected) => {
    expect(evaluate(synthetic({ [nutrient]: value }, 'beverage')).points[key].possible).toEqual([expected]);
    expect(evaluate(synthetic({ [nutrient]: value + 0.00001 }, 'beverage')).points[key].possible).toEqual([expected + 1]);
  });
  test.each([[10, 1], [16, 2], [64, 10]])('fat-ratio boundary %s is inclusive', (sat, expected) => {
    expect(evaluate(synthetic({ saturatedFat: sat, fat: 100 }, 'fats-nuts-seeds')).points.saturatedFat.possible).toEqual([expected]);
    expect(evaluate(synthetic({ saturatedFat: sat - 0.00001, fat: 100 }, 'fats-nuts-seeds')).points.saturatedFat.possible).toEqual([expected - 1]);
  });
  test('fat energy uses saturates times 37, independently of total calories', () => {
    const a = synthetic({ saturatedFat: 120 / 37, fat: 90, energyKj: 1200 }, 'fats-nuts-seeds');
    const b = JSON.parse(JSON.stringify(a)); b.nutrients.energyKj.value = 3600;
    expect(evaluate(a).points.energy.possible).toEqual([0]);
    expect(evaluate(a).rawScore).toBe(evaluate(b).rawScore);
    a.nutrients.saturatedFat.value += 0.0001;
    expect(evaluate(a).points.energy.possible).toEqual([1]);
  });
  test.each([[40, 0, 0], [40.04, 0, 0], [40.06, 1, 2], [60, 1, 2], [60.1, 2, 4], [80, 2, 4], [80.1, 5, 6]])(
    'updated FVL %s keeps one-decimal recipe rounding', (percent, food, drink) => {
      const a = synthetic(); a.updatedFvlContent.percent = percent;
      expect(evaluate(a).points.plant.possible).toEqual([food]);
      a.updatedCategory = 'beverage'; a.basis.unit = 'ml';
      expect(evaluate(a).points.plant.possible).toEqual([drink]);
    });
  test('high FVL no longer restores protein at N >= 11; cheese still counts it', () => {
    const input = synthetic({ energyKj: 3400, saturatedFat: 2, protein: 20 });
    input.updatedFvlContent.percent = 100;
    expect(evaluate(input).points.proteinApplied.possible).toEqual([0]);
    input.updatedCategory = 'cheese';
    expect(evaluate(input).points.proteinApplied.possible).toEqual([7]);
  });
  test('fats cut off protein at N >= 7 while beverages always count protein', () => {
    const input = synthetic({ saturatedFat: 12, fat: 100, salt: 0.7, protein: 20 }, 'fats-nuts-seeds');
    expect(evaluate(input).points.negative.possible).toEqual([7]);
    expect(evaluate(input).points.proteinApplied.possible).toEqual([0]);
    input.nutrients.salt.value = 0.6;
    expect(evaluate(input).points.proteinApplied.possible).toEqual([7]);
    const drink = synthetic({ energyKj: 400, saturatedFat: 5, protein: 5 }, 'beverage');
    expect(evaluate(drink).points.proteinApplied.possible).toEqual([7]);
  });
  test('red meat caps protein at two instead of seven', () => {
    expect(evaluate(synthetic({ protein: 20 }, 'red-meat')).points.proteinApplied.possible).toEqual([2]);
    expect(evaluate(synthetic({ protein: 20 })).points.proteinApplied.possible).toEqual([7]);
  });
  test('sweetener presence adds four once, with no toxicity or additive-score inference', () => {
    const input = synthetic({}, 'beverage'); input.nonNutritiveSweeteners.present = true;
    input.additives = { status: 'unknown' };
    const result = evaluate(input);
    expect(result.rawScore).toBe(4); expect(result.letter).toBe('C');
    expect(result.points.nonNutritiveSweeteners.possible).toEqual([4]);
    expect(result).not.toHaveProperty('additiveRisk');
  });
  test.each([
    ['general', -1, 'A'], ['general', 0, 'A'], ['general', 1, 'B'], ['general', 2, 'B'], ['general', 3, 'C'],
    ['general', 10, 'C'], ['general', 11, 'D'], ['general', 18, 'D'], ['general', 19, 'E'],
    ['fats-nuts-seeds', -6, 'A'], ['fats-nuts-seeds', -5, 'B'], ['fats-nuts-seeds', 2, 'B'], ['fats-nuts-seeds', 3, 'C'],
    ['beverage', -18, 'B'], ['beverage', 2, 'B'], ['beverage', 3, 'C'], ['beverage', 6, 'C'],
    ['beverage', 7, 'D'], ['beverage', 9, 'D'], ['beverage', 10, 'E'],
  ])('official %s band at raw %s', (category, raw, letter) => expect(letterFor(raw, category)).toBe(letter));
  test('water receives A/90 categorically, with no invented raw score', () => {
    const result = evaluate(synthetic({}, 'water'));
    expect(result.letter).toBe('A'); expect(result.nutritionScore100).toBe(90);
    expect(result.rawScore).toBeNull(); expect(result.rawRange).toBeNull();
    expect(result.points).toEqual({}); expect(result.displayScale).toMatch(/ordinal/);
    expect(Math.max(...Object.values(BAND_SCORES))).toBe(90);
  });
});

describe('uncertainty, independent evidence and normalization safeguards', () => {
  test('missing original-to-updated FVL evidence stays unknown', () => {
    const input = synthetic({ energyKj: 1000 });
    delete input.updatedFvlContent;
    input.plantContent = { percent: 100, basis: 'Original nuts rule', source: 'Old method' };
    const result = evaluate(input);
    expect(result.normalized.plantPercent).toBeNull();
    expect(result.letters).toEqual(['A', 'B']); expect(result.nutritionScore100).toBeNull();
  });
  test('unknown NNS gives B/C, not guessed absence', () => {
    const input = synthetic({}, 'beverage'); delete input.nonNutritiveSweeteners;
    const result = evaluate(input);
    expect(result.letters).toEqual(['B', 'C']); expect(result.nutritionScore100).toBeNull();
    expect(result.normalized.nonNutritiveSweeteners).toBeNull();
  });
  test('unknown raw score can yield a band only when every completion agrees', () => {
    const input = synthetic({ energyKj: 3400, totalSugar: 70, salt: 5, saturatedFat: 20 });
    delete input.updatedFvlContent;
    const result = evaluate(input);
    expect(result.rawRange).toEqual([50, 55]); expect(result.rawScore).toBeNull();
    expect(result.letter).toBe('E'); expect(result.nutritionScore100).toBe(10);
  });
  test('unresolved categories evaluate all candidates without assuming a meat proportion', () => {
    const input = synthetic({ protein: 20, energyKj: 1700 });
    input.updatedCategory = null; input.updatedCategoryCandidates = ['general', 'red-meat'];
    const result = evaluate(input);
    expect(result.letters).toEqual(['A', 'C']); expect(result.nutritionScore100).toBeNull();
    expect(result.categoryCandidates).toEqual(['general', 'red-meat']);
    input.nutrients.salt.value = 5;
    expect(evaluate(input).letter).toBe('E');
  });
  test('missing nutrient values stay null even when a known total bounds their points', () => {
    const input = synthetic({ saturatedFat: null, fat: 0, fiber: null, carbohydrates: 0 }, 'beverage');
    input.product = { market: 'US' };
    const result = evaluate(input);
    expect(result.normalized.nutrients.saturatedFat).toBeNull(); expect(result.normalized.nutrients.fiber).toBeNull();
    expect(result.points.saturatedFat.possible).toEqual([0]); expect(result.points.fiber.possible).toEqual([0]);
    expect(result.letter).toBe('B');
  });
  test('unknown or EU carbohydrate basis does not impose US fiber bounds', () => {
    const input = synthetic({ fiber: 6, carbohydrates: 0 });
    expect(evaluate(input).status).toBe('calculated');
    input.product = { market: 'US' };
    expect(codes(evaluate(input))).toContain('contradictory-nutrients');
  });
  test('normalizes before official kcal conversion and preserves direct kJ', () => {
    const input = synthetic({ energyKj: null, calories: 399 }); input.basis.amount = 200;
    expect(evaluate(input).normalized.nutrients.energyKj).toBe(838);
    input.nutrients.energyKj = { value: 1669, unit: 'kJ' };
    expect(evaluate(input).normalized.nutrients.energyKj).toBe(834.5);
  });
  test('sodium converts directly to salt, without intermediate rounding', () => {
    const input = synthetic({ salt: null, sodium: 79.999 });
    const result = evaluate(input);
    expect(result.normalized.nutrients.salt).toBeCloseTo(0.1999975, 10);
    expect(result.points.salt.possible).toEqual([0]);
    input.nutrients.sodium.value = 80.001;
    expect(evaluate(input).points.salt.possible).toEqual([1]);
  });
  test('mass units and explicit US fluid ounces are converted, never density-guessed', () => {
    const input = synthetic({ totalSugar: 1 }, 'beverage');
    input.nutrients.saturatedFat = { value: 500, unit: 'mg' };
    input.basis = { amount: 1, unit: 'fl oz', system: 'US' };
    expect(evaluate(input).normalized.nutrients.saturatedFat).toBeCloseTo(50 / 29.5735295625, 10);
    delete input.basis.system; expect(codes(evaluate(input))).toContain('unsupported-basis');
    input.basis = { amount: 100, unit: 'g' }; expect(codes(evaluate(input))).toContain('volume-required');
  });
  test('missing GTIN, market, hash and review date remain confidence warnings, not point penalties', () => {
    const result = evaluate(synthetic());
    expect(result.status).toBe('calculated'); expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.scanMatchEligible).toBe(false);
    const unknown = synthetic({ addedSugar: null, freeSugar: null });
    expect(evaluate(unknown).nutritionScore100).toBe(result.nutritionScore100);
  });
  test('known honey or sugar is not accidentally excluded by the old Yuka scope', () => {
    const input = synthetic({ totalSugar: 80 }); input.product = { category: 'honey' };
    expect(evaluate(input).status).toBe('calculated');
    input.product.category = 'infant-formula'; expect(codes(evaluate(input))).toContain('excluded-product-category');
  });
  test.each([
    ['invalid-value', p => { p.nutrients.totalSugar.value = -1; }],
    ['invalid-value', p => { p.nutrients.energyKj.value = Infinity; }],
    ['unsupported-unit', p => { p.nutrients.totalSugar.unit = 'cups'; }],
    ['unsupported-basis', p => { p.basis.amount = 0; }],
    ['inconsistent-basis', p => { p.basis.kind = '100ml'; }],
    ['mixed-measurement-basis', p => { p.nutrients.totalSugar.basis = { amount: 50, unit: 'g' }; }],
    ['conflicting-panels', p => { p.sourceState = { unresolvedConflicts: ['different panels'] }; }],
    ['conflicting-provenance', p => { p.nutrients.totalSugar.panelId = 'a'; p.nutrients.salt.panelId = 'b'; }],
    ['conflicting-market', p => { p.product = { market: 'US' }; p.evidence = { market: { claim: 'UK' } }; }],
    ['conflicting-energy', p => { p.nutrients.calories = { value: 100, unit: 'kcal' }; }],
    ['conflicting-salt-sodium', p => { p.nutrients.sodium = { value: 100, unit: 'mg' }; }],
    ['contradictory-nutrients', p => { p.nutrients.addedSugar = { value: 1, unit: 'g' }; }],
    ['contradictory-nutrients', p => { p.nutrients.totalSugar.value = null; p.nutrients.carbohydrates = { value: 0, unit: 'g' }; p.nutrients.freeSugar = { value: 1, unit: 'g' }; }],
    ['impossible-mass', p => { p.nutrients.protein.value = 101; }],
    ['plant-evidence-missing', p => { p.updatedFvlContent.source = null; }],
    ['invalid-plant-content', p => { p.updatedFvlContent.percent = 101; }],
    ['sweetener-evidence-missing', p => { p.nonNutritiveSweeteners.source = null; }],
    ['invalid-sweetener-evidence', p => { p.nonNutritiveSweeteners.present = 'no'; }],
    ['unsupported-category', p => { p.updatedCategory = 'automatic'; }],
    ['conflicting-category', p => { p.updatedCategoryCandidates = ['general', 'red-meat']; }],
    ['invalid-category-candidates', p => { p.updatedCategory = null; p.updatedCategoryCandidates = ['general', 'general']; }],
    ['undefined-fat-ratio', p => { p.updatedCategory = 'fats-nuts-seeds'; p.nutrients.fat = { value: 0, unit: 'g' }; }],
    ['fat-denominator-unknown', p => { p.updatedCategory = 'fats-nuts-seeds'; }],
    ['water-category-conflict', p => { p.updatedCategory = 'water'; p.basis.unit = 'ml'; p.nutrients.totalSugar.value = 1; }],
    ['water-category-conflict', p => { p.updatedCategory = 'water'; p.basis.unit = 'ml'; p.nonNutritiveSweeteners.present = true; }],
  ])('rejects %s without producing a grade', (reason, mutate) => {
    const input = synthetic(); mutate(input); const result = evaluate(input);
    expect(codes(result)).toContain(reason); expect(result.nutritionScore100).toBeNull();
    expect(result.grade).toBeNull(); expect(result.scoreReady).toBe(false);
  });
});

describe('all 18 real observations remain independent from old records and consumers', () => {
  const fixtures = require('./updatedNutritionFixtures');
  const oldFixtures = require('./publishedNutritionFixtures');
  const EXPECTED = {
    'refined-cereal-rice-krispies': null, 'sugary-cereal-frosted-flakes': 10, 'plain-almonds': 90,
    'peanut-butter': null, 'frozen-meal': null, 'processed-meat': 10, 'protein-bar': null,
    'white-bread': null, 'whole-wheat-bread': null, 'whole-grain-cereal': 90, 'olive-oil': 70,
    'regular-soda': 10, 'diet-soda': 50, 'unsweetened-tea': 70, 'plain-yogurt': 90,
    'sweetened-yogurt': 90, 'fresh-apple': 90, 'fresh-broccoli': 90,
  };
  test.each(fixtures.OBSERVATIONS.map(profile => [profile.id, profile]))('%s has a coarse band or explicit unresolved state', (id, profile) => {
    const before = JSON.stringify(profile), old = oldFixtures.OBSERVATIONS.find(p => p.id === id);
    const oldBefore = JSON.stringify(old), oldScore = original.evaluatePublishedNutrition(old);
    const result = evaluate(profile);
    expect(result.nutritionScore100).toBe(EXPECTED[id]);
    expect(result.grade).toBeNull(); expect(result.scoreReady).toBe(false); expect(result.scanMatchEligible).toBe(false);
    expect(JSON.stringify(profile)).toBe(before); expect(JSON.stringify(old)).toBe(oldBefore);
    expect(profile.nutrients).toEqual(old.nutrients); expect(profile.basis).toEqual(old.basis);
    expect(original.evaluatePublishedNutrition(old)).toEqual(oldScore);
    expect(evaluate(profile)).toEqual(result); expect(Object.isFrozen(result.normalized.nutrients)).toBe(true);
  });
  test('all eighteen are covered and only official A-E encodings are returned', () => {
    expect(fixtures.OBSERVATIONS).toHaveLength(18);
    expect(Object.keys(EXPECTED).sort()).toEqual(fixtures.OBSERVATIONS.map(p => p.id).sort());
    for (const input of fixtures.PROFILES) {
      const result = evaluate(input);
      expect(result.grade).toBeNull(); expect(result.scoreReady).toBe(false);
      expect([null, ...Object.values(BAND_SCORES)]).toContain(result.nutritionScore100);
    }
  });
  test('Pepsi missing fiber is bounded with label rounding, never changed to zero', () => {
    const pepsi = fixtures.OBSERVATIONS.find(p => p.id === 'regular-soda');
    const result = evaluate(pepsi);
    expect(result.normalized.nutrients.fiber).toBeNull();
    expect(result.normalized.derivedBounds.fiber.max).toBeCloseTo(100 / 355, 10);
    expect(result.normalized.derivedBounds.fiber.roundingAllowancePerSourceBasisG).toBe(1);
    expect(result.points.fiber.possible).toEqual([0]); expect(result.rawScore).toBe(13);
    expect(result.letter).toBe('E');
    for (const kind of ['government-composition', 'api-product', null]) {
      const copy = JSON.parse(JSON.stringify(pepsi)); copy.source.kind = kind;
      const unbounded = evaluate(copy);
      expect(unbounded.normalized.derivedBounds).toEqual({});
      expect(unbounded.nutritionScore100).toBeNull();
    }
    const unknownMarket = JSON.parse(JSON.stringify(pepsi));
    unknownMarket.product.market = null; unknownMarket.evidence.market.claim = null;
    expect(evaluate(unknownMarket).normalized.derivedBounds).toEqual({});
  });
  test('US residual rounding can leave multiple points on a small serving; no exact-zero inference', () => {
    const pepsi = JSON.parse(JSON.stringify(fixtures.OBSERVATIONS.find(p => p.id === 'regular-soda')));
    pepsi.basis.amount = 20;
    // Smaller controlled serving with otherwise internally consistent gram totals.
    pepsi.nutrients.totalSugar.value = 4; pepsi.nutrients.addedSugar.value = 4; pepsi.nutrients.carbohydrates.value = 4;
    const result = evaluate(pepsi);
    expect(result.normalized.nutrients.fiber).toBeNull();
    expect(result.normalized.derivedBounds.fiber.max).toBe(5);
    expect(result.points.fiber.possible).toEqual([0, 1, 2]);
  });
  test('milk moves to beverage rules while spoonable yogurt remains general', () => {
    const milk = fixtures.SYNTHETIC.find(p => p.id === 'milk-original-general-rule');
    expect(evaluate(milk).methodCategory).toBe('beverage');
    expect(evaluate(milk).letter).toBe('B');
    expect(evaluate(fixtures.OBSERVATIONS.find(p => p.id === 'plain-yogurt')).methodCategory).toBe('general');
  });
});

const { evaluatePublishedComposite: evaluate } = require('./publishedCompositeScoring');
const { evaluatePublishedNutrition } = require('./publishedNutritionScoring');
const { synthetic } = require('./publishedNutritionFixtures');

// Only hypothetical classifications: no real additive is assigned a risk level.
const source = { kind: 'synthetic', attribution: 'Invented controlled assessment, not a product finding.' };
function control(levels = [], organic = false) {
  return synthetic('combined-control', 'general', { energyKj: 100, totalSugar: 0, saturatedFat: 0,
    sodium: 0, fiber: 5, protein: 9 }, { compositeAssessments: {
    additives: { status: 'reviewed', complete: true, scope: 'full-ingredient-list', source,
      items: levels.map((level, index) => ({ id: `hypothetical-${index}`, level, source })) },
    organic: { status: organic ? 'certified' : 'not-certified', certification: organic ? 'Synthetic certification' : null, source },
    hydrogenatedOils: { status: 'reviewed', partialCount: 0, fullyCount: 0, source },
  } });
}
const codes = result => result.reasons.map(r => r.code);

test.each([
  [[], false, 90], [[], true, 100], [['green'], false, 90], [['yellow'], false, 84],
  [['orange'], false, 75], [['orange', 'orange'], false, 60], [['yellow', 'orange'], false, 69],
  [['red'], false, 49], [['red'], true, 49], [['red', 'red', 'orange'], false, 49],
])('published ordinary weights and caps: %j organic %s', (levels, organic, expected) => {
  const result = evaluate(control(levels, organic));
  expect(result.score100).toBe(expected);
  expect(result.grade).toBeNull(); expect(result.scoreReady).toBe(false); expect(result.scanMatchEligible).toBe(false);
});

test.each([[13, 7.8, 38], [57, 34.2, 64], [1, 0.6, 31]])('preserves raw component precision at nutrition %s', (nutritionScore100, raw, score) => {
  const result = evaluate(control(), { nutritionScore100 });
  expect(result.components.nutrition).toBeCloseTo(raw);
  expect(result.rawScore100).toBeCloseTo(raw + 30); expect(result.score100).toBe(score);
});

test.each(['additives', 'organic', 'hydrogenatedOils'])('missing %s assessment never earns default credit', key => {
  const p = control(); delete p.compositeAssessments[key];
  expect(evaluate(p).score100).toBeNull(); expect(evaluatePublishedNutrition(p).nutritionScore100).toBe(100);
});
test('provider empty list does not substitute for a complete assessment', () => {
  const p = control(); delete p.compositeAssessments.additives;
  p.additives = { status: 'reported', items: [], source: 'open-food-facts' };
  expect(codes(evaluate(p))).toContain('additive-assessment-missing');
});
test('source, completeness, coverage and classification must be explicit', () => {
  for (const change of [p => { p.compositeAssessments.additives.source = null; },
    p => { p.compositeAssessments.additives.complete = false; },
    p => { p.compositeAssessments.additives.scope = 'provider-tags'; },
    p => { p.compositeAssessments.additives.items[0].level = 'banned'; },
    p => { p.compositeAssessments.additives.items[0].source = null; },
    p => { p.synthetic = false; }]) {
    const p = control(['yellow']); change(p); expect(evaluate(p).score100).toBeNull();
  }
});
test('duplicate assessments are rejected, not counted twice', () => {
  const p = control(['yellow']); p.compositeAssessments.additives.items.push(p.compositeAssessments.additives.items[0]);
  expect(codes(evaluate(p))).toContain('duplicate-assessment');
});
test.each(['sugar', 'honey', 'alcohol', 'protein-supplement'])('%s cannot bypass exclusions', category => {
  const p = control(); p.product.category = category; expect(evaluate(p).score100).toBeNull();
});
test('chocolate does not receive ordinary weights', () => {
  const p = control(); p.product.category = 'dark-chocolate'; expect(codes(evaluate(p))).toContain('chocolate-rule-incomplete');
});
test('salt special rule excludes organic, with conditional source-backed bonuses', () => {
  const p = control(); p.product.category = 'sea-salt';
  p.compositeAssessments.salt = { unrefined: true, seaExtracted: true, source };
  delete p.compositeAssessments.organic;
  expect(evaluate(p).score100).toBe(50);
  p.sourceState.unresolvedConflicts.push('Conflicting manufacturer panels');
  expect(evaluate(p).score100).toBeNull();
});
test('plain water exception is not an organic-certification claim', () => {
  const p = control(); p.methodCategory = 'water'; p.product.category = 'water';
  p.basis = { kind: '100ml', amount: 100, unit: 'ml' };
  Object.values(p.nutrients).forEach(n => { n.value = 0; }); delete p.compositeAssessments.organic;
  const result = evaluate(p);
  expect(result.score100).toBe(100); expect(result.components.organic).toBe(0); expect(result.components.waterException).toBe(10);
  delete p.compositeAssessments.additives; expect(evaluate(p).score100).toBeNull();
});
test.each([['partialCount', 49], ['fullyCount', 75]])('documented single US oil deduction %s', (key, expected) => {
  const p = control(); p.compositeAssessments.hydrogenatedOils[key] = 1;
  expect(evaluate(p).score100).toBe(expected);
});
test('unknown oil aggregation remains explicit', () => {
  const p = control(['yellow']); p.compositeAssessments.hydrogenatedOils.fullyCount = 1;
  expect(codes(evaluate(p))).toContain('oil-aggregation-unverified');
});
test('unverified non-red floor is unavailable rather than guessed', () => {
  expect(codes(evaluate(control(Array(6).fill('yellow'))))).toContain('additive-floor-unverified');
  expect(evaluate(control(Array(6).fill('yellow'))).score100).toBeNull();
});
test('a red assessment can reach zero without a negative component or total', () => {
  const result = evaluate(control(['red', 'red']), { nutritionScore100: 0 });
  expect(result.components.additives).toBe(0); expect(result.rawScore100).toBe(0); expect(result.score100).toBe(0);
});
test('does not mutate or persist supplied inputs', () => {
  const p = control(); const before = JSON.stringify(p); const first = evaluate(p);
  expect(evaluate(p)).toEqual(first); expect(JSON.stringify(p)).toBe(before); expect(Object.isFrozen(first)).toBe(true);
});

import { evaluateTraceUsNutritionV2 as evaluate } from './traceUsNutritionScoringV2';
import { explainNutritionPoints } from './barcodeReviewInformation';
import { resolveGrainEvidence } from './traceFoodQualityEvidence';

// Synthetic equation controls; these values are not manufacturer label facts.
const source = { attribution: 'Synthetic control', url: 'https://example.org/control' };
const profile = (values = {}, category = 'general') => ({ category, source,
  basis: { amount: 100, unit: category === 'beverage' ? 'ml' : 'g' },
  nutrients: Object.fromEntries(Object.entries({ calories: 200, saturatedFat: 0, addedSugar: 0, totalSugar: 0,
    sodium: 0, fiber: 0, protein: 0, fat: 30, carbohydrates: 50, ...values }).map(([key, value]) =>
    [key, { value, unit: key === 'calories' ? 'kcal' : key === 'sodium' ? 'mg' : 'g' }])) });

test('exact density equation, bounded benefits and disabled public output', () => {
  const input = profile({ calories: 340, addedSugar: 13.75, totalSugar: 24.75, fiber: 5.6, protein: 10 });
  const before = JSON.stringify(input), result = evaluate(input);
  // E=.5, sugar=.5, B=max(.4*.5, .8*.5)=.4.
  expect(result.comparison.limitingBurden).toBeCloseTo(.4);
  expect(result.points.energy.min).toBeCloseTo(17.5);
  expect(result.points.sugar.min).toBeCloseTo(24);
  expect(result.points.fiber.min).toBeCloseTo(4.8);
  expect(result.points.proteinApplied.min).toBeCloseTo(1.2);
  expect(result.rawScore).toBeCloseTo(49.5);
  expect(result.nutritionScore100).toBe(50);
  expect(result).toMatchObject({ grade: null, scoreReady: false, scanMatchEligible: false,
    methodVersion: '2.1-milk-development-2026-10-21' });
  expect(JSON.stringify(input)).toBe(before);
  expect(Object.isFrozen(result)).toBe(true);
});

test.each(['calories', 'addedSugar', 'totalSugar', 'saturatedFat', 'sodium'])(
  '%s is monotonic without branded exceptions', key => {
    const maximum = { calories: 700, addedSugar: 40, totalSugar: 45, saturatedFat: 20, sodium: 1200 }[key];
    let previous = 101;
    for (let i = 0; i <= 40; i += 1) {
      const result = evaluate(profile({ calories: 200, totalSugar: 45, carbohydrates: 70, [key]: maximum * i / 40 }));
      expect(Number.isInteger(result.nutritionScore100)).toBe(true);
      expect(result.nutritionScore100).toBeLessThanOrEqual(previous);
      previous = result.nutritionScore100;
    }
  }
);

test('protein and fiber cannot erase strong negative factors or grow without bounds', () => {
  const modest = evaluate(profile({ addedSugar: 25, totalSugar: 30, fiber: 5.6, protein: 10 }));
  const fortified = evaluate(profile({ addedSugar: 25, totalSugar: 30, fiber: 25, protein: 50 }));
  expect(modest.nutritionScore100).toBe(fortified.nutritionScore100);
  expect(fortified.points.fiber.max).toBeLessThanOrEqual(8);
  expect(fortified.points.proteinApplied.max).toBeLessThanOrEqual(2);
  expect(fortified.nutritionScore100).toBeLessThan(40);
});

test('whole-grain credit needs matching first-ingredient provenance; no quantity is invented', () => {
  const input = profile({ calories: 350, fiber: 12, protein: 12 });
  input.grainEvidence = resolveGrainEvidence({ text: 'Whole grain wheat.', language: 'en' }, source);
  const result = evaluate(input);
  expect(result.points.wholeGrain.min).toBe(5);
  expect(result.comparison.grainEvidence.percentage).toBeNull();
  expect(result.nutritionScore100).toBeGreaterThan(80);
  input.grainEvidence.source = { ...source, url: 'https://example.org/another' };
  expect(evaluate(input).points.wholeGrain.min).toBe(0);
  delete input.grainEvidence.source;
  expect(evaluate(input).points.wholeGrain.min).toBe(0);
});

test('only genuinely satisfied criteria can reach 100; no upper clipping creates a perfect result', () => {
  const input = profile({ calories: 70, fiber: 5.6, protein: 10 });
  input.grainEvidence = resolveGrainEvidence({ text: 'Whole grain oats.', language: 'en' }, source);
  expect(evaluate(input).rawScore).toBe(100);
  expect(evaluate(profile()).nutritionScore100).toBeLessThan(100);
  expect(evaluate(profile({ calories: 1000, saturatedFat: 30, addedSugar: 40, totalSugar: 45, sodium: 2000 })).nutritionScore100).toBe(0);
});

test.each(['calories', 'saturatedFat', 'sodium'])('unknown %s cannot silently become zero', key => {
  const result = evaluate(profile({ [key]: null }));
  expect(result.nutritionScore100).toBeNull();
  expect(result.reasons.length).toBeGreaterThan(0);
});
test.each(['fiber', 'protein'])('missing optional %s remains null with no benefit', key => {
  const result = evaluate(profile({ [key]: null }));
  expect(result.normalized.originalNutrients[key]).toBeNull();
  expect(result.points[key === 'protein' ? 'proteinApplied' : key].min).toBe(0);
});

test('added and total sugars remain separate; measured total density can dominate', () => {
  const result = evaluate(profile({ addedSugar: 7, totalSugar: 24 }));
  expect(result.sugarMode).toBe('totalSugar');
  expect(result.normalized.originalNutrients.addedSugar).toBe(7);
  expect(explainNutritionPoints(result)).toContain('total sugars');
  expect(explainNutritionPoints(result)).not.toContain('added sugars unavailable');
  expect(evaluate(profile({ addedSugar: 12, totalSugar: 5 })).excludedNutrients).toContain('addedSugar');
});

test('equivalent serving panels produce the same score and preserve the input basis', () => {
  const a = profile({ fiber: 3, protein: 6, addedSugar: 7, totalSugar: 20 });
  const b = JSON.parse(JSON.stringify(a)); b.basis.amount = 25;
  Object.values(b.nutrients).forEach(n => { n.value /= 4; });
  expect(evaluate(a).nutritionScore100).toBe(evaluate(b).nutritionScore100);
  expect(evaluate(b).normalized.originalBasis.amount).toBe(25);
});
test('nut/oil rules measure fat quality, not all calorie density', () => {
  const oliveLike = profile({ calories: 884, fat: 100, saturatedFat: 14 }, 'oil');
  const coconutLike = profile({ calories: 884, fat: 100, saturatedFat: 82 }, 'oil');
  expect(evaluate(oliveLike).nutritionScore100).toBeGreaterThan(75);
  expect(evaluate(coconutLike).nutritionScore100).toBeLessThan(10);
  const nuts = profile({ calories: 600, fat: 50, saturatedFat: 3.5, fiber: 11, protein: 21 }, 'nuts');
  expect(evaluate(nuts).nutritionScore100).toBeGreaterThan(90);
  expect(evaluate(nuts).comparison.energyRule).toContain('saturated-fat');
});
test('beverage sugar is more stringent; unknown saturated fat remains unknown when masked', () => {
  const result = evaluate(profile({ calories: 42, totalSugar: 10.6, addedSugar: null, saturatedFat: null, fat: 0 }, 'beverage'));
  expect(result.nutritionScore100).toBeLessThan(20);
  expect(result.normalized.nutrients.saturatedFat).toBeNull();
  expect(result.points.saturatedFat.min).toBe(0);
  expect(result.points.saturatedFat.max).toBeGreaterThan(0);
});
test.each([-1, NaN, Infinity, '100'])('invalid essential values reject: %s', sodium => {
  expect(evaluate(profile({ sodium })).nutritionScore100).toBeNull();
});
test('units, incompatible dimensions, and absent basis reject without network or storage access', () => {
  const input = profile(); input.nutrients.sodium.unit = 'IU';
  expect(evaluate(input).nutritionScore100).toBeNull();
  expect(evaluate({ ...profile(), basis: null }).nutritionScore100).toBeNull();
  expect(evaluate({ ...profile(), basis: { amount: 100, unit: 'ml' } }).nutritionScore100).toBeNull();
});

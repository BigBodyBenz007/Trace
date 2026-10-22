import { explainNutritionPoints, getNutritionHighlights, getBarcodeAdditiveInformation, getBarcodeReviewName } from './barcodeReviewInformation';

test('readable review names deduplicate provider repetition without dropping distinct variants', () => {
  const display = { name: 'CHOCOLATE CHIP COOKIE DOUGH PROTEIN BAR, CHOCOLATE CHIP COOKIE DOUGH PROTEIN BAR', brand: 'Example, LLC' };
  expect(getBarcodeReviewName({ display })).toBe('Example · Chocolate Chip Cookie Dough Protein Bar');
  expect(display.name).toContain(', CHOCOLATE');
  expect(getBarcodeReviewName({ display: { name: 'SPAM Classic', brand: 'SPAM' } })).toBe('SPAM Classic');
  expect(getBarcodeReviewName({ display: { name: 'Yogurt, Strawberry', brand: 'Example' } })).toContain('Strawberry');
  expect(getBarcodeReviewName({ display: { name: 'りんご, みかん', brand: '' } })).toBe('りんご, みかん');
  expect(getBarcodeReviewName({ display: { ...display, nutritionCorrection: { manufacturerPanel: { identity: { name: 'Honey Graham Snacks', brand: 'Example' } } } } })).toBe('Example · Honey Graham Snacks');
});

const point = (min, max = min) => ({ min, max });
const result = points => ({ nutritionScore100: 64, methodCategory: 'general', points });

test('opening highlights select at most three actual contributions in deterministic importance order', () => {
  const input = { ...result({ energy: point(20), sugar: point(8), saturatedFat: point(0), salt: point(1),
    fiber: point(2), proteinApplied: point(1), wholeGrain: point(4) }), sugarMode: 'totalSugar' };
  expect(getNutritionHighlights(input).map(f => f.key)).toEqual(['energy', 'sugar', 'wholeGrain']);
  expect(getNutritionHighlights(input).map(f => f.text)).toEqual(['Calorie density lowers the score.', 'Total sugars lower the score.', 'Whole grains help the score.']);
  expect(getNutritionHighlights(input)).toEqual(getNutritionHighlights(input));
});

test('unknown, zero and unapplied nutrient credits never become opening claims', () => {
  expect(getNutritionHighlights(null)).toEqual([]);
  expect(getNutritionHighlights({ nutritionScore100: null })).toEqual([]);
  expect(getNutritionHighlights(result({ fiber: point(0, 8), protein: point(8), proteinApplied: point(0), sugar: point(0) }))).toEqual([]);
  expect(getNutritionHighlights({ ...result({ sugar: point(3) }), sugarMode: 'addedSugar' })[0].text).toContain('Added sugars');
});

test('nut and oil fat-quality factors are combined without claiming general calorie-density penalties', () => {
  const facts = getNutritionHighlights({ ...result({ energy: point(2), saturatedFat: point(3), fiber: point(4) }), methodCategory: 'nuts' });
  expect(facts).toHaveLength(2);
  expect(facts[0]).toMatchObject({ key: 'saturatedFat', contribution: 5, text: 'Saturated fat lowers the score.' });
  expect(facts.some(f => /calorie density/i.test(f.text))).toBe(false);
});

test('all 21 saved observations use actual applied points without changing a result or inventing missing factors', () => {
  const report = require('../../docs/trace-nutrition-v2-comparison-2026-10-20.json');
  expect(report.products).toHaveLength(21);
  for (const product of report.products) {
    const input = product.after.result, before = JSON.stringify(input), highlights = getNutritionHighlights(input);
    expect(highlights.length).toBeLessThanOrEqual(3);
    expect(new Set(highlights.map(h => h.key)).size).toBe(highlights.length);
    expect(highlights.every(h => h.contribution > 0 && h.text.length < 60)).toBe(true);
    for (const highlight of highlights) {
      const applied = input.points[highlight.key].min;
      expect(highlight.contribution).toBeCloseTo(applied + (highlight.key === 'saturatedFat' && ['nuts', 'oil'].includes(input.methodCategory) ? input.points.energy.min : 0));
    }
    expect(JSON.stringify(input)).toBe(before);
  }
});
test('explains only actual adverse and applied favorable contributions', () => {
  const text = explainNutritionPoints(result({ sugar: point(3), saturatedFat: point(2), salt: point(1), fiber: point(2), protein: point(7), proteinApplied: point(0) }));
  expect(text).toBe('This score is lowered by total sugars, saturated fat, and sodium (calculated as salt). It is raised by fiber.');
  expect(text).not.toMatch(/protein|added sugar|energy/);
});
test('unknown point ranges never claim a guaranteed contribution', () => {
  expect(explainNutritionPoints(result({ plant: point(0, 5), fiber: point(0, 5) }))).toMatch(/do not establish/);
  expect(explainNutritionPoints(result({ proteinApplied: point(2, 5) }))).toBe('It is raised by protein.');
});
test('missing score, zero points, fats and beverage rules have accurate wording', () => {
  expect(explainNutritionPoints({ nutritionScore100: null })).toBeNull();
  expect(explainNutritionPoints(result({ fiber: point(0) }))).toMatch(/No measured component/);
  expect(explainNutritionPoints({ ...result({ energy: point(2), saturatedFat: point(1), plant: point(5) }), methodCategory: 'fats-nuts-seeds' }))
    .toBe('This score is lowered by energy from saturated fat and the share of saturated fat. It is raised by qualifying plant ingredients.');
  expect(explainNutritionPoints(result({ nonNutritiveSweeteners: point(4) }))).toMatch(/beverage rule.*not a safety judgment/);
  expect(explainNutritionPoints({ ...result({}), methodCategory: 'water' })).toMatch(/separate reference score/);
});
test.each([
  ['E150d', 'Coloring'], ['E202', 'Preservative'], ['E211', 'Preservative'], ['E300', 'Antioxidant'],
  ['E322', 'Emulsifier'], ['E330', 'Acidity regulator'], ['E415', 'Thickener'], ['E500ii', 'Leavening'],
])('%s has a verified general function with dated official US attribution', (id, role) => {
  const info = getBarcodeAdditiveInformation(id);
  expect(info.function).toContain(role);
  expect(info.functionSource).toMatchObject({ jurisdiction: 'US', publisher: 'FDA', reviewedOn: '2026-10-20', verification: 'directly-reviewed' });
  expect(new URL(info.functionSource.url).hostname).toMatch(/(^|\.)fda.gov$/);
  expect(Object.isFrozen(info)).toBe(true);
});
test.each(['E9999', 'E127', 'en:e330', null, 'constructor', '__proto__'])('unknown identity %s receives no invented information', id => {
  expect(getBarcodeAdditiveInformation(id)).toBeNull();
});
test('scientific concerns retain context and do not diagnose a product', () => {
  const benzoate = getBarcodeAdditiveInformation('E211').concern;
  expect(benzoate.text).toMatch(/some beverages.*vitamin C.*heat and light/);
  expect(benzoate.text).toMatch(/historical survey.*do not establish benzene/);
  expect(getBarcodeAdditiveInformation('E150d').concern.text).toMatch(/lung tumors in mice.*effects in rats.*far above.*unknown/);
  expect(getBarcodeAdditiveInformation('E202').concern).toBeUndefined();
});
test('regulatory summaries bind exact editions and preserve conditions, not blanket approval', () => {
  for (const id of ['E211', 'E330', 'E415']) {
    const regulation = getBarcodeAdditiveInformation(id).regulation;
    expect(regulation.source.url).toMatch(/^https:\/\/www.ecfr.gov\/current\/title-21\/section-/);
    expect(regulation.source.edition).toContain('current through 2026-10-16');
    expect(regulation.source.provision).toBeTruthy();
    expect(regulation.text).toMatch(/manufacturing practice/);
    expect(regulation.text).toMatch(/compliance/);
  }
  expect(getBarcodeAdditiveInformation('E211').regulation.text).toMatch(/0.1%.*significantly different.*Prior-sanction/);
  expect(getBarcodeAdditiveInformation('E415').regulation.text).toMatch(/standards do not preclude.*food-grade labeling/);
});
